import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
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
import RegisterSGS from './pages/RegisterSGS'
import RegisterExternal from './pages/RegisterExternal'
import Portfolio from './pages/Portfolio'
import Dashboard from './pages/Dashboard'
import CreateAccount from './pages/CreateAccount'

function MainPage() {
  return (
    <>
      <CinematicBackground />
      <div className="grain-overlay" aria-hidden="true" />
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
          <Route path="/register/sgs" element={<RegisterSGS />} />
          <Route path="/register/external" element={<RegisterExternal />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-account" element={<CreateAccount />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
