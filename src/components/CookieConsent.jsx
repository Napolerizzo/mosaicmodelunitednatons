import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const css = `
.cookie-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9000;
  width: min(640px, calc(100vw - 32px));
  background: #ffffff;
  color: #1a1a2e;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.12);
}

.cookie-text {
  font-size: 13px;
  line-height: 1.65;
  color: #333;
}

.cookie-text strong {
  display: block;
  font-weight: 500;
  color: #09080f;
  margin-bottom: 4px;
}

.cookie-text a {
  color: #4b1d8e;
  text-decoration: none;
  font-size: 12px;
}
.cookie-text a:hover { text-decoration: underline; }

.cookie-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.cookie-accept {
  background: #09080f;
  color: #fff;
  border: none;
  padding: 10px 22px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: background 0.2s;
}
.cookie-accept:hover { background: #1a1a2e; }

.cookie-decline {
  background: transparent;
  color: #888;
  border: 1px solid #ddd;
  padding: 10px 18px;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: border-color 0.2s, color 0.2s;
}
.cookie-decline:hover { border-color: #999; color: #555; }

@media (max-width: 540px) {
  .cookie-bar { flex-direction: column; align-items: flex-start; }
}
`

const STORAGE_KEY = 'mosaic-mun-cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    const val = localStorage.getItem(STORAGE_KEY)
    if (!val) {
      const timer = setTimeout(() => setVisible(true), 1800)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = (choice) => {
    localStorage.setItem(STORAGE_KEY, choice)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="cookie-bar"
          role="dialog"
          aria-label="Cookie consent"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="cookie-text">
            <strong>We use cookies</strong>
            This site uses cookies to improve your experience. By continuing, you agree to our{' '}
            <a href="#cookie-policy">Cookie Policy</a>,{' '}
            <a href="#terms">Terms of Service</a>, and{' '}
            <a href="#privacy">Privacy Policy</a>.
          </div>
          <div className="cookie-actions">
            <button className="cookie-decline" onClick={() => dismiss('declined')}>Decline</button>
            <button className="cookie-accept" onClick={() => dismiss('accepted')}>Accept</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
