"""
Mosaic MUN II — Allotment Engine v5.0
======================================

KEY FIXES in v5.0:
  - Delegates with ZERO valid preferences → INF_COST for all slots → waitlisted.
    (Previously they got auto-allotted to random slots. Now they NEVER get a slot
    unless at least one preference resolves to a real portfolio in the matrix.)
  - AI consultation receives FULL committee portfolio list (all vacant + taken)
    so it has complete context to make accurate add/reject decisions.
  - "Nonsense" inputs (hello, bye, random strings) → rejected by all 3 fuzzy
    layers AND by AI → delegate correctly waitlisted.
  - Preference resolution is now stricter: a committee pref that doesn't resolve
    to a known committee → entire preference pair is freeform.
  - Auto-allot (no prefs) is fully disabled. Delegates MUST have at least 1
    valid preference to receive an allocation.

ALGORITHM STACK:
  1. 3-layer fuzzy name resolution (alias → Levenshtein → Jaro-Winkler)
  2. AI consultation for genuinely ambiguous freeform inputs (Gemini → GLM → skip)
  3. Hungarian algorithm (globally optimal, not greedy)
  4. Monte Carlo stability analysis (50 runs)
  5. Atomic portfolio claims via Postgres RPC
"""

import os, math, copy, random, json, time, base64
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
FUZZY_THRESH   = 80      # Levenshtein ratio threshold
JARO_THRESH    = 0.82    # Raised from 0.75 — reduces false phonetic matches
INF_COST       = 1e9
MC_RUNS        = 50
CONTEST_THRESH = 0.15
PREF_SCORES    = {1: 1.0, 2: 0.6, 3: 0.3}
GEMINI_RATE_S  = 35
_last_gemini   = 0.0

# ── Committee metadata + full portfolio lists (for AI context) ────────────────
COMMITTEE_FULL = {
    "UNGA": {
        "name": "United Nations General Assembly",
        "agenda": "Discussing the Voting Rights of States Under Foreign Military Occupation",
        "description": "Each delegate represents ONE UN member state. Military occupation strips a state of territorial control and often challenges its standing in international institutions. Debate focuses on whether occupied states retain full UNGA voting rights — engaging with Palestinian observer status, Western Sahara, Crimea, and what statehood means when boots are on the ground.",
        "valid": "Any of the 193 UN member states.",
        "invalid": "NGOs, individuals, companies, fictional states, random words, nonsense strings.",
    },
    "UNCSW": {
        "name": "UN Commission on the Status of Women",
        "agenda": "Deliberation upon Surrogate Motherhood as International Labor",
        "description": "Each delegate represents ONE UN member state. Commercial surrogacy sits at the collision point of reproductive rights, labor law, migration, and bodily autonomy.",
        "valid": "Any of the 193 UN member states.",
        "invalid": "Individuals, organizations, companies, random words, nonsense strings.",
    },
    "UNHRC": {
        "name": "UN Human Rights Council",
        "agenda": "Discussing The Right to Be Forgotten vs. The Right to Truth in Atrocity Documentation",
        "description": "Each delegate represents ONE UN member state. Perpetrators of genocide and war crimes have begun invoking the right to be forgotten to scrub their names from atrocity documentation.",
        "valid": "Any of the 193 UN member states.",
        "invalid": "Individuals, NGOs, companies, random words, nonsense strings.",
    },
    "AIPPM": {
        "name": "All India Political Parties Meet",
        "agenda": "Operation Sindoor and the Question of Parliamentary War Powers",
        "description": "Each delegate represents ONE real, named, currently active Indian politician. Debate covers Operation Sindoor and whether the executive has authority for offensive military operations without parliamentary sanction.",
        "valid": "Real active Indian politicians: MPs, MLAs, Chief Ministers, Union Ministers, party presidents. Must be a recognizable named individual.",
        "invalid": "Fictional politicians, foreign politicians, party names (not people), states/regions, random words, nonsense strings.",
    },
    "IPL": {
        "name": "Indian Premier League Committee",
        "agenda": "Mega Auction",
        "description": "Each delegate represents ONE IPL franchise. Delegates bid for players within strict budget constraints and build balanced squads.",
        "valid": "Mumbai Indians, Chennai Super Kings, Royal Challengers Bengaluru, Kolkata Knight Riders, Sunrisers Hyderabad, Rajasthan Royals, Delhi Capitals, Punjab Kings, Gujarat Titans, Lucknow Super Giants, Deccan Chargers, Kochi Tuskers Kerala, Pune Warriors India, Rising Pune Supergiant, Kashmir Kings, Goa Mariners, Ahmedabad Falcons, Vizag Sharks, Indore Leopards, Nagpur Strikers.",
        "invalid": "Players, sponsors, individuals, non-franchise entities, random words, nonsense strings.",
    },
    "IP": {
        "name": "International Press Corps",
        "agenda": "Photography, Caricature, and Journalism",
        "description": "There are EXACTLY THREE valid tracks. Nothing else is valid.",
        "valid": "ONLY: Photojournalism, Written Journalism, Editorial Caricature.",
        "invalid": "EVERYTHING ELSE. Any other input MUST be rejected.",
    },
    "USSIC": {
        "name": "US Senate Intelligence Committee",
        "agenda": "Discussing and Declassifying The Epstein Files",
        "description": "Each delegate represents ONE real US senator, senior intelligence official, or executive branch official.",
        "valid": "Sitting US Senators, CIA/FBI/NSA/DNI/DIA/CISA Directors, President, VP, Secretary of State, Secretary of Defense, Attorney General, Chairman Joint Chiefs, Commander US Cyber Command, Commander Indo-Pacific Command, CEO Google, CEO Microsoft, Whistleblower Asset Alpha, Foreign Intelligence Liaison Director.",
        "invalid": "Foreign nationals, fictional characters, private citizens, random words, nonsense strings.",
    },
}

# ── Alias maps ────────────────────────────────────────────────────────────────
COUNTRY_ALIASES = {
    "us":"United States","usa":"United States","america":"United States","u.s.":"United States","u.s.a.":"United States",
    "uk":"United Kingdom","great britain":"United Kingdom","britain":"United Kingdom","u.k.":"United Kingdom",
    "russia":"Russia","russian federation":"Russia","rf":"Russia","ussr":"Russia",
    "china":"China","prc":"China","peoples republic of china":"China","people's republic of china":"China","zhongguo":"China",
    "india":"India","republic of india":"India","bharat":"India",
    "germany":"Germany","federal republic of germany":"Germany","deutschland":"Germany",
    "france":"France","french republic":"France","la france":"France",
    "brazil":"Brazil","brasil":"Brazil","federative republic of brazil":"Brazil",
    "japan":"Japan","nippon":"Japan",
    "canada":"Canada","dominion of canada":"Canada",
    "australia":"Australia","commonwealth of australia":"Australia",
    "mexico":"Mexico","united mexican states":"Mexico","mejico":"Mexico",
    "norway":"Norway","kingdom of norway":"Norway","norge":"Norway",
    "netherlands":"Netherlands","holland":"Netherlands","the netherlands":"Netherlands",
    "pakistan":"Pakistan","islamic republic of pakistan":"Pakistan",
    "nigeria":"Nigeria","federal republic of nigeria":"Nigeria",
    "south africa":"South Africa","rsa":"South Africa",
    "south korea":"South Korea","republic of korea":"South Korea","rok":"South Korea",
    "north korea":"North Korea","dprk":"North Korea",
    "iran":"Iran","islamic republic of iran":"Iran","persia":"Iran",
    "saudi arabia":"Saudi Arabia","ksa":"Saudi Arabia",
    "uae":"UAE","united arab emirates":"UAE","emirates":"UAE",
    "turkey":"Türkiye","turkiye":"Türkiye","republic of turkey":"Türkiye",
    "israel":"Israel","state of israel":"Israel",
    "egypt":"Egypt","arab republic of egypt":"Egypt",
    "kenya":"Kenya","ghana":"Ghana","indonesia":"Indonesia","malaysia":"Malaysia","singapore":"Singapore",
    "new zealand":"New Zealand","aotearoa":"New Zealand",
    "sweden":"Sweden","denmark":"Denmark","finland":"Finland",
    "switzerland":"Switzerland","austria":"Austria","spain":"Spain","espana":"Spain",
    "italy":"Italy","italia":"Italy","portugal":"Portugal","poland":"Poland","ukraine":"Ukraine",
    "czech republic":"Czech Republic","czechia":"Czech Republic",
    "hungary":"Hungary","romania":"Romania","bulgaria":"Bulgaria","greece":"Greece","belgium":"Belgium",
    "ethiopia":"Ethiopia","argentina":"Argentina","colombia":"Colombia",
    # IPL franchises
    "mi":"Mumbai Indians","csk":"Chennai Super Kings","rcb":"Royal Challengers Bengaluru",
    "kkr":"Kolkata Knight Riders","srh":"Sunrisers Hyderabad","rr":"Rajasthan Royals",
    "dc":"Delhi Capitals","pbks":"Punjab Kings","gt":"Gujarat Titans","lsg":"Lucknow Super Giants",
    # IP tracks
    "photo":"Photojournalism","photography":"Photojournalism",
    "written":"Written Journalism","journalism":"Written Journalism","writing":"Written Journalism",
    "caricature":"Editorial Caricature","cartoon":"Editorial Caricature","editorial":"Editorial Caricature",
}

COMMITTEE_ALIASES = {
    "unga":"UNGA","general assembly":"UNGA","ga":"UNGA","un general assembly":"UNGA",
    "unhrc":"UNHRC","human rights council":"UNHRC","hrc":"UNHRC","un human rights council":"UNHRC",
    "uncsw":"UNCSW","csw":"UNCSW","commission on the status of women":"UNCSW",
    "aippm":"AIPPM","all india political parties meet":"AIPPM","aipp":"AIPPM",
    "ipl":"IPL","indian premier league":"IPL","ipl committee":"IPL",
    "ip":"IP","international press":"IP","press corps":"IP","press":"IP","international press corps":"IP",
    "ussic":"USSIC","us senate intelligence committee":"USSIC","senate intel":"USSIC",
    "senate intelligence committee":"USSIC","us senate":"USSIC",
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
    resolution: str = "exact"

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

    @property
    def has_valid_preferences(self) -> bool:
        """True only if at least one preference resolved to a real portfolio in the matrix."""
        return any(not p.is_freeform for p in self.preferences)

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
    """Returns (canonical, method, confidence). Three layers: alias → fuzzy → phonetic."""
    if not raw or not raw.strip():
        return "", "empty", 0.0
    cleaned = raw.strip().lower()

    # Reject obvious nonsense (very short random strings, pure numbers unless they map)
    if len(cleaned) <= 2 and cleaned not in alias_map:
        return raw.strip(), "too_short", 0.0

    # Layer 1: alias map — but only use the result if the canonical is actually in known list
    # (prevents cross-committee leaks: "india" → "India" is valid for UNGA but NOT for IP)
    if cleaned in alias_map:
        canonical = alias_map[cleaned]
        if canonical in known:
            return canonical, "alias", 1.0
        # Alias found but canonical not in this committee's known list → fall through to fuzzy
        # (don't return here — let fuzzy/phonetic try within the known list)

    # Layer 2: Levenshtein fuzzy (via rapidfuzz)
    if FUZZY_OK and known:
        result = rf_process.extractOne(cleaned, [n.lower() for n in known], scorer=fuzz.token_sort_ratio)
        if result and result[1] >= FUZZY_THRESH:
            canonical = known[[n.lower() for n in known].index(result[0])]
            return canonical, f"fuzzy({result[1]}%)", result[1] / 100

    # Layer 3: Jaro-Winkler phonetic
    if PHONETIC_OK and known:
        best_s, best_m = 0.0, ""
        for k in known:
            s = jellyfish.jaro_winkler_similarity(cleaned, k.lower())
            if s > best_s: best_s, best_m = s, k
        if best_s >= JARO_THRESH:
            return best_m, f"phonetic({best_s:.2f})", best_s

    return raw.strip(), "unresolved", 0.0

def is_clearly_nonsense(raw: str) -> bool:
    """Detects inputs that are obviously not a real portfolio or committee: greetings, random words, etc.
    Does NOT include committee names or country names — those are handled by the alias/fuzzy resolver."""
    if not raw: return True
    cleaned = raw.strip().lower()
    # Common nonsense patterns — greetings, placeholders, random words only
    # NOTE: do NOT add committee names (unga, ipl, etc.) or country names here
    nonsense = {
        "hello","hi","hey","bye","goodbye","test","yes","no","ok","okay","idk","none",
        "any","random","whatever","n/a","na","null","undefined","something","nothing",
        "abc","xyz","aaa","bbb","ccc","lol","wtf","no preference","don't care",
        "anything","please","help","hello hello","bye bye","idk idk",
    }
    if cleaned in nonsense: return True
    # Pure numbers are nonsense for portfolio names
    if cleaned.isdigit(): return True
    # Repeated words (e.g. "hello hello", "ipl ipl")
    words = cleaned.split()
    if len(words) >= 2 and len(set(words)) == 1: return True
    return False

# ── Google Auth ───────────────────────────────────────────────────────────────
def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def get_google_token(scope: str) -> Optional[str]:
    if not G_CLIENT_EMAIL or not G_PRIVATE_KEY or not CRYPTO_OK:
        return None
    try:
        now = int(time.time())
        header  = _b64url(json.dumps({"alg":"RS256","typ":"JWT"}).encode())
        claim   = _b64url(json.dumps({"iss":G_CLIENT_EMAIL,"scope":scope,"aud":"https://oauth2.googleapis.com/token","exp":now+3600,"iat":now}).encode())
        unsigned = f"{header}.{claim}"
        pk = serialization.load_pem_private_key(G_PRIVATE_KEY.encode(), password=None)
        sig = pk.sign(unsigned.encode(), asym_padding.PKCS1v15(), hashes.SHA256())
        jwt = f"{unsigned}.{_b64url(sig)}"
        r = httpx.post("https://oauth2.googleapis.com/token",
            data={"grant_type":"urn:ietf:params:oauth:grant-type:jwt-bearer","assertion":jwt}, timeout=30)
        tok = r.json().get("access_token")
        if not tok: print(f"Google token error: {r.text[:200]}")
        return tok
    except Exception as e:
        print(f"Google auth error: {e}")
        return None

# ── Supabase helpers ──────────────────────────────────────────────────────────
SB_HDR = {"apikey":SERVICE_KEY,"Authorization":f"Bearer {SERVICE_KEY}","Content-Type":"application/json"}

def sb_get(path, params=None):
    r = httpx.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HDR, params=params, timeout=30)
    r.raise_for_status(); return r.json()

def sb_patch(table, data, col, val):
    httpx.patch(f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**SB_HDR,"Prefer":"return=minimal"}, params={col:f"eq.{val}"}, json=data, timeout=30)

def sb_post(path, body):
    r = httpx.post(f"{SUPABASE_URL}/rest/v1/{path}",
        headers={**SB_HDR,"Prefer":"return=representation"}, json=body, timeout=30)
    r.raise_for_status(); return r.json()

def sb_rpc(fn, body):
    r = httpx.post(f"{SUPABASE_URL}/rest/v1/rpc/{fn}", headers=SB_HDR, json=body, timeout=30)
    r.raise_for_status(); return r.json()

# ── AI consultation ───────────────────────────────────────────────────────────
def _rate_limit_gemini():
    global _last_gemini
    elapsed = time.time() - _last_gemini
    if elapsed < GEMINI_RATE_S:
        wait = GEMINI_RATE_S - elapsed
        print(f"  [RATE LIMIT] waiting {wait:.1f}s for Gemini free tier...")
        time.sleep(wait)
    _last_gemini = time.time()

def _build_ai_prompt(committee: str, portfolio_input: str, all_portfolios: list, vacant_portfolios: list) -> str:
    """Build prompt with FULL portfolio context — all known + which are vacant."""
    ctx = COMMITTEE_FULL.get(committee, {})
    vacant_str = ', '.join(vacant_portfolios[:60]) if vacant_portfolios else 'None'
    taken_count = len(all_portfolios) - len(vacant_portfolios)
    return f"""You are the portfolio validation engine for Mosaic MUN II, a school-level Model UN conference.

COMMITTEE: {committee} — {ctx.get('name', committee)}
AGENDA: {ctx.get('agenda', 'N/A')}
CONTEXT: {ctx.get('description', '')}
WHAT IS VALID: {ctx.get('valid', '')}
WHAT IS INVALID: {ctx.get('invalid', '')}

FULL PORTFOLIO MATRIX FOR THIS COMMITTEE:
- Total portfolios: {len(all_portfolios)}
- Taken (already allotted): {taken_count}
- Vacant (available): {len(vacant_portfolios)}
- Vacant portfolios: {vacant_str}

DELEGATE INPUT (unrecognized after fuzzy matching): "{portfolio_input}"

DECISION REQUIRED:
Should this input be (a) ADDED as a new valid portfolio and allotted to this delegate, or (b) REJECTED (delegate waitlisted)?

STRICT RULES:
1. Only approve if the input CLEARLY and UNAMBIGUOUSLY refers to a valid entity for THIS specific committee.
2. If the input is a misspelling of something already in the matrix, REJECT — fuzzy matching should have caught it.
3. If the input is a greeting (hello, hi, bye), random word, nonsense, or not a real entity, REJECT.
4. For IP committee: ONLY Photojournalism, Written Journalism, or Editorial Caricature. EVERYTHING else = REJECT.
5. When in doubt → REJECT. A wrong allotment is worse than a waitlist.
6. If you add a portfolio, the canonical_name must be the exact official name.

Respond ONLY with compact JSON (no markdown, no explanation outside JSON):
{{"add": true/false, "reason": "one short sentence", "canonical_name": "exact official name or empty if rejected"}}"""

def consult_ai(committee: str, portfolio: str, all_ports: list, vacant_ports: list) -> dict:
    """Consult Gemini → GLM → default reject. Never raises."""
    # Gemini first
    if GEMINI_KEY:
        _rate_limit_gemini()
        try:
            r = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_KEY}",
                json={"contents":[{"parts":[{"text":_build_ai_prompt(committee,portfolio,all_ports,vacant_ports)}]}],
                      "generationConfig":{"temperature":0.0,"maxOutputTokens":120}},
                timeout=20,
            )
            if r.status_code == 429:
                print("  [GEMINI] quota hit — trying GLM")
            elif r.ok:
                text = (r.json()["candidates"][0]["content"]["parts"][0]["text"] or "").strip()
                result = json.loads(text.replace("```json","").replace("```","").strip())
                print(f"  [GEMINI] {committee}|{portfolio} → {result}")
                return result
        except Exception as e:
            print(f"  [GEMINI] error: {e}")

    # GLM fallback
    if GLM_KEY:
        try:
            r = httpx.post(
                "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                headers={"Authorization":f"Bearer {GLM_KEY}","Content-Type":"application/json"},
                json={"model":"glm-4-flash",
                      "messages":[{"role":"user","content":_build_ai_prompt(committee,portfolio,all_ports,vacant_ports)}],
                      "temperature":0.0,"max_tokens":120},
                timeout=20,
            )
            if r.ok:
                text = (r.json()["choices"][0]["message"]["content"] or "").strip()
                result = json.loads(text.replace("```json","").replace("```","").strip())
                print(f"  [GLM] {committee}|{portfolio} → {result}")
                return result
        except Exception as e:
            print(f"  [GLM] error: {e}")

    # Default: reject
    print(f"  [AI] both failed — conservatively rejecting {committee}|{portfolio}")
    return {"add": False, "canonical_name": "", "reason": "AI unavailable — conservatively rejected"}

# ── Algorithm ─────────────────────────────────────────────────────────────────
def calibrate_weights(delegates):
    counts = [d.mun_count for d in delegates if d.mun_count > 0]
    if len(counts) < 3: return BASE_PREF_W, BASE_EXP_W
    mean = sum(counts) / len(counts)
    std  = math.sqrt(sum((x-mean)**2 for x in counts)/len(counts))
    cv   = std / mean if mean > 0 else 0
    if cv < 0.3: p = min(0.85, BASE_PREF_W+0.10); return p, 1-p
    if cv > 0.8: p = max(0.60, BASE_PREF_W-0.05); return p, 1-p
    return BASE_PREF_W, BASE_EXP_W

def norm_exp(mc, all_counts):
    mx = max(all_counts) if all_counts else 1
    return math.log1p(mc) / math.log1p(mx) if mx > 0 else 0.0

def build_cost_matrix(delegates, slots, all_counts, pw, ew):
    n  = max(len(delegates), len(slots))
    cm = np.full((n, n), INF_COST)
    sm = np.zeros((len(delegates), len(slots)))

    for i, d in enumerate(delegates):
        # ── CRITICAL FIX: delegates with no valid prefs get INF_COST everywhere ──
        if not d.has_valid_preferences:
            # Leave entire row as INF_COST — they will be unallocated by Hungarian
            continue

        exp_n = norm_exp(d.mun_count, all_counts)
        pm = {f"{p.committee}|{p.portfolio}": p.rank for p in d.preferences if not p.is_freeform}

        for j, slot in enumerate(slots):
            if d.mun_count < slot.min_experience:
                continue  # experience gate — leave INF_COST

            key   = slot.key
            if key in pm:
                # Delegate has this slot in their preferences — score it
                rank  = pm[key]
                score = pw * PREF_SCORES[rank] + ew * exp_n
                cm[i][j] = 1.0 - score
                sm[i][j] = score
            # else: slot NOT in preferences → leave INF_COST
            # This means delegates ONLY compete for slots they actually want.
            # No auto-allotment to random slots.

    return cm, sm

def compute_confidence(di, si, sm, cm):
    assigned = float(sm[di][si]) if di < sm.shape[0] and si < sm.shape[1] else 0.0
    eligible = [float(sm[di][j]) for j in range(sm.shape[1]) if j!=si and cm[di][j] < INF_COST]
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
            bk   = max(dc, key=dc.get)
            rate = dc[bk] / MC_RUNS
            stab[d.id] = {"key":bk,"rate":rate,"stable":rate>=(1-CONTEST_THRESH)}
        else:
            stab[d.id] = {"key":None,"rate":0.0,"stable":False}
    return stab

def run_matching(delegates, portfolios, pw, ew):
    slots      = [p for port in portfolios for _ in range(port.seats) for p in [port]]
    all_counts = [d.mun_count for d in delegates]
    stab       = run_monte_carlo(delegates, slots, all_counts, pw, ew)
    cm, sm     = build_cost_matrix(delegates, slots, all_counts, pw, ew)
    rows, cols = linear_sum_assignment(cm)

    results = []
    for i, j in zip(rows, cols):
        if i >= len(delegates): continue
        d = delegates[i]
        s = stab.get(d.id, {"key":None,"rate":1.0,"stable":True})

        if j < len(slots) and cm[i][j] < INF_COST:
            port = slots[j]
            pref_rank = next(
                (p.rank for p in d.preferences if not p.is_freeform
                 and p.committee == port.committee and p.portfolio == port.portfolio), None
            )
            score = float(sm[i][j])
            conf  = compute_confidence(i, j, sm, cm)
            reason = f"Pref#{pref_rank}|Score:{score:.4f}|Stability:{s['rate']*100:.0f}%" if pref_rank else f"Auto|Score:{score:.4f}"
            results.append(AllocationResult(d, port, pref_rank, round(score,5), round(conf,3), s["stable"], round(s["rate"],3), reason))
        else:
            # Unallocated — log the specific reason
            if not d.has_valid_preferences:
                reason = "UNALLOCATED — all preferences were invalid/nonsense (no valid portfolio in matrix)"
            elif all(p.is_freeform for p in d.preferences):
                reason = "UNALLOCATED — all preferences freeform and AI rejected them"
            else:
                reason = "UNALLOCATED — preferred portfolios all taken or experience-gated"
            results.append(AllocationResult(d, None, None, 0.0, 0.0, False, 0.0, reason))

    return results

# ── Google Sheets ─────────────────────────────────────────────────────────────
SHEET_COLS = [
    "registration_id","full_name","email","phone","institution","class_year","mun_count",
    "committee_pref_1","committee_pref_2","committee_pref_3",
    "portfolio_pref_1","portfolio_pref_2","portfolio_pref_3",
    "allocated_committee","allocated_portfolio","allocation_status",
    "allotment_score","allotment_confidence","allotment_stability","is_allotment_stable","created_at",
]

def append_to_sheet(reg_type: str, row: dict):
    sheet_id = G_SHEET_SGS if reg_type == "sgs" else G_SHEET_EXT
    if not sheet_id: return
    tok = get_google_token("https://www.googleapis.com/auth/spreadsheets")
    if not tok: print("  [SHEETS] no token"); return
    values = [[str(row.get(c,"") or "") for c in SHEET_COLS]]
    try:
        r = httpx.post(
            f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/Sheet1!A1:append"
            "?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
            headers={"Authorization":f"Bearer {tok}","Content-Type":"application/json"},
            json={"values":values}, timeout=20,
        )
        if r.status_code == 200: print(f"  [SHEETS] appended {row.get('registration_id')}")
        else: print(f"  [SHEETS] error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"  [SHEETS] {e}")

# ── Resend emails ─────────────────────────────────────────────────────────────
def _qr(reg_id: str) -> str:
    import urllib.parse
    return f"https://api.qrserver.com/v1/create-qr-code/?data={urllib.parse.quote(f'{SITE}/verify/{reg_id}')}&size=160x160&bgcolor=050402&color=9b6e09&margin=12"

def send_allotment_email(to, name, committee, portfolio, reg_id, confidence, is_stable):
    if not RESEND_KEY or not to: return
    fn  = name.split()[0] if name else "Delegate"
    cp  = round(confidence * 100)
    ctx = COMMITTEE_FULL.get(committee, {})
    agenda = ctx.get("agenda","")
    committee_full_name = ctx.get("name", committee)
    html = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Portfolio Allotment — Mosaic MUN II</title></head>
<body style="margin:0;padding:0;background:#050402;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050402;"><tr><td align="center" style="padding:52px 20px 0;">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
<tr><td style="border-bottom:1px solid rgba(155,110,9,0.2);padding-bottom:28px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="26" alt="Mosaic MUN" style="opacity:0.88;display:block;"/></td>
<td align="right" style="font-size:7.5px;letter-spacing:0.38em;text-transform:uppercase;color:rgba(155,110,9,0.4);vertical-align:middle;">OFFICIAL CORRESPONDENCE</td>
</tr></table></td></tr>
<tr><td style="padding-top:44px;padding-bottom:6px;"><div style="display:inline-block;border:1.5px solid rgba(155,110,9,0.5);padding:5px 18px;font-size:8.5px;letter-spacing:0.48em;text-transform:uppercase;color:#9b6e09;margin-bottom:28px;">ALLOTMENT CONFIRMED</div></td></tr>
<tr><td style="padding-bottom:8px;"><h1 style="margin:0;font-size:38px;font-weight:900;letter-spacing:-0.045em;color:#e8e4dc;line-height:1.04;">{fn},<br/>your seat<br/>is confirmed.</h1></td></tr>
<tr><td style="padding:18px 0 38px;border-bottom:1px solid rgba(155,110,9,0.1);"><p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.7;font-style:italic;">The Secretariat of Mosaic Model United Nations II is pleased to confirm your portfolio allotment for the conference on 11–12 July 2026 at Saraswati Global School, Faridabad. Your position has been formally reserved and this credential constitutes your official accreditation.</p></td></tr>
<tr><td style="padding-top:36px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(155,110,9,0.3);background:linear-gradient(135deg,rgba(155,110,9,0.06) 0%,rgba(0,0,0,0) 60%);">
<tr><td style="padding:22px 28px 18px;border-bottom:1px solid rgba(155,110,9,0.14);"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:7px;letter-spacing:0.46em;text-transform:uppercase;color:rgba(155,110,9,0.55);">MOSAIC MUN II · DELEGATE CREDENTIAL · EDITION II</td>
<td align="right" style="font-size:7px;letter-spacing:0.38em;text-transform:uppercase;color:rgba(155,110,9,0.35);">ACCREDITATION</td>
</tr></table></td></tr>
<tr><td style="padding:28px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:24px;">
<div style="margin-bottom:20px;"><div style="font-size:6.5px;letter-spacing:0.46em;text-transform:uppercase;color:rgba(155,110,9,0.45);margin-bottom:5px;">DELEGATE</div><div style="font-size:17px;font-weight:700;color:#e8e4dc;">{name}</div></div>
<div style="margin-bottom:20px;"><div style="font-size:6.5px;letter-spacing:0.46em;text-transform:uppercase;color:rgba(155,110,9,0.45);margin-bottom:5px;">COMMITTEE</div><div style="font-size:13px;font-weight:700;color:#e8e4dc;">{committee} — {committee_full_name}</div></div>
<div style="margin-bottom:20px;"><div style="font-size:6.5px;letter-spacing:0.46em;text-transform:uppercase;color:rgba(155,110,9,0.45);margin-bottom:5px;">AGENDA</div><div style="font-size:12px;color:#c4b490;font-style:italic;line-height:1.55;">{agenda}</div></div>
<div style="margin-bottom:20px;"><div style="font-size:6.5px;letter-spacing:0.46em;text-transform:uppercase;color:rgba(155,110,9,0.45);margin-bottom:5px;">ALLOTTED PORTFOLIO</div><div style="font-size:16px;font-weight:700;color:#e8e4dc;">{portfolio}</div></div>
<div><div style="font-size:6.5px;letter-spacing:0.46em;text-transform:uppercase;color:rgba(155,110,9,0.45);margin-bottom:8px;">STATUS</div><span style="font-size:8.5px;letter-spacing:0.3em;color:rgba(155,110,9,0.95);border:1px solid rgba(155,110,9,0.38);padding:5px 14px;text-transform:uppercase;">CONFIRMED &amp; ACTIVE</span></div>
</td>
<td style="vertical-align:top;text-align:right;width:118px;"><div style="border:1px solid rgba(155,110,9,0.25);padding:12px;display:inline-block;background:rgba(255,255,255,0.025);"><img src="{_qr(reg_id)}" width="94" height="94" alt="QR" style="display:block;"/></div><div style="font-size:6.5px;letter-spacing:0.22em;color:rgba(155,110,9,0.35);margin-top:7px;text-transform:uppercase;text-align:center;">SCAN TO VERIFY</div></td>
</tr></table></td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid rgba(155,110,9,0.1);"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:7.5px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(122,106,78,0.7);">11–12 JULY 2026 · SARASWATI GLOBAL SCHOOL, FARIDABAD</td>
<td align="right"><span style="font-size:7px;letter-spacing:0.26em;text-transform:uppercase;color:rgba(155,110,9,0.5);border:1px solid rgba(155,110,9,0.2);padding:3px 10px;">{cp}% CONFIDENCE{'' if is_stable else ' · MANUAL REVIEW'}</span></td>
</tr></table></td></tr></table></td></tr>
<tr><td style="padding:32px 0 8px;"><table width="100%" cellpadding="0" cellspacing="0" style="border-left:2px solid rgba(155,110,9,0.3);padding-left:18px;"><tr><td>
<div style="font-size:7px;letter-spacing:0.42em;text-transform:uppercase;color:rgba(155,110,9,0.45);margin-bottom:8px;">REGISTRATION REFERENCE</div>
<div style="font-family:'Courier New',monospace;font-size:14px;color:#9b6e09;letter-spacing:0.14em;margin-bottom:16px;">{reg_id}</div>
<p style="margin:0;font-size:12px;color:rgba(180,164,138,0.75);line-height:1.9;">Please retain this registration ID. You will be required to present it at the accreditation desk upon arrival. Failure to produce a valid credential may result in delayed entry.</p>
</td></tr></table></td></tr>
<tr><td style="padding:28px 0 8px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(155,110,9,0.03);border:1px solid rgba(155,110,9,0.1);padding:18px 20px;"><tr><td>
<div style="font-size:7px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(155,110,9,0.4);margin-bottom:8px;">ALLOTMENT PROCESS DISCLOSURE</div>
<p style="margin:0;font-size:11px;color:rgba(160,144,118,0.65);line-height:1.85;">This allotment was determined exclusively by the Mosaic MUN Allocation Engine — an automated system employing the Hungarian optimisation algorithm, Monte Carlo stability analysis, and adaptive preference-weighting. No human intervention was involved in the assignment of portfolios. The engine ensures globally optimal allocation across all registered delegates simultaneously, minimising preference dissatisfaction at the cohort level.</p>
</td></tr></table></td></tr>
<tr><td style="padding:28px 0 0;border-top:1px solid rgba(155,110,9,0.08);"></td></tr>
<tr><td style="padding-bottom:10px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="20" alt="Mosaic MUN" style="opacity:0.42;display:block;margin-bottom:7px;"/><div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(90,78,56,0.7);">Mosaic Model United Nations II · Saraswati Global School, Faridabad</div></td>
<td align="right" valign="bottom"><a href="https://instagram.com/mosaicmunofficial" style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(155,110,9,0.45);text-decoration:none;">Instagram &#8599;</a></td>
</tr></table></td></tr>
<tr><td style="padding:20px 0 52px;border-top:1px solid rgba(255,255,255,0.04);">
<p style="margin:0;font-size:9.5px;color:rgba(120,108,88,0.45);line-height:1.9;"><strong style="color:rgba(155,110,9,0.35);letter-spacing:0.05em;">CONFIDENTIALITY NOTICE:</strong> This electronic mail message is intended solely for the use of the individual to whom it is addressed. If you have received this communication in error, please notify the sender immediately and permanently delete the original message. Unauthorised review, use, disclosure, dissemination, or copying of this email is strictly prohibited and may be unlawful.<br/><br/>This message was generated and dispatched by the Mosaic MUN II automated allotment system on behalf of the Secretariat. &copy; 2026 Mosaic MUN. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>"""
    try:
        r = httpx.post("https://api.resend.com/emails",
            headers={"Authorization":f"Bearer {RESEND_KEY}","Content-Type":"application/json"},
            json={"from":"Mosaic MUN II <allotments@sandnco.lol>","to":[to],
                  "subject":f"Portfolio Allotment Confirmed — {committee} | {portfolio} · Mosaic MUN II","html":html},
            timeout=15)
        if r.status_code in (200,201): print(f"  [EMAIL] allotment sent to {to}")
        else: print(f"  [EMAIL] error {r.status_code}: {r.text[:200]}")
    except Exception as e: print(f"  [EMAIL] {e}")

def send_waitlist_email(to, name, reg_id):
    if not RESEND_KEY or not to: return
    fn = name.split()[0] if name else "Delegate"
    html = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Waitlist Notice — Mosaic MUN II</title></head>
<body style="margin:0;padding:0;background:#050402;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050402;"><tr><td align="center" style="padding:52px 20px 0;">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
<tr><td style="border-bottom:1px solid rgba(155,110,9,0.2);padding-bottom:28px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="26" alt="Mosaic MUN" style="opacity:0.88;display:block;"/></td>
<td align="right" style="font-size:7.5px;letter-spacing:0.38em;text-transform:uppercase;color:rgba(155,110,9,0.4);vertical-align:middle;">OFFICIAL CORRESPONDENCE</td>
</tr></table></td></tr>
<tr><td style="padding-top:44px;padding-bottom:6px;"><div style="display:inline-block;border:1.5px solid rgba(155,110,9,0.35);padding:5px 18px;font-size:8.5px;letter-spacing:0.48em;text-transform:uppercase;color:rgba(155,110,9,0.7);margin-bottom:28px;">WAITLIST NOTICE</div></td></tr>
<tr><td style="padding-bottom:8px;"><h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:-0.04em;color:#e8e4dc;line-height:1.06;">{fn}, your<br/>application is<br/>under review.</h1></td></tr>
<tr><td style="padding:18px 0 38px;border-bottom:1px solid rgba(155,110,9,0.1);"><p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.7;font-style:italic;">Your registration for Mosaic MUN II has been successfully received and processed. At this time, all available seats matching your submitted preferences are at capacity. You have been placed on the official waitlist and will receive a further communication should a position become available.</p></td></tr>
<tr><td style="padding:32px 0 8px;"><table width="100%" cellpadding="0" cellspacing="0" style="border-left:2px solid rgba(155,110,9,0.3);padding-left:18px;"><tr><td>
<div style="font-size:7px;letter-spacing:0.42em;text-transform:uppercase;color:rgba(155,110,9,0.45);margin-bottom:8px;">REGISTRATION REFERENCE</div>
<div style="font-family:'Courier New',monospace;font-size:14px;color:#9b6e09;letter-spacing:0.14em;margin-bottom:16px;">{reg_id}</div>
<p style="margin:0;font-size:12px;color:rgba(180,164,138,0.75);line-height:1.9;">Please retain this reference number for all future correspondence with the Secretariat. For queries, contact us at <a href="mailto:sameer.jhamb1719@gmail.com" style="color:#9b6e09;text-decoration:none;">sameer.jhamb1719@gmail.com</a></p>
</td></tr></table></td></tr>
<tr><td style="padding:28px 0 8px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(155,110,9,0.03);border:1px solid rgba(155,110,9,0.1);padding:18px 20px;"><tr><td>
<div style="font-size:7px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(155,110,9,0.4);margin-bottom:8px;">ALLOTMENT PROCESS DISCLOSURE</div>
<p style="margin:0;font-size:11px;color:rgba(160,144,118,0.65);line-height:1.85;">Portfolio allotments at Mosaic MUN II are determined exclusively by an automated optimisation engine. Waitlist placement was assigned on the basis of preference compatibility and seat availability across the full delegate cohort. No human intervention was involved in this determination.</p>
</td></tr></table></td></tr>
<tr><td style="padding:28px 0 0;border-top:1px solid rgba(155,110,9,0.08);"></td></tr>
<tr><td style="padding-bottom:10px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="{SITE}/brand-assets/mosaic-logo-nobg.png" height="20" alt="Mosaic MUN" style="opacity:0.42;display:block;margin-bottom:7px;"/><div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(90,78,56,0.7);">Mosaic Model United Nations II · Saraswati Global School, Faridabad</div></td>
<td align="right" valign="bottom"><a href="https://instagram.com/mosaicmunofficial" style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(155,110,9,0.45);text-decoration:none;">Instagram &#8599;</a></td>
</tr></table></td></tr>
<tr><td style="padding:20px 0 52px;border-top:1px solid rgba(255,255,255,0.04);">
<p style="margin:0;font-size:9.5px;color:rgba(120,108,88,0.45);line-height:1.9;"><strong style="color:rgba(155,110,9,0.35);letter-spacing:0.05em;">CONFIDENTIALITY NOTICE:</strong> This electronic mail message is intended solely for the use of the individual to whom it is addressed. If you have received this communication in error, please notify the sender immediately and permanently delete the original message. Unauthorised review, use, disclosure, or copying of this email is strictly prohibited.<br/><br/>This message was generated by the Mosaic MUN II automated allotment system. &copy; 2026 Mosaic MUN. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>"""
    try:
        r = httpx.post("https://api.resend.com/emails",
            headers={"Authorization":f"Bearer {RESEND_KEY}","Content-Type":"application/json"},
            json={"from":"Mosaic MUN II <allotments@sandnco.lol>","to":[to],
                  "subject":"Waitlist Notice — Mosaic MUN II Portfolio Allotment","html":html},
            timeout=15)
        if r.status_code in (200,201): print(f"  [EMAIL] waitlist sent to {to}")
        else: print(f"  [EMAIL] error {r.status_code}: {r.text[:200]}")
    except Exception as e: print(f"  [EMAIL] {e}")

# ── Main allotment pipeline ───────────────────────────────────────────────────
def run_allotment():
    raw_delegates  = sb_get("registrations", {"order":"created_at.asc"})
    raw_portfolios = sb_get("portfolios")  # fetch ALL (vacant + taken) for AI context

    # Build portfolio objects
    all_portfolios = [
        Portfolio(id=p["id"], committee=p["committee"], portfolio=p["portfolio"],
                  archive_code=p.get("archive_code",""), min_experience=p.get("min_experience",0),
                  prestige_tier=p.get("prestige_tier",1), seats=p.get("seats",1), status=p.get("status","vacant"))
        for p in raw_portfolios
    ]
    vacant_portfolios = [p for p in all_portfolios if p.status == "vacant"]

    known_committees = list({p.committee for p in all_portfolios})

    # all known portfolio names per committee (for fuzzy matching)
    all_by_committee: dict = defaultdict(list)
    for p in all_portfolios:
        all_by_committee[p.committee].append(p.portfolio)

    # only vacant names per committee (for AI context — show what's actually available)
    vacant_by_committee: dict = defaultdict(list)
    for p in vacant_portfolios:
        vacant_by_committee[p.committee].append(p.portfolio)

    all_known_names = [p.portfolio for p in all_portfolios]

    # Build delegate list
    delegates, seen_emails, flagged = [], {}, []

    for order, r in enumerate(raw_delegates):
        if r.get("allocation_status") in ("allotted","contested"):
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
            full_name=r.get("full_name",""), email=r.get("email",""),
            phone=r.get("phone",""), institution=r.get("institution",""),
            class_year=r.get("class_year",""), mun_count=r.get("mun_count",0) or 0,
            type=r.get("type","external"),
            committee_pref_1=r.get("committee_pref_1"), committee_pref_2=r.get("committee_pref_2"),
            committee_pref_3=r.get("committee_pref_3"), portfolio_pref_1=r.get("portfolio_pref_1"),
            portfolio_pref_2=r.get("portfolio_pref_2"), portfolio_pref_3=r.get("portfolio_pref_3"),
            registration_order=order, is_duplicate=is_dup,
        )

        for rank in range(1, MAX_PREFS+1):
            raw_c = getattr(d, f"committee_pref_{rank}")
            raw_p = getattr(d, f"portfolio_pref_{rank}")
            if not raw_c or not raw_p:
                continue

            # Reject obvious nonsense immediately — no fuzzy, no AI
            if is_clearly_nonsense(raw_c) or is_clearly_nonsense(raw_p):
                print(f"  [NONSENSE] {d.full_name} pref#{rank}: '{raw_c}' | '{raw_p}' — rejected before fuzzy")
                d.preferences.append(Preference(raw_c, raw_p, rank, is_freeform=True, resolution="nonsense"))
                continue

            # Resolve committee name
            committee, c_method, _ = normalize_name(raw_c, COMMITTEE_ALIASES, known_committees)
            if c_method == "unresolved" or c_method == "too_short":
                print(f"  [UNRESOLVED] {d.full_name} pref#{rank}: committee '{raw_c}' unresolvable")
                d.preferences.append(Preference(raw_c, raw_p, rank, is_freeform=True, resolution="committee_unresolved"))
                continue

            # Resolve portfolio name against this committee's portfolios
            portfolio_n, p_method, _ = normalize_name(raw_p, COUNTRY_ALIASES, all_by_committee.get(committee, []))

            is_ff = portfolio_n not in all_known_names or committee not in known_committees

            if is_ff:
                flagged.append({
                    "delegate": d, "rank": rank,
                    "committee": committee, "portfolio": portfolio_n,
                    "raw_c": raw_c, "raw_p": raw_p,
                })

            d.preferences.append(Preference(committee, portfolio_n, rank,
                                            is_freeform=is_ff, resolution=p_method))

        delegates.append(d)

    active = [d for d in delegates if not d.is_duplicate]
    if not active:
        return {"message":"No pending delegates","processed":0}

    # AI: resolve freeform preferences with FULL context
    for f in flagged:
        d, rank, committee, portfolio_n = f["delegate"], f["rank"], f["committee"], f["portfolio"]

        # Don't consult AI for obvious nonsense — it was already flagged
        pref = next((p for p in d.preferences if p.rank == rank), None)
        if pref and pref.resolution == "nonsense":
            continue

        all_in_committee    = all_by_committee.get(committee, [])
        vacant_in_committee = vacant_by_committee.get(committee, [])

        dec = consult_ai(committee, portfolio_n, all_in_committee, vacant_in_committee)
        if dec.get("add") and dec.get("canonical_name"):
            canonical = dec["canonical_name"]
            new_code  = f"GEN-{int(time.time())}"
            try:
                rows = sb_post("portfolios", {
                    "committee":committee, "portfolio":canonical, "archive_code":new_code,
                    "status":"vacant", "min_experience":0, "prestige_tier":1, "seats":1,
                })
                np_data = rows[0] if isinstance(rows, list) else rows
                new_port = Portfolio(id=np_data["id"], committee=committee, portfolio=canonical, archive_code=new_code)
                vacant_portfolios.append(new_port)
                all_by_committee[committee].append(canonical)
                vacant_by_committee[committee].append(canonical)
                all_known_names.append(canonical)
                if pref:
                    pref.portfolio   = canonical
                    pref.is_freeform = False
                    pref.resolution  = "ai_added"
                print(f"  [AI ADD] {committee}|{canonical} added to matrix")
            except Exception as e:
                print(f"  [AI ADD] failed to insert portfolio: {e}")

    # Run matching (only delegates with valid preferences compete)
    pw, ew  = calibrate_weights(active)
    results = run_matching(active, vacant_portfolios, pw, ew)

    claimed = waited = skipped = 0

    for res in results:
        d = res.delegate
        if res.portfolio:
            try:
                ok = sb_rpc("claim_portfolio", {"p_portfolio_id":res.portfolio.id,"p_delegate_id":d.id})
                if not ok:
                    skipped += 1
                    print(f"  [CLAIM] slot taken: {res.portfolio.key} → {d.full_name} re-queued")
                    continue
            except Exception as e:
                skipped += 1; print(f"  [CLAIM] error: {e}"); continue
            claimed += 1
            sb_patch("registrations", {
                "allocation_status": "allotted" if res.is_stable else "contested",
                "allocated_committee": res.portfolio.committee,
                "allocated_portfolio": res.portfolio.portfolio,
                "allotment_score": res.score, "allotment_confidence": res.confidence,
                "allotment_stability": res.stability_rate, "is_allotment_stable": res.is_stable,
            }, "id", d.id)
        else:
            waited += 1
            sb_patch("registrations", {
                "allocation_status":"waitlisted",
                "allotment_score":0,"allotment_confidence":0,"allotment_stability":0,"is_allotment_stable":False,
            }, "id", d.id)

        try:
            rows = sb_get("registrations", {"id":f"eq.{d.id}"}); full_row = rows[0] if rows else {}
        except Exception: full_row = {}

        append_to_sheet(d.type, full_row)

        if res.portfolio:
            send_allotment_email(d.email, d.full_name, res.portfolio.committee, res.portfolio.portfolio,
                                 d.registration_id, res.confidence, res.is_stable)
        else:
            send_waitlist_email(d.email, d.full_name, d.registration_id)

        print(f"  {'✓ ALLOTTED' if res.portfolio else '⊘ WAITLISTED'} {d.full_name}: {res.reason}")

    return {"processed":len(active),"claimed":claimed,"waitlisted":waited,
            "skipped":skipped,"flagged":len(flagged),"prefWeight":pw,"expWeight":ew}

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI()

@app.get("/health")
def health():
    return {"status":"ok","service":"mosaic-mun-allot","version":"5.0"}

@app.post("/allot")
async def allot(request: Request):
    secret = request.headers.get("X-Secret","")
    if secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        run_id = sb_rpc("try_acquire_allotment_lock", {})
    except Exception as e:
        return JSONResponse({"error":f"Lock error: {e}"}, status_code=500)
    if not run_id:
        return JSONResponse({"skipped":True,"reason":"mutex_locked"})
    print(f"\n{'='*50}\nAllotment run: {run_id}")
    try:
        summary = run_allotment()
        summary["run_id"] = run_id
        print(f"Complete: {summary}\n{'='*50}")
        return JSONResponse(summary)
    except Exception as e:
        import traceback
        print(f"Error: {traceback.format_exc()}")
        return JSONResponse({"error":str(e)}, status_code=500)
    finally:
        try: sb_rpc("release_allotment_lock",{"p_run_id":run_id})
        except Exception: pass

@app.post("/test")
async def test_engine(request: Request):
    """Run comprehensive scenario tests without touching real data."""
    secret = request.headers.get("X-Secret","")
    if secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    results = []

    SCENARIOS = [
        # (description, raw_committee, raw_portfolio, expected_outcome)
        ("Valid: UNGA + India",          "UNGA",  "India",          "valid"),
        ("Valid: unga + usa aliases",     "unga",  "usa",            "valid"),
        ("Valid: fuzzy Germny",          "UNGA",  "Germny",         "valid"),
        ("Valid: IPL + MI alias",        "ipl",   "mi",             "valid"),
        ("Valid: IP + photo alias",      "ip",    "photo",          "valid"),
        ("Nonsense: hello + bye",        "UNGA",  "hello",          "freeform"),
        ("Nonsense: IPL + hello",        "IPL",   "hello",          "freeform"),
        ("Nonsense: repeat IPL IPL",     "IPL",   "ipl",            "freeform"),
        ("Nonsense: random 123",         "UNGA",  "123",            "freeform"),
        ("Invalid commit: blah",         "blah",  "India",          "freeform"),
        ("Ambiguous: unknown country",   "UNGA",  "Wakanda",        "freeform"),
        ("Typo phonetic: Rusisa",        "UNHRC", "Rusisa",         "valid"),
        ("Typo: Frnce",                  "UNCSW", "Frnce",          "valid"),
        ("IPL full name",                "IPL",   "Chennai Super Kings","valid"),
        ("USSIC valid role",             "USSIC", "CIA Director",   "valid"),
        ("IP valid track",               "ip",    "Written Journalism","valid"),
        ("IP invalid: India",            "IP",    "India",          "freeform"),
    ]

    known_committees = list(COMMITTEE_ALIASES.values()) + list(COMMITTEE_FULL.keys())
    # Build minimal known portfolios for test
    test_known: dict = defaultdict(list)
    for k, v in COUNTRY_ALIASES.items():
        if v not in test_known["UNGA"]: test_known["UNGA"].append(v)
        if v not in test_known["UNCSW"]: test_known["UNCSW"].append(v)
        if v not in test_known["UNHRC"]: test_known["UNHRC"].append(v)
    test_known["IPL"] = ["Mumbai Indians","Chennai Super Kings","Royal Challengers Bengaluru","Kolkata Knight Riders",
                         "Sunrisers Hyderabad","Rajasthan Royals","Delhi Capitals","Punjab Kings","Gujarat Titans","Lucknow Super Giants"]
    test_known["IP"]  = ["Photojournalism","Written Journalism","Editorial Caricature"]
    test_known["USSIC"] = ["CIA Director","FBI Director","NSA Director","Marco Rubio","Mark Warner"]
    test_known["AIPPM"] = ["Narendra Modi","Rahul Gandhi","Amit Shah"]

    for desc, raw_c, raw_p, expected in SCENARIOS:
        nonsense_c = is_clearly_nonsense(raw_c)
        nonsense_p = is_clearly_nonsense(raw_p)

        if nonsense_c or nonsense_p:
            outcome = "freeform"
            method  = "nonsense_filter"
        else:
            committee, c_method, _ = normalize_name(raw_c, COMMITTEE_ALIASES, list(test_known.keys()))
            if c_method in ("unresolved","too_short"):
                outcome = "freeform"; method = f"committee_unresolved:{c_method}"
            else:
                portfolio_n, p_method, _ = normalize_name(raw_p, COUNTRY_ALIASES, test_known.get(committee,[]))
                if portfolio_n in [p for pts in test_known.values() for p in pts]:
                    outcome = "valid"; method = p_method
                else:
                    outcome = "freeform"; method = f"unresolved:{p_method}"

        passed = (outcome == expected)
        results.append({
            "scenario": desc,
            "input": f"{raw_c} | {raw_p}",
            "expected": expected,
            "got": outcome,
            "method": method,
            "pass": passed,
        })

    passed_count = sum(1 for r in results if r["pass"])
    return JSONResponse({
        "total": len(results),
        "passed": passed_count,
        "failed": len(results) - passed_count,
        "results": results,
    })
