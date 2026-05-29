import { useRef, useEffect } from 'react'
import { useScroll, useTransform, motion } from 'framer-motion'

const css = `
.ring-section {
  padding: 80px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border-top: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.ring-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.5;
  margin-top: 40px;
}

.rings-svg {
  overflow: visible;
}

.ring-dot {
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes orbit1 { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
@keyframes orbit2 { from { transform: rotate(120deg); } to { transform: rotate(480deg); } }
@keyframes orbit3 { from { transform: rotate(240deg); } to { transform: rotate(600deg); } }
@keyframes orbit4 { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
@keyframes orbit5 { from { transform: rotate(180deg); } to { transform: rotate(-180deg); } }

.r-ring-1 { animation: orbit1 12s linear infinite; }
.r-ring-2 { animation: orbit2 18s linear infinite; }
.r-ring-3 { animation: orbit3 9s linear infinite; }
.r-ring-4 { animation: orbit4 24s linear infinite; }
.r-ring-5 { animation: orbit5 15s linear infinite; }

.ring-center-text {
  font-family: 'Montserrat', sans-serif;
  font-style: normal;
  font-weight: 600;
  font-size: 13px;
  fill: var(--muted);
  text-anchor: middle;
  dominant-baseline: middle;
  letter-spacing: 0.08em;
}
`

export default function AnimatedRing() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const cx = 160, cy = 160
  const radii = [38, 60, 82, 106, 130]
  const dotCounts = [3, 4, 6, 5, 8]
  const dotSizes = [4, 3.5, 3, 2.5, 2]
  const dotColors = ['#c9a84c', '#7a6530', '#4d0303', 'rgba(155,110,9,0.4)', 'rgba(141,125,90,0.4)']
  const ringClasses = ['r-ring-1', 'r-ring-2', 'r-ring-3', 'r-ring-4', 'r-ring-5']

  return (
    <div className="ring-section" ref={ref}>
      <style>{css}</style>

      <svg
        className="rings-svg"
        width="320"
        height="320"
        viewBox="0 0 320 320"
        aria-hidden="true"
      >
        {/* Orbit paths */}
        {radii.map((r, i) => (
          <circle
            key={`path-${i}`}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={`rgba(201,168,76,${0.04 + i * 0.02})`}
            strokeWidth="0.5"
          />
        ))}

        {/* Center */}
        <circle cx={cx} cy={cy} r={16} fill="rgba(201,168,76,0.08)" />
        <circle cx={cx} cy={cy} r={10} fill="rgba(201,168,76,0.15)" />
        <circle cx={cx} cy={cy} r={4}  fill="var(--gold)" opacity="0.8" />
        <text x={cx} y={cy + 28} className="ring-center-text">MUN</text>

        {/* Orbiting dots */}
        {radii.map((r, ri) =>
          Array.from({ length: dotCounts[ri] }, (_, di) => {
            const baseAngle = (di / dotCounts[ri]) * 360
            const rad = (baseAngle * Math.PI) / 180
            const dotX = cx + r * Math.cos(rad)
            const dotY = cy + r * Math.sin(rad)
            return (
              <g key={`dot-${ri}-${di}`} className={`ring-dot ${ringClasses[ri]}`}>
                <circle
                  cx={dotX} cy={dotY}
                  r={dotSizes[ri]}
                  fill={dotColors[ri]}
                />
              </g>
            )
          })
        )}
      </svg>

      <p className="ring-label">Scroll to explore</p>
    </div>
  )
}
