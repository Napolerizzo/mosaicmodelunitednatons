import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const links = ['About', 'Committees', 'FAQ']

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

/* Flip text nav item */
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

/* Logged-in user area */
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

/* Hamburger */
.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 6px;
  cursor: pointer;
  background: none;
  border: none;
}

.hamburger span {
  display: block;
  width: 22px;
  height: 1.5px;
  background: var(--cream);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

/* Mobile menu */
.mobile-menu {
  position: fixed;
  inset: 0;
  z-index: 490;
  background: rgba(0,0,0,0.97);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 36px;
}

.mobile-menu a {
  font-family: 'League Spartan', sans-serif;
  font-weight: 700;
  font-size: 3rem;
  font-style: normal;
  letter-spacing: 0.05em;
  color: var(--cream);
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.mobile-menu a:hover { opacity: 1; color: var(--gold); }

.mobile-menu-exit {
  font-family: 'Poppins', sans-serif;
  font-weight: 400;
  font-size: 1.1rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.6;
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.mobile-menu-exit:hover { opacity: 1; }

@media (max-width: 768px) {
  .nav { padding: 14px 20px; }
  .nav.scrolled { padding: 10px 20px; }
  .nav-links-list, .nav-cta, .nav-user-area { display: none; }
  .hamburger { display: flex; }
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

  const handleNav = (href) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSignOut = async () => {
    setMenuOpen(false)
    await logout()
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Delegate'

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

        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {links.map((link, i) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={e => { e.preventDefault(); handleNav(`#${link.toLowerCase()}`) }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                {link}
              </motion.a>
            ))}
            {user ? (
              <motion.button
                className="mobile-menu-exit"
                onClick={handleSignOut}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: links.length * 0.07 }}
              >
                Sign Out
              </motion.button>
            ) : (
              <motion.a
                href="/login"
                onClick={e => { e.preventDefault(); setMenuOpen(false); navigate('/login') }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: links.length * 0.07 }}
                style={{ color: 'var(--gold)', fontSize: '2.4rem' }}
              >
                Sign In
              </motion.a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
