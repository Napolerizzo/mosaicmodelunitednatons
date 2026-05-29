import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'

const MOMENTS = [
  {
    time: '08:42', period: 'AM',
    caption: 'First light. The hall fills before the gavel.',
    body: 'Chairs in rows. Nameplates not yet placed. There is a silence a conference gets only once, and it does not last.',
    img: '/brand-assets/0A6F8213-9ACE-43D9-B87F-24EAF110D480_1_105_c.jpeg',
    side: 'right',
  },
  {
    time: '10:17', period: 'AM',
    caption: 'The first delegate raises their placard.',
    body: 'The hardest moment in any committee is the first speech. After that, the room opens. It always does.',
    img: '/brand-assets/2E9FC29D-C33E-4880-B233-097764A88E0B_4_5005_c.jpeg',
    side: 'left',
  },
  {
    time: '11:34', period: 'AM',
    caption: 'Alliances form outside the chamber.',
    body: 'The real work does not happen at the podium. It happens in the margins, over position papers and agreements made between sessions.',
    img: '/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg',
    side: 'right',
  },
  {
    time: '13:05', period: 'PM',
    caption: 'Lunch. The caucuses do not stop.',
    body: 'Delegates who stay with their blocs during breaks walk back in with votes already counted.',
    img: '/brand-assets/493C4669-ACB6-42CD-A1D3-A7AA2BF4602D_1_105_c.jpeg',
    side: 'left',
  },
  {
    time: '15:22', period: 'PM',
    caption: 'A crisis update. The agenda shifts.',
    body: 'No background guide prepares you for this. The room recalibrates. The delegates who adapt in that moment are the ones who advance.',
    img: '/brand-assets/5771A8D9-88FD-4A2A-9889-3E2CDA237CF6_4_5005_c.jpeg',
    side: 'right',
  },
  {
    time: '17:48', period: 'PM',
    caption: 'Final speeches. The votes are close.',
    body: 'Not every resolution passes. The ones that fail leave something behind too. A sharper argument. A bloc that almost held.',
    img: '/brand-assets/8AF34B6E-9909-47EA-ABE8-7E55CB30BF98_1_105_c.jpeg',
    side: 'left',
  },
  {
    time: '19:51', period: 'PM',
    caption: 'The first gavel falls for the last time.',
    body: 'Some rooms stay with you. Edition I made delegates who came back and built Edition II. That is what this is.',
    img: '/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg',
    side: 'right',
  },
]

const css = `
.archive {
  background: var(--bg);
  border-top: 1px solid var(--border);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.archive-header {
  padding: 100px 8vw 80px;
  max-width: 70ch;
}

.archive-overline {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.archive-overline-line {
  width: 32px;
  height: 1px;
  background: var(--gold);
  opacity: 0.5;
}

.archive-overline-text {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.7;
}

.archive-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(3.2rem, 7vw, 7rem);
  line-height: 0.87;
  letter-spacing: -0.04em;
  color: var(--cream);
  margin-bottom: 22px;
}

.archive-subtitle {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(1rem, 1.7vw, 1.35rem);
  color: var(--muted);
  font-weight: 400;
  line-height: 1.55;
}

/* Each moment row */
.archive-moment {
  position: relative;
  padding: 80px 8vw;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8vw;
  align-items: center;
  border-top: 1px solid rgba(155,110,9,0.07);
}

.archive-moment.img-left .archive-img-col { order: 1; }
.archive-moment.img-left .archive-text-col  { order: 2; }
.archive-moment.img-right .archive-img-col { order: 2; }
.archive-moment.img-right .archive-text-col { order: 1; }

/* Ghost ordinal behind each moment */
.archive-ordinal {
  position: absolute;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: clamp(8rem, 18vw, 18rem);
  line-height: 1;
  color: rgba(155,110,9,0.022);
  right: 7vw;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.06em;
  z-index: 0;
}

.archive-img-col {
  position: relative;
  z-index: 1;
}

.archive-img-wrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4/5;
  clip-path: polygon(7% 0%, 100% 0%, 93% 100%, 0% 100%);
}

.archive-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: sepia(0.5) saturate(0.7) brightness(0.48);
  transition: filter 1.2s ease;
}

.archive-moment:hover .archive-img {
  filter: sepia(0.3) saturate(0.85) brightness(0.58);
}

.archive-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(155,110,9,0.1) 0%, rgba(0,0,0,0.45) 100%);
  pointer-events: none;
  mix-blend-mode: multiply;
}

.archive-text-col {
  position: relative;
  z-index: 1;
}

.archive-time {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  font-size: clamp(3rem, 5.5vw, 5.5rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--cream);
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.archive-period {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.32em;
  color: var(--gold);
  text-transform: uppercase;
  padding-bottom: 6px;
}

.archive-rule {
  width: 24px;
  height: 1px;
  background: rgba(155,110,9,0.5);
  margin: 22px 0;
}

.archive-caption {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(1.05rem, 1.7vw, 1.35rem);
  color: var(--cream);
  opacity: 0.88;
  line-height: 1.4;
  margin-bottom: 18px;
}

.archive-body {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: 12.5px;
  line-height: 1.95;
  color: var(--muted);
  max-width: 40ch;
}

/* Closing statement */
.archive-close {
  padding: 80px 8vw 100px;
  border-top: 1px solid rgba(155,110,9,0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.archive-close-quote {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(1.3rem, 2.5vw, 2rem);
  color: var(--cream);
  opacity: 0.5;
  max-width: 52ch;
  line-height: 1.55;
}

.archive-close-line {
  width: 1px;
  height: 44px;
  background: linear-gradient(to bottom, rgba(155,110,9,0.55), rgba(155,110,9,0));
  margin-top: 6px;
}

/* Mobile */
@media (max-width: 900px) {
  .archive-header {
    padding: 60px 24px 48px;
    max-width: 100%;
  }

  .archive-moment {
    grid-template-columns: 1fr;
    padding: 44px 24px;
    gap: 28px;
  }

  .archive-moment.img-left .archive-img-col,
  .archive-moment.img-right .archive-img-col { order: 1; }
  .archive-moment.img-left .archive-text-col,
  .archive-moment.img-right .archive-text-col { order: 2; }

  .archive-img-wrap { aspect-ratio: 16/9; clip-path: none; }
  .archive-ordinal { display: none; }
  .archive-body { max-width: 100%; }

  .archive-close {
    padding: 60px 24px 80px;
  }
}
`

function MomentRow({ m, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const isImgLeft = m.side === 'left'

  return (
    <div ref={ref} className={`archive-moment ${isImgLeft ? 'img-left' : 'img-right'}`}>
      <span className="archive-ordinal" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>

      <motion.div
        className="archive-img-col"
        initial={{ opacity: 0, x: isImgLeft ? -28 : 28 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="archive-img-wrap">
          <img
            className="archive-img"
            src={m.img}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <div className="archive-img-overlay" />
        </div>
      </motion.div>

      <motion.div
        className="archive-text-col"
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.1, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="archive-time">
          {m.time}
          <span className="archive-period">{m.period}</span>
        </div>
        <div className="archive-rule" />
        <p className="archive-caption">{m.caption}</p>
        <p className="archive-body">{m.body}</p>
      </motion.div>
    </div>
  )
}

export default function Archive() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <section id="about" className="archive">
      <span id="journey" style={{ position: 'absolute', top: 0 }} aria-hidden="true" />

      <motion.div
        className="archive-header"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="archive-overline">
          <span className="archive-overline-line" />
          <span className="archive-overline-text">Edition I / 2025 / The Archive</span>
        </div>
        <h2 className="archive-title">Mosaic I</h2>
        <p className="archive-subtitle">
          A day worth remembering, told through the rooms that held it.
        </p>
      </motion.div>

      <div>
        {MOMENTS.map((m, i) => (
          <MomentRow key={m.time} m={m} index={i} />
        ))}
      </div>

      <motion.div
        className="archive-close"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="archive-close-quote">
          Edition II begins where Edition I left off.
        </p>
        <div className="archive-close-line" />
      </motion.div>
    </section>
  )
}
