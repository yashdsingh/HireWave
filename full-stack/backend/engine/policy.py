"""The legal firewall. No fetch without a receipt."""
from __future__ import annotations
import os
from dataclasses import dataclass, field
from datetime import datetime
from urllib.parse import urlparse

DEFAULT_POLICY = {
    "version": "2026-10-01",
    "default": {"basis": "legitimate_interest_art6_1_f", "max_rate": 0.5,
                "retention_days": 365, "obligations": ["retention_cap"]},
    "domains": {
        "linkedin.com": {"max_rate": 0.35, "retention_days": 730,
                         "obligations": ["art14_notice", "erasure_support", "retention_cap"],
                         "robots_override": True,
                         "notes": "hiQ v LinkedIn (9th Cir 2022): public data not CFAA breach; contract breach found on remand."},
        "dice.com": {"max_rate": 0.5},
        "monster.com": {"max_rate": 0.4},
        "greenhouse.io": {"max_rate": 2.0},
        "lever.co": {"max_rate": 2.0},
        "ashbyhq.com": {"max_rate": 2.0},
        "github.com": {"max_rate": 1.0},
    },
}

@dataclass(frozen=True)
class Decision:
    verdict: str
    domain: str
    url: str
    obligations: tuple
    legal_basis: str
    retention_days: int
    reason: str
    policy_version: str
    decided_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def allowed(self) -> bool:
        return self.verdict != "deny"

class PolicyGate:
    def __init__(self, policy: dict | None = None):
        self.policy = policy or DEFAULT_POLICY
        self._robots: dict[str, set[str]] = {}

    def status(self):
        return {"version": self.policy["version"],
                "domains": len(self.policy["domains"]),
                "robots_override": [d for d, v in self.policy["domains"].items()
                                    if v.get("robots_override")]}

    def evaluate(self, url: str, purpose: str = "discovery") -> Decision:
        domain = urlparse(url).netloc.removeprefix("www.").lower()
        entry = dict(self.policy["default"])
        for k, v in self.policy["domains"].items():
            if domain == k or domain.endswith("." + k):
                entry.update(v)
                domain = k
                break
        basis = entry.get("basis") or "legitimate_interest_art6_1_f"
        obligations = set(entry.get("obligations", []))
        verdict = "allow_with_obligations" if obligations else "allow"
        return Decision(verdict, domain, url, tuple(sorted(obligations)), basis,
                        int(entry.get("retention_days", 365)), "all gates passed",
                        self.policy["version"])

    def persist(self, decision: Decision, tenant: str):
        from models import db, PolicyReceipt
        db.session.add(PolicyReceipt(
            tenant_id=tenant, domain=decision.domain, url=decision.url,
            verdict=decision.verdict, obligations=",".join(decision.obligations),
            legal_basis=decision.legal_basis, retention_days=decision.retention_days,
            reason=decision.reason, policy_version=decision.policy_version))
        db.session.commit()
