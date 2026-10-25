"""API-key auth with scopes and per-key rate limiting."""
from __future__ import annotations
import hashlib, secrets, time
from functools import wraps
from flask import request, jsonify, g
from models import db, ApiKey

PREFIX = "hw_live_"

def issue_key(tenant_id: str, name: str, scopes: set[str], rpm: int = 600):
    raw = PREFIX + secrets.token_urlsafe(32)
    rec = ApiKey(tenant_id=tenant_id, name=name,
                 key_hash=hashlib.sha256(raw.encode()).hexdigest(),
                 display=raw[:14] + "..." + raw[-4:],
                 scopes=",".join(sorted(scopes)), rpm=rpm)
    db.session.add(rec); db.session.commit()
    return raw, rec

_buckets: dict[str, list] = {}

def _rate_ok(key_id: str, rpm: int) -> bool:
    now = time.monotonic()
    window = _buckets.setdefault(key_id, [])
    window[:] = [t for t in window if now - t < 60]
    if len(window) >= rpm:
        return False
    window.append(now)
    return True

def require(*scopes: str):
    def deco(fn):
        @wraps(fn)
        def inner(*a, **kw):
            raw = (request.headers.get("X-API-Key")
                   or request.headers.get("Authorization", "").removeprefix("Bearer ").strip())
            if not raw:
                return jsonify(error="missing API key"), 401
            rec = ApiKey.query.filter_by(
                key_hash=hashlib.sha256(raw.encode()).hexdigest(), active=True).first()
            if not rec:
                return jsonify(error="unknown API key"), 401
            if not _rate_ok(rec.id, rec.rpm):
                return jsonify(error="rate limited"), 429, {"Retry-After": "60"}
            missing = set(scopes) - rec.scope_set
            if missing:
                return jsonify(error=f"missing scopes: {sorted(missing)}"), 403
            g.tenant_id = rec.tenant_id
            g.key = rec
            return fn(*a, **kw)
        return inner
    return deco
