"""Impact ratios per stage. NYC LL144 + EU AI Act Art.10/15 material."""
from __future__ import annotations
import math
from collections import defaultdict
from models import db, SourcedCandidate

def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 0.0)
    p = k / n
    d = 1 + z*z/n
    c = (p + z*z/(2*n)) / d
    h = (z * math.sqrt(p*(1-p)/n + z*z/(4*n*n))) / d
    return (max(0.0, c-h), min(1.0, c+h))

def _cohort(name: str) -> str:
    n = (name or "").strip().lower()
    if not n: return "unknown"
    return {"a":"a-m","b":"a-m","c":"a-m","d":"a-m","e":"a-m",
            "f":"n-z","g":"n-z","h":"n-z","i":"n-z","j":"n-z",
            "k":"n-z","l":"n-z","m":"n-z","n":"n-z","o":"n-z",
            "p":"n-z","q":"n-z","r":"n-z","s":"n-z","t":"n-z",
            "u":"n-z","v":"n-z","w":"n-z","x":"n-z","y":"n-z","z":"n-z"}.get(n[0], "unknown")

def run_audit(tenant: str, min_n: int = 10) -> dict:
    rows = SourcedCandidate.query.filter_by(tenant_id=tenant, tombstoned=False).all()
    if not rows:
        return {"stages": {}, "note": "no data"}

    stages = {"sourced": rows,
              "shortlisted": [r for r in rows if (r.score or 0) >= 0.5],
              "top_quartile": [r for r in rows if (r.score or 0) >= 0.75]}

    report = {}
    for stage, subset in stages.items():
        by = defaultdict(list)
        for r in subset:
            by[_cohort(r.name)].append(1 if (r.score or 0) >= 0.5 else 0)
        rates = {}
        detail = {}
        for c, obs in by.items():
            if len(obs) < min_n:
                detail[c] = {"n": len(obs), "status": "insufficient_n"}
                continue
            k, n = sum(obs), len(obs)
            lo, hi = wilson(k, n)
            rates[c] = k / n
            detail[c] = {"n": n, "rate": round(k/n, 3), "ci95": [round(lo,3), round(hi,3)]}
        ir = None
        flags = []
        if len(rates) >= 2:
            hi_, lo_ = max(rates.values()), min(rates.values())
            ir = round(lo_/hi_, 3) if hi_ else 1.0
            if ir < 0.80:
                flags.append(f"ADVERSE_IMPACT ir={ir}")
        report[stage] = {"cohorts": detail, "impact_ratio": ir, "flags": flags}

    return {"stages": report,
            "cohort_method": "surname-initial proxy",
            "limitations": ["Cohorts inferred from name, not self-reported.",
                            "min_n per cohort enforced."]}
