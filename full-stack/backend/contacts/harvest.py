"""Precision-ordered harvesters. href attributes beat prose regex every time."""
from __future__ import annotations
import asyncio, json, re
from bs4 import BeautifulSoup

NOREPLY = re.compile(r"^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$", re.I)
EMAIL_RX = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
BAD_SUFFIX = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".webp", ".ico")

def decode_cfemail(hexstr: str) -> str | None:
    """Cloudflare obfuscation is XOR with its own first byte. Fully offline."""
    try:
        raw = bytes.fromhex(hexstr)
    except (ValueError, TypeError):
        return None
    if not raw:
        return None
    key = raw[0]
    return "".join(chr(b ^ key) for b in raw[1:])

_OBF = [
    (re.compile(r"\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+", re.I), "@"),
    (re.compile(r"\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+", re.I), "."),
    (re.compile(r"&#0?64;", re.I), "@"),
    (re.compile(r"&#0?46;", re.I), "."),
]

def deobfuscate(text: str) -> str:
    for rx, repl in _OBF:
        text = rx.sub(repl, text)
    return text

def from_mailto(html: str) -> list[tuple[str, float]]:
    soup = BeautifulSoup(html or "", "html.parser")
    out = []
    for a in soup.select('a[href^="mailto:"]'):
        addr = a["href"][7:].split("?")[0].strip().lower()
        if "@" in addr and "." in addr.split("@")[-1]:
            out.append((addr, 0.97))
    for node in soup.select("[data-cfemail]"):
        d = decode_cfemail(node.get("data-cfemail", ""))
        if d and "@" in d:
            out.append((d.lower(), 0.95))
    return out

def from_tel(html: str) -> list[str]:
    soup = BeautifulSoup(html or "", "html.parser")
    return [a["href"][4:].split("?")[0].strip()
            for a in soup.select('a[href^="tel:"]') if a["href"][4:].strip()]

def from_jsonld(html: str) -> list[dict]:
    soup = BeautifulSoup(html or "", "html.parser")
    people = []
    for tag in soup.select('script[type="application/ld+json"]')[:10]:
        try:
            data = json.loads(tag.string or tag.get_text() or "{}")
        except Exception:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            node = stack.pop()
            if isinstance(node, dict):
                t = node.get("@type", "")
                if "Person" in (t if isinstance(t, list) else [t]):
                    people.append(node)
                stack.extend(v for v in node.values() if isinstance(v, (dict, list)))
            elif isinstance(node, list):
                stack.extend(node)
    return people

def from_prose(text: str) -> list[tuple[str, float]]:
    out = []
    for m in EMAIL_RX.findall(deobfuscate(text or "")):
        a = m.lower().rstrip(".")
        if a.endswith(BAD_SUFFIX):
            continue
        out.append((a, 0.70))
    return out

async def _run(cmd: list[str]) -> str:
    p = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    out, _ = await p.communicate()
    return out.decode(errors="replace")

async def from_git(clone_url: str, depth: int = 500) -> list[tuple[str, str]]:
    """git log has NO rate limit and NO API key. Blobless clone: ~1-3MB, ~2s."""
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        try:
            await _run(["git", "clone", "--filter=blob:none", "--no-checkout",
                        "--quiet", clone_url, d])
            log = await _run(["git", "-C", d, "log", f"-{depth}", "--format=%ae|%an"])
        except Exception:
            return []
    pairs = []
    for line in log.splitlines():
        if "|" not in line:
            continue
        email, name = line.split("|", 1)
        email = email.strip().lower()
        if not email or email.endswith((".local", "@localhost")):
            continue
        if email.endswith("noreply.github.com"):
            m = NOREPLY.match(email)
            if m:
                pairs.append((f"{m.group(1)}@github", name.strip()))
            continue
        pairs.append((email, name.strip()))
    return pairs
