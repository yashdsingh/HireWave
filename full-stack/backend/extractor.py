"""Extraction engine: JS rendering, OCR, phone normalisation, ML fake-contact filter.
Polite by design: robots.txt, delays, and it STOPS on blocks or CAPTCHAs (never evades them)."""
import io, re, time, urllib.robotparser
from functools import lru_cache
from urllib.parse import urljoin, urlparse

import dns.resolver, phonenumbers, requests
import spacy
from bs4 import BeautifulSoup
from pypdf import PdfReader
from sklearn.linear_model import LogisticRegression

UA = "ContactExtractorBot/2.0 (+mailto:you@example.com)"  # identify yourself honestly
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
LINKEDIN = re.compile(r"https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/[\w\-%]+", re.I)
GENERIC = re.compile(r"^(info|contact|hello|admin|support|sales|noreply|no-reply|office|mail|test)@", re.I)
BLOCKED = re.compile(r"captcha|are you a robot|unusual traffic|access denied", re.I)
PAGES = ("contact", "about", "team", "people", "leadership")
FAKE = {"example.com", "example.org", "test.com", "domain.com", "email.com", "yourcompany.com", "company.com", "sentry.io"}

_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def _features(email: str):
    local, _, dom = email.lower().partition("@")
    return [dom in FAKE or dom.endswith(".sentry.io"), bool(GENERIC.match(email)),
            sum(c.isdigit() for c in local) / max(len(local), 1), len(local) / 20,
            bool(re.fullmatch(r"[a-z]+[._-][a-z]+", local)), dom.endswith((".png", ".jpg", ".gif", ".js", ".css"))]

# Tiny seed set so the filter works out of the box. Retrain on your own labelled emails (1 = real person, 0 = fake/low value).
SEED = [("jane.doe@acme.io", 1), ("m.lee@northwind.com", 1), ("priya.nair@globex.co.uk", 1), ("carlos@initech.com", 1),
        ("sam.wilson@umbrella.org", 1), ("a.kim@stark.io", 1), ("info@example.com", 0), ("test@test.com", 0),
        ("name@domain.com", 0), ("user@email.com", 0), ("noreply@acme.io", 0), ("your@email.com", 0),
        ("john123456@example.org", 0), ("logo@2x.png", 0), ("admin@yourcompany.com", 0), ("x@abc.ingest.sentry.io", 0)]
clf = LogisticRegression().fit([_features(e) for e, _ in SEED], [y for _, y in SEED])


@lru_cache(512)
def has_mx(domain: str) -> bool:
    try:
        dns.resolver.resolve(domain, "MX", lifetime=3)
        return True
    except Exception:
        return False


def email_score(email: str) -> float:
    p = float(clf.predict_proba([_features(email)])[0][1])
    return round(p * (1 if has_mx(email.split("@")[1]) else 0.4), 2)


def extract(text: str, region: str = "US") -> list[dict]:
    out = {}
    for e in EMAIL.findall(text):
        e = e.lower().rstrip(".")
        s = email_score(e)
        if s >= 0.3:
            out[("email", e)] = s
    for u in LINKEDIN.findall(text):
        out[("linkedin", "https://www.linkedin.com" + urlparse(u).path.rstrip("/").lower())] = 0.95
    for m in phonenumbers.PhoneNumberMatcher(text, region):  # handles "(123) 456-7890" vs "123-456-7890"
        if phonenumbers.is_valid_number(m.number):
            out[("phone", phonenumbers.format_number(m.number, phonenumbers.PhoneNumberFormat.E164))] = 0.9
    return [{"type": t, "value": v, "confidence": c} for (t, v), c in out.items()]


def people_orgs(text: str) -> dict:
    doc = _get_nlp()(text[:100_000])
    return {"people": sorted({e.text for e in doc.ents if e.label_ == "PERSON"})[:20],
            "orgs": sorted({e.text for e in doc.ents if e.label_ == "ORG"})[:20]}


def pdf_text(data: bytes) -> str:
    text = " ".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
    if len(text.strip()) < 50:  # scanned document: fall back to OCR
        import pytesseract
        from pdf2image import convert_from_bytes
        text = " ".join(pytesseract.image_to_string(im) for im in convert_from_bytes(data, dpi=200)[:20])
    return text


def _render(url: str) -> str:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    o = Options()
    for a in ("--headless=new", "--no-sandbox", f"--user-agent={UA}"):
        o.add_argument(a)
    d = webdriver.Chrome(options=o)
    try:
        d.set_page_load_timeout(20)
        d.get(url)
        time.sleep(1.5)  # let client-side JS render
        return d.page_source
    finally:
        d.quit()


def crawl(url: str, js: bool = True, max_pages: int = 6, delay: float = 2.0):
    u0 = urlparse(url)
    if u0.scheme not in ("http", "https") or re.match(r"(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)", u0.hostname or ""):
        raise ValueError("URL not allowed")
    robots = urllib.robotparser.RobotFileParser(f"{u0.scheme}://{u0.netloc}/robots.txt")
    try:
        robots.read()
    except Exception:
        pass
    queue, seen, chunks, warnings = [url], set(), [], []
    while queue and len(seen) < max_pages:
        u = queue.pop(0)
        if u in seen:
            continue
        seen.add(u)
        if not robots.can_fetch(UA, u):
            warnings.append(f"robots.txt disallows {u}")
            continue
        time.sleep(delay)
        html = _render(u) if js else requests.get(u, headers={"User-Agent": UA}, timeout=15).text
        if BLOCKED.search(html[:5000]):
            warnings.append(f"{u} blocked automated access or showed a CAPTCHA; stopped, not bypassed")
            break
        soup = BeautifulSoup(html, "html.parser")
        chunks.append(soup.get_text(" ") + " " + " ".join(a["href"] for a in soup.find_all("a", href=True)))
        for a in soup.find_all("a", href=True):
            link = urljoin(u, a["href"]).split("#")[0]
            if urlparse(link).netloc == u0.netloc and any(p in link.lower() for p in PAGES):
                queue.append(link)
    return " ".join(chunks), warnings


# ===== v2 glue: names imported by app.py =====
def extract_contacts(text: str, html: str = "", region: str = "US") -> dict:
    items = extract((text or "") + " " + (html or ""), region)
    return {"emails": [i for i in items if i["type"] == "email"],
            "phones": [{**i, "e164": i["value"]} for i in items if i["type"] == "phone"],
            "socials": [i["value"] for i in items if i["type"] == "linkedin"]}

from sourcing import extract_candidate  # noqa: E402,F401
