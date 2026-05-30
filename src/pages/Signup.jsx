import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      const { error: err } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
      if (err) throw err
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Account creation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-grain" aria-hidden="true" />

      {/* Photo panel — different image from login */}
      <div className="auth-photo" aria-hidden="true">
        <img
          className="auth-photo-img"
          src="/brand-assets/5771A8D9-88FD-4A2A-9889-3E2CDA237CF6_4_5005_c.jpeg"
          alt=""
        />
        <div className="auth-photo-veil" />
        <div className="auth-photo-content">
          <Link to="/">
            <img src="/brand-assets/mosaic-logo-nobg.png" className="auth-logo-img" alt="Mosaic MUN" />
          </Link>
          <div className="auth-photo-bottom">
            <p className="auth-photo-tag">Delegate Portal &middot; Mosaic MUN II</p>
            <p className="auth-photo-caption">
              Track your allotment.<br />Talk to Mozart.
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
            <span className="auth-eyebrow-text">Create Account</span>
          </div>

          <h1 className="auth-title">Access<br/>granted.</h1>
          <p className="auth-subtitle">Create your delegate account to access the dashboard.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="su-email">Email Address</label>
              <input id="su-email" type="email" className="auth-input"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required autoComplete="email" autoFocus />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="su-password">Password</label>
              <input id="su-password" type="password" className="auth-input"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 characters" required autoComplete="new-password" />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="su-confirm">Confirm Password</label>
              <input id="su-confirm" type="password" className="auth-input"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password" required autoComplete="new-password" />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
