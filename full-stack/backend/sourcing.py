"""Evidence-first public web sourcing helpers. Search credentials remain server-side."""
import ipaddress
import json
import os
import re
import socket
import time
import urllib.robotparser
from datetime import datetime, timezone
from urllib.parse import urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

SKILLS = ["python","sql","java","javascript","typescript","react","aws","azure",
          "gcp","spark","airflow","dbt","kafka","salesforce","sap","plc","scada",
          "siemens","c++","c#","go","rust","machine learning","kubernetes",
          "docker","terraform"]
BLOCKED_DOMAINS = ()
UA = "HireWaveResearchBot/1.0 (+public professional research; obeys robots.txt)"


def analyze_job(description, instructions=""):
    if not isinstance(description, str) or len(description.strip()) < 30:
        raise ValueError("Enter a job description with at least 30 characters.")
    text = description.strip()
    lines = [re.sub(r"^[\s#*•-]+", "", x).strip() for x in text.splitlines() if x.strip()]
    title = (lines[0] if lines and len(lines[0]) < 100 else "")
    title = re.sub(r"\s+(?:\||—|–|at\s).*$", "", title, flags=re.I)
    skill_matches = sorted({s.strip() for s in SKILLS if re.search(re.escape(s.strip()), text, re.I)})
    loc = re.search(r"\b(?:in|near|location[: ]+)\s+([A-Z][A-Za-z .'-]+(?:,\s*[A-Z]{2})?)", text)
    years = re.search(r"(\d+)\s*\+?\s+years?", text, re.I)
    mode = "remote" if re.search(r"\bremote\b", text, re.I) else "hybrid" if re.search(r"\bhybrid\b", text, re.I) else "onsite" if re.search(r"\b(on.?site|in.?office)\b", text, re.I) else "unspecified"
    preferred = re.findall(r"(?:preferred|nice to have|bonus)[:\s-]+([^\n.;]+)", text, re.I)
    return {"title": title or "Role from job description", "alternative_titles": [], "required_skills": skill_matches,
            "preferred_skills": sorted({x.strip() for x in re.split(r"[,/]|\band\b", " ".join(preferred)) if x.strip()}),
            "minimum_experience_years": int(years.group(1)) if years else None, "industry_experience": [],
            "certifications": [], "location": loc.group(1).strip() if loc else "", "nearby_locations": [],
            "work_arrangement": mode, "mandatory_qualifications": [], "preferred_qualifications": preferred,
            "exclusions": [], "target_count": 20, "instructions": instructions[:2000], "job_description": text}


def queries(job):
    title, loc = job.get("title", ""), job.get("location", "")
    skills = job.get("required_skills", [])[:3]
    variants = [title]
    if len(skills) > 0: variants.append(" ".join(skills[:2]) + " engineer")
    if len(skills) > 2: variants.append(title + " " + " ".join(skills[2:]))
    suffix = f' "{loc}"' if loc else ""
    return list(dict.fromkeys((q + suffix).strip() for q in variants if q.strip()))[:int(os.getenv("HIREWAVE_MAX_QUERIES", "5"))]


def search_web(query):
    key = os.getenv("BRAVE_SEARCH_API_KEY")
    if not key: raise RuntimeError("Live search is not configured. Set BRAVE_SEARCH_API_KEY on the backend.")
    last = None
    for attempt in range(2):
        try:
            response = requests.get("https://api.search.brave.com/res/v1/web/search", params={"q": query, "count": min(20, int(os.getenv("HIREWAVE_RESULTS_PER_QUERY", "10"))), "country": "US", "search_lang": "en"}, headers={"X-Subscription-Token": key, "Accept": "application/json"}, timeout=20)
            if response.status_code == 429 or response.status_code >= 500:
                response.raise_for_status()
            response.raise_for_status()
            return response.json().get("web", {}).get("results", [])
        except requests.RequestException as exc:
            last = exc
            status = exc.response.status_code if exc.response is not None else None
            retryable = status is None or status == 429 or status >= 500
            if attempt or not retryable: raise
            time.sleep(0.5)
    raise last


def normalize_url(url):
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname: return None
    return urlunparse((p.scheme, p.netloc.lower(), p.path.rstrip("/"), "", "", ""))


def _safe_public_url(url):
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname or any(p.hostname == d or p.hostname.endswith("." + d) for d in BLOCKED_DOMAINS): return False
    try:
        for result in socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == "https" else 80), type=socket.SOCK_STREAM):
            ip = ipaddress.ip_address(result[4][0])
            if not ip.is_global: return False
    except Exception: return False
    return True


def retrieve(url):
    """Retrieve only public, robots-allowed pages, with small response/time limits."""
    if not _safe_public_url(url): return {"status": "not_retrieved", "limitation": "URL is restricted or not a public web address."}
    p = urlparse(url)
    robots_url = f"{p.scheme}://{p.netloc}/robots.txt"
    try:
        robots = requests.get(robots_url, headers={"User-Agent": UA}, timeout=5, allow_redirects=False)
        if 300 <= robots.status_code < 400:
            return {"status": "not_retrieved", "limitation": "robots.txt redirects; retrieval declined."}
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(robots.text.splitlines() if robots.status_code == 200 else [])
        if not rp.can_fetch(UA, url): return {"status": "not_retrieved", "limitation": "robots.txt disallows retrieval."}
        r = requests.get(url, headers={"User-Agent": UA}, timeout=12, allow_redirects=False, stream=True)
        if 300 <= r.status_code < 400: return {"status": "not_retrieved", "limitation": "Page redirects; destination was not followed."}
        if "text/html" not in r.headers.get("Content-Type", "").lower(): return {"status": "not_retrieved", "limitation": "Page is not HTML."}
        body = r.raw.read(1_000_000, decode_content=True)
        soup = BeautifulSoup(body, "html.parser")
        structured = []
        for node in soup.select('script[type="application/ld+json"]')[:8]:
            try: structured.append(json.loads(node.string or node.get_text()))
            except Exception: pass
        for node in soup(["script", "style", "noscript", "svg"]): node.decompose()
        content = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))[:16000]
        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        person = next((x for x in structured if isinstance(x, dict) and (x.get("@type") == "Person" or "Person" in x.get("@type", []))), {})
        return {"status": "retrieved", "title": title, "text": content, "structured": person, "retrieved_at": datetime.now(timezone.utc).isoformat()}
    except Exception as exc:
        return {"status": "not_retrieved", "limitation": f"Retrieval failed: {type(exc).__name__}"}


def extract_candidate(result, page, job):
    text = (page.get("text") or result.get("description") or "")
    structured = page.get("structured") or {}
    name = structured.get("name") or ""
    if not name:
        # Only use a likely human name from result title; avoid inventing one.
        candidate = re.split(r"\s*[|–—-]\s*", result.get("title", ""))[0].strip()
        role_words = {"engineer", "developer", "architect", "manager", "director", "scientist", "analyst", "consultant", "designer", "recruiter", "president", "chief", "senior", "junior", "staff", "principal", "lead", "software", "data", "sales", "product", "marketing"}
        if 2 <= len(candidate.split()) <= 4 and all(w[:1].isupper() for w in candidate.split()) and not any(w.lower().strip(".,") in role_words for w in candidate.split()): name = candidate
    req = job.get("required_skills", [])
    found = [s for s in req if re.search(re.escape(s), text, re.I)]
    missing = [s for s in req if s not in found]
    preferred = job.get("preferred_skills", [])
    preferred_found = [s for s in preferred if re.search(re.escape(s), text, re.I)]
    minimum = job.get("minimum_experience_years")
    exp = re.search(r"\b(\d+)\+?\s+years?", text, re.I)
    exp_score = min(25, round(25 * int(exp.group(1)) / max(1, minimum))) if exp and minimum else (25 if exp else 0)
    title_terms = [w.lower() for w in re.findall(r"[a-z0-9+#]+", job.get("title", "")) if len(w) > 2]
    title_hits = sum(1 for w in title_terms if w in result.get("title", "").lower())
    title_score = round(10 * title_hits / max(1, len(title_terms)))
    domain_terms = job.get("industry_experience", [])
    domain_score = round(20 * sum(1 for term in domain_terms if term.lower() in text.lower()) / max(1, len(domain_terms))) if domain_terms else 0
    loc = job.get("location", "")
    location_score = 10 if loc and loc.lower() in text.lower() else (10 if job.get("work_arrangement") == "remote" and "remote" in text.lower() else 0)
    score = round((30 * len(found) / max(1, len(req))) + exp_score + domain_score + title_score + location_score + (5 * len(preferred_found) / max(1, len(preferred))))
    return {"name": name or "Unknown", "title": result.get("title", "Unknown"), "location": job.get("location") or "Unknown",
            "skills": found, "matched_requirements": found + preferred_found, "missing_requirements": missing, "score": score,
            "score_breakdown": {"technical_skills": round(30 * len(found) / max(1, len(req))), "relevant_experience": exp_score, "domain_relevance": domain_score, "job_title_relevance": title_score, "location_and_arrangement": location_score, "preferred_qualifications": round(5 * len(preferred_found) / max(1, len(preferred)))},
            "ranking_explanation": "Evidence-only weighted score: unknown or unsupported criteria receive no points; review the source before using this ranking.",
            "evidence_confidence": "medium" if page.get("status") == "retrieved" and name else "low",
            "source_url": result.get("url"), "snippet": result.get("description", ""),
            "evidence": (text[:1200] if page.get("status") == "retrieved" else result.get("description", "")),
            "retrieval_status": page.get("status", "not_retrieved"), "limitation": page.get("limitation", ""),
            "retrieved_at": page.get("retrieved_at") or datetime.now(timezone.utc).isoformat(), "contact": "Contact information not found.",
            "information_status": "source supported" if page.get("status") == "retrieved" else "search result only"}


# ===== v2 additions (from the integration spec) =====

# 3) use the ladder instead of raw requests
from engine.ladder import fetch as ladder_fetch
from engine.resolve import dedupe as dedupe_candidates  # dedupe hook

def retrieve(url: str) -> dict:
    return ladder_fetch(url)


# --- glue: adapt the existing helpers to the signatures run_sourcing() calls ---
_analyze_job_v1 = analyze_job
_search_web_v1 = search_web
_extract_candidate_v1 = extract_candidate

def analyze_job(description, instructions=""):
    plan = _analyze_job_v1(description, instructions)
    plan["queries"] = queries(plan)
    return plan

def search_web(query, count=10):
    return _search_web_v1(query)[:count]

def extract_candidate(html, url, job):
    soup = BeautifulSoup(html or "", "html.parser")
    for node in soup(["script", "style", "noscript", "svg"]): node.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))[:16000]
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    page = {"status": "retrieved", "title": title, "text": text,
            "retrieved_at": datetime.now(timezone.utc).isoformat()}
    return _extract_candidate_v1({"url": url, "title": title, "description": ""}, page, job)


# 4) new: full run with dedupe + policy receipts + ledger
def run_sourcing(run, job, tenant: str, max_pages: int = 40, max_results: int = 25) -> dict:
    from models import db, SourcedCandidate
    from engine.policy import PolicyGate
    from engine.ledger import Ledger
    from engine.resolve import dedupe

    gate, ledger = PolicyGate(), Ledger()
    plan = analyze_job(job.jd_text or "")
    warnings, seen_urls, raw = [], set(), []
    stats = {"queries": 0, "retrieved": 0, "candidates": 0, "duplicates_removed": 0}

    for q in plan["queries"][:8]:
        stats["queries"] += 1
        for hit in search_web(q, count=10):
            url = hit.get("url")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            d = gate.evaluate(url)
            gate.persist(d, tenant)
            if not d.allowed:
                warnings.append(f"policy denied {url}")
                continue
            r = retrieve(url)
            if r["status"] != "retrieved":
                warnings.append(f"{url}: {r.get('limitation')}")
                continue
            stats["retrieved"] += 1
            cand = extract_candidate(r["html"], r["url"], plan)
            if cand:
                raw.append(cand)
            if len(raw) >= max_pages:
                break
        if len(raw) >= max_pages:
            break

    before = len(raw)
    for c in dedupe(raw)[:max_results]:
        db.session.add(SourcedCandidate(
            tenant_id=tenant, run_id=run.id, job_id=job.id,
            cluster_id=c.get("cluster_id"), source_url=c.get("source_url"),
            source_domain=c.get("source_domain"), name=c.get("name"),
            title=c.get("title"), company=c.get("company"),
            location=c.get("location"), score=c.get("score", 0),
            candidate_json=json.dumps(c)))
    stats["duplicates_removed"] = before - min(before, max_results)
    stats["candidates"] = min(before, max_results)
    stats["warnings"] = warnings[:50]
    db.session.commit()
    ledger.event(tenant, "sourcing.run.completed", run.id, **stats)
    return stats
