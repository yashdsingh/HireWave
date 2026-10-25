"""All models. Everything tenant-scoped from day one."""
from __future__ import annotations
import json, secrets
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def _id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"

def _now() -> datetime:
    return datetime.utcnow()

class Tenant(db.Model):
    __tablename__ = "tenants"
    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=_now)

class ApiKey(db.Model):
    __tablename__ = "api_keys"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("key"))
    tenant_id = db.Column(db.String(64), db.ForeignKey("tenants.id"), index=True)
    name = db.Column(db.String(120))
    key_hash = db.Column(db.String(128), unique=True, index=True)
    display = db.Column(db.String(64))
    scopes = db.Column(db.Text, default="")
    rpm = db.Column(db.Integer, default=600)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_now)
    last_used_at = db.Column(db.DateTime)

    @property
    def scope_set(self) -> set[str]:
        return set(filter(None, (self.scopes or "").split(",")))

class Job(db.Model):
    __tablename__ = "jobs"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("job"))
    tenant_id = db.Column(db.String(64), index=True)
    title = db.Column(db.String(300))
    dept = db.Column(db.String(120))
    location = db.Column(db.String(200))
    status = db.Column(db.String(40), default="Draft")
    jd_text = db.Column(db.Text)
    req_graph = db.Column(db.Text)          # JSON RequirementGraph
    created_at = db.Column(db.DateTime, default=_now)

    def to_dict(self):
        return {"id": self.id, "title": self.title, "dept": self.dept,
                "location": self.location, "status": self.status,
                "candidateCount": SourcedCandidate.query.filter_by(job_id=self.id).count(),
                "createdAt": self.created_at.isoformat()}

class SourcingRun(db.Model):
    __tablename__ = "sourcing_runs"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("run"))
    tenant_id = db.Column(db.String(64), index=True)
    job_id = db.Column(db.String(64), db.ForeignKey("jobs.id"), index=True)
    status = db.Column(db.String(30), default="queued")
    queries = db.Column(db.Text)
    stats = db.Column(db.Text)
    warnings = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=_now)
    finished_at = db.Column(db.DateTime)

    def to_dict(self):
        return {"id": self.id, "jobId": self.job_id, "status": self.status,
                "stats": json.loads(self.stats or "{}"),
                "warnings": json.loads(self.warnings or "[]"),
                "createdAt": self.created_at.isoformat()}

class SourcedCandidate(db.Model):
    __tablename__ = "sourced_candidates"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("cand"))
    tenant_id = db.Column(db.String(64), index=True)
    run_id = db.Column(db.String(64), db.ForeignKey("sourcing_runs.id"), index=True)
    job_id = db.Column(db.String(64), index=True)
    cluster_id = db.Column(db.String(64), index=True)
    source_url = db.Column(db.Text)
    source_domain = db.Column(db.String(200))
    name = db.Column(db.String(200))
    title = db.Column(db.String(300))
    company = db.Column(db.String(200))
    location = db.Column(db.String(200))
    score = db.Column(db.Float, default=0.0)
    candidate_json = db.Column(db.Text)
    first_seen = db.Column(db.DateTime, default=_now)
    last_seen = db.Column(db.DateTime, default=_now)
    tombstoned = db.Column(db.Boolean, default=False)

    def to_dict(self):
        d = json.loads(self.candidate_json or "{}")
        d.update({"id": self.id, "score": self.score, "clusterId": self.cluster_id,
                  "sourceUrl": self.source_url, "domain": self.source_domain})
        return d

class Contact(db.Model):
    __tablename__ = "contacts"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("ct"))
    tenant_id = db.Column(db.String(64), index=True, default="default")
    candidate_id = db.Column(db.String(64), index=True)
    type = db.Column(db.String(20))            # email | phone
    value = db.Column(db.String(320))
    confidence = db.Column(db.Float, default=0.5)
    tier = db.Column(db.String(20))            # GUESS..VERIFIED
    source_kind = db.Column(db.String(40))
    line_type = db.Column(db.String(40))
    area = db.Column(db.String(120))
    suppressed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=_now)
    __table_args__ = (db.UniqueConstraint("tenant_id", "type", "value",
                                          name="uq_contact_tenant_type_value"),)

    def to_dict(self):
        return {"id": self.id, "type": self.type, "value": self.value,
                "confidence": self.confidence, "tier": self.tier,
                "lineType": self.line_type, "area": self.area,
                "source": self.source_kind, "suppressed": self.suppressed}

class Suppression(db.Model):
    __tablename__ = "suppressions"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("sup"))
    tenant_id = db.Column(db.String(64), index=True, default="default")
    value = db.Column(db.String(320), index=True)
    reason = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=_now)

class PolicyReceipt(db.Model):
    __tablename__ = "policy_receipts"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("rcpt"))
    tenant_id = db.Column(db.String(64), index=True)
    domain = db.Column(db.String(200), index=True)
    url = db.Column(db.Text)
    verdict = db.Column(db.String(30))
    obligations = db.Column(db.Text)
    legal_basis = db.Column(db.String(80))
    retention_days = db.Column(db.Integer)
    reason = db.Column(db.Text)
    policy_version = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=_now)

class AuditEvent(db.Model):
    __tablename__ = "audit_events"
    id = db.Column(db.String(64), primary_key=True, default=lambda: _id("ev"))
    tenant_id = db.Column(db.String(64), index=True)
    kind = db.Column(db.String(60), index=True)
    subject = db.Column(db.String(200))
    detail = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=_now)

    def to_dict(self):
        return {"id": self.id, "kind": self.kind, "subject": self.subject,
                "detail": json.loads(self.detail or "{}"),
                "createdAt": self.created_at.isoformat()}
