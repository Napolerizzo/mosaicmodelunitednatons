// Gemini integration — cheapest model, maximum context, conservative trigger
// Only called when the 3-layer fuzzy resolver CANNOT match to any known portfolio.
// Model: gemini-2.0-flash-lite (free tier, ~$0.00 for this scale)

const MODEL = 'gemini-2.0-flash-lite'

const COMMITTEE_FULL_CONTEXT: Record<string, string> = {
  UNGA: `United Nations General Assembly (UNGA)
Agenda: Addressing Global Refugee Crisis and Displacement
Each delegate represents ONE UN member state (country).
Valid portfolios: any of the 193 UN member states.
Invalid: NGOs, individuals, companies, fictional states, non-UN entities.`,

  UNCSW: `UN Commission on the Status of Women (UNCSW)
Agenda: Bridging the Digital Gender Divide
Each delegate represents ONE UN member state (country).
Valid portfolios: any of the 193 UN member states.
Invalid: individuals, organizations, companies.`,

  UNHRC: `UN Human Rights Council (UNHRC)
Agenda: Protecting Human Rights Defenders in Armed Conflict Zones
Each delegate represents ONE UN member state (country).
Valid portfolios: any of the 193 UN member states.
Invalid: individuals, NGOs, companies.`,

  AIPPM: `All India Political Parties Meet (AIPPM)
Agenda: India's Military Response to Cross-Border Terrorism
Each delegate represents ONE named Indian politician currently active in Indian politics.
Valid portfolios: real Indian politicians (MPs, MLAs, CMs, ministers, party presidents).
Invalid: fictional politicians, foreign politicians, companies, states/regions.`,

  IPL: `Indian Premier League (IPL) Committee
Agenda: IPL Expansion, Broadcasting Rights & Player Salary Cap
Each delegate represents ONE IPL franchise (existing, legacy, or expansion).
Valid portfolios: Mumbai Indians, Chennai Super Kings, RCB, KKR, SRH, RR, DC, PBKS, GT, LSG, and expansion franchises.
Invalid: players, sponsors, individuals, non-franchise entities.`,

  IP: `International Press (IP) Corps
Each delegate is a press track, not a country or person.
Valid portfolios: ONLY these three tracks — Photojournalism, Written Journalism, Editorial Caricature.
Invalid: anything else whatsoever. Every other input must be rejected.`,

  USSIC: `US Senate Intelligence Committee (USSIC)
Agenda: Foreign Interference in US Critical Infrastructure
Each delegate represents ONE real US senator, senior intelligence official, or executive branch official.
Valid portfolios: sitting US Senators, Directors of intelligence agencies (CIA, FBI, NSA, DNI, DIA, CISA), senior executive branch officials (President, VP, SecState, SecDef, AG), senior military leaders, tech CEOs (if relevant to intelligence oversight).
Invalid: foreign nationals, fictional characters, private citizens.`,
}

export interface GeminiDecision {
  add: boolean
  reason: string
  canonical_name: string
}

export async function consultGemini(
  committee: string,
  requestedPortfolio: string,
  existingPortfolios: string[],
  cfg: Record<string, string>
): Promise<GeminiDecision> {
  const apiKey = cfg.GEMINI_API_KEY
  if (!apiKey) return { add: false, reason: 'Gemini API key not configured', canonical_name: requestedPortfolio }

  const context = COMMITTEE_FULL_CONTEXT[committee] ?? `${committee} — Model UN committee. Be conservative.`
  const existing = existingPortfolios.join(', ')

  const prompt = `You are the portfolio validation engine for Mosaic MUN II, a school Model UN conference.
A delegate submitted a portfolio preference that could not be matched to any known portfolio.
Your job: decide if this should be ADDED to the matrix and allotted, or REJECTED (waitlisted).

COMMITTEE CONTEXT:
${context}

FULL EXISTING PORTFOLIO LIST FOR THIS COMMITTEE:
${existing}

DELEGATE'S UNRECOGNIZED INPUT: "${requestedPortfolio}"

RULES:
1. Only approve if the input is clearly a valid entity for this SPECIFIC committee.
2. If it might be a misspelling or abbreviation of something already in the list, reject it (the fuzzy matcher should have caught it — if it didn't, it's too ambiguous).
3. If it's a completely new valid addition that genuinely belongs in this committee, approve it with the correct canonical name.
4. When in doubt, REJECT. A wrong allotment is worse than a waitlist.
5. For IP committee: ALWAYS reject anything that isn't exactly one of the three tracks.

Respond ONLY with compact JSON, no markdown, no extra text:
{"add":true/false,"reason":"one short sentence","canonical_name":"exact official name to use"}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,    // deterministic — no creativity needed here
            maxOutputTokens: 120, // we only need a tiny JSON response
          },
        }),
      }
    )

    if (!res.ok) {
      console.warn(`Gemini error ${res.status} — defaulting to reject`)
      return { add: false, reason: `Gemini unavailable (${res.status})`, canonical_name: requestedPortfolio }
    }

    const data = await res.json()
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as GeminiDecision

    console.log(`Gemini decision for "${requestedPortfolio}" in ${committee}:`, parsed)
    return parsed
  } catch (e) {
    console.error('Gemini parse failed — defaulting to reject:', e)
    // Default to reject on any error — accuracy over automation
    return { add: false, reason: 'Gemini parse failed — conservatively rejected', canonical_name: requestedPortfolio }
  }
}
