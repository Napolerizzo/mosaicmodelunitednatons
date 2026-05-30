// Google Sheets API v4 integration — appends delegate row to SGS or External sheet

async function getServiceAccountToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const claim = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const unsigned = `${header}.${claim}`

  // Import private key
  const pemKey = sa.private_key as string
  const pemBody = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(unsigned)
  )
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${unsigned}.${signature}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenRes.json()
  return tokenData.access_token as string
}

export async function appendToSheet(params: {
  type: 'sgs' | 'external'
  row: Record<string, string | number | null>
}): Promise<void> {
  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
  const sheetIdSGS = Deno.env.get('GOOGLE_SHEET_ID_SGS')
  const sheetIdExternal = Deno.env.get('GOOGLE_SHEET_ID_EXTERNAL')

  if (!saJson || !sheetIdSGS || !sheetIdExternal) {
    console.warn('Google Sheets env vars not configured — skipping sheet sync')
    return
  }

  const sheetId = params.type === 'sgs' ? sheetIdSGS : sheetIdExternal

  const COLUMNS = [
    'registration_id', 'full_name', 'email', 'phone', 'institution', 'class_year',
    'mun_count', 'committee_pref_1', 'committee_pref_2', 'committee_pref_3',
    'portfolio_pref_1', 'portfolio_pref_2', 'portfolio_pref_3',
    'allocated_committee', 'allocated_portfolio', 'allocation_status',
    'allotment_score', 'allotment_confidence', 'allotment_stability', 'is_allotment_stable',
    'created_at',
  ]

  const values = [COLUMNS.map(col => String(params.row[col] ?? ''))]

  try {
    const token = await getServiceAccountToken(saJson)
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('Sheets API error:', err)
    }
  } catch (e) {
    console.error('appendToSheet failed:', e)
  }
}
