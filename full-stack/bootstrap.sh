#!/usr/bin/env bash
set -euo pipefail
[ -f .env ] || cp .env.example .env
docker compose up -d postgres redis
sleep 8
docker compose up -d api
sleep 6

# issue the first key — printed ONCE
docker compose exec api python -c "
from app import app, init_db
from auth import issue_key
init_db()
with app.app_context():
    raw, rec = issue_key('default', 'local', {'job:read','job:write','contact:read','contact:write','audit:read','dsar:write'})
    print('HW_KEY=' + raw)
"
