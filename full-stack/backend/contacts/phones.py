"""phonenumbers does offline validation, line-type and carrier.
No API, no cost, no side effects — just published number-plan metadata."""
from __future__ import annotations
import phonenumbers
from phonenumbers import PhoneNumberType, carrier, geocoder

MOBILE = {PhoneNumberType.MOBILE, PhoneNumberType.FIXED_LINE_OR_MOBILE}

def normalise(raw: str, region: str = "US") -> dict | None:
    try:
        n = phonenumbers.parse(raw, region)
    except phonenumbers.NumberParseException:
        return None
    if not phonenumbers.is_possible_number(n) or not phonenumbers.is_valid_number(n):
        return None
    return {
        "e164": phonenumbers.format_number(n, phonenumbers.PhoneNumberFormat.E164),
        "national": phonenumbers.format_number(n, phonenumbers.PhoneNumberFormat.NATIONAL),
        "country": phonenumbers.region_code_for_number(n),
        "line_type": PhoneNumberType.to_string(phonenumbers.number_type(n)),
        "is_mobile": phonenumbers.number_type(n) in MOBILE,
        "carrier": carrier.name_for_number(n, "en") or None,
        "area": geocoder.description_for_number(n, "en") or None,
    }

def extract_phones(text: str, region: str = "US") -> list[dict]:
    seen, out = set(), []
    for m in phonenumbers.PhoneNumberMatcher(text or "", region):
        rec = normalise(m.raw_string, region)
        if rec and rec["e164"] not in seen:
            seen.add(rec["e164"])
            out.append(rec)
    return out
