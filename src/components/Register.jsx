import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const css = `
.register {
  padding: 120px 0;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.register-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.register-left .section-heading {
  font-size: clamp(2.8rem, 5vw, 4.4rem);
  margin-top: 18px;
  margin-bottom: 24px;
}
.register-left .section-heading em {
  font-style: italic;
  color: var(--gold);
}

.register-body {
  font-size: 15.5px;
  line-height: 1.82;
  color: var(--cream);
  opacity: 0.5;
  margin-bottom: 38px;
}

.register-box {
  background: var(--bg-1);
  border: 1px solid var(--border);
  padding: 48px 40px;
}

.register-box h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 1.65rem;
  color: var(--cream);
  margin-bottom: 8px;
}

.register-box p {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.65;
  margin-bottom: 28px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-input {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 0;
  color: var(--cream);
  padding: 13px 16px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 300;
  outline: none;
  width: 100%;
  transition: border-color 0.25s;
  -webkit-appearance: none;
}
.form-input::placeholder { color: var(--muted); opacity: 0.6; }
.form-input:focus { border-color: var(--gold-dim); }

.form-note {
  font-size: 11px;
  color: var(--muted);
  opacity: 0.4;
  margin-top: 4px;
}
.form-note.success {
  color: var(--gold);
  opacity: 0.9;
}

@media (max-width: 900px) {
  .register-inner {
    grid-template-columns: 1fr;
    padding: 0 24px;
    gap: 44px;
  }
}
`

export default function Register() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {}
    setSubmitted(true)
  }

  return (
    <section id="register" className="register">
      <style>{css}</style>
      <div className="register-inner" ref={ref}>
        <motion.div
          className="register-left"
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.85 }}
        >
          <span className="eyebrow">Join Us</span>
          <h2 className="section-heading">
            Be in<br />the <em>room.</em>
          </h2>
          <p className="register-body">
            Registrations for Mosaic MUN II open soon. Leave your email and we'll notify you the moment they do.
          </p>
          <a
            className="btn btn-gold"
            href="mailto:sameer.jhamb1719@gmail.com"
          >
            <div className="btn-fill" />
            <span>Get in Touch</span>
          </a>
        </motion.div>

        <motion.div
          className="register-box"
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.85, delay: 0.18 }}
        >
          <h3>Stay Updated</h3>
          <p>Committee reveals, registration dates, study guides — straight to your inbox.</p>
          <form className="form-row" onSubmit={handleSubmit}>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={submitted}
            />
            {!submitted ? (
              <button type="submit" className="btn btn-gold" style={{ alignSelf: 'flex-start' }}>
                <div className="btn-fill" />
                <span>Notify Me</span>
              </button>
            ) : (
              <motion.p
                className="form-note success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                You're on the list. See you in the chambers.
              </motion.p>
            )}
            {!submitted && (
              <p className="form-note">No spam. Just Mosaic MUN updates.</p>
            )}
          </form>
        </motion.div>
      </div>
    </section>
  )
}
