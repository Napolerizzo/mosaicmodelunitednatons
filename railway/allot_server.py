"""
Mosaic MUN II — Allotment Engine v4.0
======================================
Allotment strategy (waterfall):
  1. Gemini 2.0 Flash Lite  — free tier, rate-limited to 1 call / 35s
  2. GLM-4-Flash (ZhipuAI)  — free fallback if Gemini quota hit
  3. Pure Hungarian           — deterministic fallback if both AI fail

Google auth uses manual RS256 JWT — no google-auth library needed.
"""

import os, math, copy, random, json, time, base64, hashlib, hmac
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

import httpx
import numpy as np
from scipy.optimize import linear_sum_assignment
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

try:
    from rapidfuzz import fuzz, process as rf_process
    FUZZY_OK = True
except ImportError:
    FUZZY_OK = False

try:
    import jellyfish
    PHONETIC_OK = True
except ImportError:
    PHONETIC_OK = False

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding as asym_padding
    CRYPTO_OK = True
except ImportError:
    CRYPTO_OK = False

# ── Env ───────────────────────────────────────────────────────────────────────
SUPABASE_URL   = os.environ["SUPABASE_URL"]
SERVICE_KEY    = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND_KEY     = os.environ.get("RESEND_API_KEY", "")
GEMINI_KEY     = os.environ.get("GEMINI_API_KEY", "")
GLM_KEY        = os.environ.get("GLM_API_KEY", "3d6a8caae0b94b9b89798a1b03250b43.Z2sillVcjvoTo3KT")
G_CLIENT_EMAIL = os.environ.get("GOOGLE_CLIENT_EMAIL", "")
G_PRIVATE_KEY  = os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")
G_SHEET_SGS    = os.environ.get("GOOGLE_SHEET_ID_SGS", "")
G_SHEET_EXT    = os.environ.get("GOOGLE_SHEET_ID_EXTERNAL", "")
G_DRIVE_FOLDER = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "mosaic-mun-allot-2026")
SITE           = "https://mosaicmodelunitednatons.vercel.app"

# ── Algorithm constants ───────────────────────────────────────────────────────
BASE_PREF_W    = 0.70
BASE_EXP_W     = 0.30
MAX_PREFS      = 3
FUZZY_THRESH   = 80
JARO_THRESH    = 0.75
INF_COST       = 1e9
MC_RUNS        = 50
CONTEST_THRESH = 0.15
PREF_SCORES    = {1: 1.0, 2: 0.6, 3: 0.3}
GEMINI_RATE_S  = 35   # seconds between Gemini calls (free tier: ~2 RPM)
_last_gemini_call = 0.0

# ── Committee agendas (full context for AI) ───────────────────────────────────
COMMITTEE_FULL = {
    "UNGA": {
        "name": "United Nations General Assembly",
        "agenda": "Addressing Global Refugee Crisis and Displacement",
        "description": "Delegates represent UN member states (193 countries). Each delegate is ONE country. Debate focuses on international cooperation on refugee resettlement, border policies, and humanitarian aid.",
        "valid": "Any of the 193 UN member states.",
        "invalid": "NGOs, individuals, companies, fictional states, non-UN entities.",
    },
    "UNCSW": {
        "name": "UN Commission on the Status of Women",
        "agenda": "Bridging the Digital Gender Divide",
        "description": "Delegates represent UN member states. Debate focuses on closing the gender gap in technology access, digital literacy, and STEM careers.",
        "valid": "Any of the 193 UN member states.",
        "invalid": "Individuals, organizations, companies.",
    },
    "UNHRC": {
        "name": "UN Human Rights Council",
        "agenda": "Protecting Human Rights Defenders in Armed Conflict Zones",
        "description": "Delegates represent UN member states. Debate focuses on legal protections, international mechanisms, and accountability for violence against human rights defenders.",
        "valid": "Any of the 193 UN member states.",
        "invalid": "Individuals, NGOs, companies.",
    },
    "AIPPM": {
        "name": "All India Political Parties Meet",
        "agenda": "India's Military Response to Cross-Border Terrorism",
        "description": "Delegates represent real, named, currently active Indian politicians. Debate covers military doctrine, surgical strikes, international law, and diplomatic consequences.",
        "valid": "Real active Indian politicians: MPs, MLAs, Chief Ministers, Union Ministers, party presidents.",
        "invalid": "Fictional politicians, foreign politicians, companies, states/regions as entities.",
    },
    "IPL": {
        "name": "Indian Premier League Committee",
        "agenda": "IPL Expansion, Broadcasting Rights and Player Salary Cap Reform",
        "description": "Delegates represent IPL franchises (existing, legacy, or expansion). Debate covers franchise economics, broadcasting revenue distribution, and player contracts.",
        "valid": "Mumbai Indians, Chennai Super Kings, Royal Challengers Bengaluru, KKR, SRH, Rajasthan Royals, Delhi Capitals, Punjab Kings, Gujarat Titans, Lucknow Super Giants, Deccan Chargers, Kochi Tuskers, Pune Warriors, Rising Pune Supergiant, Kashmir Kings, Goa Mariners, Ahmedabad Falcons, Vizag Sharks, Indore Leopards, Nagpur Strikers.",
        "invalid": "Players, sponsors, individuals, non-franchise entities.",
    },
    "IP": {
        "name": "International Press Corps",
        "agenda": "Covering all committees — reporting, photography, and editorial",
        "description": "Press corps delegates cover other committees as journalists. There are exactly THREE tracks.",
        "valid": "ONLY: Photojournalism, Written Journalism, Editorial Caricature — nothing else.",
        "invalid": "Everything else. Any other input must be rejected.",
    },
    "USSIC": {
        "name": "US Senate Intelligence Committee",
        "agenda": "Foreign Interference in US Critical Infrastructure",
        "description": "Delegates represent real US senators, senior intelligence officials, or executive branch officials. Debate covers cybersecurity threats, classified intelligence, and legislative responses.",
        "valid": "Sitting US Senators, CIA/FBI/NSA/DNI/DIA/CISA Directors, President, VP, Secretary of State, Secretary of Defense, Attorney General, Chairman Joint Chiefs, Commander US Cyber Command, Commander Indo-Pacific Command, CEO Google, CEO Microsoft, Whistleblower Asset Alpha, Foreign Intelligence Liaison Director.",
        "invalid": "Foreign nationals, fictional characters, private citizens.",
    },
}

# ── Alias maps ────────────────────────────────────────────────────────────────
COUNTRY_ALIASES = {
    "us":"United States","usa":"United States","america":"United States",
    "uk":"United Kingdom","great britain":"United Kingdom","britain":"United Kingdom",
    "russia":"Russia","russian federation":"Russia","rf":"Russia","ussr":"Russia",
    "china":"China","prc":"China","india":"India","bharat":"India",
    "germany":"Germany","deutschland":"Germany","france":"France",
    "brazil":"Brazil","brasil":"Brazil","japan":"Japan","nippon":"Japan",
    "canada":"Canada","australia":"Australia","mexico":"Mexico",
    "norway":"Norway","netherlands":"Netherlands","holland":"Netherlands",
    "pakistan":"Pakistan","nigeria":"Nigeria",
    "south africa":"South Africa","rsa":"South Africa",
    "south korea":"South Korea","rok":"South Korea",
    "north korea":"North Korea","dprk":"North Korea",
    "iran":"Iran","persia":"Iran","saudi arabia":"Saudi Arabia","ksa":"Saudi Arabia",
    "uae":"UAE","united arab emirates":"UAE","emirates":"UAE",
    "turkey":"Türkiye","turkiye":"Türkiye","israel":"Israel",
    "egypt":"Egypt","kenya":"Kenya","ghana":"Ghana",
    "indonesia":"Indonesia","malaysia":"Malaysia","singapore":"Singapore",
    "new zealand":"New Zealand","aotearoa":"New Zealand",
    "sweden":"Sweden","denmark":"Denmark","finland":"Finland",
    "switzerland":"Switzerland","austria":"Austria","spain":"Spain","espana":"Spain",
    "italy":"Italy","italia":"Italy","portugal":"Portugal",
    "poland":"Poland","ukraine":"Ukraine",
    "czech republic":"Czech Republic","czechia":"Czech Republic",
    "hungary":"Hungary","romania":"Romania","bulgaria":"Bulgaria","greece":"Greece",
    "belgium":"Belgium","ethiopia":"Ethiopia","argentina":"Argentina","colombia":"Colombia",
}
COMMITTEE_ALIASES = {
    "unga":"UNGA","general assembly":"UNGA","ga":"UNGA",
    "unhrc":"UNHRC","human rights council":"UNHRC","hrc":"UNHRC",
    "uncsw":"UNCSW","csw":"UNCSW","commission on the status of women":"UNCSW",
    "aippm":"AIPPM","all india political parties meet":"AIPPM",
    "ipl":"IPL","indian premier league":"IPL",
    "ip":"IP","international press":"IP","press corps":"IP","press":"IP",
    "ussic":"USSIC","us senate intelligence committee":"USSIC","senate intel":"USSIC",
}

# ── Dataclasses ───────────────────────────────────────────────────────────────
@dataclass
class Portfolio:
    id: str
    committee: str
    portfolio: str
    archive_code: str
    min_experience: int = 0
    prestige_tier: int = 1
    seats: int = 1
    status: str = "vacant"

    @property
    def key(self): return f"{self.committee}|{self.portfolio}"

@dataclass
class Preference:
    committee: str
    portfolio: str
    rank: int
    is_freeform: bool = False

@dataclass
class Delegate:
    id: str
    registration_id: str
    full_name: str
    email: str
    phone: str
    institution: str
    class_year: str
    mun_count: int
    type: str
    committee_pref_1: Optional[str]
    committee_pref_2: Optional[str]
    committee_pref_3: Optional[str]
    portfolio_pref_1: Optional[str]
    portfolio_pref_2: Optional[str]
    portfolio_pref_3: Optional[str]
    preferences: list = field(default_factory=list)
    registration_order: int = 0
    is_duplicate: bool = False

@dataclass
class AllocationResult:
    delegate: Delegate
    portfolio: Optional[Portfolio]
    preference_rank: Optional[int]
    score: float
    confidence: float
    is_stable: bool
    stability_rate: float
    reason: str

# ── Name normalization ────────────────────────────────────────────────────────
def normalize_name(raw: str, alias_map: dict, known: list) -> tuple:
    if not raw or not raw.strip():
        return "", "empty", 0.0
    cleaned = raw.strip().lower()
    if cleaned in alias_map:
        canonical = alias_map[cleaned]
        return canonical, "alias", (1.0 if canonical in known else 0.9)
    if FUZZY_OK and known:
        result = rf_process.extractOne(cleaned, [n.lower() for n in known], scorer=fuzz.token_sort_ratio)
        if result and result[1] >= FUZZY_THRESH:
            canonical = known[[n.lower() for n in known].index(result[0])]
            return canonical, f"fuzzy({result[1]}%)", result[1] / 100
    if PHONETIC_OK and known:
        best_s, best_m = 0.0, ""
        for k in known:
            s = jellyfish.jaro_winkler_similarity(cleaned, k.lower())
            if s > best_s: best_s, best_m = s, k
        if best_s >= JARO_THRESH:
            return best_m, f"phonetic({best_s:.2f})", best_s
    return raw.strip(), "unresolved", 0.0

# ── Google Auth (manual RS256 JWT — no google-auth lib needed) ────────────────
def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def get_google_token(scope: str) -> Optional[str]:
    if not G_CLIENT_EMAIL or not G_PRIVATE_KEY or not CRYPTO_OK:
        print(f"Google auth skipped: email={bool(G_CLIENT_EMAIL)}, key={bool(G_PRIVATE_KEY)}, crypto={CRYPTO_OK}")
        return None
    try:
        now = int(time.time())
        header = _b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
        claim  = _b64url(json.dumps({
            "iss": G_CLIENT_EMAIL, "scope": scope,
            "aud": "https://oauth2.googleapis.com/token",
            "exp": now + 3600, "iat": now,
        }).encode())
        unsigned = f"{header}.{claim}"

        private_key = serialization.load_pem_private_key(G_PRIVATE_KEY.encode(), password=None)
        sig = private_key.sign(unsigned.encode(), asym_padding.PKCS1v15(), hashes.SHA256())
        jwt = f"{unsigned}.{_b64url(sig)}"

        r = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt},
            timeout=30,
        )
        tok = r.json().get("access_token")
        if not tok:
            print(f"Google token error: {r.text[:200]}")
        return tok
    except Exception as e:
        print(f"Google auth error: {e}")
        return None

# ── Supabase helpers ──────────────────────────────────────────────────────────
SB_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def sb_get(path, params=None):
    r = httpx.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def sb_patch(table, data, eq_col, eq_val):
    httpx.patch(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**SB_HEADERS, "Prefer": "return=minimal"},
        params={eq_col: f"eq.{eq_val}"},
        json=data, timeout=30,
    )

def sb_post(path, body):
    r = httpx.post(f"{SUPABASE_URL}/rest/v1/{path}",
        headers={**SB_HEADERS, "Prefer": "return=representation"},
        json=body, timeout=30)
    r.raise_for_status()
    return r.json()

def sb_rpc(fn, body):
    r = httpx.post(f"{SUPABASE_URL}/rest/v1/rpc/{fn}", headers=SB_HEADERS, json=body, timeout=30)
    r.raise_for_status()
    return r.json()

# ── AI: Gemini (primary) + GLM (fallback) ────────────────────────────────────
def _rate_limit_gemini():
    """Block until 35s have passed since the last Gemini call."""
    global _last_gemini_call
    elapsed = time.time() - _last_gemini_call
    if elapsed < GEMINI_RATE_S:
        wait = GEMINI_RATE_S - elapsed
        print(f"  [RATE LIMIT] waiting {wait:.1f}s for Gemini free tier...")
        time.sleep(wait)
    _last_gemini_call = time.time()

def _build_ai_prompt(committee: str, portfolio_input: str, existing_portfolios: list) -> str:
    ctx = COMMITTEE_FULL.get(committee, {})
    return f"""You are the portfolio validation engine for Mosaic MUN II — a school-level Model UN conference.

COMMITTEE: {committee} — {ctx.get('name', committee)}
AGENDA: {ctx.get('agenda', 'N/A')}
CONTEXT: {ctx.get('description', '')}
VALID PORTFOLIOS: {ctx.get('valid', '')}
INVALID: {ctx.get('invalid', '')}

EXISTING PORTFOLIOS IN THIS COMMITTEE:
{', '.join(existing_portfolios[:50])}

A delegate submitted an unrecognized portfolio preference: "{portfolio_input}"

TASK: Decide if this should be:
  (a) ADDED to the matrix and allotted to this delegate with a canonical name
  (b) REJECTED and the delegate waitlisted

RULES:
1. Only approve if the input clearly and unambiguously refers to a valid entity for THIS committee.
2. If it could be a misspelling of something already in the list, REJECT (fuzzy matcher should have caught it).
3. For IP committee: ONLY the three tracks are valid — reject everything else.
4. When in doubt → REJECT. A wrong allotment is worse than a waitlist.

Respond ONLY with compact JSON, no markdown:
{{"add": true/false, "reason": "one sentence", "canonical_name": "exact official name"}}"""

def consult_gemini(committee: str, portfolio: str, existing: list) -> dict:
    if not GEMINI_KEY:
        return {"add": False, "canonical_name": portfolio, "reason": "No Gemini key"}
    _rate_limit_gemini()
    prompt = _build_ai_prompt(committee, portfolio, existing)
    try:
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}],
                  "generationConfig": {"temperature": 0.0, "maxOutputTokens": 100}},
            timeout=20,
        )
        if r.status_code == 429:
            print("  [GEMINI] quota hit — falling back to GLM")
            return consult_glm(committee, portfolio, existing)
        r.raise_for_status()
        text = (r.json()["candidates"][0]["content"]["parts"][0]["text"] or "").strip()
        result = json.loads(text.replace("```json", "").replace("```", "").strip())
        print(f"  [GEMINI] {committee}|{portfolio} → {result}")
        return result
    except Exception as e:
        print(f"  [GEMINI] error: {e} — falling back to GLM")
        return consult_glm(committee, portfolio, existing)

def consult_glm(committee: str, portfolio: str, existing: list) -> dict:
    if not GLM_KEY:
        return {"add": False, "canonical_name": portfolio, "reason": "No GLM key"}
    prompt = _build_ai_prompt(committee, portfolio, existing)
    try:
        r = httpx.post(
            "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            headers={"Authorization": f"Bearer {GLM_KEY}", "Content-Type": "application/json"},
            json={"model": "glm-4-flash", "messages": [{"role": "user", "content": prompt}],
                  "temperature": 0.0, "max_tokens": 100},
            timeout=20,
        )
        r.raise_for_status()
        text = (r.json()["choices"][0]["message"]["content"] or "").strip()
        result = json.loads(text.replace("```json", "").replace("```", "").strip())
        print(f"  [GLM] {committee}|{portfolio} → {result}")
        return result
    except Exception as e:
        print(f"  [GLM] error: {e} — using Hungarian fallback")
        return {"add": False, "canonical_name": portfolio, "reason": f"AI unavailable: {e}"}

# ── Algorithm (Hungarian + MC) ────────────────────────────────────────────────
def calibrate_weights(delegates):
    counts = [d.mun_count for d in delegates if d.mun_count > 0]
    if len(counts) < 3: return BASE_PREF_W, BASE_EXP_W
    mean = sum(counts) / len(counts)
    std = math.sqrt(sum((x - mean)**2 for x in counts) / len(counts))
    cv = std / mean if mean > 0 else 0
    if cv < 0.3: p = min(0.85, BASE_PREF_W + 0.10); return p, 1 - p
    if cv > 0.8: p = max(0.60, BASE_PREF_W - 0.05); return p, 1 - p
    return BASE_PREF_W, BASE_EXP_W

def norm_exp(mc, all_counts):
    mx = max(all_counts) if all_counts else 1
    return math.log1p(mc) / math.log1p(mx) if mx > 0 else 0.0

def build_cost_matrix(delegates, slots, all_counts, pw, ew):
    n = max(len(delegates), len(slots))
    cm = np.full((n, n), INF_COST)
    sm = np.zeros((len(delegates), len(slots)))
    for i, d in enumerate(delegates):
        exp_n = norm_exp(d.mun_count, all_counts)
        pm = {f"{p.committee}|{p.portfolio}": p.rank for p in d.preferences if not p.is_freeform}
        for j, slot in enumerate(slots):
            if d.mun_count < slot.min_experience: continue
            key = slot.key
            rank = pm.get(key, MAX_PREFS + 1)
            score = pw * PREF_SCORES.get(rank, 0.05) + ew * (exp_n if key in pm else exp_n * 0.1)
            cm[i][j] = 1.0 - score
            sm[i][j] = score
    return cm, sm

def compute_confidence(di, si, sm, cm):
    assigned = float(sm[di][si]) if di < sm.shape[0] and si < sm.shape[1] else 0.0
    eligible = [float(sm[di][j]) for j in range(sm.shape[1]) if j != si and cm[di][j] < INF_COST]
    if not eligible: return 1.0
    return min(1.0, max(0.0, 0.5 + (assigned - max(eligible)) * 2))

def run_monte_carlo(delegates, slots, all_counts, pw, ew):
    counts = defaultdict(lambda: defaultdict(int))
    sh = copy.deepcopy(delegates)
    for _ in range(MC_RUNS):
        random.shuffle(sh)
        cm, _ = build_cost_matrix(sh, slots, all_counts, pw, ew)
        rows, cols = linear_sum_assignment(cm)
        for i, j in zip(rows, cols):
            if i < len(sh) and j < len(slots) and cm[i][j] < INF_COST:
                counts[sh[i].id][slots[j].key] += 1
    stab = {}
    for d in delegates:
        dc = counts.get(d.id, {})
        if dc:
            bk = max(dc, key=dc.get)
            rate = dc[bk] / MC_RUNS
            stab[d.id] = {"key": bk, "rate": rate, "stable": rate >= (1 - CONTEST_THRESH)}
        else:
            stab[d.id] = {"key": None, "rate": 0.0, "stable": False}
    return stab

def run_matching(delegates, portfolios, pw, ew):
    slots = [p for port in portfolios for _ in range(port.seats) for p in [port]]
    all_counts = [d.mun_count for d in delegates]
    stab = run_monte_carlo(delegates, slots, all_counts, pw, ew)
    cm, sm = build_cost_matrix(delegates, slots, all_counts, pw, ew)
    rows, cols = linear_sum_assignment(cm)
    results = []
    for i, j in zip(rows, cols):
        if i >= len(delegates): continue
        d = delegates[i]
        s = stab.get(d.id, {"key": None, "rate": 1.0, "stable": True})
        if j < len(slots) and cm[i][j] < INF_COST:
            port = slots[j]
            pref_rank = next((p.rank for p in d.preferences if not p.is_freeform
                              and p.committee == port.committee and p.portfolio == port.portfolio), None)
            score = float(sm[i][j])
            conf = compute_confidence(i, j, sm, cm)
            reason = f"Pref#{pref_rank}|Score:{score:.4f}|Stability:{s['rate']*100:.0f}%" if pref_rank else f"Auto|Score:{score:.4f}"
            results.append(AllocationResult(d, port, pref_rank, round(score, 5), round(conf, 3), s["stable"], round(s["rate"], 3), reason))
        else:
            results.append(AllocationResult(d, None, None, 0.0, 0.0, False, 0.0, "UNALLOCATED"))
    return results

# ── Google Sheets ─────────────────────────────────────────────────────────────
SHEET_COLS = [
    "registration_id", "full_name", "email", "phone", "institution", "class_year", "mun_count",
    "committee_pref_1", "committee_pref_2", "committee_pref_3",
    "portfolio_pref_1", "portfolio_pref_2", "portfolio_pref_3",
    "allocated_committee", "allocated_portfolio", "allocation_status",
    "allotment_score", "allotment_confidence", "allotment_stability", "is_allotment_stable", "created_at",
]

def append_to_sheet(reg_type: str, row: dict):
    sheet_id = G_SHEET_SGS if reg_type == "sgs" else G_SHEET_EXT
    if not sheet_id:
        print("  [SHEETS] no sheet ID configured")
        return
    tok = get_google_token("https://www.googleapis.com/auth/spreadsheets")
    if not tok:
        print("  [SHEETS] could not get token")
        return
    values = [[str(row.get(c, "") or "") for c in SHEET_COLS]]
    try:
        r = httpx.post(
            f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/Sheet1!A1:append"
            "?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
            headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
            json={"values": values},
            timeout=20,
        )
        if r.status_code == 200:
            print(f"  [SHEETS] row appended for {row.get('registration_id')}")
        else:
            print(f"  [SHEETS] error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"  [SHEETS] exception: {e}")

# ── Resend email ──────────────────────────────────────────────────────────────
def _qr(reg_id: str) -> str:
    import urllib.parse
    return f"https://api.qrserver.com/v1/create-qr-code/?data={urllib.parse.quote(f'{SITE}/verify/{reg_id}')}&size=160x160&bgcolor=050402&color=9b6e09&margin=12"

def send_allotment_email(to: str, name: str, committee: str, portfolio: str,
                          reg_id: str, confidence: float, is_stable: bool):
    if not RESEND_KEY or not to:
        print(f"  [EMAIL] skipped — key={bool(RESEND_KEY)}, to={to}")
        return
    fn = name.split()[0] if name else "Delegate"
    cp = round(confidence * 100)
    ctx = COMMITTEE_FULL.get(committee, {})
    agenda = ctx.get("agenda", "")
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#050402;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" style="background:#050402;"><tr><td align="center" style="padding:48px 20px 0;">
<table width="560" style="max-width:560px;width:100%;">
<tr><td style="border-bottom:1px solid rgba(155,110,9,.25);padding-bottom:24px;">
<img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="28" style="opacity:.85;display:block;"/></td></tr>
<tr><td style="padding-top:36px;padding-bottom:8px;">
<span style="border:1.5px solid rgba(155,110,9,.55);padding:5px 16px;font-size:9px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;">ALLOTMENT CONFIRMED</span></td></tr>
<tr><td style="padding-top:20px;"><h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:-.04em;color:#e8e4dc;line-height:1.05;">{fn},<br/>your seat<br/>is confirmed.</h1></td></tr>
<tr><td style="padding:16px 0 36px;border-bottom:1px solid rgba(155,110,9,.1);">
<p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.65;font-style:italic;">The Secretariat has confirmed your allocation. Your portfolio is reserved in your name.</p></td></tr>
<tr><td style="padding-top:32px;">
<table width="100%" style="border:1px solid rgba(155,110,9,.28);background:rgba(155,110,9,.04);">
<tr><td style="padding:20px 24px 16px;border-bottom:1px solid rgba(155,110,9,.15);">
<span style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.6;">MOSAIC MUN II · DELEGATE CREDENTIAL</span></td></tr>
<tr><td style="padding:24px;">
<table width="100%"><tr>
<td style="vertical-align:top;padding-right:20px;">
<div style="margin-bottom:16px;"><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:4px;">DELEGATE</div><div style="font-size:16px;font-weight:700;color:#e8e4dc;">{name}</div></div>
<div style="margin-bottom:16px;"><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:4px;">COMMITTEE</div><div style="font-size:15px;font-weight:700;color:#e8e4dc;">{committee}</div></div>
<div style="margin-bottom:16px;"><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:4px;">AGENDA</div><div style="font-size:12px;color:#c8bba0;font-style:italic;">{agenda}</div></div>
<div style="margin-bottom:16px;"><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:4px;">PORTFOLIO</div><div style="font-size:15px;font-weight:700;color:#e8e4dc;">{portfolio}</div></div>
<div><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:6px;">STATUS</div>
<span style="font-size:9px;letter-spacing:.28em;color:rgba(155,110,9,.9);border:1px solid rgba(155,110,9,.35);padding:4px 12px;text-transform:uppercase;">ALLOTTED</span></div></td>
<td style="vertical-align:top;text-align:right;width:110px;">
<div style="border:1px solid rgba(155,110,9,.22);padding:10px;display:inline-block;">
<img src="{_qr(reg_id)}" width="90" height="90" style="display:block;"/></div>
<div style="font-size:7px;letter-spacing:.2em;color:#9b6e09;opacity:.35;margin-top:6px;text-transform:uppercase;">SCAN TO VERIFY</div></td></tr></table></td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid rgba(155,110,9,.1);">
<span style="font-size:8px;letter-spacing:.28em;text-transform:uppercase;color:#7a6a4e;">11–12 JULY 2026 · SARASWATI GLOBAL SCHOOL, FARIDABAD</span>
<span style="float:right;font-size:7px;letter-spacing:.28em;text-transform:uppercase;color:#9b6e09;opacity:.45;border:1px solid rgba(155,110,9,.2);padding:2px 8px;">{cp}% CONFIDENCE{'' if is_stable else ' · REVIEW'}</span></td></tr></table></td></tr>
<tr><td style="padding:28px 0 12px;"><p style="margin:0;font-size:11px;color:#7a6a4e;line-height:1.85;font-style:italic;">
Registration ID: <strong style="color:#9b6e09;letter-spacing:.1em;">{reg_id}</strong><br/>
Bring this ID to the conference for check-in.<br/>
Queries: <a href="mailto:sameer.jhamb1719@gmail.com" style="color:#9b6e09;text-decoration:none;">sameer.jhamb1719@gmail.com</a></p></td></tr>
<tr><td style="padding:20px 0 48px;border-top:1px solid rgba(155,110,9,.1);">
<img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="20" style="opacity:.45;display:block;margin-bottom:6px;"/>
<div style="font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#5a4e38;">Mosaic MUN II · Saraswati Global School</div></td></tr>
</table></td></tr></table></body></html>"""

    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
            json={"from": "Mosaic MUN II <allotments@mosaicmun.in>", "to": [to],
                  "subject": f"Your Allotment — {committee} | {portfolio} · Mosaic MUN II",
                  "html": html},
            timeout=15,
        )
        if r.status_code in (200, 201):
            print(f"  [EMAIL] allotment sent to {to}")
        else:
            print(f"  [EMAIL] error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"  [EMAIL] exception: {e}")

def send_waitlist_email(to: str, name: str, reg_id: str):
    if not RESEND_KEY or not to: return
    fn = name.split()[0] if name else "Delegate"
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#050402;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" style="background:#050402;"><tr><td align="center" style="padding:48px 20px 0;">
<table width="560" style="max-width:560px;width:100%;">
<tr><td style="border-bottom:1px solid rgba(155,110,9,.25);padding-bottom:24px;">
<img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="28" style="opacity:.85;display:block;"/></td></tr>
<tr><td style="padding-top:40px;"><h1 style="margin:0;font-size:34px;font-weight:900;color:#e8e4dc;line-height:1.1;">{fn}, you're<br/>on the waitlist.</h1></td></tr>
<tr><td style="padding:20px 0 36px;"><p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.65;font-style:italic;">
Your registration is received. All seats matching your preferences are currently filled.
You will be notified as soon as a spot opens.</p></td></tr>
<tr><td style="padding:12px 0 48px;border-top:1px solid rgba(155,110,9,.1);">
<p style="margin:16px 0 0;font-size:11px;color:#7a6a4e;line-height:1.85;font-style:italic;">
Registration ID: <strong style="color:#9b6e09;">{reg_id}</strong><br/>
Queries: <a href="mailto:sameer.jhamb1719@gmail.com" style="color:#9b6e09;text-decoration:none;">sameer.jhamb1719@gmail.com</a>
</p></td></tr></table></td></tr></table></body></html>"""
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
            json={"from": "Mosaic MUN II <allotments@mosaicmun.in>", "to": [to],
                  "subject": "You are on the waitlist — Mosaic MUN II", "html": html},
            timeout=15,
        )
        if r.status_code in (200, 201):
            print(f"  [EMAIL] waitlist sent to {to}")
        else:
            print(f"  [EMAIL] error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"  [EMAIL] exception: {e}")

# ── Main allotment pipeline ───────────────────────────────────────────────────
def run_allotment():
    raw_delegates  = sb_get("registrations", {"order": "created_at.asc"})
    raw_portfolios = sb_get("portfolios", {"status": "eq.vacant"})

    portfolios = [
        Portfolio(id=p["id"], committee=p["committee"], portfolio=p["portfolio"],
                  archive_code=p.get("archive_code", ""), min_experience=p.get("min_experience", 0),
                  prestige_tier=p.get("prestige_tier", 1), seats=p.get("seats", 1))
        for p in raw_portfolios
    ]

    known_committees = list({p.committee for p in portfolios})
    known_by_committee = defaultdict(list)
    for p in portfolios:
        known_by_committee[p.committee].append(p.portfolio)
    all_known = [p.portfolio for p in portfolios]

    delegates, seen_emails, flagged = [], {}, []

    for order, r in enumerate(raw_delegates):
        if r.get("allocation_status") in ("allotted", "contested"):
            continue
        email = (r.get("email") or "").lower().strip()
        is_dup = False
        if email and email in seen_emails:
            delegates[seen_emails[email]].is_duplicate = True
            is_dup = True
        if email:
            seen_emails[email] = len(delegates)

        d = Delegate(
            id=r["id"], registration_id=r.get("registration_id") or r["id"],
            full_name=r.get("full_name", ""), email=r.get("email", ""),
            phone=r.get("phone", ""), institution=r.get("institution", ""),
            class_year=r.get("class_year", ""), mun_count=r.get("mun_count", 0) or 0,
            type=r.get("type", "external"),
            committee_pref_1=r.get("committee_pref_1"), committee_pref_2=r.get("committee_pref_2"),
            committee_pref_3=r.get("committee_pref_3"), portfolio_pref_1=r.get("portfolio_pref_1"),
            portfolio_pref_2=r.get("portfolio_pref_2"), portfolio_pref_3=r.get("portfolio_pref_3"),
            registration_order=order, is_duplicate=is_dup,
        )

        for rank in range(1, MAX_PREFS + 1):
            raw_c = getattr(d, f"committee_pref_{rank}")
            raw_p = getattr(d, f"portfolio_pref_{rank}")
            if not raw_c or not raw_p: continue
            committee, _, _ = normalize_name(raw_c, COMMITTEE_ALIASES, known_committees)
            portfolio_n, _, _ = normalize_name(raw_p, COUNTRY_ALIASES, known_by_committee.get(committee, []))
            is_ff = portfolio_n not in all_known or committee not in known_committees
            if is_ff:
                flagged.append({"delegate": d, "rank": rank, "committee": committee, "portfolio": portfolio_n})
            d.preferences.append(Preference(committee, portfolio_n, rank, is_ff))
        delegates.append(d)

    active = [d for d in delegates if not d.is_duplicate]
    if not active:
        return {"message": "No pending delegates", "processed": 0}

    # AI: resolve freeform preferences (Gemini → GLM → skip)
    for f in flagged:
        d, rank, committee, portfolio_n = f["delegate"], f["rank"], f["committee"], f["portfolio"]
        dec = consult_gemini(committee, portfolio_n, known_by_committee.get(committee, []))
        if dec.get("add"):
            canonical = dec["canonical_name"]
            new_code = f"GEN-{int(time.time())}"
            try:
                rows = sb_post("portfolios", {
                    "committee": committee, "portfolio": canonical, "archive_code": new_code,
                    "status": "vacant", "min_experience": 0, "prestige_tier": 1, "seats": 1,
                })
                np_data = rows[0] if isinstance(rows, list) else rows
                portfolios.append(Portfolio(id=np_data["id"], committee=committee, portfolio=canonical, archive_code=new_code))
                known_by_committee[committee].append(canonical)
                all_known.append(canonical)
                for p in d.preferences:
                    if p.rank == rank:
                        p.portfolio = canonical
                        p.is_freeform = False
            except Exception as e:
                print(f"  [AI ADD] failed to insert portfolio: {e}")

    # Hungarian matching
    pw, ew = calibrate_weights(active)
    results = run_matching(active, portfolios, pw, ew)

    claimed = waited = skipped = 0

    for res in results:
        d = res.delegate
        if res.portfolio:
            try:
                ok = sb_rpc("claim_portfolio", {"p_portfolio_id": res.portfolio.id, "p_delegate_id": d.id})
                if not ok:
                    skipped += 1
                    print(f"  [CLAIM] failed for {d.full_name} → {res.portfolio.key}")
                    continue
            except Exception as e:
                skipped += 1
                print(f"  [CLAIM] error: {e}")
                continue
            claimed += 1
            sb_patch("registrations", {
                "allocation_status": "allotted" if res.is_stable else "contested",
                "allocated_committee": res.portfolio.committee,
                "allocated_portfolio": res.portfolio.portfolio,
                "allotment_score": res.score,
                "allotment_confidence": res.confidence,
                "allotment_stability": res.stability_rate,
                "is_allotment_stable": res.is_stable,
            }, "id", d.id)
        else:
            waited += 1
            sb_patch("registrations", {
                "allocation_status": "waitlisted",
                "allotment_score": 0, "allotment_confidence": 0,
                "allotment_stability": 0, "is_allotment_stable": False,
            }, "id", d.id)

        # Fetch updated row for sheets
        try:
            rows = sb_get("registrations", {"id": f"eq.{d.id}"})
            full_row = rows[0] if rows else {}
        except Exception:
            full_row = {}

        append_to_sheet(d.type, full_row)

        if res.portfolio:
            send_allotment_email(d.email, d.full_name, res.portfolio.committee,
                                 res.portfolio.portfolio, d.registration_id,
                                 res.confidence, res.is_stable)
        else:
            send_waitlist_email(d.email, d.full_name, d.registration_id)

    return {"processed": len(active), "claimed": claimed, "waitlisted": waited,
            "skipped": skipped, "flagged": len(flagged), "prefWeight": pw, "expWeight": ew}

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok", "service": "mosaic-mun-allot", "version": "4.0"}

@app.post("/allot")
async def allot(request: Request):
    secret = request.headers.get("X-Secret", "")
    if secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        run_id = sb_rpc("try_acquire_allotment_lock", {})
    except Exception as e:
        return JSONResponse({"error": f"Lock error: {e}"}, status_code=500)
    if not run_id:
        return JSONResponse({"skipped": True, "reason": "mutex_locked"})
    print(f"Run started: {run_id}")
    try:
        summary = run_allotment()
        summary["run_id"] = run_id
        print(f"Run complete: {summary}")
        return JSONResponse(summary)
    except Exception as e:
        import traceback
        print(f"Run error: {traceback.format_exc()}")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        try: sb_rpc("release_allotment_lock", {"p_run_id": run_id})
        except Exception: pass
