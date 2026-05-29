import { useRef, useEffect, Fragment } from 'react'

const PHOTOS = [
  '/brand-assets/0A6F8213-9ACE-43D9-B87F-24EAF110D480_1_105_c.jpeg',
  '/brand-assets/2E9FC29D-C33E-4880-B233-097764A88E0B_4_5005_c.jpeg',
  '/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg',
  '/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg',
  '/brand-assets/8AF34B6E-9909-47EA-ABE8-7E55CB30BF98_1_105_c.jpeg',
]

/* 5 photos, 50s total cycle, each visible 10s with 2s crossfades on each side */
const css = `
.footer {
  position: relative;
  height: 440px;
  overflow: hidden;
  background: #000;
  border-top: 1px solid rgba(155,110,9,0.1);
}

/* Photo background */
.fp-photos {
  position: absolute;
  inset: -30px;
  z-index: 0;
  will-change: transform;
}

.fp-p {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  animation: fp-cycle 50s ease-in-out infinite;
  filter: sepia(0.4) saturate(0.55) brightness(0.85);
}

.fp-p:nth-child(1) { animation-delay: -3s;  object-position: center 35%; }
.fp-p:nth-child(2) { animation-delay: 7s;   object-position: center 55%; }
.fp-p:nth-child(3) { animation-delay: 17s;  object-position: center 45%; }
.fp-p:nth-child(4) { animation-delay: 27s;  object-position: center 30%; }
.fp-p:nth-child(5) { animation-delay: 37s;  object-position: center 60%; }

@keyframes fp-cycle {
  0%   { opacity: 0;    }
  3%   { opacity: 0.16; }
  17%  { opacity: 0.16; }
  23%  { opacity: 0;    }
  100% { opacity: 0;    }
}

/* Layered overlays */
.fp-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(ellipse 90% 90% at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 100%),
    linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.72) 100%),
    radial-gradient(ellipse 80% 60% at 20% 100%, rgba(155,110,9,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 80% 0%,   rgba(155,110,9,0.05) 0%, transparent 55%);
}

/* Content */
.fp-content {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 8vw 28px;
}

/* Top: slogan + info */
.fp-top {}

.fp-slogan {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(1.25rem, 2.2vw, 1.75rem);
  color: var(--cream);
  opacity: 0.78;
  line-height: 1.3;
  letter-spacing: 0.01em;
  margin: 0 0 12px;
}

.fp-info {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: 9.5px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.5;
  margin: 0;
  line-height: 1.9;
}

/* Center: nav */
.fp-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.fp-nav a {
  font-family: 'Poppins', sans-serif;
  font-size: 9.5px;
  font-weight: 400;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cream);
  text-decoration: none;
  opacity: 0.38;
  transition: opacity 0.2s ease, color 0.2s ease;
  padding: 2px 0;
}

.fp-nav a:hover { opacity: 0.8; color: var(--gold); }

.fp-nav-dot {
  color: var(--muted);
  opacity: 0.22;
  font-size: 9px;
  padding: 0 4px;
}

/* Bottom bar */
.fp-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.fp-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.fp-copy,
.fp-bar a {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--muted);
  opacity: 0.35;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.fp-bar a:hover { opacity: 0.65; }
.fp-bar a.fp-ig  { color: var(--gold); opacity: 0.45; }
.fp-bar a.fp-ig:hover { opacity: 0.8; }

.fp-bar-sep {
  color: var(--muted);
  opacity: 0.18;
  font-size: 8px;
}

.fp-credit {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--muted);
  opacity: 0.58;
}

.fp-credit a {
  color: var(--gold);
  opacity: 0.75;
  text-decoration: none;
  transition: opacity 0.2s ease;
}
.fp-credit a:hover { opacity: 1; }

/* Mobile */
@media (max-width: 768px) {
  .footer { height: 340px; }

  .fp-content { padding: 30px 24px 22px; }

  .fp-slogan {
    font-size: clamp(1.1rem, 5.5vw, 1.4rem);
    margin-bottom: 8px;
  }

  .fp-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
`

export default function Footer() {
  const parallaxRef = useRef(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    const el = parallaxRef.current
    const onScroll = () => {
      if (!el) return
      const footer = el.closest('footer')
      if (!footer) return
      const rect = footer.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / vh))
      el.style.transform = `translateY(${progress * -22}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="footer" aria-label="Site footer">
      {/* Parallax photo layer */}
      <div className="fp-photos" ref={parallaxRef} aria-hidden="true">
        {PHOTOS.map((src, i) => (
          <img key={i} className="fp-p" src={src} alt="" loading="lazy" />
        ))}
      </div>

      {/* Overlays */}
      <div className="fp-overlay" aria-hidden="true" />

      {/* Content */}
      <div className="fp-content">
        {/* Top: slogan + info */}
        <div className="fp-top">
          <p className="fp-slogan">Debate. Deliberate. Decide.</p>
          <p className="fp-info">Mosaic MUN II &nbsp;&middot;&nbsp; 11 · 12 July 2026</p>
          <p className="fp-info">Saraswati Global School, Faridabad</p>
        </div>

        {/* Center: navigation */}
        <nav className="fp-nav" aria-label="Footer navigation">
          {[['About', '#about'], ['Committees', '#committees'], ['FAQ', '#faq'], ['Register', '#register']].map(([label, href], i, arr) => (
            <Fragment key={label}>
              <a
                href={href}
                onClick={e => { e.preventDefault(); scrollTo(href) }}
              >
                {label}
              </a>
              {i < arr.length - 1 && (
                <span className="fp-nav-dot" aria-hidden="true">/</span>
              )}
            </Fragment>
          ))}
        </nav>

        {/* Bottom bar */}
        <div className="fp-bar">
          <div className="fp-bar-left">
            <span className="fp-copy">&copy; 2026 Mosaic MUN</span>
            <span className="fp-bar-sep">·</span>
            <a href="#" className="fp-bar-link">Privacy</a>
            <span className="fp-bar-sep">·</span>
            <a href="#" className="fp-bar-link">Terms</a>
            <span className="fp-bar-sep">·</span>
            <a
              href="https://instagram.com/mosaicmunofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="fp-ig"
            >
              Instagram &uarr;
            </a>
          </div>
          <span className="fp-credit">
            Designed by{' '}
            <a href="https://instagram.com/sameerjhambb" target="_blank" rel="noopener noreferrer">
              Sameer Jhamb
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
