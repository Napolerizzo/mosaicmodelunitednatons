import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform, useSpring } from 'framer-motion'
import OrbitingStats from './OrbitingStats'

const GLOBE_SIZE = 480
const GLOBE_GAP  = 52

const revealUp = (delay = 0) => ({
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] } },
})

const css = `
.about {
  padding: 110px 0 100px;
  background: var(--bg-1);
  border-top: 1px solid var(--border);
}

.about-inner {
  padding: 0 7vw 0 48px;
  max-width: none;
  margin: 0;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 80px;
  align-items: start;
}

.about-pull {
  font-family: 'Poppins', sans-serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(1.7rem, 3.2vw, 2.9rem);
  line-height: 1.25;
  color: var(--cream);
  padding-left: 24px;
  border-left: 2px solid var(--gold-dim);
  margin-top: 20px;
}

.about-right { padding-top: 4px; }

.about-body {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  line-height: 1.85;
  color: var(--cream);
  opacity: 0.55;
  margin-bottom: 18px;
}

/* stats replaced by OrbitingStats component */

@media (max-width: 900px) {
  .about-inner {
    grid-template-columns: 1fr;
    padding: 0 24px !important;
    gap: 44px;
  }
  .about-stats { grid-template-columns: repeat(2, 1fr); }
  .stat-cell:nth-child(2) { border-right: none; }
  .stat-cell:nth-child(3),
  .stat-cell:nth-child(4) { border-top: 1px solid var(--border); }
}
`

export default function About() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  // Globe-aware padding — same formula as GlobeFloat
  const { scrollY } = useScroll()
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const isMobile = vw < 900

  const endX        = vw * 0.04
  const globeRight  = endX + GLOBE_SIZE + GLOBE_GAP  // ~590px on 1440px screen
  const defaultLeft = vw * 0.07                      // 7vw

  // On mobile, GlobeFloat is hidden — never shift content
  const shiftedLeft = isMobile ? defaultLeft : globeRight

  // paddingLeft tracks globe right edge: grows as globe moves left, returns when globe fades
  // Matches globe travel (0 → 3vh), snaps right sharply as globe approaches
  const rawLeft = useTransform(scrollY, [0, vh * 3], [defaultLeft, shiftedLeft])
  const paddingLeft = useSpring(rawLeft, { stiffness: 80, damping: 18 })

  return (
    <section id="about" className="about">
      <style>{css}</style>
      <motion.div
        className="about-inner"
        ref={ref}
        style={{ paddingLeft }}
      >
        <motion.div
          variants={revealUp(0)}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <span className="eyebrow">About the Conference</span>
          <blockquote className="about-pull">
            Debate.<br />
            Deliberate.<br />
            Decide.
          </blockquote>
        </motion.div>

        <div className="about-right">
          <motion.p className="about-body" variants={revealUp(0.12)} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
            Mosaic MUN is Saraswati Global School's student-run Model United Nations — a conference where delegates argue, persuade, and build. Not polished or corporate. Real students, real arguments, rooms that run too hot, tables that actually matter.
          </motion.p>
          <motion.p className="about-body" variants={revealUp(0.22)} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
            Edition II brings larger committees, sharper agendas, and the same chaotic energy that made Edition I something people still talk about.
          </motion.p>
        </div>

        {/* Orbiting nodes span both columns */}
        <motion.div
          style={{ gridColumn: '1 / -1' }}
          variants={revealUp(0.34)}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <OrbitingStats />
        </motion.div>
      </motion.div>
    </section>
  )
}
