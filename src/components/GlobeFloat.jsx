import { useScroll, useTransform, motion } from 'framer-motion'
import Globe3D from './Globe3D'

export default function GlobeFloat({ loaded }) {
  const { scrollY } = useScroll()

  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const isMobile = vw < 900

  const size = isMobile ? 200 : Math.min(520, Math.round(vw * 0.38))

  // Hidden during hero, fades IN at hero→journey boundary, fades OUT as journey ends.
  // Hero=100vh, Journey=100vh → total=200vh.
  const scrollFade = useTransform(
    scrollY,
    [0, vh * 0.82, vh * 1.0, vh * 1.7, vh * 2.05],
    [0,          0,         1,         1,          0]
  )
  const mobileFade = useTransform(scrollY, [0, vh * 0.55], [1, 0])

  // Globe hidden entirely on mobile
  if (isMobile) return null

  // ── Desktop: fixed right-center, fades out after journey ──
  return (
    <motion.div
      style={{
        position: 'fixed',
        right: 'max(6vw, 24px)',
        top: `calc(50vh - ${size / 2}px)`,
        zIndex: 8,
        pointerEvents: 'none',
        opacity: scrollFade,
      }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={loaded ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 1.3, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Globe3D size={size} />
      </motion.div>
    </motion.div>
  )
}
