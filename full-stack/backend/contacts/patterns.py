"""Email pattern inference — published convention, no permission needed."""
from __future__ import annotations
import re
from collections import Counter

PATTERNS = (
    "{first}.{last}", "{first}{last}", "{f}{last}", "{first}_{last}",
    "{first}", "{last}.{first}", "{first}.{l}", "{f}.{last}",
    "{last}{f}", "{first}-{last}",
)

def _clean(s: str) -> str:
    return re.sub(r"[^a-z]", "", (s or "").lower().strip())

def generate(first: str, last: str, domain: str) -> list[str]:
    f, l = _clean(first), _clean(last)
    if not f or not l or not domain:
        return []
    seen, out = set(), []
    for p in PATTERNS:
        try:
            addr = p.format(first=f, last=l, f=f[0], l=l[0]) + "@" + domain.lower()
        except (KeyError, IndexError):
            continue
        if addr not in seen:
            seen.add(addr); out.append(addr)
    return out

def infer_domain_pattern(known: list[tuple[str, str, str]]) -> tuple[str | None, float]:
    """known: [(first, last, email)]. Learns the company's own convention."""
    votes: Counter[str] = Counter()
    for first, last, email in known:
        local = email.split("@")[0].lower()
        f, l = _clean(first), _clean(last)
        if not f or not l:
            continue
        for p in PATTERNS:
            try:
                if p.format(first=f, last=l, f=f[0], l=l[0]) == local:
                    votes[p] += 1
                    break
            except (KeyError, IndexError):
                continue
    if not votes:
        return None, 0.0
    pattern, n = votes.most_common(1)[0]
    return pattern, n / sum(votes.values())
