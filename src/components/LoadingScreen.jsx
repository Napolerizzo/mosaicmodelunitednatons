import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

/*
  Brand palette (from Mosaic MUN Brand Guidelines):
  #4d0303  — deep maroon
  #9b6e09  — dark amber gold
  #000000  — black
  #8d7d5a  — warm tan
  #d9d9d9  — light gray
  Fonts: Montserrat, League Spartan, Poppins
*/

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    let p = 0

    const tick = () => {
      const remaining = 100 - p
      // Fast at start, slows near end for drama, then snaps to 100
      const step =
        p < 40  ? Math.random() * 9 + 5
        : p < 75  ? Math.random() * 5 + 3
        : p < 92  ? Math.random() * 2 + 1
        :           Math.random() * 1.2 + 0.4

      p = Math.min(p + step, 100)
      setProgress(Math.floor(p))

      if (p >= 100) {
        timerRef.current = setTimeout(onComplete, 480)
      } else {
        const delay = p < 60 ? 55 : p < 85 ? 75 : 100
        timerRef.current = setTimeout(tick, delay)
      }
    }

    timerRef.current = setTimeout(tick, 180)
    return () => clearTimeout(timerRef.current)
  }, [onComplete])

  // Chibi sits on top of the bar; its left position tracks progress.
  // We subtract ~36px (half the visible chibi area) to center feet on progress point.
  const CHIBI_W = 88
  const BAR_W_VW = 82 // % of viewport we allocate to bar

  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
      style={styles.screen}
    >
      {/* ── Logo + title ── */}
      <div style={styles.head}>
        <img
          src="/brand-assets/mosaic-logo-nobg.png"
          alt="Mosaic MUN"
          style={styles.logo}
        />
        <p style={styles.title}>MOSAIC MUN</p>
        <p style={styles.subtitle}>Model United Nations &middot; Edition II</p>
      </div>

      {/* ── Counter ── */}
      <div style={styles.counterWrap}>
        <span style={styles.counterNum}>{String(progress).padStart(2, '0')}</span>
        <span style={styles.counterPct}>%</span>
      </div>

      {/* ── Bar + chibi stage ── */}
      <div style={{ ...styles.stage, width: `${BAR_W_VW}vw`, maxWidth: 720 }}>

        {/* Chibi: feet land on the bar */}
        <img
          src="/brand-assets/chibian.png"
          alt=""
          aria-hidden="true"
          style={{
            ...styles.chibi,
            width: CHIBI_W,
            // clamp so chibi doesn't overflow the track
            left: `calc(${Math.min(Math.max(progress, 2), 96)}% - ${CHIBI_W * 0.45}px)`,
          }}
        />

        {/* Double-thick bar: thin gold line on top + thick main bar */}
        <div style={styles.barWrap}>
          {/* Top thin accent line */}
          <div style={styles.thinTrack}>
            <div
              style={{
                ...styles.thinFill,
                width: `${progress}%`,
              }}
            />
          </div>

          {/* Main thick bar */}
          <div style={styles.thickTrack}>
            <div
              style={{
                ...styles.thickFill,
                width: `${progress}%`,
              }}
            />
            {/* Shimmer head at progress point */}
            {progress > 2 && progress < 100 && (
              <div
                style={{
                  ...styles.shimmerHead,
                  left: `${progress}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Label ── */}
      <p style={styles.label}>Loading the chambers…</p>
    </motion.div>
  )
}

/* ── Inline styles (all brand-compliant) ── */
const styles = {
  screen: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    userSelect: 'none',
    overflow: 'hidden',
  },

  // ── Head
  head: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  logo: {
    height: 56,
    width: 'auto',
    marginBottom: 8,
    // tint toward brand gold
    filter: 'brightness(1.05) saturate(1.1)',
  },
  title: {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 900,
    fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
    letterSpacing: '0.22em',
    color: '#d9d9d9',
    margin: 0,
    lineHeight: 1,
  },
  subtitle: {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 400,
    fontSize: 'clamp(0.65rem, 2vw, 0.78rem)',
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: '#8d7d5a',
    margin: 0,
  },

  // ── Counter
  counterWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 2,
    marginBottom: 28,
    lineHeight: 1,
  },
  counterNum: {
    fontFamily: "'League Spartan', 'Impact', sans-serif",
    fontWeight: 900,
    fontSize: 'clamp(4.5rem, 12vw, 7.5rem)',
    color: '#9b6e09',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    // subtle glow
    textShadow: '0 0 40px rgba(155,110,9,0.35)',
  },
  counterPct: {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700,
    fontSize: 'clamp(1.2rem, 4vw, 2rem)',
    color: '#8d7d5a',
    marginTop: '0.5em',
  },

  // ── Stage (chibi + bar together)
  stage: {
    position: 'relative',
    // Stage height = chibi height + bar total height + gap
    height: 102, // 82px chibi + 20px bar area
  },

  // ── Chibi
  chibi: {
    position: 'absolute',
    bottom: 18, // lifts chibi so feet rest on top of the thick bar (bar is 18px total: 2+gap+12+gap)
    height: 82,
    objectFit: 'contain',
    transition: 'left 0.09s linear',
    // On black bg, show as a framed sticker with gold glow
    filter: 'drop-shadow(0 0 8px rgba(155,110,9,0.5))',
    imageRendering: 'crisp-edges',
  },

  // ── Bar wrapper
  barWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },

  // Top thin accent line
  thinTrack: {
    width: '100%',
    height: 2,
    background: 'rgba(155,110,9,0.18)',
    overflow: 'hidden',
  },
  thinFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4d0303 0%, #9b6e09 60%, #c9a84c 100%)',
    transition: 'width 0.09s linear',
  },

  // Main thick bar
  thickTrack: {
    position: 'relative',
    width: '100%',
    height: 12,
    background: 'rgba(155,110,9,0.12)',
    overflow: 'visible',
    // double-line effect: inset border on top
    borderTop: '1px solid rgba(155,110,9,0.25)',
  },
  thickFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4d0303 0%, #7a4a06 35%, #9b6e09 75%, #c9a84c 100%)',
    transition: 'width 0.09s linear',
    boxShadow: '0 0 14px rgba(155,110,9,0.55), 0 0 4px rgba(155,110,9,0.8)',
    position: 'relative',
  },

  // Shimmer glow at the progress head
  shimmerHead: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 6,
    height: 20,
    borderRadius: 3,
    background: '#fff',
    opacity: 0.7,
    boxShadow: '0 0 12px 4px rgba(201,168,76,0.9)',
    transition: 'left 0.09s linear',
    pointerEvents: 'none',
  },

  // ── Label
  label: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: '0.7rem',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: '#8d7d5a',
    marginTop: 20,
    opacity: 0.65,
  },
}
