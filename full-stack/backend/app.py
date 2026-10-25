"""HireWave API — complete route surface."""
from __future__ import annotations
import io, json, os, asyncio, csv
from datetime import datetime
from flask import Flask, request, jsonify, send_file, g
from werkzeug.exceptions import HTTPException
import traceback
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from models import (db, Tenant, ApiKey, Job, SourcingRun, SourcedCandidate,
                    Contact, Suppression, PolicyReceipt, AuditEvent)
from auth import require, issue_key
from extractor import extract_contacts, extract_candidate
from sourcing import analyze_job, run_sourcing, dedupe_candidates
from contacts.engine import ContactEngine
from contacts.verify import SMTPPool
from engine.policy import PolicyGate
from engine.jd import parse_jd
from engine.ledger import Ledger
from compliance.dsar import DSARHandler
from compliance.bias import run_audit

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///hirewave.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024
db.init_app(app)
CORS(app, origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()])


@app.errorhandler(Exception)
def _json_errors(e):
    """Flask defaults to HTML error pages; the client expects JSON."""
    if isinstance(e, HTTPException):
        return jsonify(error=e.description, code=e.code), e.code
    app.logger.exception(e)
    return jsonify(error=f"{type(e).__name__}: {e}",
                   trace=traceback.format_exc().splitlines()[-8:]), 500

# ---- singletons ----
_egress = [i.strip() for i in os.getenv("SMTP_EGRESS_IPS", "").split(",") if i.strip()]
_smtp = SMTPPool(_egress, os.getenv("SMTP_PROBE_FROM", "verify@yourdomain.com")) if _egress else None
_contacts = ContactEngine(_smtp)
_policy = PolicyGate()
_ledger = Ledger()
_dsar = DSARHandler()

def _tenant() -> str:
    return getattr(g, "tenant_id", "default")

def _run(coro):
    """Run a coroutine from a sync Flask view."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        return loop.run_until_complete(coro)
    return asyncio.run(coro)

@app.before_request
def _ensure_schema():
    pass

# ---------------- health ----------------

@app.get("/api/health")
def health():
    return jsonify(
        ok=True,
        db=db.session.execute(db.text("SELECT 1")).scalar() == 1,
        smtp_egress=len(_egress),
        smtp_ready=bool(_egress),
        sources=_policy.status(),
        version="2.0.0",
    )

# ---------------- jobs ----------------

@app.get("/api/jobs")
@require("job:read")
def list_jobs():
    q = Job.query.filter_by(tenant_id=_tenant()).order_by(Job.created_at.desc())
    return jsonify(jobs=[j.to_dict() for j in q.all()])

@app.post("/api/jobs")
@require("job:write")
def create_job():
    d = request.get_json(silent=True) or {}
    j = Job(tenant_id=_tenant(), title=d.get("title", "Untitled"),
            dept=d.get("dept"), location=d.get("location"),
            jd_text=d.get("jd_text", ""), status="Draft")
    if j.jd_text:
        try:
            j.req_graph = json.dumps(parse_jd(j.jd_text).to_dict())
        except Exception:
            pass
    db.session.add(j); db.session.commit()
    return jsonify(job=j.to_dict()), 201

@app.get("/api/jobs/<jid>")
@require("job:read")
def get_job(jid):
    j = Job.query.filter_by(id=jid, tenant_id=_tenant()).first_or_404()
    d = j.to_dict()
    d["reqGraph"] = json.loads(j.req_graph or "{}")
    return jsonify(job=d)

# ---------------- analyze ----------------

@app.post("/api/sourcing/analyze")
@require("job:write")
def sourcing_analyze():
    d = request.get_json(silent=True) or {}
    text = (d.get("jd_text") or "").strip()
    if not text:
        return jsonify(error="jd_text is required"), 400
    try:
        plan = analyze_job(text)
        plan["reqGraph"] = parse_jd(text).to_dict()
        return jsonify(plan)
    except Exception as e:
        app.logger.exception("analyze failed")
        # A degraded plan beats a failed request; the UI keeps working.
        return jsonify(
            error=f"{type(e).__name__}: {e}",
            queries=[f'"{text.splitlines()[0][:60]}"'],
            must=[], nice=[], locations=[], seniority="mid",
            reqGraph={"graph_id": "req_fallback", "must": [], "nice": []},
            degraded=True,
        ), 200

# ---------------- runs ----------------

@app.post("/api/sourcing/run")
@require("job:write")
def sourcing_run():
    d = request.get_json(silent=True) or {}
    job = Job.query.filter_by(id=d.get("job_id"), tenant_id=_tenant()).first_or_404()
    run = SourcingRun(tenant_id=_tenant(), job_id=job.id, status="running")
    db.session.add(run); db.session.commit()
    try:
        stats = run_sourcing(run, job, tenant_id=_tenant(),
                             max_pages=int(d.get("max_pages", 40)),
                             max_results=int(d.get("max_results", 25)))
        run.status = "completed"; run.stats = json.dumps(stats)
        run.warnings = json.dumps(stats.get("warnings", []))
        job.status = "Sourcing"
    except Exception as e:
        run.status = "failed"
        run.stats = json.dumps({"error": f"{type(e).__name__}: {e}"})
    run.finished_at = datetime.utcnow()
    db.session.commit()
    return jsonify(run=run.to_dict())

@app.get("/api/sourcing/runs/<rid>")
@require("job:read")
def get_run(rid):
    r = SourcingRun.query.filter_by(id=rid, tenant_id=_tenant()).first_or_404()
    return jsonify(run=r.to_dict())

@app.get("/api/sourcing/runs/<rid>/candidates")
@require("job:read")
def run_candidates(rid):
    rows = (SourcedCandidate.query
            .filter_by(run_id=rid, tenant_id=_tenant(), tombstoned=False)
            .order_by(SourcedCandidate.score.desc()).all())
    return jsonify(candidates=[c.to_dict() for c in rows])

# ---------------- contacts ----------------

@app.post("/api/extract")
@require("contact:write")
def extract_route():
    """Legacy endpoint — kept so the existing UI keeps working."""
    text, html, filename = "", "", None
    if request.files.get("file"):
        f = request.files["file"]
        filename = f.filename
        text = _read_file(f)
    else:
        body = request.get_json(silent=True) or {}
        text = body.get("text", "")
        html = body.get("html", "")
    region = (request.form.get("region")
              or (request.get_json(silent=True) or {}).get("region")
              or "US")
    res = extract_contacts(text, html, region=region)
    res["filename"] = filename
    _persist_contacts(res, tenant=_tenant())
    return jsonify(res)

@app.post("/api/contacts/deep")
@require("contact:write")
def contacts_deep():
    """High-precision + SMTP-verified + pattern inference."""
    d = request.get_json(silent=True) or {}
    people = [(p.get("first", ""), p.get("last", ""), p.get("domain", ""))
              for p in d.get("infer_for", [])]
    res = _run(_contacts.extract(
        text=d.get("text", ""), html=d.get("html", ""),
        region=d.get("region", "US"), infer_for=people,
        verify_smtp=bool(_smtp) and d.get("verify", True)))
    _persist_contacts(res.to_dict(), tenant=_tenant())
    return jsonify(res.to_dict())

@app.get("/api/contacts")
@require("contact:read")
def list_contacts():
    q = Contact.query.filter_by(tenant_id=_tenant(), suppressed=False)
    if request.args.get("type"):
        q = q.filter_by(type=request.args["type"])
    q = q.order_by(Contact.confidence.desc()).limit(500)
    return jsonify(contacts=[c.to_dict() for c in q.all()])

@app.post("/api/suppress")
@require("contact:write")
def suppress():
    d = request.get_json(silent=True) or {}
    v = (d.get("value") or "").strip().lower()
    if not v:
        return jsonify(error="value required"), 400
    db.session.add(Suppression(tenant_id=_tenant(), value=v, reason=d.get("reason", "manual")))
    for c in Contact.query.filter_by(tenant_id=_tenant(), value=v).all():
        c.suppressed = True
    db.session.commit()
    return jsonify(ok=True, suppressed=v)

@app.post("/api/anonymize")
@require("contact:write")
def anonymize():
    d = request.get_json(silent=True) or {}
    mode = d.get("mode", "mask")
    out = []
    for c in Contact.query.filter_by(tenant_id=_tenant()).limit(500).all():
        v = c.value
        if c.type == "email" and mode == "mask":
            local, _, dom = v.partition("@")
            v = (local[0] + "*" * max(len(local) - 1, 1)) + "@" + dom
        elif c.type == "phone" and mode == "mask":
            v = v[:4] + "*" * max(len(v) - 6, 0) + v[-2:]
        out.append({"type": c.type, "value": v})
    return jsonify(anonymized=out, mode=mode)

@app.get("/api/export")
@require("contact:read")
def export():
    fmt = request.args.get("format", "csv")
    rows = Contact.query.filter_by(tenant_id=_tenant(), suppressed=False).all()
    if fmt == "json":
        return jsonify(contacts=[c.to_dict() for c in rows])
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["type", "value", "confidence", "tier", "line_type", "area", "source"])
    for c in rows:
        w.writerow([c.type, c.value, c.confidence, c.tier, c.line_type, c.area, c.source_kind])
    return send_file(io.BytesIO(buf.getvalue().encode()), mimetype="text/csv",
                     as_attachment=True, download_name="hirewave-contacts.csv")

# ---------------- policy + compliance ----------------

@app.get("/api/policy/receipts")
@require("audit:read")
def receipts():
    rows = (PolicyReceipt.query.filter_by(tenant_id=_tenant())
            .order_by(PolicyReceipt.created_at.desc()).limit(1000).all())
    return jsonify(receipts=[{"domain": r.domain, "verdict": r.verdict,
                              "basis": r.legal_basis, "reason": r.reason,
                              "at": r.created_at.isoformat()} for r in rows])

@app.post("/api/dsar/find")
@require("dsar:write")
def dsar_find():
    d = request.get_json(silent=True) or {}
    return jsonify(_dsar.find(tenant=_tenant(), email=d.get("email"),
                              name=d.get("name"), profile_url=d.get("profile_url")))

@app.post("/api/dsar/erase")
@require("dsar:write")
def dsar_erase():
    d = request.get_json(silent=True) or {}
    return jsonify(_dsar.erase(tenant=_tenant(), candidate_id=d.get("candidate_id")))

@app.get("/api/audit/bias")
@require("audit:read")
def audit_bias():
    return jsonify(run_audit(tenant=_tenant()))

@app.get("/api/audit/events")
@require("audit:read")
def audit_events():
    rows = (AuditEvent.query.filter_by(tenant=_tenant())
            .order_by(AuditEvent.created_at.desc()).limit(200).all())
    return jsonify(events=[e.to_dict() for e in rows])

# ---------------- helpers ----------------

def _read_file(f):
    name = (f.filename or "").lower()
    if name.endswith(".pdf"):
        import pdfplumber
        with pdfplumber.open(f.stream) as pdf:
            return "\n".join((p.extract_text() or "") for p in pdf.pages)
    if name.endswith((".png", ".jpg", ".jpeg")):
        import pytesseract
        from PIL import Image
        return pytesseract.image_to_string(Image.open(f.stream))
    return f.read().decode("utf-8", errors="replace")

def _persist_contacts(res, tenant):
    for e in res.get("emails", []):
        v = (e.get("value") or "").lower()
        if not v:
            continue
        row = Contact.query.filter_by(tenant_id=tenant, type="email", value=v).first()
        if row:
            row.confidence = max(row.confidence or 0, e.get("confidence", 0.5))
        else:
            db.session.add(Contact(tenant_id=tenant, type="email", value=v,
                                   confidence=e.get("confidence", 0.5),
                                   tier=e.get("tier"), source_kind="extract"))
    for p in res.get("phones", []):
        v = p.get("e164") or p.get("value")
        if not v:
            continue
        row = Contact.query.filter_by(tenant_id=tenant, type="phone", value=v).first()
        if row:
            row.confidence = max(row.confidence or 0, p.get("confidence", 0.5))
        else:
            db.session.add(Contact(tenant_id=tenant, type="phone", value=v,
                                   confidence=p.get("confidence", 0.5),
                                   tier=p.get("tier"), line_type=p.get("line_type"),
                                   area=p.get("area"), source_kind="extract"))
    db.session.commit()

# ---------------- bootstrap ----------------

def init_db():
    with app.app_context():
        db.create_all()
        if not Tenant.query.get("default"):
            db.session.add(Tenant(id="default", name="Default"))
            db.session.commit()

if __name__ == "__main__":
    init_db()
    app.run(port=8080, debug=True)
