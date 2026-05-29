import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'

const COMMITTEES = [
  {
    file: '01',
    abbr: 'UNGA',
    name: 'United Nations General Assembly',
    hook: 'Who speaks when the state cannot?',
    agenda: 'Discussing the Voting Rights of States Under Foreign Military Occupation',
    logo: '/brand-assets/ungalogo.jpg',
    type: 'UN Body',
    difficulty: 'Intermediate',
    about: `The UN General Assembly is the only body in the world where all 193 member states have equal footing. No vetoes. One vote each. It is the principal deliberative organ of the United Nations, responsible for setting the global agenda on peace, security, development, and human rights.`,
    agendaDetail: `Military occupation strips a state of territorial control, and often challenges its standing in international institutions. This committee will interrogate a question that current international law answers incompletely: do occupied states retain full UNGA voting rights? Delegates will engage with the Palestinian observer status debate, Western Sahara, Crimea, and what statehood means when boots are on the ground.`,
    expect: `Classic general debate format. Strong research into customary international law, UN Charter provisions, and active occupation disputes is essential. Resolutions will be voted on. Every bloc matters.`,
  },
  {
    file: '02',
    abbr: 'UNCSW',
    name: 'UN Commission on the Status of Women',
    hook: 'Whose body counts as labor?',
    agenda: 'Deliberation upon Surrogate Motherhood as International Labor',
    logo: '/brand-assets/uncsw.png',
    type: 'UN Body',
    difficulty: 'Advanced',
    about: `The Commission on the Status of Women is the principal intergovernmental body advancing gender equality and women's empowerment globally. It convenes annually in New York, drafting agreed conclusions and resolutions that set international standards on women's rights.`,
    agendaDetail: `Commercial surrogacy sits at the collision point of reproductive rights, labor law, migration, and bodily autonomy. Women from lower-income countries often carry children for wealthier clients abroad, raising urgent questions about informed consent, fair compensation, exploitation, and whether surrogacy constitutes labor deserving international protection.`,
    expect: `Requires comfort with feminist theory, international labor standards, bioethics, and comparative domestic law. Delegates should research how India, Thailand, Ukraine, and the United States have handled surrogacy regulation.`,
  },
  {
    file: '03',
    abbr: 'UNHRC',
    name: 'UN Human Rights Council',
    hook: 'Can a perpetrator erase what history demands to remember?',
    agenda: 'Discussing The Right to Be Forgotten vs. The Right to Truth in Atrocity Documentation',
    logo: '/brand-assets/unhrc-2.jpeg',
    type: 'UN Body',
    difficulty: 'Advanced',
    about: `The Human Rights Council is a 47-member intergovernmental body that addresses systematic violations of human rights worldwide. It operates through the Universal Periodic Review, Special Procedures, and ad hoc commissions of inquiry.`,
    agendaDetail: `Perpetrators of genocide and war crimes have begun invoking the right to be forgotten to scrub their names from atrocity documentation. The committee will confront cases drawn from the Balkans, Rwanda, and Syria: when do privacy rights yield to historical accountability? Can international law protect digital archives of atrocity?`,
    expect: `Heavy legal research required. Engage with GDPR, the ICC Rome Statute, transitional justice mechanisms, and landmark ECHR rulings on privacy versus public interest. This is a committee for delegates who enjoy complexity.`,
  },
  {
    file: '04',
    abbr: 'AIPPM',
    name: 'All India Political Parties Meet',
    hook: 'The strike landed. Parliament was not consulted.',
    agenda: 'Operation Sindoor and the Question of Parliamentary War Powers',
    logo: '/brand-assets/aippm.png',
    type: 'Indian Parliament',
    difficulty: 'Intermediate',
    about: `AIPPM simulates the informal cross-party consultations that shape India's major executive decisions. Unlike formal parliamentary debate, AIPPM focuses on behind-the-scenes consensus-building, factional politics, and the ideological divisions that define Indian democracy.`,
    agendaDetail: `In May 2025, India launched Operation Sindoor, precision strikes on terrorist infrastructure in Pakistan-administered Kashmir. The operation raised a constitutional question India has never formally resolved: does the executive branch have authority to conduct offensive military operations abroad without explicit parliamentary sanction?`,
    expect: `Know the Indian Constitution, Articles 352, 53, and 246. Research the India-Pakistan conflict landscape, Operation Sindoor, and how major parties are positioned. This committee will move fast and get loud.`,
  },
  {
    file: '05',
    abbr: 'IPL',
    name: 'Indian Premier League',
    hook: 'Build the franchise. Win the auction.',
    agenda: 'Mega Auction',
    logo: '/brand-assets/Indian_Premier_League_Official_Logo.svg',
    type: 'Custom',
    difficulty: 'Beginner',
    about: `The IPL Mega Auction is Mosaic MUN's custom committee. Delegates represent IPL franchise owners and team management, navigating the economics of the world's most valuable cricket league. High-energy, high-stakes, and fast-moving.`,
    agendaDetail: `Delegates bid for players within strict budget constraints, use RTM cards strategically, and build balanced squads for a full season. The committee involves real-time bidding rounds, negotiation between franchises, and decisions under significant time pressure.`,
    expect: `Know the IPL auction rules, the purse system, RTM mechanics, and current franchise strengths. Less formal than traditional UN committees, but the competition is just as fierce. Designed to be fun and fast.`,
  },
  {
    file: '06',
    abbr: 'IP',
    name: 'International Press',
    hook: 'The record belongs to the press.',
    agenda: 'Photography, Caricature, and Journalism',
    logo: '/brand-assets/ip.jpg',
    type: 'Press Corps',
    difficulty: 'All Levels',
    about: `International Press delegates are the media corps of Mosaic MUN II. They cover the conference through three distinct lenses: photojournalism, editorial caricature, and written journalism. IP delegates attend sessions, interview delegates, and shape how the conference understands itself.`,
    agendaDetail: `Reporters are assigned one of three tracks based on their skills and interests. Photojournalists cover sessions and moments. Caricaturists produce editorial commentary on the day's debates. Journalists write communiques and file stories under tight deadlines.`,
    expect: `Strong creative and observational skills. You need to be everywhere at once. The goal is to produce work that the entire conference reads, sees, and remembers. Prior journalism, art, or writing experience is an advantage.`,
  },
  {
    file: '07',
    abbr: 'USSIC',
    name: 'US Senate Intelligence Committee',
    hook: 'The files were sealed. Now they are not.',
    agenda: 'Discussing and Declassifying The Epstein Files',
    logo: '/brand-assets/297-2972564_seal-of-the-united-states-senate-united-states-congress-seal.png.jpeg',
    type: 'Crisis',
    difficulty: 'Advanced',
    about: `The United States Senate Select Committee on Intelligence was established in 1976 to provide oversight of the CIA, NSA, DIA, and the full US intelligence apparatus. It has conducted some of the most consequential classified investigations in American history.`,
    agendaDetail: `Jeffrey Epstein's documented connections to intelligence networks, foreign governments, and powerful political figures were never fully investigated. This crisis committee simulates a live Senate hearing as sealed documents are released in real time, witnesses appear under subpoena, and new information forces the committee to adapt.`,
    expect: `This is a crisis committee. The agenda will evolve. Research the Epstein case, Maxwell trial transcripts, US intelligence history, and Senate investigation procedures. Crisis updates will change everything you thought you knew.`,
  },
]

const css = `
/* ── THE CASEFILES ── */
.casefiles {
  padding: 100px 0 120px;
  background: transparent;
  border-top: 1px solid rgba(155,110,9,0.1);
  position: relative;
  z-index: 1;
}

.casefiles-hdr {
  padding: 0 8vw 72px;
}

.casefiles-eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.casefiles-eyebrow-line {
  width: 32px;
  height: 1px;
  background: var(--gold);
  opacity: 0.4;
}

.casefiles-eyebrow-text {
  font-family: 'Poppins', sans-serif;
  font-size: 8.5px;
  letter-spacing: 0.48em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.65;
}

.casefiles-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(3rem, 7.5vw, 7.5rem);
  line-height: 0.86;
  letter-spacing: -0.04em;
  color: var(--cream);
  margin: 0 0 20px;
}

.casefiles-sub {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(1rem, 1.7vw, 1.35rem);
  color: var(--muted);
  opacity: 0.75;
}

/* ── File list ── */
.cf-list {
  border-top: 1px solid rgba(155,110,9,0.12);
}

/* Each file entry */
.cf-entry {
  position: relative;
  border-bottom: 1px solid rgba(155,110,9,0.07);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.5s ease;
}

.cf-entry:hover {
  background: rgba(155,110,9,0.018);
}

.cf-entry.cf-open {
  background: rgba(155,110,9,0.025);
}

/* Ghost ordinal behind each entry */
.cf-ghost-num {
  position: absolute;
  right: 7vw;
  top: 50%;
  transform: translateY(-50%);
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: clamp(6rem, 14vw, 14rem);
  line-height: 1;
  letter-spacing: -0.06em;
  color: rgba(155,110,9,0.028);
  pointer-events: none;
  user-select: none;
  z-index: 0;
  transition: opacity 0.4s ease;
}

.cf-entry.cf-open .cf-ghost-num {
  opacity: 0;
}

/* Header row — always visible */
.cf-header {
  position: relative;
  z-index: 1;
  padding: 32px 8vw;
  display: grid;
  grid-template-columns: 72px 120px 1fr auto 36px;
  gap: 0 20px;
  align-items: center;
}

.cf-file-label {
  font-family: 'Poppins', sans-serif;
  font-size: 8px;
  letter-spacing: 0.48em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.6;
  white-space: nowrap;
}

.cf-abbr {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: clamp(1rem, 1.8vw, 1.4rem);
  letter-spacing: 0.04em;
  color: var(--cream);
}

.cf-hook {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(0.9rem, 1.4vw, 1.1rem);
  color: var(--muted);
  opacity: 0.72;
  padding-right: 24px;
}

.cf-difficulty {
  font-family: 'Poppins', sans-serif;
  font-size: 7.5px;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.45;
  text-align: right;
  white-space: nowrap;
}

.cf-indicator {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--gold);
  opacity: 0.45;
  transition: opacity 0.3s ease, transform 0.6s cubic-bezier(0.45, 0, 0.15, 1);
  flex-shrink: 0;
}

.cf-entry.cf-open .cf-indicator {
  opacity: 0.85;
  transform: rotate(45deg);
}

/* ── Dossier (expanded content) ── */
.cf-dossier {
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.cf-dossier-inner {
  padding: 0 8vw 48px;
}

/* Animated gold divider line */
.cf-gold-line {
  height: 1px;
  background: linear-gradient(to right, var(--gold), rgba(155,110,9,0.15));
  margin-bottom: 40px;
  transform-origin: left;
}

/* Dossier grid: logo | about | agenda+expect */
.cf-dossier-grid {
  display: grid;
  grid-template-columns: 180px 1fr 1fr;
  gap: 0 56px;
  align-items: start;
}

/* Logo column */
.cf-logo-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cf-logo-frame {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px solid rgba(155,110,9,0.12);
  background: rgba(0,0,0,0.2);
}

.cf-logo-img {
  max-width: 100%;
  max-height: 72px;
  object-fit: contain;
  display: block;
  /* Unified gold filter */
  filter: grayscale(1) sepia(1) saturate(2.5) hue-rotate(-8deg) brightness(0.58) contrast(1.1);
  opacity: 0.9;
  transition: opacity 0.4s ease, filter 0.4s ease;
}

.cf-logo-frame:hover .cf-logo-img {
  opacity: 1;
  filter: grayscale(1) sepia(1) saturate(3) hue-rotate(-8deg) brightness(0.68) contrast(1.1);
}

.cf-logo-agenda {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0.04em;
  line-height: 1.7;
  color: var(--muted);
  opacity: 0.6;
}

.cf-logo-agenda strong {
  display: block;
  font-size: 7.5px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.7;
  font-weight: 500;
  margin-bottom: 7px;
}

/* Text columns */
.cf-text-col {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.cf-section-label {
  font-family: 'Poppins', sans-serif;
  font-size: 7.5px;
  letter-spacing: 0.48em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.55;
  margin-bottom: 12px;
}

.cf-body-text {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: 12.5px;
  line-height: 1.92;
  color: var(--muted);
  margin-bottom: 28px;
}

.cf-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid rgba(155,110,9,0.16);
  font-family: 'Poppins', sans-serif;
  font-size: 7.5px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.65;
  width: fit-content;
  margin-top: 4px;
}

/* ── Mobile ── */
@media (max-width: 900px) {
  .casefiles { padding: 72px 0 90px; }
  .casefiles-hdr { padding: 0 20px 44px; }
  .casefiles-title { font-size: clamp(2.6rem, 13vw, 4rem); }

  .cf-header {
    padding: 26px 20px;
    grid-template-columns: 44px 1fr 28px;
    grid-template-rows: auto auto auto;
    row-gap: 0;
    column-gap: 14px;
  }

  .cf-file-label {
    grid-column: 1; grid-row: 1 / 4;
    align-self: center;
    font-size: 7px;
    letter-spacing: 0.4em;
  }
  .cf-abbr {
    grid-column: 2; grid-row: 1;
    font-size: 1.2rem;
    margin-bottom: 4px;
  }
  .cf-hook {
    grid-column: 2; grid-row: 2;
    padding-right: 0;
    font-size: 0.92rem;
    margin-bottom: 8px;
  }
  .cf-difficulty {
    display: block;
    grid-column: 2; grid-row: 3;
    font-size: 7px;
    letter-spacing: 0.32em;
    text-align: left;
    opacity: 0.35;
  }
  .cf-indicator { grid-column: 3; grid-row: 1 / 4; align-self: center; }
  .cf-ghost-num { display: none; }

  .cf-dossier-inner { padding: 0 20px 40px; }
  .cf-gold-line { margin-bottom: 28px; }

  .cf-dossier-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .cf-logo-col {
    flex-direction: row;
    align-items: flex-start;
    gap: 18px;
  }

  .cf-logo-frame {
    width: 80px;
    flex-shrink: 0;
    padding: 14px;
  }

  .cf-logo-agenda { font-size: 10px; line-height: 1.75; }

  .cf-body-text {
    font-size: 13px;
    line-height: 1.88;
  }

  .cf-section-label { letter-spacing: 0.36em; }
}
`

function EntryRow({ c, isOpen, onToggle, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      className={`cf-entry${isOpen ? ' cf-open' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="cf-ghost-num" aria-hidden="true">{c.file}</span>

      <div
        className="cf-header"
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      >
        <span className="cf-file-label">File {c.file}</span>
        <span className="cf-abbr">{c.abbr}</span>
        <span className="cf-hook">{c.hook}</span>
        <span className="cf-difficulty">{c.difficulty}</span>
        <span className="cf-indicator" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1">
            <line x1="7" y1="0" x2="7" y2="14" />
            <line x1="0" y1="7" x2="14" y2="7" />
          </svg>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="cf-dossier"
            key="dossier"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.72, ease: [0.45, 0, 0.15, 1] }}
          >
            <div className="cf-dossier-inner">
              <motion.div
                className="cf-gold-line"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              />

              <div className="cf-dossier-grid">
                {/* Logo */}
                <motion.div
                  className="cf-logo-col"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="cf-logo-frame">
                    <img
                      className="cf-logo-img"
                      src={c.logo}
                      alt={c.abbr}
                      loading="lazy"
                    />
                  </div>
                  <div className="cf-logo-agenda">
                    <strong>Agenda</strong>
                    {c.agenda}
                  </div>
                  <span className="cf-type-badge">{c.type}</span>
                </motion.div>

                {/* About */}
                <motion.div
                  className="cf-text-col"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="cf-section-label">About</span>
                  <p className="cf-body-text">{c.about}</p>
                </motion.div>

                {/* Agenda + Expect */}
                <motion.div
                  className="cf-text-col"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="cf-section-label">In Committee</span>
                  <p className="cf-body-text">{c.agendaDetail}</p>
                  <span className="cf-section-label">What to Expect</span>
                  <p className="cf-body-text" style={{ marginBottom: 0 }}>{c.expect}</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Committees() {
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const toggle = (abbr) => setOpen(prev => prev === abbr ? null : abbr)

  return (
    <section id="committees" className="casefiles" aria-label="Committees">
      <motion.div
        className="casefiles-hdr"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="casefiles-eyebrow">
          <span className="casefiles-eyebrow-line" />
          <span className="casefiles-eyebrow-text">Classified / Edition II / Seven Committees</span>
        </div>
        <h2 className="casefiles-title">The<br />Casefiles.</h2>
        <p className="casefiles-sub">Seven conflicts. One conference.</p>
      </motion.div>

      <div className="cf-list">
        {COMMITTEES.map((c, i) => (
          <EntryRow
            key={c.abbr}
            c={c}
            index={i}
            isOpen={open === c.abbr}
            onToggle={() => toggle(c.abbr)}
          />
        ))}
      </div>
    </section>
  )
}
