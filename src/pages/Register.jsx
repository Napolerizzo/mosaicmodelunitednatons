import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, sanitizeError } from '../contexts/AuthContext'

const css = `
/* ── REGISTER PAGE ── */
/* Shares .auth-* classes from Login.jsx styles (injected there on /login) */
/* Auth-page CSS is declared in Login.jsx; Register re-injects for standalone use */
.auth-page { min-height:100vh; display:flex; background:#000; position:relative; overflow:hidden; }
.auth-grain { position:fixed; inset:0; z-index:0; pointer-events:none; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.045'/%3E%3C/svg%3E"); background-size:200px 200px; opacity:0.55; mix-blend-mode:overlay; }
.auth-photo { position:relative; width:52%; flex-shrink:0; overflow:hidden; }
.auth-photo-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:sepia(0.55) saturate(0.5) brightness(0.38); }
.auth-photo-veil { position:absolute; inset:0; background: linear-gradient(to right, rgba(0,0,0,0.1) 55%, #000 100%), linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.7) 100%), radial-gradient(ellipse 70% 60% at 20% 100%, rgba(155,110,9,0.07) 0%, transparent 60%); }
.auth-photo-content { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:40px 48px; }
.auth-logo-img { height:26px; width:auto; display:block; }
.auth-photo-tag { font-family:'Poppins',sans-serif; font-size:8px; letter-spacing:0.44em; text-transform:uppercase; color:var(--gold); opacity:0.55; margin:0 0 8px; }
.auth-photo-caption { font-family:'Cormorant Garamond',serif; font-style:italic; font-weight:300; font-size:clamp(1rem,1.8vw,1.4rem); color:var(--cream); opacity:0.62; margin:0; line-height:1.4; }
.auth-form-panel { flex:1; display:flex; align-items:center; justify-content:center; padding:60px 48px; position:relative; z-index:1; border-left:1px solid rgba(155,110,9,0.07); }
.auth-form-box { width:100%; max-width:360px; }
.auth-back { display:inline-flex; align-items:center; gap:10px; font-family:'Poppins',sans-serif; font-size:8px; letter-spacing:0.38em; text-transform:uppercase; color:var(--muted); opacity:0.45; text-decoration:none; margin-bottom:56px; transition:opacity 0.2s ease; }
.auth-back:hover { opacity:0.8; }
.auth-back-arrow { width:16px; height:1px; background:currentColor; position:relative; }
.auth-back-arrow::before { content:''; position:absolute; left:0; top:-3px; width:6px; height:6px; border-left:1px solid currentColor; border-bottom:1px solid currentColor; transform:rotate(45deg); }
.auth-eyebrow { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
.auth-eyebrow-line { width:26px; height:1px; background:var(--gold); opacity:0.35; }
.auth-eyebrow-text { font-family:'Poppins',sans-serif; font-size:7.5px; letter-spacing:0.46em; text-transform:uppercase; color:var(--gold); opacity:0.55; }
.auth-title { font-family:'Montserrat',sans-serif; font-weight:900; font-size:clamp(2.8rem,5vw,4rem); line-height:0.88; letter-spacing:-0.04em; color:var(--cream); margin:0 0 18px; }
.auth-subtitle { font-family:'Poppins',sans-serif; font-weight:300; font-size:12px; line-height:1.9; color:var(--muted); opacity:0.7; margin:0 0 44px; }
.auth-field { margin-bottom:28px; }
.auth-label { display:block; font-family:'Poppins',sans-serif; font-size:7.5px; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); opacity:0.55; margin-bottom:10px; }
.auth-input { width:100%; box-sizing:border-box; background:transparent; border:none; border-bottom:1px solid rgba(155,110,9,0.18); padding:10px 0; font-family:'Poppins',sans-serif; font-size:13px; font-weight:300; color:var(--cream); outline:none; transition:border-color 0.25s ease; -webkit-appearance:none; }
.auth-input::placeholder { color:var(--muted); opacity:0.28; }
.auth-input:focus { border-bottom-color:rgba(155,110,9,0.7); }
.auth-input:-webkit-autofill { -webkit-box-shadow:0 0 0 1000px #000 inset; -webkit-text-fill-color:var(--cream); caret-color:var(--cream); }
.auth-error { font-family:'Poppins',sans-serif; font-size:11px; font-weight:300; color:#b87070; margin:-8px 0 20px; line-height:1.6; }
.auth-submit { width:100%; background:var(--gold); color:#000; font-family:'Poppins',sans-serif; font-size:9.5px; font-weight:500; letter-spacing:0.32em; text-transform:uppercase; border:none; padding:16px 24px; cursor:pointer; margin-top:12px; transition:opacity 0.22s ease, background 0.22s ease; }
.auth-submit:hover:not(:disabled) { opacity:0.82; }
.auth-submit:disabled { opacity:0.45; cursor:default; }
.auth-switch { font-family:'Poppins',sans-serif; font-size:11px; font-weight:300; color:var(--muted); opacity:0.55; margin:28px 0 0; }
.auth-switch a { color:var(--gold); opacity:0.85; text-decoration:none; transition:opacity 0.18s; }
.auth-switch a:hover { opacity:1; }
@media (max-width:768px) {
  .auth-photo { display:none; }
  .auth-form-panel { border-left:none; padding:40px 24px; min-height:100vh; align-items:flex-start; padding-top:60px; }
  .auth-back { margin-bottom:40px; }
  .auth-title { font-size:clamp(2.4rem,10vw,3rem); }
}
`

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setSubmitting(true)
    try {
      await register(email.trim().toLowerCase(), password, fullName.trim(), school.trim())
      setSuccess(true)
      setTimeout(() => navigate('/'), 1800)
    } catch (err) {
      setError(sanitizeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-grain" aria-hidden="true" />

      {/* Photo panel */}
      <div className="auth-photo" aria-hidden="true">
        <img
          className="auth-photo-img"
          src="/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg"
          alt=""
        />
        <div className="auth-photo-veil" />
        <div className="auth-photo-content">
          <Link to="/">
            <img src="/brand-assets/mosaic-logo-nobg.png" className="auth-logo-img" alt="Mosaic MUN" />
          </Link>
          <div className="auth-photo-bottom">
            <p className="auth-photo-tag">Mosaic MUN II &middot; 2026</p>
            <p className="auth-photo-caption">
              Saraswati Global School,<br />Faridabad
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-box">
          <Link to="/" className="auth-back">
            <span className="auth-back-arrow" />
            Return to site
          </Link>

          <div className="auth-eyebrow">
            <span className="auth-eyebrow-line" />
            <span className="auth-eyebrow-text">Delegate Registration</span>
          </div>

          <h1 className="auth-title">Register.</h1>
          <p className="auth-subtitle">Create your delegate account for Mosaic MUN II.</p>

          {success ? (
            <div style={{ paddingTop: 8 }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--cream)', opacity: 0.85, lineHeight: 1.8, margin: '0 0 8px' }}>
                Account created.
              </p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11, fontWeight: 300, color: 'var(--muted)', opacity: 0.6, lineHeight: 1.7, margin: 0 }}>
                Redirecting you now...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-name">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  className="auth-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  autoFocus
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-school">School / Institution</label>
                <input
                  id="reg-school"
                  type="text"
                  className="auth-input"
                  value={school}
                  onChange={e => setSchool(e.target.value)}
                  placeholder="Your school"
                  autoComplete="organization"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-confirm">Confirm Password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  className="auth-input"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="auth-switch">
            Already registered?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
