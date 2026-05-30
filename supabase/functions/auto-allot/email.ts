// Resend email builder — branded Mosaic MUN II allotment emails

const SITE = 'https://mosaicmodelunitednatons.vercel.app'
const LOGO  = `${SITE}/brand-assets/mosaic-logo-nobg.png`
const RESEND_API = 'https://api.resend.com/emails'

function qrUrl(registrationId: string): string {
  const target = encodeURIComponent(`${SITE}/verify/${registrationId}`)
  return `https://api.qrserver.com/v1/create-qr-code/?data=${target}&size=160x160&bgcolor=050402&color=9b6e09&margin=12`
}

function allotmentHtml(params: {
  name: string
  committee: string
  portfolio: string
  registrationId: string
  confidence: number
  isStable: boolean
}): string {
  const { name, committee, portfolio, registrationId, confidence, isStable } = params
  const firstName = name.split(' ')[0]
  const confPct = Math.round(confidence * 100)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Allotment Confirmed — Mosaic MUN II</title>
</head>
<body style="margin:0;padding:0;background:#050402;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050402;min-height:100vh;">
<tr><td align="center" style="padding:48px 20px 0;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Header bar -->
  <tr>
    <td style="border-bottom:1px solid rgba(155,110,9,0.25);padding-bottom:24px;padding-top:8px;">
      <img src="${LOGO}" alt="Mosaic MUN" height="28" style="opacity:0.85;display:block;" />
    </td>
  </tr>

  <!-- Stamp -->
  <tr>
    <td style="padding-top:40px;padding-bottom:8px;">
      <span style="display:inline-block;border:1.5px solid rgba(155,110,9,0.55);padding:5px 16px;font-size:9px;letter-spacing:0.44em;text-transform:uppercase;color:#9b6e09;transform:rotate(-3deg);display:inline-block;">
        ALLOTMENT CONFIRMED
      </span>
    </td>
  </tr>

  <!-- Heading -->
  <tr>
    <td style="padding-top:20px;padding-bottom:6px;">
      <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:-0.04em;color:#e8e4dc;line-height:1.05;">
        ${firstName},<br/>your seat<br/>is confirmed.
      </h1>
    </td>
  </tr>

  <!-- Sub -->
  <tr>
    <td style="padding-top:16px;padding-bottom:36px;border-bottom:1px solid rgba(155,110,9,0.1);">
      <p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.65;font-style:italic;">
        The Secretariat has reviewed your application and confirmed your allocation.<br/>
        Your portfolio has been reserved in your name.
      </p>
    </td>
  </tr>

  <!-- Allocation card -->
  <tr>
    <td style="padding-top:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(155,110,9,0.28);background:rgba(155,110,9,0.04);">

        <!-- Card header -->
        <tr>
          <td style="padding:20px 24px 16px;border-bottom:1px solid rgba(155,110,9,0.15);">
            <span style="font-size:7px;letter-spacing:0.44em;text-transform:uppercase;color:#9b6e09;opacity:0.6;">
              MOSAIC MUN II · DELEGATE CREDENTIAL
            </span>
            <span style="float:right;font-size:7px;letter-spacing:0.36em;text-transform:uppercase;color:#9b6e09;opacity:0.4;">
              ACCREDITATION
            </span>
          </td>
        </tr>

        <!-- Card body -->
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Fields -->
                <td style="vertical-align:top;padding-right:20px;">
                  <div style="margin-bottom:18px;">
                    <div style="font-size:7px;letter-spacing:0.44em;text-transform:uppercase;color:#9b6e09;opacity:0.5;margin-bottom:4px;">DELEGATE</div>
                    <div style="font-size:16px;font-weight:700;color:#e8e4dc;letter-spacing:0.01em;">${name}</div>
                  </div>
                  <div style="margin-bottom:18px;">
                    <div style="font-size:7px;letter-spacing:0.44em;text-transform:uppercase;color:#9b6e09;opacity:0.5;margin-bottom:4px;">COMMITTEE</div>
                    <div style="font-size:15px;font-weight:700;color:#e8e4dc;">${committee}</div>
                  </div>
                  <div style="margin-bottom:18px;">
                    <div style="font-size:7px;letter-spacing:0.44em;text-transform:uppercase;color:#9b6e09;opacity:0.5;margin-bottom:4px;">PORTFOLIO</div>
                    <div style="font-size:15px;font-weight:700;color:#e8e4dc;">${portfolio}</div>
                  </div>
                  <div style="margin-bottom:0;">
                    <div style="font-size:7px;letter-spacing:0.44em;text-transform:uppercase;color:#9b6e09;opacity:0.5;margin-bottom:6px;">STATUS</div>
                    <span style="font-size:9px;letter-spacing:0.28em;color:rgba(155,110,9,0.9);border:1px solid rgba(155,110,9,0.35);padding:4px 12px;text-transform:uppercase;">
                      ALLOTTED
                    </span>
                  </div>
                </td>
                <!-- QR code -->
                <td style="vertical-align:top;text-align:right;width:110px;">
                  <div style="border:1px solid rgba(155,110,9,0.22);padding:10px;display:inline-block;background:rgba(255,255,255,0.02);">
                    <img src="${qrUrl(registrationId)}" alt="Verification QR" width="90" height="90" style="display:block;" />
                  </div>
                  <div style="font-size:7px;letter-spacing:0.2em;color:#9b6e09;opacity:0.35;margin-top:6px;text-transform:uppercase;">SCAN TO VERIFY</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card footer -->
        <tr>
          <td style="padding:14px 24px;border-top:1px solid rgba(155,110,9,0.1);">
            <span style="font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6a4e;opacity:0.7;">
              11–12 JULY 2026 · SARASWATI GLOBAL SCHOOL, FARIDABAD
            </span>
            <span style="float:right;font-size:7px;letter-spacing:0.28em;text-transform:uppercase;color:#9b6e09;opacity:0.45;border:1px solid rgba(155,110,9,0.2);padding:2px 8px;">
              ${confPct}% CONFIDENCE${isStable ? '' : ' · REVIEW'}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Note -->
  <tr>
    <td style="padding:28px 0 12px;">
      <p style="margin:0;font-size:11px;color:#7a6a4e;line-height:1.85;font-style:italic;">
        Registration ID: <strong style="color:#9b6e09;letter-spacing:0.1em;">${registrationId}</strong><br/>
        Save this credential. Bring your registration ID to the conference for check-in.<br/>
        For queries, contact the Secretariat at
        <a href="mailto:sameer.jhamb1719@gmail.com" style="color:#9b6e09;text-decoration:none;">sameer.jhamb1719@gmail.com</a>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 0 48px;border-top:1px solid rgba(155,110,9,0.1);">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <img src="${LOGO}" alt="Mosaic MUN" height="20" style="opacity:0.45;display:block;margin-bottom:6px;" />
            <div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:#5a4e38;opacity:0.7;">
              Mosaic MUN II &nbsp;·&nbsp; Saraswati Global School
            </div>
          </td>
          <td style="text-align:right;vertical-align:bottom;">
            <a href="https://instagram.com/mosaicmunofficial" style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:#9b6e09;opacity:0.5;text-decoration:none;">
              Instagram ↗
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function waitlistHtml(params: { name: string; registrationId: string }): string {
  const { name, registrationId } = params
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Waitlisted — Mosaic MUN II</title></head>
<body style="margin:0;padding:0;background:#050402;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050402;min-height:100vh;">
<tr><td align="center" style="padding:48px 20px 0;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr>
    <td style="border-bottom:1px solid rgba(155,110,9,0.25);padding-bottom:24px;padding-top:8px;">
      <img src="${LOGO}" alt="Mosaic MUN" height="28" style="opacity:0.85;display:block;" />
    </td>
  </tr>
  <tr>
    <td style="padding-top:40px;">
      <h1 style="margin:0;font-size:34px;font-weight:900;letter-spacing:-0.04em;color:#e8e4dc;line-height:1.1;">
        ${firstName}, you're<br/>on the waitlist.
      </h1>
    </td>
  </tr>
  <tr>
    <td style="padding-top:20px;padding-bottom:36px;">
      <p style="margin:0;font-size:15px;color:#b5a88e;line-height:1.65;font-style:italic;">
        Your registration has been received. All seats matching your preferences are currently filled.
        You are on the waitlist and will be notified if a spot opens.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding-top:12px;padding-bottom:48px;border-top:1px solid rgba(155,110,9,0.1);">
      <p style="margin:16px 0 0;font-size:11px;color:#7a6a4e;line-height:1.85;font-style:italic;">
        Registration ID: <strong style="color:#9b6e09;letter-spacing:0.1em;">${registrationId}</strong><br/>
        Contact <a href="mailto:sameer.jhamb1719@gmail.com" style="color:#9b6e09;text-decoration:none;">sameer.jhamb1719@gmail.com</a> for any queries.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendAllotmentEmail(params: {
  to: string
  name: string
  committee: string
  portfolio: string
  registrationId: string
  confidence: number
  isStable: boolean
  cfg: Record<string, string>
}): Promise<void> {
  const apiKey = params.cfg.RESEND_API_KEY
  if (!apiKey) { console.error('RESEND_API_KEY not in edge_config'); return }

  const html = allotmentHtml(params)
  await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Mosaic MUN II <allotments@mosaicmun.in>',
      to: [params.to],
      subject: `Your Allotment — ${params.committee} | ${params.portfolio} · Mosaic MUN II`,
      html,
    }),
  })
}

export async function sendWaitlistEmail(params: {
  to: string
  name: string
  registrationId: string
  cfg: Record<string, string>
}): Promise<void> {
  const apiKey = params.cfg.RESEND_API_KEY
  if (!apiKey) { console.error('RESEND_API_KEY not in edge_config'); return }

  const html = waitlistHtml(params)
  await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Mosaic MUN II <allotments@mosaicmun.in>',
      to: [params.to],
      subject: 'You are on the waitlist — Mosaic MUN II',
      html,
    }),
  })
}
