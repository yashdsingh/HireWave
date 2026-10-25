# HireWave

HireWave is a React/Vite recruiting workspace with an existing Flask contact extractor. This bundle also includes a real public web search workflow in Job Intake and Ranked Slate.

## Local development

Backend (Python 3.9+):

```sh
cd backend
python -m venv .venv
# Activate the venv, then:
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Copy `backend/.env.example` to `.env`, set `AUTH_DISABLED=1` for local development only, and configure `BRAVE_SEARCH_API_KEY` for actual searches. Set `DATABASE_URL=sqlite:///hirewave.db` for local persistence. Run `flask --app app run`.

Frontend:

```sh
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to Flask on port 5000. The project currently has no frontend authentication flow; configure OIDC settings and add the corresponding client auth before deployment. Never deploy with `AUTH_DISABLED=1`.

## Sourcing architecture

The intake endpoint runs a deterministic first-pass job parser, which the recruiter can review and edit before starting a run. Flask calls the Brave Search API Web Search endpoint (`https://api.search.brave.com/res/v1/web/search`) from the server and sends the API key only in the `X-Subscription-Token` header. Search provider keys must stay in backend environment configuration. Brave's current official endpoint and key requirements are documented in its [API reference](https://api-dashboard.search.brave.com/api-reference/web/search/get) and [authentication guide](https://api-dashboard.search.brave.com/documentation/guides/authentication). Review current plan pricing, usage limits, terms, and data policies in the Brave dashboard before enabling use; cost depends on the active plan and call volume.

Search configuration defaults to at most 5 queries, 10 results per query, 8 page retrievals, and 90 seconds per run. Configure `HIREWAVE_MAX_QUERIES`, `HIREWAVE_RESULTS_PER_QUERY`, `HIREWAVE_MAX_PAGES`, and `HIREWAVE_MAX_EXECUTION_SECONDS` server-side. Search results are URL-deduplicated and stored with their run, original source URL, retrieval status, and timestamp. The database uses the existing SQLAlchemy connection and creates sourcing tables alongside the contact tables. Transient search errors receive one retry; results from successful queries are kept if another query fails.

Retrieval is restricted to public HTTP(S) destinations, rejects non-public IPs and restricted recruiting platforms (LinkedIn and Monster), checks `robots.txt`, uses request timeouts, declines redirects, limits response bytes, and retains the original search result when page access fails. No authentication, paywall, CAPTCHA, or access control is bypassed. Retrieved page text is treated as evidence only; embedded page instructions are never passed to a model. Contact information is not guessed or enriched. Excel export uses `openpyxl` and preserves evidence and URLs.

The initial deterministic score uses the requested 30/25/20/10/10/5 weights where the parser and page evidence support them. Unsupported criteria receive no points; the recruiter should review missing mandatory qualifications separately. It is not an AI hiring recommendation or hiring decision. Unknown fields remain unknown, and search snippets are distinguished from page-retrieved evidence. Duplicate source URLs are removed, but the same person found at different URLs is not yet entity-deduplicated; each source record stays separate.

## Deployment and remaining work

Set `DATABASE_URL`, `BRAVE_SEARCH_API_KEY`, and the three search limits in the backend secret/environment configuration. Configure `OIDC_JWKS_URL`, `OIDC_ISSUER`, and `OIDC_AUDIENCE` for authentication. The existing auth middleware verifies tokens but the application bundle has no user/organization ownership model, so tenant isolation must be implemented before multi-organization production use. For Cloudflare deployment, this Flask app requires a Python-capable backend service; Cloudflare Pages alone does not execute Flask or provide search API access. Deploy the Vite frontend separately and route `/api` to the Flask service.

The app does not yet provide streaming progress, model-based job analysis or matching, recruiter feedback calibration, broad configurable retention/deletion controls, per-user rate limiting, per-organization isolation, pagination beyond the provider's first result page, cross-URL person deduplication, or JavaScript-rendered page support. Existing Candidates, Outreach, and Analytics still use demo data; the real workflow is Job Intake → Ranked Slate. The older illustrative AI source endpoint is disabled.

## Verification

Use the configured test account and a sample job description to verify parse, edit, search, source evidence, deduplication, persistence, and Excel export. The provider-backed run cannot succeed until `BRAVE_SEARCH_API_KEY` is configured and provider connectivity is available. Do not treat demo records elsewhere in the interface as live search results.
