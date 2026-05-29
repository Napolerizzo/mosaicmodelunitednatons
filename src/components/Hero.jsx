import { useEffect } from 'react'
import { motion, useScroll } from 'framer-motion'
import FragmentField from './FragmentField'

const css = `
/* ── Hero ── */
.hero {
  position: relative;
  height: 100svh;
  display: flex;
  align-items: flex-end;
  padding: 0 8vw 9vh;
  background:
    linear-gradient(105deg, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 38%, rgba(0,0,0,0.48) 62%, rgba(0,0,0,0.08) 100%),
    linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.65) 100%);
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 52vw;
}

/* Large editorial number — decorative backdrop */
.hero-edition-bg {
  font-family: 'League Spartan', 'Impact', sans-serif;
  font-weight: 900;
  font-size: clamp(9rem, 22vw, 20rem);
  line-height: 1;
  letter-spacing: -0.06em;
  color: rgba(155,110,9,0.055);
  position: absolute;
  top: 8vh;
  left: 6vw;
  pointer-events: none;
  user-select: none;
  z-index: 1;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.hero-eyebrow-line {
  width: 36px;
  height: 1px;
  background: var(--gold);
  opacity: 0.6;
}

.hero-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(5.5rem, 12vw, 12rem);
  line-height: 0.86;
  letter-spacing: -0.035em;
  color: #d9d9d9;
  margin-bottom: 4px;
}

.hero-mun {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 5.2vw, 5.2rem);
  letter-spacing: 0.1em;
  color: #9b6e09;
  line-height: 1;
  margin-bottom: 14px;
}

.hero-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 44px;
}

.hero-meta-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8d7d5a;
}

.hero-meta-item svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.hero-btns {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

/* Scroll indicator */
.hero-scroll {
  position: absolute;
  bottom: 8vh;
  right: max(6vw, 24px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 2;
}

.hero-scroll-line {
  width: 1px;
  height: 48px;
  background: linear-gradient(to bottom, rgba(155,110,9,0.8), rgba(155,110,9,0));
  animation: scroll-pulse 2.2s ease-in-out infinite;
}

@keyframes scroll-pulse {
  0%, 100% { opacity: 0.3; transform: scaleY(1); }
  50%       { opacity: 0.9; transform: scaleY(1.2); }
}

.hero-scroll-label {
  font-family: 'Poppins', sans-serif;
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #8d7d5a;
  writing-mode: vertical-lr;
  opacity: 0.55;
}

/* MODEL UNITED NATIONS subtitle */
.hero-subtitle {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: clamp(0.6rem, 1vw, 0.8rem);
  letter-spacing: 0.52em;
  text-transform: uppercase;
  color: rgba(155,110,9,0.7);
  margin-bottom: 32px;
}

/* ── Mobile ── */
@media (max-width: 900px) {
  .hero {
    padding: 0 24px 11vh;
    align-items: flex-end;
    background:
      linear-gradient(105deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 38%, rgba(0,0,0,0.5) 62%, rgba(0,0,0,0.1) 100%),
      linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.7) 100%);
  }
  .hero-content {
    max-width: 100%;
  }
  .hero-title {
    font-size: clamp(4.5rem, 20vw, 7rem);
  }
  .hero-mun {
    font-size: clamp(2rem, 9vw, 3.5rem);
  }
  .hero-edition-bg {
    font-size: clamp(7rem, 32vw, 12rem);
    left: 2vw;
    top: 5vh;
  }
  .hero-scroll { display: none; }
  .hero-btns { gap: 10px; }
  .btn { padding: 13px 26px; font-size: 10px; }
}
`

const stagger = (i, from = 'bottom') => ({
  hidden:  { opacity: 0, y: from === 'bottom' ? 40 : -20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
  },
})

export default function Hero() {
  const { scrollY } = useScroll()

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = css
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  return (
    <section id="hero" className="hero">

      {/* Ghost "II" number behind everything */}
      <span className="hero-edition-bg" aria-hidden="true">II</span>

      <div className="hero-content">

        {/* Eyebrow */}
        <motion.div className="hero-eyebrow" variants={stagger(0)} initial="hidden" animate="visible">
          <span className="hero-eyebrow-line" />
          <span className="eyebrow">Second Edition</span>
        </motion.div>

        {/* Title */}
        <motion.h1 className="hero-title" variants={stagger(1)} initial="hidden" animate="visible">
          Mosaic
        </motion.h1>
        <motion.p className="hero-mun" variants={stagger(2)} initial="hidden" animate="visible">
          MUN&nbsp;·&nbsp;II
        </motion.p>
        <motion.p className="hero-subtitle" variants={stagger(3)} initial="hidden" animate="visible">
          Model United Nations
        </motion.p>

        {/* Date + location */}
        <motion.div className="hero-meta" variants={stagger(4)} initial="hidden" animate="visible">
          <div className="hero-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9b6e09" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            11–12 July 2026
          </div>
          <div className="hero-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9b6e09" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9.5" r="2.5"/>
            </svg>
            Saraswati Global School, Faridabad
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div className="hero-btns" variants={stagger(5)} initial="hidden" animate="visible">
          <a className="btn btn-gold" href="#register"
            onClick={e => { e.preventDefault(); document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <div className="btn-fill" /><span>Register Now</span>
          </a>
          <a className="btn btn-outline" href="#about"
            onClick={e => { e.preventDefault(); document.querySelector('#journey')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <div className="btn-fill" /><span>Learn More</span>
          </a>
        </motion.div>

      </div>

      {/* Fragment field — right 60% of hero */}
      <FragmentField scrollY={scrollY} />

      {/* Scroll indicator */}
      <div className="hero-scroll" aria-hidden="true">
        <div className="hero-scroll-line" />
        <span className="hero-scroll-label">Scroll</span>
      </div>

    </section>
  )
}
