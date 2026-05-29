import { useEffect, useRef, useState } from 'react'
import { motion, useTransform } from 'framer-motion'

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

/*
  Suspended constellation of memories.

  Every primary and secondary shard contains real imagery from Edition I.
  Hierarchy is built through blur / opacity / masking / scale — not emptiness.

  Layers:
    PRIMARY     (1)  — sharp, dominant, fast cycling — the centre of gravity
    SECONDARY   (5)  — real imagery, partial crops, slight blur
    TERTIARY    (5)  — impressionistic, painterly — heavy blur, still imagery
    COLOR WASH  (3)  — abstracted colour only, blur so heavy no detail survives
    VIDEO       (1)  — plays clip when videoSrc set, cycles photos as fallback
    STRUCTURAL  (4)  — thin knife slivers + glow line only; no full panels

  Motion: pure x/y drift, no rotation, speeds match depth layer.
*/

const FRAGS = [

  // ════════════════════════════════════════════════════════════
  // PRIMARY — one sharp window into the memory
  // ════════════════════════════════════════════════════════════

  // 0 — The focal shard. Diagonal cut. Fast cycling. Centre-right.
  {
    id:0, left:'53%', top:'14%', w:'25%', h:'58%',
    clip:[[44,0],[100,24],[56,100],[0,76]],
    z:9, op:0.92, blur:0,
    type:'photo', imgStart:0, speed:52, objectPos:'center 28%',
    drift:{x:[0,3,-2,3,0], y:[0,-5,4,-3,0]}, dur:24, del:0,
    parallaxPx:-16, border:'gold', primary:true,
  },

  // ════════════════════════════════════════════════════════════
  // SECONDARY — real imagery, partial reveals, slight blur
  // ════════════════════════════════════════════════════════════

  // 1 — Upper right. Head & shoulder crop. Slightly soft.
  {
    id:1, left:'70%', top:'11%', w:'19%', h:'33%',
    clip:[[26,0],[100,15],[78,100],[0,78]],
    z:7, op:0.72, blur:1,
    type:'photo', imgStart:4, speed:86, objectPos:'center 18%',
    drift:{x:[0,5,-4,6,0], y:[0,-5,4,-3,0]}, dur:18, del:0.9,
    parallaxPx:-28, border:'gold-faint',
  },

  // 2 — Lower left. Wide shallow cut — hands, paper, table surface.
  {
    id:2, left:'40%', top:'58%', w:'25%', h:'27%',
    clip:[[0,25],[100,5],[100,75],[0,95]],
    z:6, op:0.65, blur:1.5,
    type:'photo', imgStart:8, speed:108, objectPos:'38% 74%',
    drift:{x:[0,-6,8,-4,0], y:[0,7,-5,6,0]}, dur:21, del:1.6,
    parallaxPx:-36, border:'gold-faint',
  },

  // 3 — Upper left anchor. Delegates in session.
  {
    id:3, left:'43%', top:'8%', w:'13%', h:'28%',
    clip:[[20,0],[100,12],[84,100],[0,84]],
    z:6, op:0.60, blur:2,
    type:'photo', imgStart:16, speed:128, objectPos:'center 35%',
    drift:{x:[0,4,-5,3,0], y:[0,-6,5,-3,0]}, dur:17, del:2.3,
    parallaxPx:-22, border:'gold-faint',
  },

  // 4 — Right mid. Narrow shard — crowd, facing, motion.
  {
    id:4, left:'80%', top:'32%', w:'13%', h:'38%',
    clip:[[16,0],[100,8],[86,100],[0,88]],
    z:5, op:0.68, blur:1,
    type:'photo', imgStart:12, speed:95, objectPos:'center 50%',
    drift:{x:[0,-5,7,-3,0], y:[0,6,-7,5,0]}, dur:20, del:1.1,
    parallaxPx:-42, border:'none',
  },

  // 5 — Below primary. Diamond cut — tight emotional detail.
  {
    id:5, left:'60%', top:'50%', w:'16%', h:'22%',
    clip:[[38,0],[100,30],[62,100],[0,70]],
    z:7, op:0.74, blur:0.5,
    type:'photo', imgStart:20, speed:76, objectPos:'center 60%',
    drift:{x:[0,5,-6,4,0], y:[0,-5,4,-6,0]}, dur:15, del:2.1,
    parallaxPx:-24, border:'gold-faint',
  },

  // ════════════════════════════════════════════════════════════
  // TERTIARY — impressionistic, painterly, blur-abstracted imagery
  // ════════════════════════════════════════════════════════════

  // 6 — Wide cinematic band. Silhouette sweep across mid-field.
  {
    id:6, left:'37%', top:'37%', w:'50%', h:'4%',
    clip:[[0,25],[100,0],[100,75],[0,100]],
    z:5, op:0.40, blur:3.5,
    type:'photo', imgStart:2, speed:220, objectPos:'center 42%',
    drift:{x:[0,-7,10,-5,0], y:[0,3,-2,4,0]}, dur:29, del:0.8,
    parallaxPx:-38, border:'none',
  },

  // 7 — Lower right mass. Audience, applause — blur renders them gestural.
  {
    id:7, left:'60%', top:'65%', w:'26%', h:'26%',
    clip:[[6,10],[92,0],[100,88],[10,100]],
    z:4, op:0.34, blur:5,
    type:'photo', imgStart:6, speed:285, objectPos:'center 25%',
    drift:{x:[0,-5,8,-4,0], y:[0,5,-6,4,0]}, dur:26, del:2.7,
    parallaxPx:-52, border:'none',
  },

  // 8 — Upper right haze. Blurred faces, motion, energy.
  {
    id:8, left:'79%', top:'10%', w:'13%', h:'22%',
    clip:[[22,0],[100,14],[80,100],[0,72]],
    z:4, op:0.36, blur:4,
    type:'photo', imgStart:10, speed:245, objectPos:'center 30%',
    drift:{x:[0,-3,5,-2,0], y:[0,4,-5,3,0]}, dur:24, del:3.5,
    parallaxPx:-58, border:'none',
  },

  // 9 — Background centre mass. Wide irregular polygon — mood, colour.
  {
    id:9, left:'46%', top:'23%', w:'28%', h:'37%',
    clip:[[8,5],[94,0],[100,90],[12,100],[0,50]],
    z:3, op:0.28, blur:6,
    type:'photo', imgStart:14, speed:325, objectPos:'45% 40%',
    drift:{x:[0,5,-4,3,0], y:[0,-4,5,-3,0]}, dur:33, del:1.5,
    parallaxPx:-60, border:'none',
  },

  // 10 — Lower atmospheric sweep. Horizontal band, soft impression.
  {
    id:10, left:'38%', top:'61%', w:'44%', h:'4.5%',
    clip:[[0,20],[100,0],[100,80],[0,100]],
    z:3, op:0.26, blur:7,
    type:'photo', imgStart:18, speed:370, objectPos:'center 55%',
    drift:{x:[0,-4,6,-3,0], y:[0,2,-2,2,0]}, dur:37, del:2.0,
    parallaxPx:-64, border:'none',
  },

  // ════════════════════════════════════════════════════════════
  // COLOR WASH — pure abstraction; blur so heavy only tone survives
  // ════════════════════════════════════════════════════════════

  // 11 — Large background warm haze
  {
    id:11, left:'43%', top:'3%', w:'42%', h:'58%',
    clip:[[3,8],[97,2],[100,93],[6,98],[0,52]],
    z:2, op:0.11, blur:20,
    type:'photo', imgStart:3, speed:650,
    drift:{x:[0,4,-3,2,0], y:[0,-3,4,-2,0]}, dur:42, del:1.0,
    parallaxPx:-80, border:'none',
  },

  // 12 — Right field depth colour
  {
    id:12, left:'63%', top:'8%', w:'32%', h:'72%',
    clip:[[6,3],[100,0],[100,97],[2,100]],
    z:1, op:0.07, blur:24,
    type:'photo', imgStart:7, speed:850,
    drift:{x:[0,-2,3,-1,0], y:[0,2,-3,2,0]}, dur:46, del:2.4,
    parallaxPx:-92, border:'none',
  },

  // 13 — Lower right depth colour
  {
    id:13, left:'56%', top:'62%', w:'34%', h:'30%',
    clip:[[5,8],[95,0],[100,90],[3,100]],
    z:1, op:0.06, blur:26,
    type:'photo', imgStart:22, speed:1100,
    drift:{x:[0,2,-3,2,0], y:[0,-2,3,-2,0]}, dur:52, del:3.6,
    parallaxPx:-90, border:'none',
  },

  // ════════════════════════════════════════════════════════════
  // VIDEO SLOT — activates when videoSrc is provided
  // Falls back to fast photo cycling when null
  // ════════════════════════════════════════════════════════════

  // 14 — Diamond shard, centre-right. Drop videoSrc path to enable.
  {
    id:14, left:'67%', top:'36%', w:'15%', h:'22%',
    clip:[[38,0],[100,32],[62,100],[0,68]],
    z:6, op:0.80, blur:0,
    type:'video', videoSrc:null,
    imgStart:21, speed:62, objectPos:'center center',
    drift:{x:[0,4,-5,3,0], y:[0,-4,4,-5,0]}, dur:16, del:1.8,
    parallaxPx:-26, border:'gold',
  },

  // ════════════════════════════════════════════════════════════
  // STRUCTURAL ACCENTS — thin only; no full empty panels
  // ════════════════════════════════════════════════════════════

  // 15 — Left boundary knife sliver (gold glass)
  {
    id:15, left:'41%', top:'6%', w:'2%', h:'57%',
    clip:[[20,0],[80,4],[60,100],[40,96]],
    z:8, op:0.58, blur:0,
    type:'glass-gold',
    drift:{x:[0,3,-2,4,0], y:[0,-8,6,-4,0]}, dur:20, del:0,
    parallaxPx:-10, border:'gold',
  },

  // 16 — Far right sliver accent (gold glass)
  {
    id:16, left:'90%', top:'18%', w:'2%', h:'48%',
    clip:[[18,0],[82,4],[62,100],[38,96]],
    z:5, op:0.34, blur:0,
    type:'glass-gold',
    drift:{x:[0,-2,4,-2,0], y:[0,5,-5,4,0]}, dur:25, del:1.9,
    parallaxPx:-18, border:'gold-faint',
  },

  // 17 — Horizontal gold glow line
  {
    id:17, left:'40%', top:'68%', w:'28%', h:'1%',
    clip:[[0,0],[100,38],[100,100],[0,62]],
    z:7, op:0.25, blur:0,
    type:'glow',
    drift:{x:[0,-4,7,-3,0], y:[0,2,-2,2,0]}, dur:27, del:0.5,
    parallaxPx:-20, border:'none',
  },

  // 18 — Small dark glass gem (upper right corner accent only)
  {
    id:18, left:'77%', top:'6%', w:'8%', h:'14%',
    clip:[[28,0],[100,20],[72,100],[0,72]],
    z:6, op:0.44, blur:0,
    type:'glass-dark',
    drift:{x:[0,-3,4,-2,0], y:[0,3,-4,2,0]}, dur:15, del:1.5,
    parallaxPx:-14, border:'white-faint',
  },
]

// ════════════════════════════════════════════════════════════
// MOBILE COMPOSITION — portrait magazine cover
// Curated 5-shard layout for <768px viewports.
// Coordinates are re-authored for portrait, not scaled from desktop.
// Hero text lives at bottom-left; shards float upper-right and edges.
// ════════════════════════════════════════════════════════════

const MOBILE_FRAGS = [

  // M0 — Primary anchor: bold diagonal shard, upper-right quadrant
  {
    id:100, left:'44%', top:'7%', w:'50%', h:'52%',
    clip:[[18,0],[100,10],[84,100],[0,84]],
    z:9, op:0.80, blur:0,
    type:'photo', imgStart:0, speed:52, objectPos:'center 28%',
    drift:{x:[0,2,-2,2,0], y:[0,-3,3,-2,0]}, dur:24, del:0,
    parallaxPx:-8, border:'gold', primary:true,
  },

  // M1 — Left-edge accent: delegates peeking in from left
  {
    id:101, left:'2%', top:'18%', w:'30%', h:'38%',
    clip:[[0,6],[94,0],[100,92],[6,100]],
    z:6, op:0.44, blur:1.5,
    type:'photo', imgStart:8, speed:108, objectPos:'center 38%',
    drift:{x:[0,-2,3,-1,0], y:[0,3,-3,2,0]}, dur:21, del:1.6,
    parallaxPx:-4, border:'gold-faint',
  },

  // M2 — Right-edge strip: narrow vertical slice, far-right column
  {
    id:102, left:'83%', top:'20%', w:'13%', h:'48%',
    clip:[[14,0],[100,6],[88,100],[0,90]],
    z:7, op:0.58, blur:0.5,
    type:'photo', imgStart:4, speed:86, objectPos:'center 42%',
    drift:{x:[0,-2,3,-2,0], y:[0,3,-3,2,0]}, dur:20, del:1.1,
    parallaxPx:-6, border:'none',
  },

  // M3 — Lower accent: sits behind the text zone, very subtle
  {
    id:103, left:'50%', top:'60%', w:'40%', h:'22%',
    clip:[[0,22],[100,4],[100,78],[0,96]],
    z:4, op:0.28, blur:3,
    type:'photo', imgStart:16, speed:128, objectPos:'center 55%',
    drift:{x:[0,2,-2,1,0], y:[0,-2,2,-1,0]}, dur:28, del:2.0,
    parallaxPx:-3, border:'none',
  },

  // M4 — Background atmospheric wash: heavy blur, impressionistic warmth
  {
    id:104, left:'28%', top:'2%', w:'70%', h:'66%',
    clip:[[5,3],[98,0],[100,97],[2,100]],
    z:2, op:0.09, blur:22,
    type:'photo', imgStart:3, speed:650, objectPos:'center center',
    drift:{x:[0,1,-1,1,0], y:[0,-2,2,-1,0]}, dur:42, del:1.0,
    parallaxPx:0, border:'none',
  },
]

const BORDER_STROKE = {
  'gold':        'rgba(155,110,9,0.65)',
  'gold-faint':  'rgba(155,110,9,0.22)',
  'white-faint': 'rgba(255,255,255,0.10)',
}

const FIELD_CSS = `
.ff-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  isolation: isolate;
}
.ff-shard-outer {
  position: absolute;
  will-change: transform;
}
.ff-shard-content {
  position: relative;
  width: 100%;
  height: 100%;
}
.ff-clipped {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.ff-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Darkness — edges recede, centre breathes ── */
.ff-darkness {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 55% 80% at 70% 42%, transparent 22%, rgba(0,0,0,0.50) 100%),
    linear-gradient(to right, rgba(0,0,0,0.30) 0%, transparent 28%),
    linear-gradient(to bottom, rgba(0,0,0,0.16) 0%, transparent 18%, rgba(0,0,0,0.36) 100%);
  pointer-events: none;
  z-index: 20;
}

/* ── Primary halo — barely perceptible warmth behind the focal shard ── */
.ff-primary-halo {
  position: absolute;
  inset: -28px;
  background: radial-gradient(ellipse at center, rgba(155,110,9,0.08) 0%, transparent 62%);
  pointer-events: none;
  z-index: 0;
}

/* ── Glass types (used only for structural accents) ── */
.ff-glass-dark {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(148deg,
      rgba(255,255,255,0.05) 0%,
      rgba(4,2,0,0.72) 36%,
      rgba(0,0,0,0.92) 100%);
}
.ff-glass-dark::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 32%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, transparent 100%);
  pointer-events: none;
}

.ff-glass-gold {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(148deg,
      rgba(155,110,9,0.22) 0%,
      rgba(0,0,0,0.56) 44%,
      rgba(155,110,9,0.06) 100%);
}
.ff-glass-gold::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 26%;
  background: linear-gradient(to bottom, rgba(220,175,50,0.08) 0%, transparent 100%);
  pointer-events: none;
}

.ff-glow-shard {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 4%, rgba(155,110,9,0.50) 50%, transparent 96%);
  filter: blur(1.5px);
}

/* ── Photo tinting — varies by fragment opacity/blur in FRAGS ── */
.ff-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    145deg,
    rgba(155,110,9,0.22) 0%,
    rgba(0,0,0,0.18) 44%,
    rgba(0,0,0,0.48) 100%
  );
  z-index: 2;
  pointer-events: none;
}
.ff-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.65) 100%);
  z-index: 3;
  pointer-events: none;
}
.ff-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.04) 2px,
    rgba(0,0,0,0.04) 3px
  );
  z-index: 4;
  pointer-events: none;
}

.ff-border-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  overflow: visible;
}

/* Mobile: ff-field stays visible; mobile frag set is rendered via JS */
`

function Shard({ frag, scrollY }) {
  const imgRef   = useRef(null)
  const videoRef = useRef(null)

  const yOffset = useTransform(scrollY, [0, 600], [0, frag.parallaxPx])

  useEffect(() => {
    IMAGES.forEach(src => { const i = new Image(); i.src = src })
  }, [])

  useEffect(() => {
    const needsCycling = frag.type === 'photo' || (frag.type === 'video' && !frag.videoSrc)
    if (!needsCycling || !imgRef.current) return
    let c = frag.imgStart
    const id = setInterval(() => {
      if (imgRef.current) imgRef.current.src = IMAGES[c % IMAGES.length]
      c++
    }, frag.speed)
    return () => clearInterval(id)
  }, [])

  const clipPath    = `polygon(${frag.clip.map(([x, y]) => `${x}% ${y}%`).join(', ')})`
  const svgPoints   = frag.clip.map(([x, y]) => `${x},${y}`).join(' ')
  const strokeColor = BORDER_STROKE[frag.border]

  const isVideo  = frag.type === 'video' && frag.videoSrc
  const isPhoto  = frag.type === 'photo' || (frag.type === 'video' && !frag.videoSrc)
  const isGoldGl = frag.type === 'glass-gold'
  const isDarkGl = frag.type === 'glass-dark'
  const isGlow   = frag.type === 'glow'

  // Deep color wash fragments (blur ≥ 14) need no overlay — blur provides abstraction
  const showOverlays = isPhoto && frag.blur < 14

  return (
    <motion.div
      className="ff-shard-outer"
      style={{
        left:    frag.left,
        top:     frag.top,
        width:   frag.w,
        height:  frag.h,
        zIndex:  frag.z,
        opacity: frag.op,
        filter:  frag.blur > 0 ? `blur(${frag.blur}px)` : undefined,
        y: yOffset,
      }}
    >
      <motion.div
        style={{ width: '100%', height: '100%' }}
        animate={{ x: frag.drift.x, y: frag.drift.y }}
        transition={{
          duration: frag.dur,
          delay:    frag.del,
          repeat:   Infinity,
          ease:     'easeInOut',
          times:    [0, 0.25, 0.5, 0.75, 1],
        }}
      >
        <div className="ff-shard-content">
          {frag.primary && <div className="ff-primary-halo" />}

          <div className="ff-clipped" style={{ clipPath }}>
            {isDarkGl && <div className="ff-glass-dark" />}
            {isGoldGl && <div className="ff-glass-gold" />}
            {isGlow   && <div className="ff-glow-shard" />}

            {isVideo && (
              <video
                ref={videoRef}
                className="ff-media"
                src={frag.videoSrc}
                autoPlay loop muted playsInline
                style={{ objectPosition: frag.objectPos }}
              />
            )}

            {isPhoto && (
              <img
                ref={imgRef}
                className="ff-media"
                src={IMAGES[frag.imgStart % IMAGES.length]}
                alt=""
                style={{ objectPosition: frag.objectPos }}
              />
            )}

            {showOverlays && (
              <>
                <div className="ff-tint" />
                <div className="ff-vignette" />
                {frag.primary && <div className="ff-scanlines" />}
              </>
            )}
          </div>

          {strokeColor && (
            <svg className="ff-border-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points={svgPoints}
                fill="none"
                stroke={strokeColor}
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
              {frag.border === 'gold' && (
                <polygon
                  points={svgPoints}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="0.4"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="22 78"
                  strokeDashoffset="5"
                />
              )}
            </svg>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FragmentField({ scrollY }) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  const frags = isMobile ? MOBILE_FRAGS : FRAGS

  return (
    <div className="ff-field" aria-hidden="true">
      <style>{FIELD_CSS}</style>
      {frags.map(frag => (
        <Shard key={frag.id} frag={frag} scrollY={scrollY} />
      ))}
      <div className="ff-darkness" />
    </div>
  )
}
