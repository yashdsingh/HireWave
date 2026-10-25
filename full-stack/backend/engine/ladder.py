"""Tiered fetch: cheap HTTP first, browser only when needed."""
from __future__ import annotations
import requests
from urllib.parse import urljoin, urlparse

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9",
           "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}

BLOCK_MARKERS = ("authwall", "checkpoint/challenge", "px-captcha", "cf-chl-",
                 "Just a moment...", "Access Denied")

def looks_blocked(status: int, html: str) -> bool:
    if status in (403, 429, 999):
        return True
    if status == 200 and len(html) < 4000:
        return True
    return any(m in html[:20000] for m in BLOCK_MARKERS)

def fetch(url: str, render=None, max_hops: int = 4) -> dict:
    chain, current = [], url
    for _ in range(max_hops):
        try:
            r = requests.get(current, headers=HEADERS, timeout=12,
                             allow_redirects=False, stream=True)
        except requests.RequestException as e:
            return {"status": "not_retrieved", "limitation": f"{type(e).__name__}", "tier": 0}
        if 300 <= r.status_code < 400 and r.headers.get("Location"):
            nxt = urljoin(current, r.headers["Location"])
            if urlparse(nxt).scheme not in ("http", "https"):
                return {"status": "not_retrieved", "limitation": "bad redirect", "tier": 0}
            chain.append(current); current = nxt; continue
        if r.status_code >= 400:
            break
        ctype = r.headers.get("Content-Type", "")
        if "html" in ctype or "text" in ctype:
            body = r.text
            if not looks_blocked(r.status_code, body):
                return {"status": "retrieved", "html": body, "url": current,
                        "redirects": chain, "tier": 0, "bytes": len(r.content)}
        break

    if render:
        try:
            html = render(current)
            if html and not looks_blocked(200, html):
                return {"status": "retrieved", "html": html, "url": current,
                        "redirects": chain, "tier": 1}
        except Exception as e:
            return {"status": "not_retrieved", "limitation": f"render {type(e).__name__}", "tier": 1}
    return {"status": "not_retrieved", "limitation": "all tiers blocked", "tier": 2}
