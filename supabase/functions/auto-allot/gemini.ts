// Gemini API integration — decides whether freeform portfolio requests should be added to the matrix

const COMMITTEE_CONTEXTS: Record<string, string> = {
  UNGA:  'United Nations General Assembly — member states debate and vote on international resolutions. Each delegate represents a UN member country.',
  UNCSW: 'UN Commission on the Status of Women — member states discuss gender equality and women\'s rights. Each delegate represents a UN member country.',
  UNHRC: 'UN Human Rights Council — member states review and address global human rights situations. Each delegate represents a UN member country.',
  AIPPM: 'All India Political Parties Meet — Indian politicians debate domestic policy. Each delegate represents a real Indian political leader or party.',
  IPL:   'Indian Premier League committee — franchise owners and administrators debate league governance. Each delegate represents an IPL franchise.',
  IP:    'International Press — journalists cover other committees. Each delegate is a press track (Photojournalism, Written Journalism, Editorial Caricature).',
  USSIC: 'US Senate Intelligence Committee — senators and intelligence officials discuss national security. Each delegate represents a real US senator, intelligence director, or executive official.',
}

export interface GeminiDecision {
  add: boolean
  reason: string
  canonical_name: string
}

export async function consultGemini(
  committee: string,
  requestedPortfolio: string,
  existingPortfolios: string[]
): Promise<GeminiDecision> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return { add: false, reason: 'Gemini API key not configured', canonical_name: requestedPortfolio }

  const context = COMMITTEE_CONTEXTS[committee] ?? `${committee} — Model UN committee.`
  const existing = existingPortfolios.slice(0, 20).join(', ')

  const prompt = `You are helping manage a Model UN conference portfolio matrix.

Committee: ${committee}
Context: ${context}
Existing portfolios (sample): ${existing}

A delegate requested a portfolio not in our matrix: "${requestedPortfolio}"

Should this portfolio be added to this committee? Consider:
1. Is it a real, valid entity that would belong in this committee?
2. Is it substantially different from existing portfolios (not a duplicate/alias)?
3. Does it make sense in a Model UN context for this specific committee?

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{"add": true/false, "reason": "one sentence reason", "canonical_name": "the clean official name to use"}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      }
    )

    if (!res.ok) return { add: false, reason: `Gemini error ${res.status}`, canonical_name: requestedPortfolio }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as GeminiDecision
    return parsed
  } catch {
    return { add: false, reason: 'Failed to parse Gemini response', canonical_name: requestedPortfolio }
  }
}
