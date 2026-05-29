import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'

const PHOTOS = [
  '/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg',
  '/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg',
  '/brand-assets/8AF34B6E-9909-47EA-ABE8-7E55CB30BF98_1_105_c.jpeg',
]

const css = `
.reg-root {
  min-height: 100vh;
  background: #050402;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Background photos ── */
.reg-bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.reg-bg-photo {
  position: absolute;
  object-fit: cover;
  filter: sepia(0.6) saturate(0.4) brightness(0.18);
}
.reg-bg-photo-0 {
  width: 52%; height: 70%;
  top: -5%; right: -4%;
  clip-path: polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%);
}
.reg-bg-photo-1 {
  width: 34%; height: 44%;
  bottom: 8%; right: 22%;
  clip-path: polygon(12% 0%, 100% 6%, 88% 100%, 0% 94%);
  opacity: 0.7;
}
.reg-bg-photo-2 {
  width: 24%; height: 36%;
  top: 28%; right: 50%;
  clip-path: polygon(0% 8%, 100% 0%, 100% 92%, 0% 100%);
  opacity: 0.45;
}
.reg-veil {
  position: fixed;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse 75% 80% at 25% 50%, rgba(5,4,2,0.85) 0%, rgba(5,4,2,0.4) 100%),
    linear-gradient(to right, rgba(5,4,2,0.92) 38%, rgba(5,4,2,0.25) 100%);
  pointer-events: none;
}

/* ── Top bar ── */
.reg-topbar {
  position: relative;
  z-index: 10;
  padding: 18px 8vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(155,110,9,0.08);
  background: rgba(5,4,2,0.85);
  backdrop-filter: blur(12px);
}
.reg-topbar-back {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 8px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.55;
  text-decoration: none;
  transition: opacity 0.2s;
}
.reg-topbar-back:hover { opacity: 0.95; }
.reg-topbar-back-line {
  width: 18px; height: 1px; background: currentColor; position: relative;
}
.reg-topbar-back-line::before {
  content: ''; position: absolute; left: 0; top: -3px;
  width: 5px; height: 5px;
  border-left: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: rotate(45deg);
}
.reg-topbar-label {
  font-size: 7.5px; letter-spacing: 0.42em;
  text-transform: uppercase; color: var(--gold); opacity: 0.42;
}

/* ── Main content ── */
.reg-main {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px 8vw 80px;
}

.reg-eyebrow {
  display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
}
.reg-eyebrow-line { width: 28px; height: 1px; background: var(--gold); opacity: 0.35; }
.reg-eyebrow-text {
  font-size: 7.5px; letter-spacing: 0.5em;
  text-transform: uppercase; color: var(--gold); opacity: 0.5;
}

.reg-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(4rem, 11vw, 11rem);
  line-height: 0.85;
  letter-spacing: -0.05em;
  color: #e8e4dc;
  margin: 0 0 16px;
}

.reg-sub {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(0.95rem, 1.6vw, 1.2rem);
  color: var(--muted);
  opacity: 0.58;
  margin: 0 0 56px;
}

/* ── File cards ── */
.reg-files {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 860px;
}

.reg-file-card {
  position: relative;
  background: rgba(8,6,4,0.92);
  border: 1px solid rgba(155,110,9,0.14);
  padding: 32px 28px;
  cursor: pointer;
  transition: border-color 0.3s ease, background 0.3s ease, transform 0.3s ease;
  overflow: hidden;
  text-align: left;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.reg-file-card:hover, .reg-file-card:focus-visible {
  border-color: rgba(155,110,9,0.45);
  background: rgba(155,110,9,0.025);
  transform: translateY(-3px);
}
.reg-file-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(to right, var(--gold), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.reg-file-card:hover::before, .reg-file-card:focus-visible::before { opacity: 0.6; }

.reg-file-num {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: var(--gold);
  opacity: 0.4;
  margin-bottom: 28px;
  display: block;
}

.reg-file-tag {
  font-size: 6.5px;
  letter-spacing: 0.44em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.45;
  margin-bottom: 10px;
  display: block;
}

.reg-file-name {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(1.3rem, 2.8vw, 2rem);
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: #e8e4dc;
  margin: 0 0 14px;
}

.reg-file-desc {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: 11px;
  line-height: 1.85;
  color: var(--muted);
  opacity: 0.55;
  margin: 0 0 28px;
}

.reg-file-cta {
  font-size: 8px;
  letter-spacing: 0.36em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: opacity 0.2s, gap 0.2s;
}
.reg-file-card:hover .reg-file-cta { opacity: 1; gap: 14px; }

.reg-file-cta-line {
  width: 20px; height: 1px; background: currentColor;
  transition: width 0.3s ease;
}
.reg-file-card:hover .reg-file-cta-line { width: 28px; }

/* ghost number behind card */
.reg-file-ghost {
  position: absolute;
  bottom: -10px; right: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: 9rem;
  line-height: 1;
  color: rgba(155,110,9,0.04);
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.06em;
}

/* ── Bottom note ── */
.reg-note {
  position: relative;
  z-index: 2;
  padding: 0 8vw 32px;
  font-size: 8px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.28;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .reg-topbar { padding: 14px 20px; }
  .reg-main { padding: 40px 20px 56px; }
  .reg-files { grid-template-columns: 1fr; gap: 12px; }
  .reg-file-card { padding: 24px 20px; }
  .reg-note { padding: 0 20px 24px; }
}
`

export default function Register() {
  const navigate = useNavigate()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <div className="reg-root">
      {/* Background */}
      <div className="reg-bg-layer" aria-hidden="true">
        {PHOTOS.map((src, i) => (
          <img key={i} src={src} className={`reg-bg-photo reg-bg-photo-${i}`} alt="" />
        ))}
      </div>
      <div className="reg-veil" aria-hidden="true" />

      {/* Top bar */}
      <div className="reg-topbar">
        <Link to="/" className="reg-topbar-back">
          <span className="reg-topbar-back-line" />
          Return to site
        </Link>
        <span className="reg-topbar-label">Delegate Accreditation · Mosaic MUN II</span>
      </div>

      {/* Main */}
      <div className="reg-main">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="reg-eyebrow">
            <span className="reg-eyebrow-line" />
            <span className="reg-eyebrow-text">Access Request · Select Classification</span>
          </div>
          <h1 className="reg-title">Delegate<br />Access.</h1>
          <p className="reg-sub">Before you enter the chamber, you must be cleared.</p>

          <div className="reg-files">
            {/* SGS file */}
            <motion.button
              className="reg-file-card"
              onClick={() => navigate('/register/sgs')}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="reg-file-num">FILE · 001</span>
              <span className="reg-file-tag">Internal · SGS Students Only</span>
              <h2 className="reg-file-name">Saraswati<br />Global School</h2>
              <p className="reg-file-desc">
                For students currently enrolled at Saraswati Global School, Faridabad.
                Valid school ID and payment required.
              </p>
              <div className="reg-file-cta">
                <span className="reg-file-cta-line" />
                Access File
              </div>
              <span className="reg-file-ghost" aria-hidden="true">01</span>
            </motion.button>

            {/* External file */}
            <motion.button
              className="reg-file-card"
              onClick={() => navigate('/register/external')}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="reg-file-num">FILE · 002</span>
              <span className="reg-file-tag">External · Open Application</span>
              <h2 className="reg-file-name">External<br />Delegate</h2>
              <p className="reg-file-desc">
                For delegates from outside institutions. Full documentation
                and personal details required for processing.
              </p>
              <div className="reg-file-cta">
                <span className="reg-file-cta-line" />
                Access File
              </div>
              <span className="reg-file-ghost" aria-hidden="true">02</span>
            </motion.button>
          </div>
        </motion.div>
      </div>

      <p className="reg-note">Mosaic MUN II · 11 · 12 July 2026 · Saraswati Global School, Faridabad</p>
    </div>
  )
}
