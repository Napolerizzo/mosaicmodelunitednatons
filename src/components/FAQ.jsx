import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'

const ENTRIES = [
  {
    num: '01',
    q: "I've never done a MUN before.\nAm I cooked?",
    a: "Not at all. Mosaic II is designed with first-timers in mind. Background guides go out before the conference, and our chairs run a full committee briefing on day one. Show up curious and willing to engage. That is enough to start.",
  },
  {
    num: '02',
    q: "How competitive is\nMosaic actually?",
    a: "Very. Awards are taken seriously, chairs know their committees, and delegates who prepare stand out fast. But competitive does not mean exclusive. You can place without being the loudest voice in the room. Technical preparation beats performance every time.",
  },
  {
    num: '03',
    q: "What if I'm nervous about\npublic speaking?",
    a: "That is the point of doing it. The first speech is always the hardest. By the third session, most delegates forget they were nervous at all. The committee room is full of people who feel exactly the same way going in.",
  },
  {
    num: '04',
    q: "Will the study guides\nactually help me prepare?",
    a: "Yes. Each guide is written specifically for this conference, not pulled from a template. It covers the agenda, bloc positions, and what the chairs are looking for. Read it once properly and you are already ahead of most delegates in the room.",
  },
  {
    num: '05',
    q: "How are committee\nallocations decided?",
    a: "Through your registration preferences and your stated experience level. We try to place delegates where they will be challenged without being overwhelmed. If you have a specific committee in mind, note it clearly in your application.",
  },
  {
    num: '06',
    q: "What kind of delegates\nsucceed here?",
    a: "The ones who do the work. Research your position, know your bloc before you walk in, and prepare a position paper. Technical preparation matters more than confidence. Confidence comes from knowing the topic, not the other way around.",
  },
  {
    num: '07',
    q: "Is there a dress code?",
    a: "Western or Indian formal. For committee sessions that means blazers and formal shoes, or equivalent Indian formal wear. This is a conference, not a classroom. Dress like you are making a case.",
  },
  {
    num: '08',
    q: "Is Mosaic MUN II\nresidential?",
    a: "No. The conference runs across two days at Saraswati Global School, Faridabad. Accommodation is not provided, but we can share recommendations for nearby hotels if you are traveling from outside the city.",
  },
]

const css = `
/* ── THE BRIEFING ── */
.briefing {
  padding: 100px 0 120px;
  background: transparent;
  border-top: 1px solid rgba(155,110,9,0.1);
  position: relative;
  z-index: 1;
}

.briefing-hdr {
  padding: 0 8vw 72px;
}

.briefing-eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.briefing-eyebrow-line {
  width: 32px;
  height: 1px;
  background: var(--gold);
  opacity: 0.4;
}

.briefing-eyebrow-text {
  font-family: 'Poppins', sans-serif;
  font-size: 8.5px;
  letter-spacing: 0.48em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.65;
}

.briefing-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(3rem, 7.5vw, 7.5rem);
  line-height: 0.86;
  letter-spacing: -0.04em;
  color: var(--cream);
  margin: 0 0 20px;
}

.briefing-sub {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(1rem, 1.7vw, 1.35rem);
  color: var(--muted);
  opacity: 0.75;
}

.briefing-list {
  border-top: 1px solid rgba(155,110,9,0.1);
}

/* Each entry */
.be {
  border-bottom: 1px solid rgba(155,110,9,0.07);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.4s ease;
}

.be:hover { background: rgba(155,110,9,0.015); }
.be.be-open { background: rgba(155,110,9,0.022); }

/* Grid: num | question | answer (desktop) */
/* Grid: num | question + answer stacked (mobile) */
.be-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  grid-template-areas:
    "num q"
    ".   a";
  column-gap: 20px;
  padding: 32px 24px;
}

.be-num {
  grid-area: num;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  font-size: 2rem;
  line-height: 1.15;
  color: var(--gold);
  opacity: 0.3;
  transition: opacity 0.35s ease;
  padding-top: 2px;
}

.be.be-open .be-num { opacity: 0.65; }

.be-q-area {
  grid-area: q;
}

.be-question {
  font-family: 'Poppins', sans-serif;
  font-weight: 400;
  font-size: clamp(0.95rem, 1.45vw, 1.1rem);
  line-height: 1.55;
  color: var(--cream);
  opacity: 0.8;
  margin: 0 0 14px;
  white-space: pre-line;
  transition: opacity 0.3s ease;
}

.be:hover .be-question,
.be.be-open .be-question { opacity: 1; }

.be-cue {
  display: flex;
  align-items: center;
  gap: 10px;
}

.be-cue-bar {
  width: 16px;
  height: 1px;
  background: var(--gold);
  opacity: 0.3;
  transition: width 0.4s ease, opacity 0.4s ease;
}

.be.be-open .be-cue-bar {
  width: 26px;
  opacity: 0.65;
}

.be-cue-label {
  font-family: 'Poppins', sans-serif;
  font-size: 7.5px;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.be.be-open .be-cue-label { opacity: 0.65; }

/* Answer area */
.be-a-area {
  grid-area: a;
  overflow: hidden;
}

.be-answer-inner {
  padding-top: 16px;
  border-left: 1px solid rgba(155,110,9,0.18);
  padding-left: 18px;
}

.be-answer {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: 12.5px;
  line-height: 1.95;
  color: var(--muted);
  margin: 0;
}

/* Desktop: 3-column layout, answer beside question */
@media (min-width: 900px) {
  .be-row {
    grid-template-columns: 64px 1fr 1fr;
    grid-template-areas: "num q a";
    column-gap: 56px;
    row-gap: 0;
    padding: 40px 8vw;
  }

  .be-a-area {
    padding-top: 4px;
  }

  .be-answer-inner {
    padding-top: 0;
  }
}

/* Section header mobile */
@media (max-width: 900px) {
  .briefing-hdr { padding: 0 24px 52px; }
  .briefing-title { font-size: clamp(2.6rem, 13vw, 4rem); }
}
`

function BriefingEntry({ entry, index }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const toggle = () => setOpen(v => !v)

  return (
    <motion.div
      ref={ref}
      className={`be${open ? ' be-open' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="be-row"
        onClick={toggle}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle()}
      >
        <span className="be-num" aria-hidden="true">{entry.num}</span>

        <div className="be-q-area">
          <p className="be-question">{entry.q}</p>
          <div className="be-cue" aria-hidden="true">
            <span className="be-cue-bar" />
            <span className="be-cue-label">{open ? 'Close' : 'Read'}</span>
          </div>
        </div>

        <div className="be-a-area">
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="be-answer-inner">
                  <p className="be-answer">{entry.a}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function FAQ() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <section id="faq" className="briefing" aria-label="Briefing">
      <motion.div
        className="briefing-hdr"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="briefing-eyebrow">
          <span className="briefing-eyebrow-line" />
          <span className="briefing-eyebrow-text">Confidential / Before You Enter</span>
        </div>
        <h2 className="briefing-title">The<br />Briefing.</h2>
        <p className="briefing-sub">Before you enter the chamber, read this.</p>
      </motion.div>

      <div className="briefing-list">
        {ENTRIES.map((entry, i) => (
          <BriefingEntry key={entry.num} entry={entry} index={i} />
        ))}
      </div>
    </section>
  )
}
