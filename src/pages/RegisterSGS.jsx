import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabase'

const COMMITTEES = [
  { id: 'UNGA',  label: 'UNGA — United Nations General Assembly' },
  { id: 'UNCSW', label: 'UNCSW — UN Commission on the Status of Women' },
  { id: 'UNHRC', label: 'UNHRC — UN Human Rights Council' },
  { id: 'AIPPM', label: 'AIPPM — All India Political Parties Meet' },
  { id: 'IPL',   label: 'IPL — Indian Premier League' },
  { id: 'IP',    label: 'IP — International Press' },
  { id: 'USSIC', label: 'USSIC — US Senate Intelligence Committee' },
]

const BANK = {
  name: 'Joginder Jhamb',
  account: '10000000908043',
  ifsc: 'JIOP0000001',
  upi: '9811588040@ptyes',
}

const STEPS = ['Identification', 'Delegation', 'Documentation']

const css = `
/* ── Registration Form shared ── */
.rf-page {
  min-height: 100vh;
  background: #050402;
  font-family: 'Poppins', sans-serif;
  display: flex;
  flex-direction: column;
}

.rf-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 14px 8vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(155,110,9,0.08);
  background: rgba(5,4,2,0.96);
  backdrop-filter: blur(12px);
}
.rf-topbar-back {
  display: flex; align-items: center; gap: 10px;
  font-size: 7.5px; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--muted);
  opacity: 0.48; text-decoration: none; transition: opacity 0.2s;
}
.rf-topbar-back:hover { opacity: 0.9; }
.rf-topbar-back-line {
  width: 16px; height: 1px; background: currentColor; position: relative;
}
.rf-topbar-back-line::before {
  content: ''; position: absolute; left: 0; top: -3px;
  width: 5px; height: 5px;
  border-left: 1px solid currentColor; border-bottom: 1px solid currentColor;
  transform: rotate(45deg);
}
.rf-topbar-meta {
  font-size: 7.5px; letter-spacing: 0.4em;
  text-transform: uppercase; color: var(--gold); opacity: 0.38;
}

/* Progress */
.rf-progress-strip {
  height: 1px;
  background: rgba(155,110,9,0.1);
  position: relative;
  flex-shrink: 0;
}
.rf-progress-fill {
  position: absolute; left: 0; top: 0; height: 100%;
  background: var(--gold);
  transition: width 0.6s cubic-bezier(0.22,1,0.36,1);
}

/* Body */
.rf-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52px 8vw 80px;
  overflow-x: hidden;
}

.rf-inner {
  width: 100%;
  max-width: 580px;
}

/* Step header */
.rf-step-meta {
  font-size: 7px; letter-spacing: 0.44em;
  text-transform: uppercase; color: var(--gold); opacity: 0.42;
  margin-bottom: 14px; display: block;
}
.rf-step-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 0.9;
  letter-spacing: -0.03em;
  color: #e8e4dc;
  margin: 0 0 10px;
}
.rf-step-sub {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1rem;
  color: var(--muted);
  opacity: 0.58;
  margin: 0 0 44px;
}

/* Fields */
.rf-field {
  margin-bottom: 32px;
  position: relative;
}
.rf-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}
.rf-label {
  display: block;
  font-size: 7px;
  letter-spacing: 0.44em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.5;
  margin-bottom: 8px;
}
.rf-input, .rf-select, .rf-textarea {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(155,110,9,0.18);
  padding: 10px 0;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 16px;
  color: #e8e4dc;
  outline: none;
  transition: border-color 0.25s ease;
  -webkit-appearance: none;
  appearance: none;
}
.rf-input:focus, .rf-select:focus { border-bottom-color: rgba(155,110,9,0.65); }
.rf-input::placeholder { color: var(--muted); opacity: 0.28; font-style: italic; }
.rf-input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px #050402 inset;
  -webkit-text-fill-color: #e8e4dc;
  caret-color: #e8e4dc;
}

.rf-select {
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239b6e09' stroke-opacity='.5' stroke-width='1'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  padding-right: 20px;
}
.rf-select option { background: #0a0804; color: #e8e4dc; font-style: normal; }

.rf-hint {
  font-size: 10px;
  color: var(--muted);
  opacity: 0.38;
  margin-top: 6px;
  line-height: 1.6;
  font-style: italic;
}

.rf-error {
  font-size: 10px;
  color: #c87070;
  margin-top: 5px;
  display: block;
}

/* Section divider */
.rf-divider {
  border: none;
  border-top: 1px solid rgba(155,110,9,0.08);
  margin: 36px 0;
}

.rf-sub-label {
  font-size: 7px;
  letter-spacing: 0.44em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.4;
  margin-bottom: 20px;
  display: block;
}

/* File upload */
.rf-upload-area {
  border: 1px solid rgba(155,110,9,0.18);
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease;
  position: relative;
}
.rf-upload-area:hover { border-color: rgba(155,110,9,0.45); background: rgba(155,110,9,0.02); }
.rf-upload-area.uploaded { border-color: rgba(155,110,9,0.4); background: rgba(155,110,9,0.025); }
.rf-upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
.rf-upload-icon {
  font-size: 20px; color: var(--gold); opacity: 0.35;
  margin-bottom: 10px; display: block;
}
.rf-upload-label {
  font-size: 8.5px; letter-spacing: 0.3em;
  text-transform: uppercase; color: var(--cream); opacity: 0.55;
  display: block; margin-bottom: 5px;
}
.rf-upload-hint {
  font-size: 10px; color: var(--muted); opacity: 0.38;
}
.rf-upload-name {
  font-size: 11px; color: var(--gold); opacity: 0.75;
  margin-top: 6px; display: block;
}

/* Payment section */
.rf-payment-section {
  margin-bottom: 36px;
}
.rf-qr-wrap {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-bottom: 28px;
}
.rf-qr-box {
  border: 1px solid rgba(155,110,9,0.2);
  padding: 16px;
  background: rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.rf-qr-img { width: 130px; height: 130px; display: block; }
.rf-bank-details {}
.rf-bank-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(155,110,9,0.06);
  gap: 16px;
}
.rf-bank-row:last-child { border-bottom: none; }
.rf-bank-key {
  font-size: 7px; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--gold); opacity: 0.45;
  flex-shrink: 0;
}
.rf-bank-val {
  font-family: 'Courier New', monospace;
  font-size: 12px; color: #e8e4dc; opacity: 0.8;
  text-align: right;
}

/* Navigation buttons */
.rf-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid rgba(155,110,9,0.08);
}
.rf-btn-back {
  font-size: 7.5px; letter-spacing: 0.36em;
  text-transform: uppercase; color: var(--muted); opacity: 0.45;
  background: none; border: none; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
  transition: opacity 0.2s;
}
.rf-btn-back:hover { opacity: 0.85; }
.rf-btn-proceed {
  background: var(--gold);
  color: #000;
  font-family: 'Poppins', sans-serif;
  font-size: 8.5px; font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  border: none; padding: 15px 32px;
  cursor: pointer; transition: opacity 0.2s ease;
}
.rf-btn-proceed:hover:not(:disabled) { opacity: 0.82; }
.rf-btn-proceed:disabled { opacity: 0.38; cursor: default; }

/* ── Credential screen ── */
.rf-credential-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52px 8vw 80px;
}
.rf-credential-eyebrow {
  font-size: 7.5px; letter-spacing: 0.5em;
  text-transform: uppercase; color: var(--gold); opacity: 0.45;
  margin-bottom: 16px;
}
.rf-credential-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  letter-spacing: -0.04em;
  color: #e8e4dc;
  margin: 0 0 40px;
  text-align: center;
}
.rf-pass {
  width: 100%;
  max-width: 520px;
  border: 1px solid rgba(155,110,9,0.25);
  background: rgba(8,6,4,0.95);
  position: relative;
  overflow: hidden;
}
.rf-pass-top {
  background: linear-gradient(135deg, rgba(155,110,9,0.12) 0%, transparent 60%);
  border-bottom: 1px solid rgba(155,110,9,0.15);
  padding: 28px 28px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rf-pass-logo-line {
  font-size: 7px; letter-spacing: 0.42em;
  text-transform: uppercase; color: var(--gold); opacity: 0.5;
}
.rf-pass-conf {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: 0.06em;
  color: #e8e4dc;
  opacity: 0.8;
}
.rf-pass-body {
  padding: 28px 28px;
  display: flex;
  gap: 28px;
  align-items: flex-start;
}
.rf-pass-info { flex: 1; }
.rf-pass-field { margin-bottom: 20px; }
.rf-pass-field-key {
  font-size: 6.5px; letter-spacing: 0.44em;
  text-transform: uppercase; color: var(--gold); opacity: 0.42;
  display: block; margin-bottom: 4px;
}
.rf-pass-field-val {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 15px;
  color: #e8e4dc;
  letter-spacing: 0.01em;
}
.rf-pass-field-val.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  letter-spacing: 0.12em;
  color: var(--gold);
  opacity: 0.9;
}
.rf-pass-field-val.status {
  font-size: 10px;
  letter-spacing: 0.28em;
  color: rgba(155,110,9,0.7);
  border: 1px solid rgba(155,110,9,0.25);
  display: inline-block;
  padding: 4px 12px;
}
.rf-pass-qr {
  flex-shrink: 0;
  border: 1px solid rgba(155,110,9,0.18);
  padding: 12px;
  background: rgba(255,255,255,0.03);
}
.rf-pass-footer {
  border-top: 1px solid rgba(155,110,9,0.1);
  padding: 16px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rf-pass-date {
  font-size: 8px; letter-spacing: 0.3em;
  text-transform: uppercase; color: var(--muted); opacity: 0.35;
}
.rf-pass-type-badge {
  font-size: 7px; letter-spacing: 0.36em;
  text-transform: uppercase;
  border: 1px solid rgba(155,110,9,0.2);
  color: var(--gold); opacity: 0.55;
  padding: 3px 10px;
}
.rf-credential-note {
  max-width: 520px; width: 100%;
  margin-top: 28px;
  font-size: 10px; line-height: 1.9;
  color: var(--muted); opacity: 0.45;
  font-style: italic;
}
.rf-credential-actions {
  display: flex; gap: 12px; margin-top: 32px;
}
.rf-action-btn {
  font-size: 8px; letter-spacing: 0.34em;
  text-transform: uppercase;
  border: 1px solid rgba(155,110,9,0.25);
  color: var(--gold); opacity: 0.65;
  padding: 12px 22px;
  background: none; cursor: pointer;
  transition: opacity 0.2s, border-color 0.2s;
  text-decoration: none;
}
.rf-action-btn:hover { opacity: 1; border-color: rgba(155,110,9,0.55); }
.rf-action-btn.primary {
  background: var(--gold); color: #000; opacity: 1; border-color: transparent;
}
.rf-action-btn.primary:hover { opacity: 0.82; }

/* Mobile */
@media (max-width: 768px) {
  .rf-topbar { padding: 12px 20px; }
  .rf-body { padding: 36px 20px 60px; }
  .rf-field-row { grid-template-columns: 1fr; gap: 0; }
  .rf-qr-wrap { flex-direction: column; gap: 20px; }
  .rf-qr-img { width: 110px; height: 110px; }
  .rf-pass-body { flex-direction: column; gap: 20px; }
  .rf-pass { max-width: 100%; }
  .rf-credential-wrap { padding: 36px 20px 56px; }
}
`

const SLIDE = {
  initial: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

const uploadFile = async (file, regId, type) => {
  const ext = file.name.split('.').pop()
  const path = `${regId}/${type}.${ext}`
  const { error } = await supabase.storage.from('registration-files').upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

export default function RegisterSGS() {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [registration, setRegistration] = useState(null)

  const [form, setForm] = useState({
    full_name: '', class_year: '',
    committee_pref_1: '', committee_pref_2: '', committee_pref_3: '',
    portfolio_pref_1: '', portfolio_pref_2: '', portfolio_pref_3: '',
    id_card: null, payment_screenshot: null,
  })

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const validate = () => {
    const e = {}
    if (step === 0) {
      if (!form.full_name.trim()) e.full_name = 'Full name is required.'
      if (!form.class_year.trim()) e.class_year = 'Class and section is required.'
    }
    if (step === 1) {
      if (!form.committee_pref_1) e.committee_pref_1 = 'First committee preference is required.'
    }
    if (step === 2) {
      if (!form.payment_screenshot) e.payment_screenshot = 'Payment screenshot is required.'
      if (!form.id_card) e.id_card = 'School ID card is required.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!validate()) return
    setDir(1)
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const back = () => {
    setDir(-1)
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const tempId = `temp-${Date.now()}`
      let idCardPath = null
      let paymentPath = null

      if (form.id_card) idCardPath = await uploadFile(form.id_card, tempId, 'id_card')
      if (form.payment_screenshot) paymentPath = await uploadFile(form.payment_screenshot, tempId, 'payment')

      const { data, error } = await supabase.from('registrations').insert({
        type: 'sgs',
        full_name: form.full_name.trim(),
        institution: 'Saraswati Global School',
        class_year: form.class_year.trim(),
        committee_pref_1: form.committee_pref_1 || null,
        committee_pref_2: form.committee_pref_2 || null,
        committee_pref_3: form.committee_pref_3 || null,
        portfolio_pref_1: form.portfolio_pref_1.trim() || null,
        portfolio_pref_2: form.portfolio_pref_2.trim() || null,
        portfolio_pref_3: form.portfolio_pref_3.trim() || null,
        id_card_url: idCardPath,
        payment_screenshot_url: paymentPath,
      }).select().single()

      if (error) throw error
      setRegistration(data)
      setDir(1)
      setStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrors({ submit: 'Submission failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const progress = step >= 3 ? 100 : Math.round((step / STEPS.length) * 100)

  return (
    <div className="rf-page">
      <div className="rf-topbar">
        <Link to="/register" className="rf-topbar-back">
          <span className="rf-topbar-back-line" />
          Back
        </Link>
        <span className="rf-topbar-meta">File 001 · SGS Registration</span>
      </div>

      <div className="rf-progress-strip">
        <div className="rf-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {step < 3 ? (
        <div className="rf-body">
          <div className="rf-inner">
            <AnimatePresence mode="wait" custom={dir}>
              {step === 0 && (
                <motion.div key="step0"
                  custom={dir} variants={SLIDE}
                  initial="initial" animate="animate" exit="exit"
                  transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
                >
                  <span className="rf-step-meta">Page 01 / 03 · Identification</span>
                  <h2 className="rf-step-title">Who<br />are you?</h2>
                  <p className="rf-step-sub">Your identity on record.</p>

                  <div className="rf-field">
                    <label className="rf-label" htmlFor="sgs-name">Full Name</label>
                    <input id="sgs-name" className="rf-input" type="text"
                      value={form.full_name}
                      onChange={e => set('full_name', e.target.value)}
                      placeholder="As on school records"
                      autoFocus autoComplete="name"
                    />
                    {errors.full_name && <span className="rf-error">{errors.full_name}</span>}
                  </div>

                  <div className="rf-field">
                    <label className="rf-label" htmlFor="sgs-class">Class & Section</label>
                    <input id="sgs-class" className="rf-input" type="text"
                      value={form.class_year}
                      onChange={e => set('class_year', e.target.value)}
                      placeholder="e.g. Class XI — A"
                      autoComplete="off"
                    />
                    {errors.class_year && <span className="rf-error">{errors.class_year}</span>}
                  </div>

                  <div className="rf-nav">
                    <div />
                    <button className="rf-btn-proceed" onClick={next}>
                      Proceed →
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step1"
                  custom={dir} variants={SLIDE}
                  initial="initial" animate="animate" exit="exit"
                  transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
                >
                  <span className="rf-step-meta">Page 02 / 03 · Delegation Preferences</span>
                  <h2 className="rf-step-title">Your<br />delegation.</h2>
                  <p className="rf-step-sub">Where you wish to serve. Preferences are considered, not guaranteed.</p>

                  <span className="rf-sub-label">Committee Preferences</span>
                  {[1,2,3].map(n => (
                    <div className="rf-field" key={`cp${n}`}>
                      <label className="rf-label">Committee Preference {n}</label>
                      <select className="rf-select"
                        value={form[`committee_pref_${n}`]}
                        onChange={e => set(`committee_pref_${n}`, e.target.value)}
                      >
                        <option value="">— Select committee</option>
                        {COMMITTEES.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      {n === 1 && errors.committee_pref_1 && <span className="rf-error">{errors.committee_pref_1}</span>}
                    </div>
                  ))}

                  <hr className="rf-divider" />
                  <span className="rf-sub-label">Portfolio Preferences</span>
                  {[1,2,3].map(n => (
                    <div className="rf-field" key={`pp${n}`}>
                      <label className="rf-label">Portfolio Preference {n}</label>
                      <input className="rf-input" type="text"
                        value={form[`portfolio_pref_${n}`]}
                        onChange={e => set(`portfolio_pref_${n}`, e.target.value)}
                        placeholder="e.g. United States, Narendra Modi"
                      />
                    </div>
                  ))}
                  <p className="rf-hint">Reference the Portfolio Matrix for available options.</p>

                  <div className="rf-nav">
                    <button className="rf-btn-back" onClick={back}>← Previous</button>
                    <button className="rf-btn-proceed" onClick={next}>Proceed →</button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2"
                  custom={dir} variants={SLIDE}
                  initial="initial" animate="animate" exit="exit"
                  transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
                >
                  <span className="rf-step-meta">Page 03 / 03 · Documentation</span>
                  <h2 className="rf-step-title">Documentation<br />& Payment.</h2>
                  <p className="rf-step-sub">Secure your registration.</p>

                  {/* Payment */}
                  <div className="rf-payment-section">
                    <span className="rf-sub-label">Payment — Scan or transfer</span>
                    <div className="rf-qr-wrap">
                      <div className="rf-qr-box">
                        <img src="/assets/qrcode.png" className="rf-qr-img" alt="Payment QR" />
                      </div>
                      <div className="rf-bank-details">
                        {Object.entries({ Name: BANK.name, 'Account No': BANK.account, IFSC: BANK.ifsc, UPI: BANK.upi }).map(([k, v]) => (
                          <div className="rf-bank-row" key={k}>
                            <span className="rf-bank-key">{k}</span>
                            <span className="rf-bank-val">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment screenshot */}
                  <div className="rf-field">
                    <label className="rf-label">Payment Screenshot</label>
                    <div className={`rf-upload-area${form.payment_screenshot ? ' uploaded' : ''}`}>
                      <input type="file" className="rf-upload-input"
                        accept="image/*,application/pdf"
                        onChange={e => set('payment_screenshot', e.target.files[0])}
                      />
                      <span className="rf-upload-icon">↑</span>
                      <span className="rf-upload-label">
                        {form.payment_screenshot ? 'File attached' : 'Attach payment screenshot'}
                      </span>
                      {form.payment_screenshot
                        ? <span className="rf-upload-name">{form.payment_screenshot.name}</span>
                        : <span className="rf-upload-hint">JPG, PNG or PDF · max 10 MB</span>
                      }
                    </div>
                    {errors.payment_screenshot && <span className="rf-error">{errors.payment_screenshot}</span>}
                  </div>

                  {/* ID card */}
                  <div className="rf-field">
                    <label className="rf-label">School ID Card</label>
                    <div className={`rf-upload-area${form.id_card ? ' uploaded' : ''}`}>
                      <input type="file" className="rf-upload-input"
                        accept="image/*,application/pdf"
                        onChange={e => set('id_card', e.target.files[0])}
                      />
                      <span className="rf-upload-icon">↑</span>
                      <span className="rf-upload-label">
                        {form.id_card ? 'File attached' : 'Attach school ID card'}
                      </span>
                      {form.id_card
                        ? <span className="rf-upload-name">{form.id_card.name}</span>
                        : <span className="rf-upload-hint">JPG, PNG or PDF · max 10 MB</span>
                      }
                    </div>
                    {errors.id_card && <span className="rf-error">{errors.id_card}</span>}
                  </div>

                  {errors.submit && <p className="rf-error" style={{ fontSize: 12, marginTop: 8 }}>{errors.submit}</p>}

                  <div className="rf-nav">
                    <button className="rf-btn-back" onClick={back}>← Previous</button>
                    <button className="rf-btn-proceed" onClick={submit} disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Dossier →'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* ── Credential screen ── */
        <motion.div className="rf-credential-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}
        >
          <p className="rf-credential-eyebrow">Registration Complete · Pending Allocation</p>
          <h2 className="rf-credential-title">Your credential<br />has been issued.</h2>

          <div className="rf-pass">
            <div className="rf-pass-top">
              <span className="rf-pass-logo-line">Mosaic MUN II · Delegate Credential</span>
              <span className="rf-pass-conf">ACCREDITATION</span>
            </div>
            <div className="rf-pass-body">
              <div className="rf-pass-info">
                <div className="rf-pass-field">
                  <span className="rf-pass-field-key">Delegate</span>
                  <span className="rf-pass-field-val">{registration?.full_name}</span>
                </div>
                <div className="rf-pass-field">
                  <span className="rf-pass-field-key">Registration ID</span>
                  <span className="rf-pass-field-val mono">{registration?.registration_id}</span>
                </div>
                <div className="rf-pass-field">
                  <span className="rf-pass-field-key">Institution</span>
                  <span className="rf-pass-field-val" style={{ fontSize: 13 }}>Saraswati Global School</span>
                </div>
                <div className="rf-pass-field">
                  <span className="rf-pass-field-key">Committee</span>
                  <span className="rf-pass-field-val" style={{ fontSize: 12, opacity: 0.5 }}>Pending allocation</span>
                </div>
                <div className="rf-pass-field">
                  <span className="rf-pass-field-key">Status</span>
                  <span className="rf-pass-field-val status">PENDING ALLOCATION</span>
                </div>
              </div>
              <div className="rf-pass-qr">
                <QRCode
                  value={`https://mosaicmodelunitednatons.vercel.app/verify/${registration?.registration_id || ''}`}
                  size={100}
                  fgColor="#9b6e09"
                  bgColor="transparent"
                />
              </div>
            </div>
            <div className="rf-pass-footer">
              <span className="rf-pass-date">
                {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
              </span>
              <span className="rf-pass-type-badge">SGS Delegate</span>
            </div>
          </div>

          <p className="rf-credential-note">
            Screenshot or save your credential. Your allocation will be confirmed
            by the Secretariat once registrations close. You will be notified via
            the registered email address.
          </p>

          <div className="rf-credential-actions">
            <Link to="/" className="rf-action-btn">Return to site</Link>
            <Link to="/portfolio" className="rf-action-btn">View Portfolio Matrix</Link>
          </div>
        </motion.div>
      )}
    </div>
  )
}
