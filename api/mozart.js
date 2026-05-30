// Vercel serverless function — Mozart AI endpoint
// GLM-4-Flash (primary) → Gemini 2.0 Flash Lite (fallback) → local intelligence (final fallback)
// GLM key never touches the frontend.

const GLM_KEY      = process.env.GLM_API_KEY    || '3d6a8caae0b94b9b89798a1b03250b43.Z2sillVcjvoTo3KT'
const GEMINI_KEY   = process.env.GEMINI_API_KEY || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iybxhvqixuxcfguhfqxf.supabase.co'
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5YnhodnFpeHV4Y2ZndWhmcXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjgzNTYsImV4cCI6MjA5NTYwNDM1Nn0.g2CVBnizkSRmlx4fdhrI2krjEiPQYHSGJ1ly2whcjc4'

const COMMITTEE_AGENDAS = {
  UNGA:  { name: 'United Nations General Assembly',        agenda: 'Discussing the Voting Rights of States Under Foreign Military Occupation' },
  UNCSW: { name: 'UN Commission on the Status of Women',   agenda: 'Deliberation upon Surrogate Motherhood as International Labor' },
  UNHRC: { name: 'UN Human Rights Council',                agenda: 'Discussing The Right to Be Forgotten vs. The Right to Truth in Atrocity Documentation' },
  AIPPM: { name: 'All India Political Parties Meet',       agenda: 'Operation Sindoor and the Question of Parliamentary War Powers' },
  IPL:   { name: 'Indian Premier League Committee',        agenda: 'Mega Auction' },
  IP:    { name: 'International Press Corps',              agenda: 'Photography, Caricature, and Journalism' },
  USSIC: { name: 'US Senate Intelligence Committee',       agenda: 'Discussing and Declassifying The Epstein Files' },
}

function buildSystemPrompt(delegate) {
  const ctx = COMMITTEE_AGENDAS[delegate.committee] || {}
  return `You are Mozart — the official AI intelligence of Mosaic Model United Nations II.
You were built exclusively for and by Mosaic MUN. You are not GPT, Gemini, Claude, or any other general AI.
If asked your origin or what model you are, respond only: "I am Mozart, the intelligence of Mosaic MUN."

You speak with authority, precision, and understated elegance — like a senior diplomat, never a chatbot.
Never use emoji. Never say "Great question!" or filler phrases. Be concise and substantive.

DELEGATE CONTEXT:
  Name: ${delegate.name || 'Unknown'}
  Registration ID: ${delegate.registration_id || 'N/A'}
  Committee: ${delegate.committee || 'Pending allocation'}
  Portfolio: ${delegate.portfolio || 'Pending allocation'}
  Allotment Status: ${delegate.status || 'pending'}
  Committee Full Name: ${ctx.name || ''}
  Committee Agenda: ${ctx.agenda || ''}

YOU CAN:
- Answer any question about Mosaic MUN II (conference details, committees, agendas, rules of procedure, logistics)
- Explain this delegate's portfolio in depth — who they represent, their historical position, what to research
- Brief the delegate on their committee agenda and what to expect in committee
- Tell the delegate about conference logistics: 11-12 July 2026, Saraswati Global School, Faridabad, Haryana
- Confirm their allotment details from the context provided above
- If the delegate asks to raise a query to the Secretariat, tell them to use the Queries tab in their dashboard

YOU CANNOT:
- Discuss anything unrelated to Mosaic MUN II
- Reveal any other delegate's personal information (email, phone, institution)
- Make changes to registration or allotment data
- Claim to be any other AI system

If asked about anything outside Mosaic MUN, say: "I am Mozart — my purpose is Mosaic MUN II. I cannot assist with anything outside the conference."

Sign every response with: — Mozart`
}

function localIntelligence(message, delegate) {
  const msg = message.toLowerCase()
  const ctx = COMMITTEE_AGENDAS[delegate.committee] || {}

  if (msg.includes('allot') || msg.includes('committee') || msg.includes('portfolio')) {
    if (delegate.status === 'allotted' || delegate.status === 'contested') {
      return `Your portfolio has been confirmed. You represent **${delegate.portfolio}** in the **${delegate.committee} — ${ctx.name}**.\n\nThe committee's agenda is: *${ctx.agenda}*.\n\nIf you have further questions about your portfolio or the agenda, the Secretariat is available through the Queries tab.\n\n— Mozart`
    }
    return `Your allotment is currently pending. The Secretariat is processing registrations and you will receive an email confirmation once your portfolio is confirmed.\n\n— Mozart`
  }

  if (msg.includes('venue') || msg.includes('location') || msg.includes('where') || msg.includes('faridabad')) {
    return `Mosaic MUN II will be held on **11–12 July 2026** at **Saraswati Global School, Faridabad, Haryana**. Further logistical details including reporting time and schedule will be shared closer to the conference.\n\n— Mozart`
  }

  if (msg.includes('date') || msg.includes('when') || msg.includes('july')) {
    return `Mosaic MUN II is scheduled for **11–12 July 2026**.\n\n— Mozart`
  }

  if (msg.includes('agenda')) {
    if (ctx.agenda) {
      return `The agenda for **${ctx.name}** is:\n\n*${ctx.agenda}*\n\nI recommend researching the historical background, key stakeholder positions, and recent developments related to this agenda before the conference.\n\n— Mozart`
    }
    return `Your committee assignment is pending. Once allotted, I can brief you fully on your committee's agenda.\n\n— Mozart`
  }

  if (msg.includes('contact') || msg.includes('secretariat') || msg.includes('query') || msg.includes('help')) {
    return `For formal queries to the Secretariat, please use the **Queries** tab in your dashboard. You can raise a concern there and the Secretariat will respond directly.\n\nFor urgent matters, contact: sameer.jhamb1719@gmail.com\n\n— Mozart`
  }

  return `I am Mozart — the intelligence of Mosaic MUN II. I can brief you on your committee, agenda, allotment status, and conference logistics. What would you like to know?\n\n— Mozart`
}

async function logConversation({ delegate, message, reply, model }) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/mozart_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        registration_id: delegate.registration_id || null,
        delegate_name:   delegate.name || null,
        message,
        reply,
        model_used: model,
      }),
    })
  } catch (e) {
    // Non-blocking — logging failure shouldn't break the chat
    console.warn('mozart_logs insert failed:', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, delegate = {} } = req.body || {}
  if (!message) return res.status(400).json({ error: 'message required' })

  const systemPrompt = buildSystemPrompt(delegate)

  // Try GLM-4-Flash first
  try {
    const r = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: message },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (r.ok) {
      const data = await r.json()
      const text = data.choices?.[0]?.message?.content?.trim()
      if (text) {
        await logConversation({ delegate, message, reply: text, model: 'glm-4-flash' })
        return res.json({ reply: text, model: 'glm-4-flash' })
      }
    }
  } catch (e) {
    console.warn('GLM failed:', e.message)
  }

  // Fallback: Gemini 2.0 Flash Lite
  if (GEMINI_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nDelegate says: ${message}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
          signal: AbortSignal.timeout(12000),
        }
      )
      if (r.ok) {
        const data = await r.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) {
          await logConversation({ delegate, message, reply: text, model: 'gemini-flash-lite' })
          return res.json({ reply: text, model: 'gemini-flash-lite' })
        }
      }
    } catch (e) {
      console.warn('Gemini failed:', e.message)
    }
  }

  // Final fallback: local intelligence (no API)
  const fallback = localIntelligence(message, delegate)
  await logConversation({ delegate, message, reply: fallback, model: 'local' })
  return res.json({ reply: fallback, model: 'local' })
}
