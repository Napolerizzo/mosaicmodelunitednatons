import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CSS = `
.ca-root{min-height:100vh;background:#050402;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;font-family:'Poppins',sans-serif;}
.ca-card{width:100%;max-width:460px;border:1px solid rgba(155,110,9,0.2);background:rgba(8,6,4,0.95);padding:44px 40px;}
.ca-input{width:100%;box-sizing:border-box;background:transparent;border:none;border-bottom:1px solid rgba(155,110,9,0.2);padding:10px 0;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:16px;color:#e8e4dc;outline:none;transition:border-color 0.25s;}
.ca-input:focus{border-bottom-color:rgba(155,110,9,0.65);}
.ca-input::placeholder{color:rgba(155,110,9,0.25);font-style:italic;}
.ca-input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #050402 inset;-webkit-text-fill-color:#e8e4dc;}
.ca-btn{width:100%;background:#9b6e09;color:#000;border:none;padding:16px;font-family:'Poppins',sans-serif;font-size:8.5px;font-weight:500;letter-spacing:0.34em;text-transform:uppercase;cursor:pointer;transition:opacity 0.2s;margin-top:32px;}
.ca-btn:hover:not(:disabled){opacity:0.82;}
.ca-btn:disabled{opacity:0.35;cursor:default;}
.ca-skip{text-align:center;margin-top:16px;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(155,110,9,0.35);cursor:pointer;transition:color 0.2s;}
.ca-skip:hover{color:rgba(155,110,9,0.65);}
`

export default function CreateAccount() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const regId = params.get('reg') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const el = document.createElement('style'); el.id='ca-css'; el.textContent=CSS
    if (!document.getElementById('ca-css')) document.head.appendChild(el)
    return () => document.getElementById('ca-css')?.remove()
  }, [])

  const submit = async () => {
    setError('')
    if (!password) { setError('Password is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) throw signUpErr

      const userId = data.user?.id
      if (userId && regId) {
        await supabase.from('registrations').update({ user_id: userId }).eq('registration_id', regId)
      }

      navigate('/dashboard')
    } catch (e) {
      setError(e.message || 'Account creation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ca-root">
      <motion.div style={{ width:'100%', maxWidth:460 }}
        initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, ease:[0.22,1,0.36,1] }}>

        <div style={{ textAlign:'center', marginBottom:36 }}>
          <img src="/brand-assets/mosaic-logo-nobg.png" alt="Mosaic MUN" height={24} style={{ opacity:0.82, marginBottom:24 }} />
          <div style={{ fontSize:'7px', letterSpacing:'0.5em', textTransform:'uppercase', color:'rgba(155,110,9,0.4)', marginBottom:12 }}>DELEGATE PORTAL ACCESS</div>
          <h1 style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:900, fontSize:'clamp(1.8rem,4vw,2.8rem)', letterSpacing:'-0.04em', color:'#e8e4dc', margin:0, lineHeight:1.05 }}>
            Create your<br/>account.
          </h1>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:14, color:'#b5a88e', marginTop:14, lineHeight:1.65 }}>
            Track your allotment, talk to Mozart, and raise queries — all in one place.
          </p>
        </div>

        <div className="ca-card">
          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', fontSize:'7px', letterSpacing:'0.44em', textTransform:'uppercase', color:'rgba(155,110,9,0.45)', marginBottom:8 }}>EMAIL</label>
            <input className="ca-input" type="email" value={email} readOnly style={{ opacity:0.55, cursor:'not-allowed' }} />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', fontSize:'7px', letterSpacing:'0.44em', textTransform:'uppercase', color:'rgba(155,110,9,0.45)', marginBottom:8 }}>PASSWORD</label>
            <input className="ca-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 characters" autoComplete="new-password" autoFocus />
          </div>

          <div>
            <label style={{ display:'block', fontSize:'7px', letterSpacing:'0.44em', textTransform:'uppercase', color:'rgba(155,110,9,0.45)', marginBottom:8 }}>CONFIRM PASSWORD</label>
            <input className="ca-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password" autoComplete="new-password"
              onKeyDown={e => { if (e.key==='Enter') submit() }} />
          </div>

          {error && <div style={{ fontSize:11, color:'#c87070', marginTop:12, lineHeight:1.6 }}>{error}</div>}

          <button className="ca-btn" onClick={submit} disabled={loading}>
            {loading ? 'Creating account...' : 'Access Dashboard →'}
          </button>
        </div>

        <div className="ca-skip" onClick={() => navigate('/')}>Skip for now</div>

        <div style={{ textAlign:'center', marginTop:32, fontSize:'9px', color:'rgba(155,110,9,0.2)', letterSpacing:'0.12em', lineHeight:1.8 }}>
          Your email is pre-filled from your registration.<br/>
          Already have an account? <span style={{ color:'rgba(155,110,9,0.45)', cursor:'pointer' }} onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </motion.div>
    </div>
  )
}
