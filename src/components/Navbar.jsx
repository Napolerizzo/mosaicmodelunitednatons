import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const links = ['About', 'Committees', 'FAQ']
const NAV_ROUTES = { Portfolios: '/portfolio' }

const css = `
.nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 500;
  padding: 16px 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.4s ease, padding 0.4s ease, border-color 0.4s ease;
  border-bottom: 1px solid transparent;
}

.nav.scrolled {
  background: rgba(0,0,0,0.94);
  backdrop-filter: blur(12px);
  padding: 12px 48px;
  border-color: rgba(201,168,76,0.08);
}

.nav-logos {
  display: flex;
  align-items: center;
}

.nav-logos img {
  height: 32px;
  width: auto;
  display: block;
}

.nav-logos .mosaic { }
.nav-logos .sgs {
  filter: brightness(0) invert(1);
  opacity: 0.7;
}

.nav-logo-divider {
  width: 1px;
  height: 24px;
  background: rgba(122,101,48,0.5);
  margin: 0 16px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-links-list {
  display: flex;
  list-style: none;
  gap: 6px;
}

.nav-link {
  display: block;
  overflow: hidden;
  padding: 0 12px;
  height: 20px;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.nav-link-inner {
  display: flex;
  flex-direction: column;
  transition: transform 0.2s cubic-bezier(0.76, 0, 0.24, 1);
  will-change: transform;
}

.nav-link:hover .nav-link-inner,
.nav-link:focus-visible .nav-link-inner {
  transform: translateY(-20px);
}

.nav-link-text {
  display: flex;
  align-items: center;
  height: 20px;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
}

.nav-link-text:first-child { color: var(--cream); opacity: 0.5; }
.nav-link-text:last-child  { color: var(--gold);  opacity: 0.9; }

.nav-cta {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--gold);
  padding: 9px 22px;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  display: inline-block;
  transition: color 0.35s cubic-bezier(0.76, 0, 0.24, 1);
  cursor: pointer;
  border: none;
  font-family: 'Poppins', sans-serif;
}

.nav-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gold-bright);
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.76, 0, 0.24, 1);
  z-index: 0;
}
.nav-cta:hover::after { transform: translateY(0); }
.nav-cta span { position: relative; z-index: 1; }

.nav-user-area {
  display: flex;
  align-items: center;
  gap: 14px;
}

.nav-user-name {
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--cream);
  opacity: 0.55;
}

.nav-user-exit {
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s ease;
}
.nav-user-exit:hover { opacity: 1; }

/* Mobile signed-in initial */
.nav-mobile-user {
  display: none;
}

/* ── Hamburger ── */
.hamburger {
  display: none;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  cursor: pointer;
  background: none;
  border: none;
}

.hamburger span {
  display: block;
  height: 1px;
  background: var(--cream);
  transition: transform 0.35s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.35s ease, width 0.35s ease;
}

.hamburger span:nth-child(1) { width: 22px; }
.hamburger span:nth-child(2) { width: 14px; opacity: 0.5; }
.hamburger span:nth-child(3) { width: 18px; opacity: 0.3; }

.hamburger.open span:nth-child(1) { width: 20px; transform: translateY(7px) rotate(45deg); opacity: 1; }
.hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger.open span:nth-child(3) { width: 20px; transform: translateY(-7px) rotate(-45deg); opacity: 1; }

/* ── Mobile drawer backdrop ── */
.mm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 489;
  background: rgba(0,0,0,0.55);
  cursor: pointer;
}

/* ── Mobile drawer ── */
.mobile-menu {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 82vw;
  max-width: 320px;
  z-index: 490;
  background: #070604;
  border-left: 1px solid rgba(155,110,9,0.12);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.mm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(155,110,9,0.07);
  flex-shrink: 0;
}

.mm-logo {
  height: 20px;
  width: auto;
  display: block;
}

.mm-close {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
  padding: 0;
  flex-shrink: 0;
}

.mm-close span {
  position: absolute;
  top: 50%;
  left: 4px;
  right: 4px;
  height: 1px;
  background: var(--cream);
  opacity: 0.45;
  transition: opacity 0.2s ease;
}

.mm-close span:nth-child(1) { transform: rotate(45deg); }
.mm-close span:nth-child(2) { transform: rotate(-45deg); }
.mm-close:hover span { opacity: 0.9; }

/* ── Navigation links ── */
.mm-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  overflow-y: auto;
}

.mm-item {
  display: flex;
  align-items: baseline;
  gap: 18px;
  padding: 20px 28px;
  border-bottom: 1px solid rgba(155,110,9,0.06);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  text-decoration: none;
  transition: background 0.2s ease;
}

.mm-item:first-child {
  border-top: 1px solid rgba(155,110,9,0.06);
}

.mm-item:active { background: rgba(155,110,9,0.03); }

.mm-num {
  font-family: 'Poppins', sans-serif;
  font-size: 7.5px;
  letter-spacing: 0.32em;
  color: var(--gold);
  opacity: 0.35;
  flex-shrink: 0;
  padding-bottom: 3px;
  transition: opacity 0.2s ease;
}

.mm-link-text {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 300;
  font-size: 2.4rem;
  line-height: 1;
  color: var(--cream);
  opacity: 0.72;
  letter-spacing: -0.01em;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.mm-item:hover .mm-num { opacity: 0.65; }
.mm-item:hover .mm-link-text { opacity: 1; color: var(--gold); }

/* ── Auth row ── */
.mm-auth {
  padding: 18px 28px;
  border-bottom: 1px solid rgba(155,110,9,0.06);
}

.mm-auth-btn {
  font-family: 'Poppins', sans-serif;
  font-size: 8.5px;
  font-weight: 400;
  letter-spacing: 0.36em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.6;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
  display: block;
  transition: opacity 0.2s ease;
}
.mm-auth-btn:hover { opacity: 1; }

.mm-user-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.mm-user-name {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cream);
  opacity: 0.45;
}

/* ── Footer details ── */
.mm-footer {
  padding: 24px 28px;
  border-top: 1px solid rgba(155,110,9,0.07);
  flex-shrink: 0;
}

.mm-detail {
  font-family: 'Poppins', sans-serif;
  font-size: 8px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.35;
  margin: 0 0 5px;
  line-height: 1.6;
}

.mm-detail:last-child { margin: 0; }

@media (max-width: 768px) {
  .nav { padding: 14px 20px; }
  .nav.scrolled { padding: 10px 20px; }
  .nav-links-list, .nav-cta, .nav-user-area { display: none; }
  .hamburger { display: flex; }
  .nav-mobile-user {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid rgba(155,110,9,0.4);
    font-family: 'Poppins', sans-serif;
    font-size: 8.5px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--gold);
    text-transform: uppercase;
    opacity: 0.85;
  }
}
`

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleNav = (href) => {
    setMenuOpen(false)
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }, 320)
  }

  const handleSignOut = async () => {
    setMenuOpen(false)
    await logout()
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Delegate'

  const drawerVariants = {
    hidden: { x: '100%' },
    visible: { x: 0 },
    exit:   { x: '100%' },
  }

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-logos">
          <img src="/brand-assets/mosaic-logo-nobg.png" alt="Mosaic MUN" className="mosaic" />
          <div className="nav-logo-divider" />
          <img src="/brand-assets/sgs-logo.png" alt="Saraswati Global School" className="sgs" />
        </div>

        <div className="nav-right">
          <ul className="nav-links-list">
            {links.map(link => (
              <li key={link}>
                <a
                  className="nav-link"
                  href={`#${link.toLowerCase()}`}
                  onClick={e => { e.preventDefault(); handleNav(`#${link.toLowerCase()}`) }}
                >
                  <span className="nav-link-inner">
                    <span className="nav-link-text">{link}</span>
                    <span className="nav-link-text" aria-hidden="true">{link}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <Link
            to="/portfolio"
            className="nav-link"
            style={{ textDecoration:'none' }}
          >
            <span className="nav-link-inner">
              <span className="nav-link-text">Portfolios</span>
              <span className="nav-link-text" aria-hidden="true">Portfolios</span>
            </span>
          </Link>

          {user ? (
            <div className="nav-user-area">
              <span className="nav-user-name">{firstName}</span>
              <button className="nav-user-exit" onClick={handleSignOut}>Exit</button>
            </div>
          ) : (
            <button className="nav-cta" onClick={() => navigate('/login')}>
              <span>Sign In</span>
            </button>
          )}
        </div>

        {user && (
          <span className="nav-mobile-user" aria-hidden="true">
            {firstName.charAt(0)}
          </span>
        )}

        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="backdrop"
            className="mm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="drawer"
            className="mobile-menu"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.76, 0, 0.24, 1] }}
          >
            {/* Header */}
            <div className="mm-header">
              <img src="/brand-assets/mosaic-logo-nobg.png" className="mm-logo" alt="Mosaic MUN" />
              <button className="mm-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <span /><span />
              </button>
            </div>

            {/* Nav links */}
            <nav className="mm-nav" aria-label="Mobile navigation">
              {links.map((link, i) => (
                <motion.a
                  key={link}
                  className="mm-item"
                  href={`#${link.toLowerCase()}`}
                  onClick={e => { e.preventDefault(); handleNav(`#${link.toLowerCase()}`) }}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="mm-num">0{i + 1}</span>
                  <span className="mm-link-text">{link}</span>
                </motion.a>
              ))}
            </nav>

            {/* Portfolios link */}
            <motion.a
              className="mm-item"
              href="/portfolio"
              onClick={e => { e.preventDefault(); setMenuOpen(false); navigate('/portfolio') }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + links.length * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="mm-num">0{links.length + 1}</span>
              <span className="mm-link-text">Portfolios</span>
            </motion.a>

            {/* Auth */}
            <motion.div
              className="mm-auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.4 }}
            >
              {user ? (
                <div className="mm-user-row">
                  <span className="mm-user-name">{firstName}</span>
                  <button className="mm-auth-btn" onClick={handleSignOut}>Sign Out</button>
                </div>
              ) : (
                <a
                  className="mm-auth-btn"
                  href="/login"
                  onClick={e => { e.preventDefault(); setMenuOpen(false); navigate('/login') }}
                >
                  Sign In
                </a>
              )}
            </motion.div>

            {/* Footer */}
            <motion.div
              className="mm-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.4 }}
            >
              <p className="mm-detail">11 · 12 July 2026</p>
              <p className="mm-detail">Saraswati Global School, Faridabad</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
