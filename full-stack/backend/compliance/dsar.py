from __future__ import annotations
import json
from models import db, SourcedCandidate, Contact, AuditEvent

class DSARHandler:
    def find(self, tenant: str, email=None, name=None, profile_url=None) -> dict:
        hits = []
        q = SourcedCandidate.query.filter_by(tenant_id=tenant)
        if profile_url:
            q = q.filter(SourcedCandidate.source_url.contains(profile_url))
        for c in q.limit(2000).all():
            d = json.loads(c.candidate_json or "{}")
            if name and name.lower() not in (c.name or "").lower():
                continue
            if email and email.lower() not in json.dumps(d).lower():
                continue
            hits.append({"candidate_id": c.id, "name": c.name,
                         "source_url": c.source_url, "score": c.score})
        return {"matches": hits, "count": len(hits)}

    def erase(self, tenant: str, candidate_id: str) -> dict:
        c = SourcedCandidate.query.filter_by(id=candidate_id, tenant_id=tenant).first()
        if not c:
            return {"error": "not found"}
        c.tombstoned = True
        for ct in Contact.query.filter_by(tenant_id=tenant, candidate_id=candidate_id).all():
            ct.suppressed = True
        db.session.add(AuditEvent(tenant_id=tenant, kind="dsar.erased",
                                  subject=candidate_id,
                                  detail=json.dumps({"name": c.name})))
        db.session.commit()
        return {"erased": candidate_id, "name": c.name}
