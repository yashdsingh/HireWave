"""Immutable decision log. This is the AI Act / LL144 artifact."""
from __future__ import annotations
import json
from models import db, AuditEvent

class Ledger:
    def event(self, tenant: str, kind: str, subject: str = "", **detail):
        db.session.add(AuditEvent(tenant_id=tenant, kind=kind, subject=subject,
                                  detail=json.dumps(detail)))
        db.session.commit()

    def explain(self, tenant: str, candidate_id: str) -> dict:
        from models import SourcedCandidate
        c = SourcedCandidate.query.filter_by(id=candidate_id, tenant_id=tenant).first()
        if not c:
            return {"error": "not found"}
        d = json.loads(c.candidate_json or "{}")
        return {
            "candidate": d.get("name"),
            "score": c.score,
            "matched": d.get("matched", []),
            "evidence": d.get("evidence", []),
            "sources": [c.source_url] + (d.get("also_at") or []),
            "explanation": (
                f"Matched on {len(d.get('matched', []))} requirement(s) "
                f"with score {c.score:.2f}. Evidence spans are quoted from the source page."
            ),
        }
