// MUN Allocation Engine v3.0 — TypeScript port of Python Hungarian algorithm engine

export interface Portfolio {
  id: string
  committee: string
  portfolio: string       // portfolio name (country/person/franchise)
  archive_code: string    // e.g. G-001
  min_experience: number
  prestige_tier: number
  seats: number
  status: string
  group_label: string | null
}

export interface Preference {
  committee: string
  portfolio: string
  rank: number
  is_freeform: boolean
  resolution_note: string
  original_input: string
}

export interface Delegate {
  id: string
  registration_id: string | null
  full_name: string
  email: string
  phone: string | null
  institution: string | null
  class_year: string | null
  mun_count: number
  type: string
  committee_pref_1: string | null
  committee_pref_2: string | null
  committee_pref_3: string | null
  portfolio_pref_1: string | null
  portfolio_pref_2: string | null
  portfolio_pref_3: string | null
  preferences: Preference[]
  registration_order: number
  is_duplicate: boolean
}

export interface GateFailure {
  preference: Preference
  portfolio_key: string
  reason: string
  min_required: number
  delegate_has: number
}

export interface AllocationResult {
  delegate: Delegate
  portfolio: Portfolio | null
  preference_rank: number | null
  score: number
  confidence: number
  is_stable: boolean
  stability_rate: number
  gate_failures: GateFailure[]
  reason: string
}

export interface FlaggedRequest {
  delegate_id: string
  name: string
  email: string
  original_input: string
  resolved_to: string
  preference_rank: number
  resolution_method: string
  confidence: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BASE_PREF_WEIGHT   = 0.70
const BASE_EXP_WEIGHT    = 0.30
const MAX_PREFS          = 3
const FUZZY_THRESHOLD    = 80
const JARO_THRESHOLD     = 0.75
const INFINITE_COST      = 1e9
const MONTE_CARLO_RUNS   = 50     // 50 is safe for 350 delegates within 60s Edge Function timeout
const CONTESTED_THRESHOLD = 0.15
const PREF_RANK_SCORES: Record<number, number> = { 1: 1.0, 2: 0.6, 3: 0.3 }

// ── Alias maps (ported from Python) ───────────────────────────────────────────

const COUNTRY_ALIASES: Record<string, string> = {
  'us': 'United States', 'usa': 'United States', 'united states of america': 'United States',
  'america': 'United States', 'u.s.': 'United States', 'u.s.a.': 'United States',
  'uk': 'United Kingdom', 'great britain': 'United Kingdom', 'britain': 'United Kingdom',
  'u.k': 'United Kingdom', 'the uk': 'United Kingdom', 'the united kingdom': 'United Kingdom',
  'russia': 'Russia', 'russian federation': 'Russia', 'rf': 'Russia', 'ussr': 'Russia',
  'china': 'China', 'prc': 'China', 'peoples republic of china': 'China',
  "people's republic of china": 'China', 'zhongguo': 'China',
  'india': 'India', 'republic of india': 'India', 'bharat': 'India',
  'germany': 'Germany', 'federal republic of germany': 'Germany', 'deutschland': 'Germany',
  'france': 'France', 'french republic': 'France', 'la france': 'France',
  'brazil': 'Brazil', 'brasil': 'Brazil', 'federative republic of brazil': 'Brazil',
  'japan': 'Japan', 'nippon': 'Japan',
  'canada': 'Canada', 'dominion of canada': 'Canada',
  'australia': 'Australia', 'commonwealth of australia': 'Australia',
  'mexico': 'Mexico', 'united mexican states': 'Mexico', 'mejico': 'Mexico',
  'norway': 'Norway', 'kingdom of norway': 'Norway', 'norge': 'Norway',
  'netherlands': 'Netherlands', 'holland': 'Netherlands', 'the netherlands': 'Netherlands',
  'pakistan': 'Pakistan', 'islamic republic of pakistan': 'Pakistan',
  'nigeria': 'Nigeria', 'federal republic of nigeria': 'Nigeria',
  'south africa': 'South Africa', 'rsa': 'South Africa',
  'south korea': 'South Korea', 'republic of korea': 'South Korea', 'rok': 'South Korea',
  'north korea': 'North Korea', 'dprk': 'North Korea',
  'iran': 'Iran', 'islamic republic of iran': 'Iran', 'persia': 'Iran',
  'saudi arabia': 'Saudi Arabia', 'ksa': 'Saudi Arabia',
  'uae': 'UAE', 'united arab emirates': 'UAE', 'emirates': 'UAE',
  'turkey': 'Türkiye', 'turkiye': 'Türkiye', 'republic of turkey': 'Türkiye',
  'israel': 'Israel', 'state of israel': 'Israel',
  'egypt': 'Egypt', 'arab republic of egypt': 'Egypt',
  'kenya': 'Kenya', 'republic of kenya': 'Kenya',
  'ghana': 'Ghana', 'republic of ghana': 'Ghana',
  'indonesia': 'Indonesia', 'republic of indonesia': 'Indonesia',
  'malaysia': 'Malaysia', 'federation of malaysia': 'Malaysia',
  'singapore': 'Singapore', 'republic of singapore': 'Singapore',
  'new zealand': 'New Zealand', 'aotearoa': 'New Zealand',
  'sweden': 'Sweden', 'kingdom of sweden': 'Sweden',
  'denmark': 'Denmark', 'kingdom of denmark': 'Denmark',
  'finland': 'Finland', 'republic of finland': 'Finland',
  'switzerland': 'Switzerland', 'swiss confederation': 'Switzerland',
  'austria': 'Austria', 'republic of austria': 'Austria',
  'spain': 'Spain', 'kingdom of spain': 'Spain', 'espana': 'Spain',
  'italy': 'Italy', 'italian republic': 'Italy', 'italia': 'Italy',
  'portugal': 'Portugal', 'portuguese republic': 'Portugal',
  'poland': 'Poland', 'republic of poland': 'Poland',
  'ukraine': 'Ukraine', 'czechia': 'Czech Republic', 'czech republic': 'Czech Republic',
}

const COMMITTEE_ALIASES: Record<string, string> = {
  'unga': 'UNGA', 'general assembly': 'UNGA', 'un general assembly': 'UNGA',
  'united nations general assembly': 'UNGA', 'ga': 'UNGA',
  'unhrc': 'UNHRC', 'human rights council': 'UNHRC', 'un human rights council': 'UNHRC',
  'hrc': 'UNHRC', 'hr council': 'UNHRC',
  'uncsw': 'UNCSW', 'commission on the status of women': 'UNCSW',
  'csw': 'UNCSW', "women's commission": 'UNCSW',
  'aippm': 'AIPPM', 'all india political parties meet': 'AIPPM', 'aipp': 'AIPPM',
  'ipl': 'IPL', 'indian premier league': 'IPL',
  'ip': 'IP', 'international press': 'IP', 'press corps': 'IP', 'press': 'IP',
  'ussic': 'USSIC', 'us senate intelligence committee': 'USSIC',
  'senate intelligence committee': 'USSIC', 'senate intel': 'USSIC',
}

// ── Jaro-Winkler (inline, no library) ─────────────────────────────────────────

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0
  const len1 = s1.length, len2 = s2.length
  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0)
  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)
  let matches = 0, transpositions = 0
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist)
    const end = Math.min(i + matchDist + 1, len2)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = s2Matches[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0.0
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  let prefix = 0
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] !== s2[i]) break
    prefix++
  }
  return jaro + prefix * 0.1 * (1 - jaro)
}

// ── Levenshtein ratio (for fuzzy matching) ────────────────────────────────────

function levenshteinRatio(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  const dist = dp[m][n]
  return (1 - dist / Math.max(m, n)) * 100
}

function bestFuzzyMatch(query: string, candidates: string[]): { match: string; score: number } | null {
  let best = { match: '', score: 0 }
  for (const c of candidates) {
    const score = levenshteinRatio(query, c)
    if (score > best.score) best = { match: c, score }
  }
  return best.score >= FUZZY_THRESHOLD ? best : null
}

// ── Name normalizer (3-layer) ──────────────────────────────────────────────────

function normalizeName(
  raw: string,
  aliasMap: Record<string, string>,
  knownNames: string[]
): { canonical: string; method: string; confidence: number } {
  if (!raw || !raw.trim()) return { canonical: '', method: 'empty', confidence: 0 }
  const cleaned = raw.trim().toLowerCase()

  // Layer 1: alias map
  if (aliasMap[cleaned]) {
    const canonical = aliasMap[cleaned]
    return {
      canonical,
      method: knownNames.includes(canonical) ? 'alias' : 'alias_not_in_matrix',
      confidence: knownNames.includes(canonical) ? 1.0 : 0.9,
    }
  }

  // Layer 2: levenshtein fuzzy
  const fuzzy = bestFuzzyMatch(cleaned, knownNames.map(n => n.toLowerCase()))
  if (fuzzy) {
    const canonical = knownNames.find(n => n.toLowerCase() === fuzzy.match) || fuzzy.match
    return { canonical, method: `fuzzy(${fuzzy.score.toFixed(0)}%)`, confidence: fuzzy.score / 100 }
  }

  // Layer 3: Jaro-Winkler phonetic
  let bestJaro = 0, bestMatch = ''
  for (const known of knownNames) {
    const score = jaroWinkler(cleaned, known.toLowerCase())
    if (score > bestJaro) { bestJaro = score; bestMatch = known }
  }
  if (bestJaro >= JARO_THRESHOLD) {
    return { canonical: bestMatch, method: `phonetic(${bestJaro.toFixed(2)})`, confidence: bestJaro }
  }

  return { canonical: raw.trim(), method: 'unresolved', confidence: 0.0 }
}

// ── Preference resolver ────────────────────────────────────────────────────────

export function resolvePreferences(
  delegate: Omit<Delegate, 'preferences'>,
  knownCommittees: string[],
  knownPortfolios: Map<string, string[]>  // committee -> list of portfolio names
): { preferences: Preference[]; flagged: FlaggedRequest[] } {
  const preferences: Preference[] = []
  const flagged: FlaggedRequest[] = []

  for (let rank = 1; rank <= MAX_PREFS; rank++) {
    const rawC  = (delegate as any)[`committee_pref_${rank}`] as string | null
    const rawP  = (delegate as any)[`portfolio_pref_${rank}`] as string | null
    if (!rawC || !rawP) continue

    const cResult = normalizeName(rawC, COMMITTEE_ALIASES, knownCommittees)
    const committee = cResult.canonical

    const portfoliosForCommittee = knownPortfolios.get(committee) || []
    const pResult = normalizeName(rawP, COUNTRY_ALIASES, portfoliosForCommittee)
    const portfolio = pResult.canonical

    const key = `${committee}|${portfolio}`
    const allKnown = Array.from(knownPortfolios.values()).flat()
    const is_freeform = !allKnown.includes(portfolio) || !knownCommittees.includes(committee)

    if (is_freeform) {
      flagged.push({
        delegate_id: delegate.id,
        name: delegate.full_name,
        email: delegate.email,
        original_input: `${rawC} | ${rawP}`,
        resolved_to: `${committee} | ${portfolio}`,
        preference_rank: rank,
        resolution_method: `${cResult.method} / ${pResult.method}`,
        confidence: (cResult.confidence + pResult.confidence) / 2,
      })
    }

    const noteparts: string[] = []
    if (cResult.method !== 'exact' && rawC) noteparts.push(`'${rawC}'->'${committee}' [${cResult.method}]`)
    if (pResult.method !== 'exact' && rawP) noteparts.push(`'${rawP}'->'${portfolio}' [${pResult.method}]`)

    preferences.push({
      committee,
      portfolio,
      rank,
      is_freeform,
      resolution_note: noteparts.join(' | ') || 'exact match',
      original_input: `${rawC} | ${rawP}`,
    })
  }

  return { preferences, flagged }
}

// ── Weight calibration ─────────────────────────────────────────────────────────

export function calibrateWeights(delegates: Delegate[]): { prefWeight: number; expWeight: number } {
  const counts = delegates.map(d => d.mun_count).filter(c => c > 0)
  if (counts.length < 3) return { prefWeight: BASE_PREF_WEIGHT, expWeight: BASE_EXP_WEIGHT }

  const mean = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0

  if (cv < 0.3) {
    const prefWeight = Math.min(0.85, BASE_PREF_WEIGHT + 0.10)
    return { prefWeight, expWeight: 1 - prefWeight }
  }
  if (cv > 0.8) {
    const prefWeight = Math.max(0.60, BASE_PREF_WEIGHT - 0.05)
    return { prefWeight, expWeight: 1 - prefWeight }
  }
  return { prefWeight: BASE_PREF_WEIGHT, expWeight: BASE_EXP_WEIGHT }
}

// ── Scoring ────────────────────────────────────────────────────────────────────

function normalizeExperience(munCount: number, allCounts: number[]): number {
  const maxExp = Math.max(...allCounts, 1)
  return Math.log1p(munCount) / Math.log1p(maxExp)
}

function computeScore(
  prefRank: number,
  expNorm: number,
  prefWeight: number,
  expWeight: number
): number {
  const prefScore = PREF_RANK_SCORES[prefRank] ?? 0.05
  return prefWeight * prefScore + expWeight * expNorm
}

// ── Hungarian algorithm (Munkres) ─────────────────────────────────────────────
// Inline implementation — no npm dependency needed for small matrices

function hungarian(costMatrix: number[][]): [number[], number[]] {
  const n = costMatrix.length
  const INF = 1e18
  const u = new Array(n + 1).fill(0)
  const v = new Array(n + 1).fill(0)
  const p = new Array(n + 1).fill(0)
  const way = new Array(n + 1).fill(0)

  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minVal = new Array(n + 1).fill(INF)
    const used = new Array(n + 1).fill(false)
    do {
      used[j0] = true
      let i0 = p[j0], delta = INF, j1 = -1
      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j]
          if (cur < minVal[j]) { minVal[j] = cur; way[j] = j0 }
          if (minVal[j] < delta) { delta = minVal[j]; j1 = j }
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta }
        else minVal[j] -= delta
      }
      j0 = j1!
    } while (p[j0] !== 0)
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1 } while (j0)
  }

  const rowInd: number[] = []
  const colInd: number[] = []
  for (let j = 1; j <= n; j++) {
    if (p[j] !== 0) { rowInd.push(p[j] - 1); colInd.push(j - 1) }
  }
  return [rowInd, colInd]
}

// ── Cost matrix builder ────────────────────────────────────────────────────────

function buildCostMatrix(
  delegates: Delegate[],
  slots: Portfolio[],
  allCounts: number[],
  prefWeight: number,
  expWeight: number
): { costMatrix: number[][]; scoreMatrix: number[][] } {
  const n = Math.max(delegates.length, slots.length)
  const costMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(INFINITE_COST))
  const scoreMatrix: number[][] = Array.from({ length: delegates.length }, () => new Array(slots.length).fill(0))

  for (let i = 0; i < delegates.length; i++) {
    const delegate = delegates[i]
    const expNorm = normalizeExperience(delegate.mun_count, allCounts)
    const prefMap = new Map<string, number>()
    for (const pref of delegate.preferences) {
      if (!pref.is_freeform) {
        const key = `${pref.committee}|${pref.portfolio}`
        prefMap.set(key, pref.rank)
      }
    }

    for (let j = 0; j < slots.length; j++) {
      const slot = slots[j]
      if (delegate.mun_count < slot.min_experience) continue

      const key = `${slot.committee}|${slot.portfolio}`
      const prefRank = prefMap.has(key) ? prefMap.get(key)! : MAX_PREFS + 1
      const expMult = prefMap.has(key) ? 1 : 0.1
      const score = computeScore(prefRank, expNorm * expMult, prefWeight, expWeight)
      costMatrix[i][j] = 1 - score
      scoreMatrix[i][j] = score
    }
  }

  return { costMatrix, scoreMatrix }
}

// ── Confidence scoring ─────────────────────────────────────────────────────────

function computeConfidence(
  delegateIdx: number,
  slotIdx: number,
  scoreMatrix: number[][],
  costMatrix: number[][]
): number {
  const assignedScore = scoreMatrix[delegateIdx]?.[slotIdx] ?? 0
  const eligible = scoreMatrix[delegateIdx]
    ?.filter((_, j) => j !== slotIdx && costMatrix[delegateIdx][j] < INFINITE_COST) ?? []
  if (eligible.length === 0) return 1.0
  const nextBest = Math.max(...eligible)
  return Math.min(1, Math.max(0, 0.5 + (assignedScore - nextBest) * 2))
}

// ── Monte Carlo stability ─────────────────────────────────────────────────────

function runMonteCarlo(
  delegates: Delegate[],
  slots: Portfolio[],
  allCounts: number[],
  prefWeight: number,
  expWeight: number
): Map<string, { mostCommon: string; rate: number; isStable: boolean }> {
  const counts = new Map<string, Map<string, number>>()

  for (let run = 0; run < MONTE_CARLO_RUNS; run++) {
    const shuffled = [...delegates].sort(() => Math.random() - 0.5)
    const { costMatrix, scoreMatrix } = buildCostMatrix(shuffled, slots, allCounts, prefWeight, expWeight)
    const [rowInd, colInd] = hungarian(costMatrix)

    for (let k = 0; k < rowInd.length; k++) {
      const i = rowInd[k], j = colInd[k]
      if (i >= shuffled.length || j >= slots.length) continue
      if (costMatrix[i][j] >= INFINITE_COST) continue
      const dId = shuffled[i].id
      const pKey = `${slots[j].committee}|${slots[j].portfolio}`
      if (!counts.has(dId)) counts.set(dId, new Map())
      counts.get(dId)!.set(pKey, (counts.get(dId)!.get(pKey) ?? 0) + 1)
    }
  }

  const stability = new Map<string, { mostCommon: string; rate: number; isStable: boolean }>()
  for (const d of delegates) {
    const dCounts = counts.get(d.id)
    if (!dCounts || dCounts.size === 0) {
      stability.set(d.id, { mostCommon: '', rate: 0, isStable: false })
      continue
    }
    let maxKey = '', maxVal = 0
    for (const [k, v] of dCounts) if (v > maxVal) { maxKey = k; maxVal = v }
    const rate = maxVal / MONTE_CARLO_RUNS
    stability.set(d.id, { mostCommon: maxKey, rate, isStable: rate >= (1 - CONTESTED_THRESHOLD) })
  }
  return stability
}

// ── Main matching engine ───────────────────────────────────────────────────────

export function runMatching(
  delegates: Delegate[],
  portfolios: Portfolio[],
  prefWeight: number,
  expWeight: number
): AllocationResult[] {
  // Expand portfolios to seats (one slot per seat)
  const slots: Portfolio[] = []
  for (const p of portfolios) {
    for (let s = 0; s < (p.seats || 1); s++) slots.push(p)
  }

  const allCounts = delegates.map(d => d.mun_count)
  const stability = runMonteCarlo(delegates, slots, allCounts, prefWeight, expWeight)
  const { costMatrix, scoreMatrix } = buildCostMatrix(delegates, slots, allCounts, prefWeight, expWeight)
  const [rowInd, colInd] = hungarian(costMatrix)

  const results: AllocationResult[] = []

  for (let k = 0; k < rowInd.length; k++) {
    const i = rowInd[k], j = colInd[k]
    if (i >= delegates.length) continue

    const delegate = delegates[i]
    const gateFailures: GateFailure[] = delegate.preferences
      .filter(p => !p.is_freeform)
      .filter(p => {
        const port = portfolios.find(pt => pt.committee === p.committee && pt.portfolio === p.portfolio)
        return port && delegate.mun_count < port.min_experience
      })
      .map(p => {
        const port = portfolios.find(pt => pt.committee === p.committee && pt.portfolio === p.portfolio)!
        return {
          preference: p,
          portfolio_key: `${p.committee}|${p.portfolio}`,
          reason: `Requires ${port.min_experience} MUNs, delegate has ${delegate.mun_count}`,
          min_required: port.min_experience,
          delegate_has: delegate.mun_count,
        }
      })

    if (j < slots.length && costMatrix[i][j] < INFINITE_COST) {
      const portfolio = slots[j]
      let preference_rank: number | null = null
      for (const pref of delegate.preferences) {
        if (!pref.is_freeform && pref.committee === portfolio.committee && pref.portfolio === portfolio.portfolio) {
          preference_rank = pref.rank
          break
        }
      }

      const score = scoreMatrix[i]?.[j] ?? 0
      const confidence = computeConfidence(i, j, scoreMatrix, costMatrix)
      const stab = stability.get(delegate.id) ?? { mostCommon: '', rate: 1, isStable: true }

      const reason = preference_rank
        ? `Preference #${preference_rank} satisfied | Score: ${score.toFixed(4)} | Stability: ${(stab.rate * 100).toFixed(0)}%`
        : `Auto-allocated | Score: ${score.toFixed(4)}`

      results.push({
        delegate, portfolio, preference_rank, score: Math.round(score * 1e5) / 1e5,
        confidence: Math.round(confidence * 1e3) / 1e3,
        is_stable: stab.isStable, stability_rate: Math.round(stab.rate * 1e3) / 1e3,
        gate_failures: gateFailures, reason,
      })
    } else {
      let reason = 'UNALLOCATED'
      if (gateFailures.length > 0) {
        reason = `UNALLOCATED — all preferences experience-gated: ${gateFailures.map(f => `Pref#${f.preference.rank}: ${f.reason}`).join('; ')}`
      } else if (!delegate.preferences.some(p => !p.is_freeform)) {
        reason = 'UNALLOCATED — no valid preferences and no eligible seats remain'
      }
      results.push({
        delegate, portfolio: null, preference_rank: null,
        score: 0, confidence: 0, is_stable: false, stability_rate: 0,
        gate_failures: gateFailures, reason,
      })
    }
  }

  return results
}
