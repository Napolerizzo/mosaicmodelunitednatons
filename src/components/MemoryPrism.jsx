import { useEffect, useRef } from 'react'

// All Edition I + new brand-assets photos
const IMAGES = [
  '/brand-assets/72A92FE4-7AD2-41D9-8D3A-A497D7EF1230_1_105_c.jpeg',
  '/brand-assets/7E510A86-748D-42E3-A502-1C27114879CA_1_105_c.jpeg',
  '/brand-assets/4AC1B940-6A42-4DA7-801E-E3DB7637AE95_1_105_c.jpeg',
  '/brand-assets/D655973D-D18C-4556-9589-3B8169E4425E_1_105_c.jpeg',
  '/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg',
  '/brand-assets/B3C9A915-88E4-4549-A99F-464AFB01C1F5_1_105_c.jpeg',
  '/brand-assets/79BC2A0E-D55B-44F2-8C68-6E2ECA3D4992_1_105_c.jpeg',
  '/brand-assets/493C4669-ACB6-42CD-A1D3-A7AA2BF4602D_1_105_c.jpeg',
  '/brand-assets/DC01BC8B-92F2-407D-AF27-93986DB12B74_1_105_c.jpeg',
  '/brand-assets/0A6F8213-9ACE-43D9-B87F-24EAF110D480_1_105_c.jpeg',
  '/brand-assets/8AF34B6E-9909-47EA-ABE8-7E55CB30BF98_1_105_c.jpeg',
  '/brand-assets/8B82B9F9-49B0-4322-8420-2D07E7269379_1_105_c.jpeg',
  '/brand-assets/4C9C681B-70D0-473D-8CB4-A7270821E3BD_1_105_c.jpeg',
  '/brand-assets/A71BDBDD-0954-4830-A3AD-3F04CCB3EBD9_1_105_c.jpeg',
  '/brand-assets/0E8BFE3E-1062-4336-95CC-049CCAB39283_1_105_c.jpeg',
  '/brand-assets/2E9FC29D-C33E-4880-B233-097764A88E0B_4_5005_c.jpeg',
  '/brand-assets/BC90F61B-5C87-4AC1-96D6-D67F79C1AF97_4_5005_c.jpeg',
  '/brand-assets/5771A8D9-88FD-4A2A-9889-3E2CDA237CF6_4_5005_c.jpeg',
  '/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg',
  '/brand-assets/8EBB4AE6-A558-4DE7-B19F-1696CDE96607_4_5005_c.jpeg',
  '/brand-assets/8F699AEC-A89B-481A-8831-A1F993AE79FE_4_5005_c.jpeg',
  '/brand-assets/0E0C117E-396D-4805-872C-03ABDE0AE155_4_5005_c.jpeg',
  '/brand-assets/DAE14D04-04CF-4105-83B9-8DD7736C3488_4_5005_c.jpeg',
  '/brand-assets/5A1171F6-5AA9-4F1C-AED8-33882BA1F89D_4_5005_c.jpeg',
  '/brand-assets/141C97FB-923A-4420-BFD7-AD9B03FF54B1_4_5005_c.jpeg',
]

// Triangular prism geometry (equilateral cross-section)
const W = 250   // face width (px)
const H = 370   // face height (px)
const R = Math.round(W / (2 * Math.tan(Math.PI / 3)))  // inradius ≈ 72px

// Each face gets a different cycling speed (ms) and starting offset
const FACE_SPEEDS = [85, 125, 65]   // face 2 fastest, face 1 slowest

const css = `
.mp-anchor {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Ambient halo behind the prism */
.mp-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -52%);
  width: 520px;
  height: 520px;
  background:
    radial-gradient(circle 160px at 50% 50%, rgba(155,110,9,0.2) 0%, transparent 100%),
    radial-gradient(ellipse 80% 80% at 50% 50%, rgba(77,3,3,0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Float wrapper — keeps perspective origin stable during float */
.mp-float {
  animation: mp-float 5s ease-in-out infinite;
  position: relative;
  z-index: 1;
}
@keyframes mp-float {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-16px); }
}

/* Perspective container */
.mp-scene {
  width: ${W}px;
  height: ${H}px;
  perspective: 1100px;
  perspective-origin: 50% 38%;
}

/* The rotating prism body */
.mp-body {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: mp-spin 13s linear infinite;
}
@keyframes mp-spin {
  0%   { transform: rotateX(-10deg) rotateY(0deg); }
  100% { transform: rotateX(-10deg) rotateY(360deg); }
}

/* Individual face */
.mp-face {
  position: absolute;
  width: ${W}px;
  height: ${H}px;
  overflow: hidden;
  backface-visibility: hidden;
  background: #050200;
  border: 1px solid rgba(255,255,255,0.13);
  box-shadow:
    inset 2px 0 0 rgba(255,255,255,0.18),
    inset -2px 0 0 rgba(0,0,0,0.55),
    inset 0 2px 0 rgba(255,255,255,0.12),
    inset 0 -2px 0 rgba(0,0,0,0.55),
    inset 0 0 50px rgba(0,0,0,0.45);
}

/* Photo — direct DOM update, no re-render */
.mp-face-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  /* Hard cut — instant switch, no fade */
  transition: none;
}

/* Gold/maroon tint overlay */
.mp-face-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    145deg,
    rgba(155,110,9,0.18) 0%,
    rgba(0,0,0,0.06) 45%,
    rgba(77,3,3,0.16) 100%
  );
  z-index: 2;
  pointer-events: none;
}

/* Film scan-lines */
.mp-face-lines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.05) 2px,
    rgba(0,0,0,0.05) 3px
  );
  z-index: 3;
  pointer-events: none;
}

/* Edge reflection strip at top of each face */
.mp-face-reflect {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 60px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%);
  z-index: 4;
  pointer-events: none;
}

/* Elliptical shadow/glow at the base */
.mp-base-glow {
  width: 200px;
  height: 14px;
  background: radial-gradient(ellipse, rgba(155,110,9,0.32) 0%, transparent 70%);
  margin-top: -4px;
  z-index: 1;
}

/* Label beneath the prism */
.mp-label {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  z-index: 1;
}

.mp-label-edition {
  font-family: 'League Spartan', 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.42em;
  color: var(--gold);
  text-transform: uppercase;
  opacity: 0.9;
}

.mp-label-sub {
  font-family: 'Poppins', sans-serif;
  font-weight: 300;
  font-size: 8.5px;
  letter-spacing: 0.26em;
  color: var(--muted);
  text-transform: uppercase;
  opacity: 0.55;
}

/* ── Mobile: hide prism ── */
@media (max-width: 900px) {
  .mp-anchor { display: none; }
}
`

export default function MemoryPrism() {
  const imgRefs = [useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    // Kick off preload of all images
    IMAGES.forEach(src => { const img = new Image(); img.src = src })

    const n = IMAGES.length
    // Stagger starting indices so faces show different photos from the start
    const counters = [
      0,
      Math.floor(n / 3),
      Math.floor((2 * n) / 3),
    ]

    const timers = FACE_SPEEDS.map((ms, fi) =>
      setInterval(() => {
        const el = imgRefs[fi].current
        if (el) el.src = IMAGES[counters[fi] % n]
        counters[fi]++
      }, ms)
    )

    return () => timers.forEach(clearInterval)
  }, [])

  return (
    <div className="mp-anchor">
      <style>{css}</style>
      <div className="mp-halo" />
      <div className="mp-float">
        <div className="mp-scene">
          <div className="mp-body">
            {[0, 120, 240].map((deg, i) => (
              <div
                key={i}
                className="mp-face"
                style={{ transform: `rotateY(${deg}deg) translateZ(${R}px)` }}
              >
                <img
                  ref={imgRefs[i]}
                  src={IMAGES[Math.floor((i * IMAGES.length) / 3)]}
                  alt=""
                  className="mp-face-img"
                />
                <div className="mp-face-tint" />
                <div className="mp-face-lines" />
                <div className="mp-face-reflect" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mp-base-glow" />
      <div className="mp-label">
        <span className="mp-label-edition">Edition I</span>
        <span className="mp-label-sub">Memory Fragments</span>
      </div>
    </div>
  )
}
