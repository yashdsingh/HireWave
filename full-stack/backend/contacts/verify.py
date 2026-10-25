"""SMTP RCPT verification.

LEGAL POSITION: we open a TCP connection to port 25, ask a question, and send
NOTHING. No message is queued. Therefore:
  - no commercial email  -> no CAN-SPAM unsubscribe duty
  - no delivery          -> no ePrivacy consent, no GDPR Art.13 sending duty
  - no bounce            -> no sender reputation, no domain warm-up
  - no queueing          -> cost per verification ~= 0

REQUIREMENT: port 25 outbound must be open. AWS/GCP/Azure block it by default.
You MUST connect directly to the recipient MX; a smart host will not do RCPT-only.
"""
from __future__ import annotations
import asyncio, random, string, time
from dataclasses import dataclass
from enum import IntEnum

import dns.asyncresolver

class Tier(IntEnum):
    GUESS = 1; PROBABLE = 2; STRONG = 3; VERIFIED = 4

@dataclass(frozen=True)
class Verification:
    email: str
    accepted: bool
    catch_all: bool
    tier: Tier
    confidence: float
    detail: str

TEMP = ("421", "450", "451", "452")
PROBE_FROM = "verify@yourdomain.com"

async def resolve_mx(domain: str) -> list[str]:
    res = dns.asyncresolver.Resolver()
    res.lifetime = 5.0
    try:
        ans = await res.resolve(domain, "MX")
    except Exception:
        return []
    return [str(r.exchange).rstrip(".") for r in sorted(ans, key=lambda r: r.preference)]

async def _session(mx: str, targets: list[str], mailfrom: str, timeout: float = 12.0):
    out: dict[str, tuple[str, bool]] = {}
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(mx, 25), timeout)
    except Exception as e:
        return {t: (f"CONNFAIL:{type(e).__name__}", False) for t in targets}

    async def cmd(line: str) -> str:
        writer.write(line.encode() + b"\r\n"); await writer.drain()
        return (await asyncio.wait_for(reader.readline(), timeout)).decode(errors="replace")

    try:
        await asyncio.wait_for(reader.readline(), timeout)
        await cmd("EHLO verify.hirewave.internal")
        await cmd(f"MAIL FROM:<{mailfrom}>")
        for t in targets:
            code = await cmd(f"RCPT TO:<{t}>")
            out[t] = (code[:3], code.startswith("250"))
        junk = "".join(random.choices(string.ascii_lowercase, k=20))
        ca = await cmd(f"RCPT TO:<{junk}@{targets[0].split('@')[1]}>")
        out["__ca__"] = (ca[:3], ca.startswith("250"))
        await cmd("QUIT")
    except Exception as e:
        for t in targets:
            out.setdefault(t, (f"ERR:{type(e).__name__}", False))
    finally:
        try:
            writer.close(); await writer.wait_closed()
        except Exception:
            pass
    return out

class SMTPPool:
    """Rotating egress IPs. One IP doing thousands of RCPTs gets greylisted,
    especially by Microsoft. 8-16 IPs is the practical sweet spot."""
    def __init__(self, egress_ips: list[str], from_addr: str = PROBE_FROM,
                 per_ip_delay: float = 0.15):
        self.ips = egress_ips or ["0.0.0.0"]
        self.from_addr = from_addr
        self.delay = per_ip_delay
        self._i = 0
        self._last: dict[str, float] = {}
        self._cache: dict[str, tuple[float, Verification]] = {}

    async def verify(self, email: str, ttl: float = 86400 * 30) -> Verification:
        email = email.lower().strip()
        hit = self._cache.get(email)
        if hit and time.time() - hit[0] < ttl:
            return hit[1]

        domain = email.split("@")[-1]
        mxs = await resolve_mx(domain)
        if not mxs:
            v = Verification(email, False, False, Tier.GUESS, 0.0, "no MX record")
            self._cache[email] = (time.time(), v); return v

        result = None
        for mx in mxs[:2]:
            ip = self.ips[self._i % len(self.ips)]; self._i += 1
            wait = self.delay - (time.monotonic() - self._last.get(ip, 0))
            if wait > 0:
                await asyncio.sleep(wait)
            self._last[ip] = time.monotonic()

            r = await _session(mx, [email], self.from_addr)
            code, accepted = r.get(email, ("ERR", False))
            catch_all = r.get("__ca__", ("", False))[1]

            if code in TEMP:
                continue
            if not accepted:
                result = Verification(email, False, catch_all, Tier.PROBABLE, 0.30, f"rcpt {code}")
                break
            if catch_all:
                result = Verification(email, True, True, Tier.GUESS, 0.55, f"catch-all MX {mx}")
            else:
                result = Verification(email, True, False, Tier.VERIFIED, 0.95, f"rcpt 250 on {mx}")
            break

        result = result or Verification(email, False, False, Tier.GUESS, 0.20, "greylisted")
        self._cache[email] = (time.time(), result)
        return result
