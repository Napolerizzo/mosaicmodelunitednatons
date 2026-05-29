import { useRef, useEffect, Suspense, lazy } from 'react'

const GlobeComponent = lazy(() => import('react-globe.gl'))

const css = `
.globe-outer {
  position: relative;
  display: inline-block;
}
.globe-atmosphere {
  position: absolute;
  inset: -10%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 30% 28%,
    rgba(155,110,9,0.09) 0%,
    rgba(77,3,3,0.05) 45%,
    transparent 68%);
  pointer-events: none;
  z-index: 2;
}
.globe-rim {
  position: absolute;
  inset: -4%;
  border-radius: 50%;
  border: 1px solid rgba(201,168,76,0.07);
  pointer-events: none;
  z-index: 2;
}
.globe-outer canvas { border-radius: 50%; }
`

function GlobeFallback({ size }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: 'radial-gradient(ellipse at 35% 35%, #1a2f5a 0%, #0d1a3a 50%, #050a1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ color: 'rgba(201,168,76,0.4)', fontSize: '12px', letterSpacing: '0.2em' }}>
        GLOBE
      </div>
    </div>
  )
}

function GlobeInner({ size }) {
  const globeRef = useRef(null)

  useEffect(() => {
    let scrollVel = 0
    let lastY = window.scrollY
    let raf = null

    const onScroll = () => {
      const delta = Math.abs(window.scrollY - lastY)
      // Scale velocity — bigger scroll step = faster spin
      scrollVel = Math.min(delta * 1.4, 10)
      lastY = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const timer = setTimeout(() => {
      try {
        const controls = globeRef.current?.controls()
        if (controls) {
          controls.autoRotate = true
          controls.autoRotateSpeed = 0   // start still
          controls.enableZoom = false
          controls.enablePan = false
          globeRef.current.pointOfView({ lat: 20.6, lng: 78.9, altitude: 2.1 }, 0)
        }
      } catch {}
    }, 200)

    const tick = () => {
      try {
        const controls = globeRef.current?.controls()
        if (controls) {
          // Lerp toward scroll velocity target, then decay to 0
          const target = scrollVel * 0.85
          controls.autoRotateSpeed += (target - controls.autoRotateSpeed) * 0.1
          scrollVel *= 0.86
        }
      } catch {}
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <GlobeComponent
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      atmosphereColor="rgba(155,110,9,0.18)"
      atmosphereAltitude={0.22}
      backgroundColor="rgba(0,0,0,0)"
      width={size}
      height={size}
    />
  )
}

export default function Globe3D({ size = 520 }) {
  return (
    <div className="globe-outer" style={{ width: size, height: size }}>
      <style>{css}</style>
      <div className="globe-atmosphere" aria-hidden="true" />
      <div className="globe-rim" aria-hidden="true" />
      <Suspense fallback={<GlobeFallback size={size} />}>
        <GlobeInner size={size} />
      </Suspense>
    </div>
  )
}
