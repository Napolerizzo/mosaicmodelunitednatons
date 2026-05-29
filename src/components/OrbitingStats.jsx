import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

/*
  Orbiting data nodes — 4 stats orbit a central emblem like satellites.
  Counter-rotation keeps labels upright as they travel.
  Transform-origin uses absolute SVG coordinates for reliable cross-browser orbit.
*/

const nodes = [
  { value: 'II',   label: 'EDITION',     r: 72,  dur: 14, startAngle: 315 },
  { value: '2',    label: 'DAYS',        r: 116, dur: 22, startAngle: 45  },
  { value: '3+',   label: 'COMMITTEES',  r: 158, dur: 34, startAngle: 135 },
  { value: '100+', label: 'DELEGATES',   r: 198, dur: 50, startAngle: 225 },
]

const CX = 210, CY = 210  // SVG center

const css = `
.orbiting-stats-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0 24px;
}

@keyframes orbit-cw  { from { transform: rotate(0deg); }    to { transform: rotate(360deg); } }
@keyframes orbit-ccw { from { transform: rotate(0deg); }    to { transform: rotate(-360deg); } }

.os-group {
  will-change: transform;
  transform-box: border-box;
}
`

function NodeGroup({ node, visible }) {
  const { value, label, r, dur, startAngle } = node
  // Negative delay = start mid-animation at the correct angle
  const delay = `${-((startAngle / 360) * dur).toFixed(2)}s`

  return (
    <g
      className="os-group"
      style={{
        transformOrigin: `${CX}px ${CY}px`,
        animation: visible ? `orbit-cw ${dur}s linear infinite` : 'none',
        animationDelay: delay,
      }}
    >
      {/* Node positioned at top of its orbit radius */}
      <g
        transform={`translate(${CX} ${CY - r})`}
        style={{
          transformOrigin: '0px 0px',
          animation: visible ? `orbit-ccw ${dur}s linear infinite` : 'none',
          animationDelay: delay,
        }}
      >
        {/* Satellite dot */}
        <circle r="6" fill="#9b6e09" opacity="0.9" />
        <circle r="12" fill="rgba(155,110,9,0.12)" />
        {/* Connector tick */}
        <line x1="0" y1="-6" x2="0" y2="-20" stroke="rgba(155,110,9,0.25)" strokeWidth="0.5" />

        {/* Stat value — above node */}
        <text
          y="-30"
          textAnchor="middle"
          fontFamily="'League Spartan', sans-serif"
          fontWeight="700"
          fontSize="22"
          fill="#9b6e09"
          style={{ letterSpacing: '-0.01em' }}
        >
          {value}
        </text>

        {/* Label — below value */}
        <text
          y="-14"
          textAnchor="middle"
          fontFamily="'Poppins', sans-serif"
          fontWeight="400"
          fontSize="6.5"
          fill="#8d7d5a"
          style={{ letterSpacing: '0.18em' }}
        >
          {label}
        </text>
      </g>
    </g>
  )
}

export default function OrbitingStats() {
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      className="orbiting-stats-wrap"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={visible ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <style>{css}</style>
      <svg
        width="420"
        height="420"
        viewBox="0 0 420 420"
        aria-label="Conference stats: Edition II, 2 days, 3+ committees, 100+ delegates"
      >
        {/* Orbit path rings */}
        {nodes.map(n => (
          <circle
            key={n.r}
            cx={CX} cy={CY} r={n.r}
            fill="none"
            stroke={`rgba(155,110,9,${0.07 - nodes.indexOf(n) * 0.01})`}
            strokeWidth="0.6"
            strokeDasharray="3 6"
          />
        ))}

        {/* Spoke lines from center to each starting node position — subtle guide */}
        {nodes.map(n => {
          const rad = ((n.startAngle - 90) * Math.PI) / 180
          return (
            <line
              key={`spoke-${n.r}`}
              x1={CX} y1={CY}
              x2={CX + n.r * Math.cos(rad)}
              y2={CY + n.r * Math.sin(rad)}
              stroke="rgba(155,110,9,0.04)"
              strokeWidth="0.5"
            />
          )
        })}

        {/* Central emblem */}
        <circle cx={CX} cy={CY} r={26} fill="rgba(155,110,9,0.07)" />
        <circle cx={CX} cy={CY} r={16} fill="rgba(155,110,9,0.12)" />
        <circle cx={CX} cy={CY} r={7}  fill="#9b6e09" opacity="0.85" />
        <text
          x={CX} y={CY + 42}
          textAnchor="middle"
          fontFamily="'Montserrat', sans-serif"
          fontWeight="700"
          fontSize="7"
          fill="#8d7d5a"
          letterSpacing="0.28em"
        >
          MOSAIC MUN
        </text>

        {/* Orbiting stat nodes */}
        {nodes.map(n => (
          <NodeGroup key={n.value} node={n} visible={visible} />
        ))}
      </svg>
    </motion.div>
  )
}
