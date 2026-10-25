"""JD -> typed RequirementGraph."""
from __future__ import annotations
import hashlib, re
from dataclasses import dataclass, field, asdict

SKILL_LEXICON = [
    "python","java","javascript","typescript","go","golang","rust","c++","c#","ruby",
    "php","scala","kotlin","swift","sql","nosql","postgres","mysql","mongodb","redis",
    "kafka","rabbitmq","spark","airflow","dbt","snowflake","databricks","hadoop",
    "aws","azure","gcp","kubernetes","docker","terraform","ansible","jenkins",
    "react","vue","angular","node","django","flask","fastapi","spring","rails",
    "machine learning","pytorch","tensorflow","llm","nlp","computer vision",
    "salesforce","sap","workday","plc","scada","siemens","figma","graphql","rest",
]

SENIORITY = [
    ("intern", ["intern", "internship"]),
    ("junior", ["junior", "entry level", "graduate", "associate"]),
    ("mid", ["mid level", "mid-level"]),
    ("senior", ["senior", "sr.", "sr ", "lead engineer"]),
    ("staff", ["staff engineer", "staff software"]),
    ("principal", ["principal", "architect", "distinguished"]),
    ("exec", ["head of", "director", "vp ", "vice president", "chief", "cto"]),
]

MUST_CUES = ["must have", "required", "requirement", "essential", "you have",
             "we need", "minimum", "at least"]
NICE_CUES = ["nice to have", "bonus", "plus", "preferred", "desirable", "advantage"]

@dataclass
class Requirement:
    label: str
    kind: str
    weight: float
    evidence: str

@dataclass
class RequirementGraph:
    graph_id: str
    jd_sha256: str
    title: str
    seniority: str
    must: list[Requirement] = field(default_factory=list)
    nice: list[Requirement] = field(default_factory=list)
    locations: list[str] = field(default_factory=list)
    remote_policy: str = "unspecified"
    comp_floor: int | None = None
    unstated: list[str] = field(default_factory=list)

    def to_dict(self):
        return asdict(self)

def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.;\n])\s+", text) if s.strip()]

def parse_jd(text: str, title: str = "") -> RequirementGraph:
    low = text.lower()
    g = RequirementGraph(
        graph_id="req_" + hashlib.sha256(text.encode()).hexdigest()[:12],
        jd_sha256=hashlib.sha256(text.encode()).hexdigest(),
        title=title or (text.strip().splitlines() or [""])[0][:120],
        seniority="mid",
    )
    for label, cues in SENIORITY:
        if any(c in low for c in cues):
            g.seniority = label
            break

    for sent in _sentences(text):
        s = sent.lower()
        is_nice = any(c in s for c in NICE_CUES)
        is_must = any(c in s for c in MUST_CUES)
        for skill in SKILL_LEXICON:
            if re.search(rf"(?<![a-z0-9+#]){re.escape(skill)}(?![a-z0-9+#])", s):
                kind = "nice" if is_nice else ("must" if is_must else "must")
                bucket = g.nice if kind == "nice" else g.must
                if not any(r.label == skill for r in bucket):
                    bucket.append(Requirement(skill, kind, 1.0, sent[:160]))

    if "remote" in low:
        g.remote_policy = "remote"
    elif "hybrid" in low:
        g.remote_policy = "hybrid"
    elif "on-site" in low or "onsite" in low or "in office" in low:
        g.remote_policy = "onsite"

    for m in re.finditer(r"\$(\d{2,3})[k,]", low):
        g.comp_floor = max(g.comp_floor or 0, int(m.group(1)) * 1000)

    for city in ("new york","san francisco","london","berlin","austin","boston",
                 "seattle","toronto","bangalore","dublin","amsterdam","chicago"):
        if city in low:
            g.locations.append(city.title())

    if "0 to 1" in low or "0-1" in low or "greenfield" in low:
        g.unstated.append("greenfield / ambiguity tolerance")
    if "fast-paced" in low or "high ownership" in low:
        g.unstated.append("high autonomy expectation")
    if "on-call" in low:
        g.unstated.append("on-call rotation")

    if not g.must and g.nice:
        g.must, g.nice = g.nice, []
    return g
