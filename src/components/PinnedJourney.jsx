import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/*
  300vh sticky-scroll container.
  Globe (GlobeFloat, fixed) occupies right ~40% of viewport.
  Left 55% shows three editorial panels that cross-fade on scroll.
  Panel visibility windows:
    Panel 0 → scrollYProgress  0.00 – 0.33
    Panel 1 → scrollYProgress  0.33 – 0.66
    Panel 2 → scrollYProgress  0.66 – 1.00
*/

const PANELS = [
  {
    num: '01',
    eyebrow: 'About the Conference',
    lines: ['Debate.', 'Deliberate.', 'Decide.'],
    body: "SGS's own MUN. Edition I packed 350+ delegates into rooms that got louder than planned. Edition II is bigger — seven committees, sharper agendas, two days in July. If you can hold a floor and write a resolution, you belong here.",
    meta: [
      { value: 'II',   label: 'Edition' },
      { value: '7',    label: 'Committees' },
      { value: '350+', label: 'Delegates' },
    ],
  },
]

const css = `
/* ── Journey container ── */
.journey-outer {
  position: relative;
  height: 100vh;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

/* Sticky stage — full width, positions itself in the viewport */
.journey-stage {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
}

/* Left text zone — stays at 55% width, globe occupies the right */
.journey-text-zone {
  position: relative;
  width: 56%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8vw;
}

/* Each panel absolutely stacked — framer drives opacity/x */
.journey-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 8vw;
  padding-bottom: 8vh;
  will-change: opacity, transform;
}

/* Ghost edition number — decorative */
.journey-num {
  font-family: 'League Spartan', 'Impact', sans-serif;
  font-weight: 900;
  font-size: clamp(7rem, 14vw, 12rem);
  line-height: 1;
  letter-spacing: -0.04em;
  color: rgba(155,110,9,0.07);
  margin-bottom: -0.18em;
  display: block;
  pointer-events: none;
  user-select: none;
}

/* Section eyebrow */
.journey-panel .eyebrow {
  margin-bottom: 18px;
}

/* Large heading lines */
.journey-heading {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(3.2rem, 6vw, 5.6rem);
  line-height: 0.9;
  letter-spacing: -0.03em;
  color: #d9d9d9;
  margin-bottom: 28px;
}

/* Body text */
.journey-body {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: clamp(0.82rem, 1.2vw, 0.95rem);
  line-height: 1.85;
  color: #8d7d5a;
  max-width: 420px;
  margin-bottom: 36px;
}

/* Stat row */
.journey-stats {
  display: flex;
  gap: 36px;
  margin-bottom: 0;
}

.journey-stat-value {
  font-family: 'League Spartan', sans-serif;
  font-weight: 700;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  color: #9b6e09;
  line-height: 1;
  display: block;
}

.journey-stat-label {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8d7d5a;
  opacity: 0.6;
  margin-top: 4px;
  display: block;
}

/* Committee badges */
.journey-badges {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 0;
}

.journey-badge {
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #9b6e09;
  padding: 10px 0;
  border-bottom: 1px solid rgba(155,110,9,0.15);
}

.journey-badge:first-child {
  border-top: 1px solid rgba(155,110,9,0.15);
}

/* Progress bar — right edge of text zone */
.journey-progress-track {
  position: absolute;
  right: 0;
  top: 15%;
  height: 70%;
  width: 1px;
  background: rgba(155,110,9,0.1);
}

.journey-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  background: linear-gradient(to bottom, #9b6e09, rgba(155,110,9,0.3));
  transform-origin: top center;
}

/* Panel dot indicators */
.journey-dots {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.journey-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(155,110,9,0.25);
  transition: background 0.4s, transform 0.4s;
}

.journey-dot.active {
  background: #9b6e09;
  transform: scale(1.5);
}

/* ── Mobile: unstick, stack panels ── */
@media (max-width: 900px) {
  .journey-outer { height: auto; }

  .journey-stage {
    position: relative;
    height: auto;
    display: block;
  }

  .journey-text-zone {
    width: 100%;
    height: auto;
    padding: 0;
    position: relative;
  }

  .journey-panel {
    position: relative;
    inset: auto;
    padding: 80px 24px;
    opacity: 1 !important;
    transform: none !important;
  }

  .journey-progress-track,
  .journey-dots { display: none; }

  .journey-num { font-size: clamp(5rem, 22vw, 8rem); }
  .journey-heading { font-size: clamp(2.6rem, 10vw, 4rem); }
}
`

export default function PinnedJourney() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Single panel: fade in quickly, stay visible
  const p0opacity = useTransform(scrollYProgress, [0, 0.12, 0.88, 1.0], [0, 1, 1, 0])
  const p0x       = useTransform(scrollYProgress, [0, 0.14], [-60, 0])

  const opacities = [p0opacity]
  const xs        = [p0x]

  // Progress fill
  const progressScaleY = useTransform(scrollYProgress, [0, 1], [0, 1])

  // Single dot
  const dotOpacities = [
    useTransform(scrollYProgress, [0, 0.12, 0.88, 1.0], [0.25, 1, 1, 0.25]),
  ]

  return (
    <div id="about" ref={containerRef} className="journey-outer">
      <style>{css}</style>

      <div className="journey-stage">
        <div className="journey-text-zone">

          {/* Content panels */}
          {PANELS.map((panel, i) => (
            <motion.div
              key={i}
              className="journey-panel"
              style={{ opacity: opacities[i], x: xs[i] }}
            >
              <span className="journey-num" aria-hidden="true">{panel.num}</span>
              <span className="eyebrow">{panel.eyebrow}</span>
              <h2 className="journey-heading">
                {panel.lines.map((line, j) => (
                  <span key={j} style={{ display: 'block' }}>{line}</span>
                ))}
              </h2>
              <p className="journey-body">{panel.body}</p>

              {panel.meta && (
                <div className="journey-stats">
                  {panel.meta.map(s => (
                    <div key={s.label}>
                      <span className="journey-stat-value">{s.value}</span>
                      <span className="journey-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {panel.badges && (
                <div className="journey-badges">
                  {panel.badges.map(b => (
                    <span key={b} className="journey-badge">{b}</span>
                  ))}
                </div>
              )}

              {panel.cta === 'committees' && (
                <a className="btn btn-gold" href="#committees"
                  onClick={e => { e.preventDefault(); document.querySelector('#committees')?.scrollIntoView({ behavior: 'smooth' }) }}>
                  <div className="btn-fill" /><span>Explore Committees ↓</span>
                </a>
              )}
              {panel.cta === true && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <a className="btn btn-gold" href="#gallery"
                    onClick={e => { e.preventDefault(); document.querySelector('#gallery')?.scrollIntoView({ behavior: 'smooth' }) }}>
                    <div className="btn-fill" /><span>View Gallery</span>
                  </a>
                  <a className="btn btn-outline" href="#register"
                    onClick={e => { e.preventDefault(); document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' }) }}>
                    <div className="btn-fill" /><span>Register</span>
                  </a>
                </div>
              )}
            </motion.div>
          ))}

          {/* Vertical progress bar */}
          <div className="journey-progress-track">
            <motion.div
              className="journey-progress-fill"
              style={{ scaleY: progressScaleY, height: '100%' }}
            />
            {/* Panel dots */}
            <div className="journey-dots">
              {PANELS.map((_, i) => (
                <motion.div
                  key={i}
                  className="journey-dot"
                  style={{ opacity: dotOpacities[i] }}
                />
              ))}
            </div>
          </div>

        </div>
        {/* Right side is intentionally empty — GlobeFloat sits here (position: fixed) */}
      </div>
    </div>
  )
}
