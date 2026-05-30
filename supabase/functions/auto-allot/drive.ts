// Google Drive API v3 — copies uploaded files from Supabase Storage to Google Drive folder

async function getDriveToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const claim = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const unsigned = `${header}.${claim}`
  const pemBody = (sa.private_key as string).replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned))
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${signature}`,
  })
  return (await tokenRes.json()).access_token as string
}

export async function copyFilesToDrive(params: {
  registrationId: string
  supabaseStoragePaths: Array<{ path: string; label: string }>
  supabaseUrl: string
  supabaseServiceRoleKey: string
}): Promise<void> {
  const saJson      = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
  const folderId    = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')

  if (!saJson || !folderId) {
    console.warn('Google Drive env vars not configured — skipping Drive sync')
    return
  }

  try {
    const token = await getDriveToken(saJson)

    for (const { path, label } of params.supabaseStoragePaths) {
      if (!path) continue
      const ext = path.split('.').pop() ?? 'bin'
      const fileName = `${params.registrationId}_${label}.${ext}`

      // Download from Supabase Storage using service role key
      const downloadUrl = `${params.supabaseUrl}/storage/v1/object/registration-files/${path}`
      const fileRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${params.supabaseServiceRoleKey}` },
      })
      if (!fileRes.ok) { console.warn(`Could not download ${path}`); continue }

      const fileBytes = await fileRes.arrayBuffer()
      const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream'

      // Multipart upload to Google Drive
      const boundary = '----MosaicMUNBoundary'
      const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
      const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
      const filePart = `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
      const closing  = `\r\n--${boundary}--`

      const enc = new TextEncoder()
      const body = new Uint8Array([
        ...enc.encode(metaPart),
        ...enc.encode(filePart),
        ...new Uint8Array(fileBytes),
        ...enc.encode(closing),
      ])

      const uploadRes = await fetch(
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
      if (!uploadRes.ok) {
        console.error('Drive upload failed:', await uploadRes.text())
      }
    }
  } catch (e) {
    console.error('copyFilesToDrive failed:', e)
  }
}
