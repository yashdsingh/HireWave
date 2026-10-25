"""Cross-URL person dedupe (Fellegi-Sunter). Prevents 6 rows for 1 human."""
from __future__ import annotations
import math, re
from rapidfuzz.distance import JaroWinkler

LEGAL = {"inc","llc","ltd","corp","gmbh","sa","bv","plc","co","group",
         "technologies","solutions","labs","holdings"}

def _name(n): return [t for t in re.sub(r"[^a-z ]", "", (n or "").lower()).split() if t]
def _emp(e): return " ".join(t for t in re.split(r"\W+", (e or "").lower())
                             if t and t not in LEGAL)

def pair_weight(a: dict, b: dict) -> float:
    w = 0.0
    na, nb = _name(a.get("name")), _name(b.get("name"))
    if na and nb and len(na[-1]) > 1 and len(nb[-1]) > 1:
        sur = JaroWinkler.normalized_similarity(na[-1], nb[-1])
        fir = (JaroWinkler.normalized_similarity(na[0], nb[0])
               if len(na) > 1 and len(nb) > 1 else 0.5)
        w += math.log2(0.90 / 0.02) * (0.65 * sur + 0.35 * fir)
    ea, eb = _emp(a.get("company")), _emp(b.get("company"))
    if ea and ea == eb:
        w += math.log2(0.72 / 0.004)
    la = (a.get("location") or "").split(",")[0].strip().lower()
    lb = (b.get("location") or "").split(",")[0].strip().lower()
    if la and la == lb:
        w += math.log2(0.80 / 0.15)
    ta, tb = (a.get("title") or "").lower(), (b.get("title") or "").lower()
    if ta and tb:
        w += math.log2(0.60 / 0.08) * JaroWinkler.normalized_similarity(ta, tb)
    return w

AUTO, REVIEW = 12.0, 8.0

def dedupe(candidates: list[dict]) -> list[dict]:
    n = len(candidates)
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[rb] = ra

    for i in range(n):
        for j in range(i + 1, n):
            if pair_weight(candidates[i], candidates[j]) >= AUTO:
                union(i, j)

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    out = []
    for members in groups.values():
        best = max((candidates[m] for m in members), key=lambda c: c.get("score", 0))
        merged = dict(best)
        if len(members) > 1:
            others = sorted({candidates[m].get("source_url", "") for m in members
                             if candidates[m].get("source_url") != best.get("source_url")})
            merged["also_at"] = [o for o in others if o]
            merged["cluster_size"] = len(members)
        merged["cluster_id"] = "cl_" + re.sub(r"\W", "", (best.get("name") or "x").lower())[:12] \
                               + str(hash(best.get("source_url", "")) % 10000)
        out.append(merged)
    return sorted(out, key=lambda c: -c.get("score", 0))
