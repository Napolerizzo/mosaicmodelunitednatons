// Google Drive API v3 — copies uploaded files from Supabase Storage to Google Drive

function base64url(input: string | Uint8Array): string {
  const str = typeof input === 'string' ? btoa(input) : btoa(String.fromCharCode(...input))
  return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

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
  return `${unsigned}.${base64url(String.fromCharCode(...new Uint8Array(sigBytes)))}`
}

async function getDriveToken(cfg: Record<string, string>): Promise<string | null> {
  const clientEmail = cfg.GOOGLE_CLIENT_EMAIL
  const privateKey  = cfg.GOOGLE_PRIVATE_KEY
  if (!clientEmail || !privateKey) return null

  const pem = privateKey.replace(/\\n/g, '\n')
  const jwt = await buildJwt(clientEmail, pem, 'https://www.googleapis.com/auth/drive.file')

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  return (await res.json()).access_token as string ?? null
}

export async function copyFilesToDrive(params: {
  registrationId: string
  supabaseStoragePaths: Array<{ path: string; label: string }>
  supabaseUrl: string
  supabaseServiceRoleKey: string
  cfg: Record<string, string>
}): Promise<void> {
  const { cfg } = params
  const folderId = cfg.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) { console.warn('GOOGLE_DRIVE_FOLDER_ID not in edge_config — skipping Drive sync'); return }

  const token = await getDriveToken(cfg)
  if (!token) { console.warn('Could not get Drive token — skipping Drive sync'); return }

  for (const { path, label } of params.supabaseStoragePaths) {
    if (!path) continue
    const ext = path.split('.').pop() ?? 'bin'
    const fileName = `${params.registrationId}_${label}.${ext}`

    try {
      // Download from Supabase Storage
      const dlUrl = `${params.supabaseUrl}/storage/v1/object/registration-files/${path}`
      const fileRes = await fetch(dlUrl, {
        headers: { Authorization: `Bearer ${params.supabaseServiceRoleKey}` },
      })
      if (!fileRes.ok) { console.warn(`Could not download ${path}: ${fileRes.status}`); continue }

      const fileBytes  = await fileRes.arrayBuffer()
      const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream'

      // Multipart upload to Google Drive
      const boundary = 'MosaicMUNBoundary'
      const meta     = JSON.stringify({ name: fileName, parents: [folderId] })
      const enc      = new TextEncoder()
      const body     = new Uint8Array([
        ...enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
        ...enc.encode(`--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
        ...new Uint8Array(fileBytes),
        ...enc.encode(`\r\n--${boundary}--`),
      ])

      const upRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      )
      if (!upRes.ok) console.error('Drive upload failed for', fileName, await upRes.text())
    } catch (e) {
      console.error('Drive upload error for', fileName, e)
    }
  }
}
