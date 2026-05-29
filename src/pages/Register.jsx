import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'

const SHARD_PHOTOS = [
  '/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg',
  '/brand-assets/72A92FE4-7AD2-41D9-8D3A-A497D7EF1230_1_105_c.jpeg',
  '/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg',
  '/brand-assets/8AF34B6E-9909-47EA-ABE8-7E55CB30BF98_1_105_c.jpeg',
  '/brand-assets/D655973D-D18C-4556-9589-3B8169E4425E_1_105_c.jpeg',
]

const SHARDS = [
  { id:0, left:'55%', top:'10%', w:'26%', h:'58%', clip:[[42,0],[100,20],[58,100],[0,80]], op:0.88, blur:0, photo:0, pos:'center 28%', dx:[0,3,-2,3,0], dy:[0,-5,4,-3,0], dur:24, del:0, stroke:'rgba(155,110,9,0.65)' },
  { id:1, left:'74%', top:'8%', w:'18%', h:'34%', clip:[[24,0],[100,16],[80,100],[0,76]], op:0.64, blur:1, photo:1, pos:'center 18%', dx:[0,5,-4,6,0], dy:[0,-5,4,-3,0], dur:18, del:0.9, stroke:'rgba(155,110,9,0.28)' },
  { id:2, left:'60%', top:'54%', w:'22%', h:'30%', clip:[[0,22],[100,4],[100,78],[0,96]], op:0.58, blur:1.5, photo:2, pos:'40% 72%', dx:[0,-5,7,-3,0], dy:[0,6,-5,5,0], dur:21, del:1.6, stroke:'rgba(155,110,9,0.22)' },
  { id:3, left:'83%', top:'28%', w:'11%', h:'42%', clip:[[16,0],[100,8],[86,100],[0,88]], op:0.52, blur:1, photo:3, pos:'center 50%', dx:[0,-4,6,-2,0], dy:[0,5,-6,4,0], dur:20, del:1.1, stroke:'none' },
  { id:4, left:'46%', top:'18%', w:'34%', h:'46%', clip:[[8,5],[96,0],[100,92],[4,100]], op:0.16, blur:10, photo:4, pos:'center 40%', dx:[0,4,-3,2,0], dy:[0,-3,4,-2,0], dur:33, del:1.5, stroke:'none' },
  { id:5, left:'52%', top:'4%', w:'1.5%', h:'58%', clip:[[20,0],[80,4],[60,100],[40,96]], op:0.52, blur:0, photo:null, pos:'center', dx:[0,2,-1,3,0], dy:[0,-7,5,-4,0], dur:22, del:0.3, stroke:'rgba(155,110,9,0.65)', type:'sliver' },
]

const css = `
.reg-root {
  min-height: 100vh;
  background: #050402;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: 'Poppins', sans-serif;
}

/* ── Shard layer ── */
.reg-shard-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ── Veil ── */
.reg-veil {
  position: fixed;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse 72% 85% at 22% 52%, rgba(5,4,2,0.94) 0%, rgba(5,4,2,0.42) 100%),
    linear-gradient(to right, rgba(5,4,2,0.97) 32%, rgba(5,4,2,0.18) 100%);
  pointer-events: none;
}

/* ── Topbar ── */
.reg-topbar {
  position: relative;
  z-index: 10;
  padding: 16px 8vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(155,110,9,0.08);
  background: rgba(5,4,2,0.88);
  backdrop-filter: blur(14px);
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
.reg-topbar-logo {
  height: 28px;
  width: auto;
  opacity: 0.82;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.reg-topbar-label {
  font-size: 7.5px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.42;
}

/* ── Main content ── */
.reg-main {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px 8vw 56px;
}

/* ── Eyebrow ── */
.reg-eyebrow {
  display: flex; align-items: center; gap: 14px; margin-bottom: 18px;
}
.reg-eyebrow-line { width: 28px; height: 1px; background: var(--gold); opacity: 0.35; }
.reg-eyebrow-text {
  font-size: 7.5px; letter-spacing: 0.5em;
  text-transform: uppercase; color: var(--gold); opacity: 0.5;
}

/* ── Title ── */
.reg-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(4rem, 11vw, 11rem);
  line-height: 0.85;
  letter-spacing: -0.05em;
  color: #e8e4dc;
  margin: 0 0 22px;
  overflow: hidden;
}

/* ── Sub ── */
.reg-sub {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(1.05rem, 1.8vw, 1.35rem);
  color: #c8bba0;
  opacity: 0.82;
  margin: 0 0 14px;
  line-height: 1.5;
}

/* ── Conference meta ── */
.reg-conference-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 34px;
  flex-wrap: wrap;
}
.reg-meta-line {
  font-size: 8px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.6;
}
.reg-meta-dot {
  width: 3px; height: 3px;
  background: rgba(155,110,9,0.4);
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Terms ── */
.reg-terms {
  margin-bottom: 36px;
  max-width: 560px;
}
.reg-terms-label {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  cursor: pointer;
}
.reg-terms-input {
  position: absolute;
  opacity: 0;
  width: 0; height: 0;
}
.reg-terms-box {
  flex-shrink: 0;
  width: 14px; height: 14px;
  border: 1px solid rgba(155,110,9,0.35);
  margin-top: 2px;
  position: relative;
  transition: border-color 0.25s, background 0.25s;
}
.reg-terms-input:checked ~ .reg-terms-box {
  background: var(--gold);
  border-color: var(--gold);
}
.reg-terms-input:checked ~ .reg-terms-box::after {
  content: '';
  position: absolute;
  left: 2px; top: 0px;
  width: 6px; height: 9px;
  border-right: 1.5px solid #000;
  border-bottom: 1.5px solid #000;
  transform: rotate(45deg);
}
.reg-terms-text {
  font-size: 9.5px;
  line-height: 1.75;
  color: #a89878;
  letter-spacing: 0.02em;
}
.reg-terms-link {
  color: var(--gold);
  text-decoration: none;
  border-bottom: 1px solid rgba(155,110,9,0.35);
  transition: opacity 0.2s;
  opacity: 0.85;
}
.reg-terms-link:hover { opacity: 1; }

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
  transition: border-color 0.3s, background 0.3s, transform 0.3s, opacity 0.35s;
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
.reg-file-card:hover::before, .reg-file-card:focus-visible::before { opacity: 0.65; }
.reg-file-card--locked {
  cursor: not-allowed;
  opacity: 0.38;
  pointer-events: none;
}
.reg-file-num {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: var(--gold);
  opacity: 0.45;
  margin-bottom: 28px;
  display: block;
}
.reg-file-tag {
  font-size: 6.5px;
  letter-spacing: 0.44em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.5;
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
  font-family: 'Cormorant Garamond', serif;
  font-size: 14.5px;
  line-height: 1.82;
  color: #b5a88e;
  opacity: 0.88;
  margin: 0 0 28px;
}
.reg-file-cta {
  font-size: 8px;
  letter-spacing: 0.36em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.62;
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
.reg-file-ghost {
  position: absolute;
  bottom: -10px; right: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: 9rem;
  line-height: 1;
  color: rgba(155,110,9,0.042);
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.06em;
}

/* ── Footer ── */
.reg-footer {
  position: relative;
  z-index: 2;
  border-top: 1px solid rgba(155,110,9,0.08);
  padding: 22px 8vw 18px;
  background: rgba(5,4,2,0.6);
}
.reg-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.reg-footer-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.reg-footer-logo {
  height: 24px;
  width: auto;
  opacity: 0.6;
}
.reg-footer-info { display: flex; flex-direction: column; gap: 2px; }
.reg-footer-name {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 8.5px;
  letter-spacing: 0.18em;
  color: var(--cream);
  opacity: 0.58;
  text-transform: uppercase;
}
.reg-footer-meta {
  font-size: 7.5px;
  letter-spacing: 0.22em;
  color: var(--muted);
  opacity: 0.4;
  text-transform: uppercase;
}
.reg-footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.reg-footer-link {
  font-size: 8.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.42;
  text-decoration: none;
  transition: opacity 0.2s, color 0.2s;
}
.reg-footer-link:hover { opacity: 0.85; color: var(--gold); }
.reg-footer-ig { color: var(--gold); opacity: 0.48; }
.reg-footer-sep { color: var(--muted); opacity: 0.2; font-size: 8px; }
.reg-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.reg-footer-copy, .reg-footer-credit {
  font-size: 8px;
  letter-spacing: 0.12em;
  color: var(--muted);
  opacity: 0.28;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .reg-topbar { padding: 12px 20px; }
  .reg-topbar-logo { height: 22px; }
  .reg-topbar-label { display: none; }
  .reg-main { padding: 36px 20px 44px; }
  .reg-files { grid-template-columns: 1fr; gap: 12px; }
  .reg-file-card { padding: 24px 20px; }
  .reg-footer { padding: 18px 20px 14px; }
  .reg-footer-inner { flex-direction: column; align-items: flex-start; gap: 14px; }
  .reg-footer-right { flex-wrap: wrap; }
  .reg-conference-meta { gap: 8px; }
}
`

function Shard({ s }) {
  const clip = `polygon(${s.clip.map(([x, y]) => `${x}% ${y}%`).join(', ')})`
  const points = s.clip.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: s.left, top: s.top,
        width: s.w, height: s.h,
        zIndex: s.id + 3,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: s.op }}
      transition={{ duration: 1.5, delay: 0.5 + s.del * 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        style={{ width: '100%', height: '100%', filter: s.blur > 0 ? `blur(${s.blur}px)` : undefined }}
        animate={{ x: s.dx, y: s.dy }}
        transition={{ duration: s.dur, delay: s.del, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: clip }}>
            {s.type === 'sliver' ? (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(148deg, rgba(155,110,9,0.22) 0%, rgba(0,0,0,0.56) 44%, rgba(155,110,9,0.06) 100%)' }} />
            ) : (
              <>
                <img
                  src={SHARD_PHOTOS[s.photo]}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: s.pos, filter: 'sepia(0.5) saturate(0.45) brightness(0.22)' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(155,110,9,0.18) 0%, rgba(0,0,0,0.2) 44%, rgba(0,0,0,0.5) 100%)', zIndex: 2 }} />
              </>
            )}
          </div>
          {s.stroke !== 'none' && (
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 10 }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polygon points={points} fill="none" stroke={s.stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              {s.id === 0 && (
                <polygon points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" strokeDasharray="22 78" strokeDashoffset="5" />
              )}
            </svg>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <div className="reg-root">
      {/* Shard field */}
      <div className="reg-shard-layer" aria-hidden="true">
        {SHARDS.map(s => <Shard key={s.id} s={s} />)}
      </div>

      {/* Veil */}
      <div className="reg-veil" aria-hidden="true" />

      {/* Topbar */}
      <div className="reg-topbar">
        <Link to="/" className="reg-topbar-back">
          <span className="reg-topbar-back-line" />
          Return to site
        </Link>
        <img src="/brand-assets/mosaic-logo-nobg.png" alt="Mosaic MUN" className="reg-topbar-logo" />
        <span className="reg-topbar-label">Delegate Accreditation · Mosaic MUN II</span>
      </div>

      {/* Main */}
      <div className="reg-main">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="reg-eyebrow">
            <span className="reg-eyebrow-line" />
            <span className="reg-eyebrow-text">Access Request · Select Classification</span>
          </div>
        </motion.div>

        <div style={{ overflow: 'hidden' }}>
          <motion.h1
            className="reg-title"
            initial={{ y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Delegate<br />Access.
          </motion.h1>
        </div>

        <motion.p
          className="reg-sub"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Before you enter the chamber, you must be cleared.
        </motion.p>

        <motion.div
          className="reg-conference-meta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
        >
          <span className="reg-meta-line">Mosaic MUN II</span>
          <span className="reg-meta-dot" aria-hidden="true" />
          <span className="reg-meta-line">11 · 12 July 2026</span>
          <span className="reg-meta-dot" aria-hidden="true" />
          <span className="reg-meta-line">Saraswati Global School, Faridabad</span>
        </motion.div>

        {/* Terms */}
        <motion.div
          className="reg-terms"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.65 }}
        >
          <label className="reg-terms-label">
            <input
              type="checkbox"
              className="reg-terms-input"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
            />
            <span className="reg-terms-box" />
            <span className="reg-terms-text">
              I acknowledge the{' '}
              <a href="#" className="reg-terms-link" onClick={e => e.preventDefault()}>Terms &amp; Conditions</a>
              {' '}of Mosaic MUN II and confirm my intent to participate
            </span>
          </label>
        </motion.div>

        {/* File cards */}
        <div className="reg-files">
          <motion.button
            className={`reg-file-card${!agreed ? ' reg-file-card--locked' : ''}`}
            onClick={() => agreed && navigate('/register/sgs')}
            initial={{ opacity: 0, x: -22 }}
            animate={{ opacity: agreed ? 1 : 0.38, x: 0 }}
            transition={{ duration: 0.8, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
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
              {agreed ? 'Access File' : 'Agree to terms first'}
            </div>
            <span className="reg-file-ghost" aria-hidden="true">01</span>
          </motion.button>

          <motion.button
            className={`reg-file-card${!agreed ? ' reg-file-card--locked' : ''}`}
            onClick={() => agreed && navigate('/register/external')}
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: agreed ? 1 : 0.38, x: 0 }}
            transition={{ duration: 0.8, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
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
              {agreed ? 'Access File' : 'Agree to terms first'}
            </div>
            <span className="reg-file-ghost" aria-hidden="true">02</span>
          </motion.button>
        </div>
      </div>

      {/* Footer */}
      <footer className="reg-footer" aria-label="Page footer">
        <div className="reg-footer-inner">
          <div className="reg-footer-left">
            <img src="/brand-assets/mosaic-logo-nobg.png" alt="Mosaic MUN" className="reg-footer-logo" />
            <div className="reg-footer-info">
              <span className="reg-footer-name">Mosaic MUN II</span>
              <span className="reg-footer-meta">11 · 12 July 2026 · Saraswati Global School, Faridabad</span>
            </div>
          </div>
          <div className="reg-footer-right">
            <Link to="/" className="reg-footer-link">Home</Link>
            <span className="reg-footer-sep" aria-hidden="true">·</span>
            <Link to="/register" className="reg-footer-link">Register</Link>
            <span className="reg-footer-sep" aria-hidden="true">·</span>
            <a
              href="https://instagram.com/mosaicmunofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="reg-footer-link reg-footer-ig"
            >
              Instagram ↗
            </a>
          </div>
        </div>
        <div className="reg-footer-bar">
          <span className="reg-footer-copy">&copy; 2026 Mosaic Model United Nations</span>
          <span className="reg-footer-credit">Saraswati Global School, Faridabad</span>
        </div>
      </footer>
    </div>
  )
}
