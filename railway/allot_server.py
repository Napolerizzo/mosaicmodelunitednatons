"""
Mosaic MUN II — Allotment Engine v3.0
FastAPI server wrapping the Hungarian-algorithm allotment pipeline.

POST /allot  — triggered by Supabase pg_net webhook on registrations INSERT
GET  /health — Railway health check
"""

import os, math, copy, random, json, time
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

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL      = os.environ["SUPABASE_URL"]
SERVICE_KEY       = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND_KEY        = os.environ.get("RESEND_API_KEY", "")
GEMINI_KEY        = os.environ.get("GEMINI_API_KEY", "")
G_CLIENT_EMAIL    = os.environ.get("GOOGLE_CLIENT_EMAIL", "")
G_PRIVATE_KEY     = os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")
G_SHEET_SGS       = os.environ.get("GOOGLE_SHEET_ID_SGS", "")
G_SHEET_EXT       = os.environ.get("GOOGLE_SHEET_ID_EXTERNAL", "")
G_DRIVE_FOLDER    = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")
WEBHOOK_SECRET    = os.environ.get("WEBHOOK_SECRET", "mosaic-mun-allot-2026")
SITE              = "https://mosaicmodelunitednatons.vercel.app"

BASE_PREF_W   = 0.70
BASE_EXP_W    = 0.30
MAX_PREFS     = 3
FUZZY_THRESH  = 80
JARO_THRESH   = 0.75
INF_COST      = 1e9
MC_RUNS       = 50
CONTEST_THRESH = 0.15
PREF_SCORES   = {1: 1.0, 2: 0.6, 3: 0.3}

# ── Alias maps ────────────────────────────────────────────────────────────────
COUNTRY_ALIASES = {
    "us":"United States","usa":"United States","america":"United States",
    "uk":"United Kingdom","great britain":"United Kingdom","britain":"United Kingdom",
    "russia":"Russia","russian federation":"Russia","rf":"Russia",
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
    "poland":"Poland","ukraine":"Ukraine","czech republic":"Czech Republic","czechia":"Czech Republic",
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
        if canonical in known:
            return canonical, "alias", 1.0
        return canonical, "alias_nim", 0.9

    if FUZZY_OK and known:
        result = rf_process.extractOne(cleaned, [n.lower() for n in known], scorer=fuzz.token_sort_ratio)
        if result and result[1] >= FUZZY_THRESH:
            canonical = known[[n.lower() for n in known].index(result[0])]
            return canonical, f"fuzzy({result[1]}%)", result[1] / 100

    if PHONETIC_OK and known:
        best_score, best_match = 0.0, ""
        for k in known:
            s = jellyfish.jaro_winkler_similarity(cleaned, k.lower())
            if s > best_score:
                best_score, best_match = s, k
        if best_score >= JARO_THRESH:
            return best_match, f"phonetic({best_score:.2f})", best_score

    return raw.strip(), "unresolved", 0.0

# ── Algorithm ─────────────────────────────────────────────────────────────────
def calibrate_weights(delegates):
    counts = [d.mun_count for d in delegates if d.mun_count > 0]
    if len(counts) < 3:
        return BASE_PREF_W, BASE_EXP_W
    mean = sum(counts) / len(counts)
    std = math.sqrt(sum((x - mean) ** 2 for x in counts) / len(counts))
    cv = std / mean if mean > 0 else 0
    if cv < 0.3:
        p = min(0.85, BASE_PREF_W + 0.10)
        return p, 1 - p
    if cv > 0.8:
        p = max(0.60, BASE_PREF_W - 0.05)
        return p, 1 - p
    return BASE_PREF_W, BASE_EXP_W

def norm_exp(mc, all_counts):
    mx = max(all_counts) if all_counts else 1
    return math.log1p(mc) / math.log1p(mx) if mx > 0 else 0.0

def compute_score(rank, exp_norm, pw, ew):
    return pw * PREF_SCORES.get(rank, 0.05) + ew * exp_norm

def build_cost_matrix(delegates, slots, all_counts, pw, ew):
    n = max(len(delegates), len(slots))
    cm = np.full((n, n), INF_COST)
    sm = np.zeros((len(delegates), len(slots)))

    for i, d in enumerate(delegates):
        exp_n = norm_exp(d.mun_count, all_counts)
        pref_map = {}
        for p in d.preferences:
            if not p.is_freeform:
                pref_map[f"{p.committee}|{p.portfolio}"] = p.rank

        for j, slot in enumerate(slots):
            if d.mun_count < slot.min_experience:
                continue
            key = slot.key
            rank = pref_map.get(key, MAX_PREFS + 1)
            em = 1.0 if key in pref_map else 0.1
            score = compute_score(rank, exp_n * em, pw, ew)
            cm[i][j] = 1.0 - score
            sm[i][j] = score

    return cm, sm

def compute_confidence(di, si, sm, cm):
    assigned = sm[di][si] if di < sm.shape[0] and si < sm.shape[1] else 0.0
    eligible = [sm[di][j] for j in range(sm.shape[1]) if j != si and cm[di][j] < INF_COST]
    if not eligible:
        return 1.0
    return min(1.0, max(0.0, 0.5 + (assigned - max(eligible)) * 2))

def run_monte_carlo(delegates, slots, all_counts, pw, ew):
    counts = defaultdict(lambda: defaultdict(int))
    shuffled = copy.deepcopy(delegates)
    for _ in range(MC_RUNS):
        random.shuffle(shuffled)
        cm, _ = build_cost_matrix(shuffled, slots, all_counts, pw, ew)
        rows, cols = linear_sum_assignment(cm)
        for i, j in zip(rows, cols):
            if i < len(shuffled) and j < len(slots) and cm[i][j] < INF_COST:
                counts[shuffled[i].id][slots[j].key] += 1

    stability = {}
    for d in delegates:
        dc = counts.get(d.id, {})
        if dc:
            best_key = max(dc, key=dc.get)
            rate = dc[best_key] / MC_RUNS
            stability[d.id] = {"key": best_key, "rate": rate, "stable": rate >= (1 - CONTEST_THRESH)}
        else:
            stability[d.id] = {"key": None, "rate": 0.0, "stable": False}
    return stability

def run_matching(delegates, portfolios, pw, ew):
    slots = []
    for p in portfolios:
        for _ in range(p.seats):
            slots.append(p)

    all_counts = [d.mun_count for d in delegates]
    stability = run_monte_carlo(delegates, slots, all_counts, pw, ew)
    cm, sm = build_cost_matrix(delegates, slots, all_counts, pw, ew)
    rows, cols = linear_sum_assignment(cm)

    results = []
    for i, j in zip(rows, cols):
        if i >= len(delegates):
            continue
        d = delegates[i]
        stab = stability.get(d.id, {"key": None, "rate": 1.0, "stable": True})

        if j < len(slots) and cm[i][j] < INF_COST:
            port = slots[j]
            pref_rank = None
            for p in d.preferences:
                if not p.is_freeform and p.committee == port.committee and p.portfolio == port.portfolio:
                    pref_rank = p.rank
                    break
            score = float(sm[i][j])
            conf = compute_confidence(i, j, sm, cm)
            reason = f"Pref#{pref_rank}|Score:{score:.4f}|Stability:{stab['rate']*100:.0f}%" if pref_rank else f"Auto|Score:{score:.4f}"
            results.append(AllocationResult(d, port, pref_rank, round(score, 5), round(conf, 3), stab["stable"], round(stab["rate"], 3), reason))
        else:
            results.append(AllocationResult(d, None, None, 0.0, 0.0, False, 0.0, "UNALLOCATED"))

    return results

# ── Supabase helpers ──────────────────────────────────────────────────────────
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def sb_get(path, params=None):
    r = httpx.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def sb_patch(table, data, eq_col, eq_val):
    httpx.patch(f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**HEADERS, "Prefer": "return=minimal"},
        params={eq_col: f"eq.{eq_val}"},
        json=data, timeout=30)

def sb_rpc(fn, body):
    r = httpx.post(f"{SUPABASE_URL}/rest/v1/rpc/{fn}", headers=HEADERS, json=body, timeout=30)
    r.raise_for_status()
    return r.json()

# ── Gemini ────────────────────────────────────────────────────────────────────
COMMITTEE_CTX = {
    "UNGA": "UNGA: Refugee Crisis. Delegates=UN member states (193 members). Invalid: NGOs, individuals.",
    "UNCSW": "UNCSW: Digital Gender Divide. Delegates=UN member states. Invalid: individuals.",
    "UNHRC": "UNHRC: Human Rights Defenders in Conflict. Delegates=UN member states.",
    "AIPPM": "AIPPM: India Military vs Terrorism. Delegates=real active Indian politicians only.",
    "IPL": "IPL: Expansion/Broadcasting. Delegates=IPL franchises only. Invalid: players.",
    "IP": "IP: Press Corps. ONLY 3 tracks: Photojournalism, Written Journalism, Editorial Caricature.",
    "USSIC": "USSIC: Foreign Interference in US Infrastructure. Delegates=real US senators/intel directors/executive officials.",
}

def consult_gemini(committee, portfolio, existing):
    if not GEMINI_KEY:
        return {"add": False, "canonical_name": portfolio}
    ctx = COMMITTEE_CTX.get(committee, f"{committee}: Model UN. Be conservative.")
    prompt = (
        f"Portfolio validation Mosaic MUN II.\nCOMMITTEE: {committee}\nCONTEXT: {ctx}\n"
        f"EXISTING: {', '.join(existing[:30])}\nINPUT: \"{portfolio}\"\n"
        f"Approve only if clearly valid. When in doubt REJECT.\n"
        f"JSON only: {{\"add\":bool,\"canonical_name\":\"official name\"}}"
    )
    try:
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.0, "maxOutputTokens": 80}},
            timeout=10,
        )
        text = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        return json.loads(text.replace("```json", "").replace("```", "").strip())
    except Exception as e:
        print(f"Gemini error: {e}")
        return {"add": False, "canonical_name": portfolio}

# ── Google auth ───────────────────────────────────────────────────────────────
def get_google_token(scope):
    if not G_CLIENT_EMAIL or not G_PRIVATE_KEY:
        return None
    try:
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_info(
            {
                "type": "service_account",
                "client_email": G_CLIENT_EMAIL,
                "private_key": G_PRIVATE_KEY,
                "token_uri": "https://oauth2.googleapis.com/token",
            },
            scopes=[scope],
        )
        creds.refresh(httpx.Request())  # won't work — use requests library instead
    except Exception:
        pass
    # Use requests-based auth
    try:
        import google.auth.transport.requests
        import google.oauth2.service_account as sa
        creds = sa.Credentials.from_service_account_info(
            {"type": "service_account", "client_email": G_CLIENT_EMAIL, "private_key": G_PRIVATE_KEY, "token_uri": "https://oauth2.googleapis.com/token"},
            scopes=[scope],
        )
        import requests as req_lib
        creds.refresh(google.auth.transport.requests.Request(session=req_lib.Session()))
        return creds.token
    except Exception as e:
        print(f"Google auth error: {e}")
        return None

# ── Google Sheets ─────────────────────────────────────────────────────────────
SHEET_COLS = [
    "registration_id","full_name","email","phone","institution","class_year","mun_count",
    "committee_pref_1","committee_pref_2","committee_pref_3",
    "portfolio_pref_1","portfolio_pref_2","portfolio_pref_3",
    "allocated_committee","allocated_portfolio","allocation_status",
    "allotment_score","allotment_confidence","allotment_stability","is_allotment_stable","created_at",
]

def append_to_sheet(reg_type, row):
    sheet_id = G_SHEET_SGS if reg_type == "sgs" else G_SHEET_EXT
    if not sheet_id:
        return
    tok = get_google_token("https://www.googleapis.com/auth/spreadsheets")
    if not tok:
        return
    values = [[str(row.get(c, "") or "") for c in SHEET_COLS]]
    try:
        httpx.post(
            f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
            headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
            json={"values": values}, timeout=20,
        )
    except Exception as e:
        print(f"Sheets error: {e}")

# ── Resend email ──────────────────────────────────────────────────────────────
def qr_url(reg_id):
    import urllib.parse
    target = urllib.parse.quote(f"{SITE}/verify/{reg_id}")
    return f"https://api.qrserver.com/v1/create-qr-code/?data={target}&size=160x160&bgcolor=050402&color=9b6e09&margin=12"

def send_allotment_email(to, name, committee, portfolio, reg_id, confidence, is_stable):
    if not RESEND_KEY or not to:
        return
    first = name.split()[0]
    conf_pct = round(confidence * 100)
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#050402;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" style="background:#050402;"><tr><td align="center" style="padding:48px 20px 0;">
<table width="560" style="max-width:560px;width:100%;">
<tr><td style="border-bottom:1px solid rgba(155,110,9,.25);padding-bottom:24px;">
<img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="28" style="opacity:.85;display:block;"/></td></tr>
<tr><td style="padding-top:40px;padding-bottom:8px;">
<span style="border:1.5px solid rgba(155,110,9,.55);padding:5px 16px;font-size:9px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;">ALLOTMENT CONFIRMED</span></td></tr>
<tr><td style="padding-top:20px;"><h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:-.04em;color:#e8e4dc;line-height:1.05;">{first},<br/>your seat<br/>is confirmed.</h1></td></tr>
<tr><td style="padding:16px 0 36px;border-bottom:1px solid rgba(155,110,9,.1);">
<p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.65;font-style:italic;">The Secretariat has confirmed your allocation. Your portfolio is reserved in your name.</p></td></tr>
<tr><td style="padding-top:32px;">
<table width="100%" style="border:1px solid rgba(155,110,9,.28);background:rgba(155,110,9,.04);">
<tr><td style="padding:20px 24px 16px;border-bottom:1px solid rgba(155,110,9,.15);">
<span style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.6;">MOSAIC MUN II · DELEGATE CREDENTIAL</span></td></tr>
<tr><td style="padding:24px;">
<table width="100%"><tr>
<td style="vertical-align:top;padding-right:20px;">
<div style="margin-bottom:18px;"><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:4px;">DELEGATE</div><div style="font-size:16px;font-weight:700;color:#e8e4dc;">{name}</div></div>
<div style="margin-bottom:18px;"><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:4px;">COMMITTEE</div><div style="font-size:15px;font-weight:700;color:#e8e4dc;">{committee}</div></div>
<div style="margin-bottom:18px;"><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:4px;">PORTFOLIO</div><div style="font-size:15px;font-weight:700;color:#e8e4dc;">{portfolio}</div></div>
<div><div style="font-size:7px;letter-spacing:.44em;text-transform:uppercase;color:#9b6e09;opacity:.5;margin-bottom:6px;">STATUS</div>
<span style="font-size:9px;letter-spacing:.28em;color:rgba(155,110,9,.9);border:1px solid rgba(155,110,9,.35);padding:4px 12px;text-transform:uppercase;">ALLOTTED</span></div></td>
<td style="vertical-align:top;text-align:right;width:110px;">
<div style="border:1px solid rgba(155,110,9,.22);padding:10px;display:inline-block;">
<img src="{qr_url(reg_id)}" width="90" height="90" style="display:block;"/></div>
<div style="font-size:7px;letter-spacing:.2em;color:#9b6e09;opacity:.35;margin-top:6px;text-transform:uppercase;">SCAN TO VERIFY</div>
</td></tr></table></td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid rgba(155,110,9,.1);">
<span style="font-size:8px;letter-spacing:.28em;text-transform:uppercase;color:#7a6a4e;">11–12 JULY 2026 · SARASWATI GLOBAL SCHOOL, FARIDABAD</span>
<span style="float:right;font-size:7px;letter-spacing:.28em;text-transform:uppercase;color:#9b6e09;opacity:.45;border:1px solid rgba(155,110,9,.2);padding:2px 8px;">{conf_pct}% CONFIDENCE{'' if is_stable else ' · REVIEW'}</span>
</td></tr></table></td></tr>
<tr><td style="padding:28px 0 12px;"><p style="margin:0;font-size:11px;color:#7a6a4e;line-height:1.85;font-style:italic;">
Registration ID: <strong style="color:#9b6e09;letter-spacing:.1em;">{reg_id}</strong><br/>
Bring ID to conference. Queries: <a href="mailto:sameer.jhamb1719@gmail.com" style="color:#9b6e09;text-decoration:none;">sameer.jhamb1719@gmail.com</a>
</p></td></tr>
<tr><td style="padding:24px 0 48px;border-top:1px solid rgba(155,110,9,.1);">
<img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="20" style="opacity:.45;display:block;margin-bottom:6px;"/>
<div style="font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#5a4e38;">Mosaic MUN II · Saraswati Global School</div>
</td></tr></table></td></tr></table></body></html>"""

    try:
        httpx.post("https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
            json={"from": "Mosaic MUN II <allotments@mosaicmun.in>", "to": [to],
                  "subject": f"Your Allotment — {committee} | {portfolio} · Mosaic MUN II", "html": html},
            timeout=15)
    except Exception as e:
        print(f"Email error: {e}")

def send_waitlist_email(to, name, reg_id):
    if not RESEND_KEY or not to:
        return
    first = name.split()[0]
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#050402;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" style="background:#050402;"><tr><td align="center" style="padding:48px 20px 0;">
<table width="560" style="max-width:560px;width:100%;">
<tr><td style="border-bottom:1px solid rgba(155,110,9,.25);padding-bottom:24px;">
<img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="28" style="opacity:.85;display:block;"/></td></tr>
<tr><td style="padding-top:40px;"><h1 style="margin:0;font-size:34px;font-weight:900;color:#e8e4dc;line-height:1.1;">{first}, you're<br/>on the waitlist.</h1></td></tr>
<tr><td style="padding:20px 0 36px;"><p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.65;font-style:italic;">
Your registration is received. All seats matching your preferences are filled. You will be notified if a spot opens.</p></td></tr>
<tr><td style="padding:12px 0 48px;border-top:1px solid rgba(155,110,9,.1);">
<p style="margin:16px 0 0;font-size:11px;color:#7a6a4e;line-height:1.85;font-style:italic;">
Registration ID: <strong style="color:#9b6e09;">{reg_id}</strong><br/>
Queries: <a href="mailto:sameer.jhamb1719@gmail.com" style="color:#9b6e09;text-decoration:none;">sameer.jhamb1719@gmail.com</a>
</p></td></tr></table></td></tr></table></body></html>"""
    try:
        httpx.post("https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
            json={"from": "Mosaic MUN II <allotments@mosaicmun.in>", "to": [to],
                  "subject": "You are on the waitlist — Mosaic MUN II", "html": html},
            timeout=15)
    except Exception as e:
        print(f"Waitlist email error: {e}")

# ── Main allotment pipeline ───────────────────────────────────────────────────
def run_allotment():
    # Fetch pending registrations
    raw_delegates = sb_get("registrations", {"order": "created_at.asc"})
    raw_portfolios = sb_get("portfolios", {"status": "eq.vacant"})

    portfolios = [
        Portfolio(
            id=p["id"], committee=p["committee"], portfolio=p["portfolio"],
            archive_code=p.get("archive_code", ""), min_experience=p.get("min_experience", 0),
            prestige_tier=p.get("prestige_tier", 1), seats=p.get("seats", 1),
        )
        for p in raw_portfolios
    ]

    known_committees = list({p.committee for p in portfolios})
    known_by_committee = defaultdict(list)
    for p in portfolios:
        known_by_committee[p.committee].append(p.portfolio)
    all_known = [p.portfolio for p in portfolios]

    # Build delegates
    delegates = []
    seen_emails = {}
    flagged = []

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
            if not raw_c or not raw_p:
                continue
            committee, _, _ = normalize_name(raw_c, COMMITTEE_ALIASES, known_committees)
            portfolio, _, _ = normalize_name(raw_p, COUNTRY_ALIASES, known_by_committee.get(committee, []))
            is_ff = portfolio not in all_known or committee not in known_committees
            if is_ff:
                flagged.append({"delegate": d, "rank": rank, "committee": committee, "portfolio": portfolio})
            d.preferences.append(Preference(committee, portfolio, rank, is_ff))

        delegates.append(d)

    active = [d for d in delegates if not d.is_duplicate]
    if not active:
        return {"message": "No pending delegates", "processed": 0}

    # Gemini: handle freeform
    for f in flagged:
        d, rank, committee, portfolio = f["delegate"], f["rank"], f["committee"], f["portfolio"]
        existing = known_by_committee.get(committee, [])
        dec = consult_gemini(committee, portfolio, existing)
        if dec.get("add"):
            canonical = dec["canonical_name"]
            new_code = f"GEN-{int(time.time())}"
            r = httpx.post(f"{SUPABASE_URL}/rest/v1/portfolios",
                headers={**HEADERS, "Prefer": "return=representation"},
                json={"committee": committee, "portfolio": canonical, "archive_code": new_code,
                      "status": "vacant", "min_experience": 0, "prestige_tier": 1, "seats": 1},
                timeout=15)
            if r.status_code in (200, 201):
                np_data = r.json()[0] if isinstance(r.json(), list) else r.json()
                new_port = Portfolio(id=np_data["id"], committee=committee, portfolio=canonical, archive_code=new_code)
                portfolios.append(new_port)
                known_by_committee[committee].append(canonical)
                all_known.append(canonical)
                # Fix delegate preference
                for p in d.preferences:
                    if p.rank == rank:
                        p.portfolio = canonical
                        p.is_freeform = False

    # Run matching
    pw, ew = calibrate_weights(active)
    results = run_matching(active, portfolios, pw, ew)

    claimed, waited, skipped = 0, 0, 0

    for res in results:
        d = res.delegate

        if res.portfolio:
            # Atomic claim
            try:
                ok = sb_rpc("claim_portfolio", {"p_portfolio_id": res.portfolio.id, "p_delegate_id": d.id})
                if not ok:
                    skipped += 1
                    print(f"Claim failed for {d.full_name} → {res.portfolio.key}")
                    continue
            except Exception as e:
                skipped += 1
                print(f"Claim error: {e}")
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

        # Fetch full row for sheets
        try:
            rows = sb_get("registrations", {"id": f"eq.{d.id}"})
            full_row = rows[0] if rows else {}
        except Exception:
            full_row = {}

        append_to_sheet(d.type, full_row)

        if res.portfolio and claimed > 0:
            send_allotment_email(d.email, d.full_name, res.portfolio.committee, res.portfolio.portfolio,
                                 d.registration_id, res.confidence, res.is_stable)
        elif not res.portfolio:
            send_waitlist_email(d.email, d.full_name, d.registration_id)

    return {
        "processed": len(active), "claimed": claimed,
        "waitlisted": waited, "skipped": skipped,
        "flagged": len(flagged), "prefWeight": pw, "expWeight": ew,
    }

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok", "service": "mosaic-mun-allot"}

@app.post("/allot")
async def allot(request: Request):
    # Verify shared secret
    secret = request.headers.get("X-Secret", "")
    if secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Acquire mutex
    try:
        run_id = sb_rpc("try_acquire_allotment_lock", {})
    except Exception as e:
        return JSONResponse({"error": f"Lock error: {e}"}, status_code=500)

    if not run_id:
        return JSONResponse({"skipped": True, "reason": "mutex_locked"})

    print(f"Allotment run started: {run_id}")
    try:
        summary = run_allotment()
        summary["run_id"] = run_id
        print(f"Allotment complete: {summary}")
        return JSONResponse(summary)
    except Exception as e:
        import traceback
        print(f"Allotment error: {traceback.format_exc()}")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        try:
            sb_rpc("release_allotment_lock", {"p_run_id": run_id})
        except Exception:
            pass
