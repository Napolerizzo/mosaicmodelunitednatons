/*
  Performance-first animated background.
  NO filter:blur() on large elements — radial gradient falloff handles softness.
  Blobs animate via transform only (GPU composited, zero layout cost).
  Particles cut to 14. Grid is static. Beams use minimal blur on small elements.
*/

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (i * 37.31 + 11.7) % 100,
  y: (i * 53.71 + 23.3) % 100,
  s: 1 + (i % 3) * 0.7,
  o: 0.07 + (i % 5) * 0.04,
  d: 8 + (i % 7) * 1.8,
  dl: (i % 9) * 1.3,
  dx: ((i % 2 === 0 ? 1 : -1) * (6 + i % 8)),
  dy: ((i % 3 === 0 ? -1 : 1) * (8 + i % 10)),
}))

const css = `
.cb {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  contain: strict;
}

/* ── Base: static gradient, zero cost ── */
.cb-base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 110% 75% at 10% 98%, rgba(77,3,3,0.28) 0%, transparent 58%),
    radial-gradient(ellipse 75% 95% at 92% 4%,  rgba(155,110,9,0.16) 0%, transparent 58%),
    radial-gradient(ellipse 85% 55% at 50% 62%, rgba(55,2,2,0.13) 0%, transparent 62%),
    linear-gradient(175deg, #040101 0%, #000000 45%, #030200 100%);
}

/* ── Blobs: NO filter:blur — radial gradient provides the softness ── */
.cb-blob {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
  transform: translateZ(0);
}

.cb-blob-1 {
  width: 70vw; height: 70vw;
  background: radial-gradient(circle, rgba(77,3,3,0.3) 0%, rgba(77,3,3,0.12) 30%, rgba(77,3,3,0.04) 55%, transparent 70%);
  bottom: -22%; left: -15%;
  animation: cb-b1 24s ease-in-out infinite;
}
.cb-blob-2 {
  width: 55vw; height: 55vw;
  background: radial-gradient(circle, rgba(155,110,9,0.22) 0%, rgba(155,110,9,0.08) 38%, rgba(155,110,9,0.02) 60%, transparent 72%);
  top: -10%; right: -10%;
  animation: cb-b2 30s ease-in-out infinite;
}
.cb-blob-3 {
  width: 44vw; height: 44vw;
  background: radial-gradient(circle, rgba(100,6,6,0.2) 0%, rgba(100,6,6,0.06) 45%, transparent 68%);
  top: 30%; left: 20%;
  animation: cb-b3 20s ease-in-out infinite;
}
.cb-blob-4 {
  width: 36vw; height: 36vw;
  background: radial-gradient(circle, rgba(155,110,9,0.14) 0%, rgba(155,110,9,0.04) 50%, transparent 70%);
  bottom: 10%; right: 14%;
  animation: cb-b4 26s ease-in-out infinite;
}

@keyframes cb-b1 {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  30%      { transform: translate3d(5%,-4%,0) scale(1.07); }
  60%      { transform: translate3d(-3%,6%,0) scale(0.93); }
  80%      { transform: translate3d(4%,-5%,0) scale(1.04); }
}
@keyframes cb-b2 {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  25%     { transform: translate3d(-6%,5%,0) scale(1.07); }
  55%     { transform: translate3d(4%,-6%,0) scale(0.92); }
  75%     { transform: translate3d(-3%,3%,0) scale(1.03); }
}
@keyframes cb-b3 {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  40%     { transform: translate3d(8%,6%,0) scale(1.1); }
  70%     { transform: translate3d(-5%,-4%,0) scale(0.9); }
}
@keyframes cb-b4 {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  45%     { transform: translate3d(-7%,6%,0) scale(1.05); }
  72%     { transform: translate3d(5%,-4%,0) scale(0.96); }
}

/* ── Volumetric beams: small blur radius, small element ── */
.cb-beam-1 {
  position: absolute;
  top: -5%;
  left: 50%;
  transform: translateX(-50%) translateZ(0);
  width: 500px;
  height: 70vh;
  background: conic-gradient(
    from 180deg at 50% 0%,
    transparent 0deg,
    rgba(155,110,9,0.04) 20deg,
    rgba(155,110,9,0.07) 30deg,
    rgba(155,110,9,0.04) 40deg,
    transparent 55deg
  );
  filter: blur(8px);
  animation: cb-beam-breathe 10s ease-in-out infinite;
  will-change: opacity;
}
@keyframes cb-beam-breathe {
  0%,100% { opacity: 0.5; }
  50%     { opacity: 0.9; }
}

/* ── Central radial pulse ── */
.cb-radial {
  position: absolute;
  top: 50%; left: 50%;
  width: 100vw; height: 100vh;
  transform: translate(-50%, -50%) translateZ(0);
  background: radial-gradient(ellipse 48% 44% at 50% 50%, rgba(155,110,9,0.055) 0%, transparent 65%);
  animation: cb-radial-breathe 18s ease-in-out infinite;
  will-change: opacity;
}
@keyframes cb-radial-breathe {
  0%,100% { opacity: 0.5; }
  50%     { opacity: 1; }
}

/* ── Static grid overlay ── */
.cb-grid {
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(0deg,  transparent, transparent 79px, rgba(155,110,9,0.038) 79px, rgba(155,110,9,0.038) 80px),
    repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(155,110,9,0.038) 79px, rgba(155,110,9,0.038) 80px);
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0.45) 0%, transparent 72%);
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0.45) 0%, transparent 72%);
}

/* ── Particles: small, GPU-cheap ── */
.cb-particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(155,110,9,1);
  will-change: transform, opacity;
  transform: translateZ(0);
  animation: cb-particle-drift var(--pd, 8s) ease-in-out calc(var(--pdl, 0s) * -1) infinite;
}
@keyframes cb-particle-drift {
  0%,100% { transform: translate3d(0,0,0) scale(1);    opacity: var(--po, 0.1); }
  33%     { transform: translate3d(var(--pdx,8px), var(--pdy,-12px), 0) scale(1.3); opacity: calc(var(--po, 0.1) * 1.8); }
  66%     { transform: translate3d(calc(var(--pdx,8px) * -0.4), calc(var(--pdy,-12px) * 0.3), 0) scale(0.8); opacity: calc(var(--po, 0.1) * 0.5); }
}

/* ── Depth fog: static gradients, zero cost ── */
.cb-fog-top {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 25vh;
  background: linear-gradient(to bottom, rgba(2,0,0,0.72) 0%, transparent 100%);
}
.cb-fog-bottom {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 25vh;
  background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%);
}

/* ── Noise ── */
.cb-noise {
  position: absolute;
  inset: 0;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}
`

export default function CinematicBackground() {
  return (
    <div className="cb" aria-hidden="true">
      <style>{css}</style>
      <div className="cb-base" />
      <div className="cb-blob cb-blob-1" />
      <div className="cb-blob cb-blob-2" />
      <div className="cb-blob cb-blob-3" />
      <div className="cb-blob cb-blob-4" />
      <div className="cb-beam-1" />
      <div className="cb-radial" />
      <div className="cb-grid" />
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="cb-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            '--po': p.o,
            '--pd': `${p.d}s`,
            '--pdl': `${p.dl}s`,
            '--pdx': `${p.dx}px`,
            '--pdy': `${p.dy}px`,
          }}
        />
      ))}
      <div className="cb-fog-top" />
      <div className="cb-fog-bottom" />
      <div className="cb-noise" />
    </div>
  )
}
