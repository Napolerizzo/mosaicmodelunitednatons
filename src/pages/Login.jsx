import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, sanitizeError } from '../contexts/AuthContext'
import '../styles/auth.css'

export default function Login() {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')

    // Input validation — prevent malformed inputs before they hit Supabase
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password || password.length < 1) {
      setError('Password is required.')
      return
    }
    // Cap lengths to prevent oversized payloads
    if (cleanEmail.length > 254 || password.length > 256) {
      setError('Invalid credentials.')
      return
    }

    setSubmitting(true)
    try {
      const data = await login(cleanEmail, password)
      // Admin goes to admin portal, everyone else to dashboard
      const loggedEmail = data?.user?.email || cleanEmail
      navigate(loggedEmail === 'admin@sameerjhamb.com' ? '/admin' : '/dashboard')
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
          src="/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg"
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
            <span className="auth-eyebrow-text">Delegate Access</span>
          </div>

          <h1 className="auth-title">Enter.</h1>
          <p className="auth-subtitle">Sign in to your delegate account.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email Address</label>
              <input
                id="login-email" type="email" className="auth-input"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required autoComplete="email" autoFocus
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <input
                id="login-password" type="password" className="auth-input"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
              />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            No account?{' '}
            <Link to="/signup">Create one</Link>
            {' · '}
            <Link to="/register">Register for conference</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
