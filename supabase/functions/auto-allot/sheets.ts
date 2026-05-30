// Google Sheets API v4 — appends delegate row to SGS or External sheet

async function buildJwt(clientEmail: string, privateKeyPem: string, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim  = base64url(JSON.stringify({
    iss: clientEmail, scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }))
  const unsigned = `${header}.${claim}`

  const pemBody = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned)
  )
  const signature = base64url(String.fromCharCode(...new Uint8Array(sigBytes)))
  return `${unsigned}.${signature}`
}

function base64url(input: string | Uint8Array): string {
  const str = typeof input === 'string' ? btoa(input) : btoa(String.fromCharCode(...input))
  return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getAccessToken(scope: string, cfg: Record<string, string>): Promise<string | null> {
  const clientEmail = cfg.GOOGLE_CLIENT_EMAIL
  const privateKey  = cfg.GOOGLE_PRIVATE_KEY
  if (!clientEmail || !privateKey) return null

  const pem = privateKey.replace(/\\n/g, '\n')

  const jwt = await buildJwt(clientEmail, pem, scope)
  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  return data.access_token as string ?? null
}

export async function appendToSheet(params: {
  type: 'sgs' | 'external'
  row: Record<string, unknown>
  cfg: Record<string, string>
}): Promise<void> {
  const { cfg } = params
  const sheetIdSGS      = cfg.GOOGLE_SHEET_ID_SGS
  const sheetIdExternal = cfg.GOOGLE_SHEET_ID_EXTERNAL

  if (!sheetIdSGS || !sheetIdExternal) {
    console.warn('Google Sheet IDs not in edge_config — skipping sheet sync')
    return
  }

  const sheetId = params.type === 'sgs' ? sheetIdSGS : sheetIdExternal
  const token   = await getAccessToken('https://www.googleapis.com/auth/spreadsheets', cfg)
  if (!token) { console.warn('Could not get Google token — skipping sheet sync'); return }

  const COLUMNS = [
    'registration_id','full_name','email','phone','institution','class_year',
    'mun_count','committee_pref_1','committee_pref_2','committee_pref_3',
    'portfolio_pref_1','portfolio_pref_2','portfolio_pref_3',
    'allocated_committee','allocated_portfolio','allocation_status',
    'allotment_score','allotment_confidence','allotment_stability',
    'is_allotment_stable','created_at',
  ]

  const values = [COLUMNS.map(col => String(params.row[col] ?? ''))]

  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      }
    )
    if (!res.ok) console.error('Sheets API error:', await res.text())
  } catch (e) {
    console.error('appendToSheet failed:', e)
  }
}
