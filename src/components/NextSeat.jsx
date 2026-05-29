import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'

const css = `
.nextseat {
  background: var(--bg);
  border-top: 1px solid var(--border);
  position: relative;
  z-index: 1;
  overflow: hidden;
  padding: 120px 8vw 140px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.nextseat::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 60% at 80% 50%, rgba(155,110,9,0.035) 0%, transparent 65%);
  pointer-events: none;
}

.nextseat-eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 44px;
}

.nextseat-eyebrow-line {
  width: 32px;
  height: 1px;
  background: var(--gold);
  opacity: 0.5;
}

.nextseat-eyebrow-text {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.7;
}

.nextseat-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(4rem, 11vw, 11rem);
  line-height: 0.86;
  letter-spacing: -0.04em;
  color: var(--cream);
  margin-bottom: 64px;
}

.nextseat-title span {
  display: block;
}

.nextseat-title .nt-accent {
  color: var(--gold);
}

.nextseat-details {
  display: flex;
  gap: 56px;
  flex-wrap: wrap;
  margin-bottom: 52px;
}

.nextseat-detail {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.nextseat-detail-label {
  font-family: 'Poppins', sans-serif;
  font-size: 8px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.6;
}

.nextseat-detail-value {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(1rem, 1.55vw, 1.2rem);
  color: var(--cream);
  opacity: 0.78;
  font-weight: 400;
}

.nextseat-sep {
  width: 100%;
  height: 1px;
  background: rgba(155,110,9,0.1);
  margin-bottom: 52px;
}

.nextseat-cta-row {
  display: flex;
  align-items: center;
  gap: 36px;
  flex-wrap: wrap;
}

.nextseat-note {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.05em;
  color: var(--muted);
  opacity: 0.6;
}

@media (max-width: 900px) {
  .nextseat {
    padding: 80px 24px 100px;
    min-height: auto;
  }

  .nextseat-title {
    font-size: clamp(3.2rem, 17vw, 5rem);
    margin-bottom: 44px;
  }

  .nextseat-details {
    gap: 28px;
  }

  .nextseat-cta-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
}
`

export default function NextSeat() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <section id="register" className="nextseat" aria-label="Registration">
      <div ref={ref}>
        <motion.div
          className="nextseat-eyebrow"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="nextseat-eyebrow-line" />
          <span className="nextseat-eyebrow-text">Mosaic MUN II / July 2026 / Registration</span>
        </motion.div>

        <motion.h2
          className="nextseat-title"
          initial={{ opacity: 0, y: 52 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.05, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>The Next</span>
          <span>Seat Is</span>
          <span className="nt-accent">Empty.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="nextseat-details">
            <div className="nextseat-detail">
              <span className="nextseat-detail-label">When</span>
              <span className="nextseat-detail-value">11 &amp; 12 July 2026</span>
            </div>
            <div className="nextseat-detail">
              <span className="nextseat-detail-label">Where</span>
              <span className="nextseat-detail-value">Saraswati Global School, Faridabad</span>
            </div>
            <div className="nextseat-detail">
              <span className="nextseat-detail-label">Edition</span>
              <span className="nextseat-detail-value">Second</span>
            </div>
            <div className="nextseat-detail">
              <span className="nextseat-detail-label">Committees</span>
              <span className="nextseat-detail-value">7 Open</span>
            </div>
          </div>

          <div className="nextseat-sep" />

          <div className="nextseat-cta-row">
            <a
              className="btn btn-gold"
              href="mailto:sameer.jhamb1719@gmail.com?subject=Mosaic MUN II Registration Interest"
            >
              <div className="btn-fill" />
              <span>Register Interest</span>
            </a>
            <p className="nextseat-note">Registration opens soon. Express interest now.</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
