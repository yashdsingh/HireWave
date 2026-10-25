"""Orchestrates harvest -> verify -> infer. Precision order, confidence on every fact."""
from __future__ import annotations
import re
from dataclasses import dataclass, field, asdict

from . import patterns, harvest, phones

@dataclass
class ContactResult:
    emails: list[dict] = field(default_factory=list)
    phones: list[dict] = field(default_factory=list)
    socials: list[str] = field(default_factory=list)
    inferred: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self):
        return asdict(self)

class ContactEngine:
    def __init__(self, smtp_pool=None):
        self.pool = smtp_pool

    async def extract(self, text: str = "", html: str = "", region: str = "US",
                      infer_for: list[tuple[str, str, str]] | None = None,
                      verify_smtp: bool = True) -> ContactResult:
        res = ContactResult()
        scored: dict[str, float] = {}

        def bump(addr, conf):
            addr = addr.lower().strip().rstrip(".")
            if addr and "@" in addr:
                scored[addr] = max(scored.get(addr, 0.0), conf)

        for addr, conf in harvest.from_mailto(html):
            bump(addr, conf)
        for p in harvest.from_jsonld(html):
            if p.get("email"):
                bump(str(p["email"]).replace("mailto:", ""), 0.96)
            if p.get("telephone"):
                rec = phones.normalise(str(p["telephone"]), region)
                if rec:
                    res.phones.append({**rec, "confidence": 0.95, "source": "jsonld"})
        for addr, conf in harvest.from_prose(text + " " + html):
            bump(addr, conf)
        for raw in harvest.from_tel(html):
            rec = phones.normalise(raw, region)
            if rec:
                res.phones.append({**rec, "confidence": 0.97, "source": "tel_href"})
        for rec in phones.extract_phones(text, region):
            res.phones.append({**rec, "confidence": 0.85, "source": "text"})
        for url in re.findall(r"https?://[^\s\"'<>)]*linkedin\.com/in/[^\s\"'<>)?]+",
                              text + " " + html):
            res.socials.append(url.split("?")[0].rstrip("/").lower())

        # dedupe phones
        seen_p = set()
        uniq_phones = []
        for p in sorted(res.phones, key=lambda x: -x["confidence"]):
            if p["e164"] not in seen_p:
                seen_p.add(p["e164"]); uniq_phones.append(p)
        res.phones = uniq_phones
        res.socials = sorted(set(res.socials))

        # SMTP verification — the loophole step
        if self.pool and verify_smtp:
            for addr in list(scored):
                v = await self.pool.verify(addr)
                if not v.accepted and scored[addr] < 0.90:
                    scored.pop(addr, None)
                    continue
                scored[addr] = min(0.99, max(scored[addr], v.confidence))
                if v.catch_all:
                    res.warnings.append(f"{addr.split('@')[-1]} is a catch-all domain")

        res.emails = [{"value": a, "confidence": round(c, 2),
                       "tier": "VERIFIED" if c >= 0.9 else "STRONG" if c >= 0.7 else "PROBABLE"}
                      for a, c in sorted(scored.items(), key=lambda kv: -kv[1])]

        # inference last, always labelled as a guess
        if infer_for and self.pool:
            for first, last, domain in infer_for:
                if not (first and last and domain):
                    continue
                for cand in patterns.generate(first, last, domain)[:4]:
                    if cand in scored:
                        continue
                    v = await self.pool.verify(cand)
                    if v.accepted:
                        res.inferred.append({"value": cand, "confidence": v.confidence,
                                             "tier": v.tier.name, "evidence": v.detail})
                        break
        return res
