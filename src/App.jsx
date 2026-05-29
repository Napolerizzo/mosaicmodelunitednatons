import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './contexts/AuthContext'
import LoadingScreen from './components/LoadingScreen'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Archive from './components/Archive'
import Committees from './components/Committees'
import FAQ from './components/FAQ'
import NextSeat from './components/NextSeat'
import Footer from './components/Footer'
import CookieConsent from './components/CookieConsent'
import CinematicBackground from './components/CinematicBackground'
import Login from './pages/Login'
import Register from './pages/Register'

function MainPage() {
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      <CinematicBackground />
      <div className="grain-overlay" aria-hidden="true" />

      <AnimatePresence>
        {!loaded && (
          <LoadingScreen key="loader" onComplete={() => setLoaded(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loaded && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Navbar />
            <main>
              <Hero />
              <Archive />
              <Committees />
              <FAQ />
              <NextSeat />
            </main>
            <Footer />
            <CookieConsent />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
