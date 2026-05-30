import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const SITE = 'https://mosaicmodelunitednatons.vercel.app'

const COMMITTEE_META = {
  UNGA:  { name:'United Nations General Assembly',       agenda:'Voting Rights of States Under Foreign Military Occupation' },
  UNCSW: { name:'UN Commission on the Status of Women',  agenda:'Surrogate Motherhood as International Labor' },
  UNHRC: { name:'UN Human Rights Council',               agenda:'Right to Be Forgotten vs. Right to Truth in Atrocity Documentation' },
  AIPPM: { name:'All India Political Parties Meet',      agenda:'Operation Sindoor and the Question of Parliamentary War Powers' },
  IPL:   { name:'Indian Premier League Committee',       agenda:'Mega Auction' },
  IP:    { name:'International Press Corps',             agenda:'Photography, Caricature, and Journalism' },
  USSIC: { name:'US Senate Intelligence Committee',      agenda:'Discussing and Declassifying The Epstein Files' },
}

const SHARD_SETS = {
  overview: [
    { src:'/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg', left:'55%', top:'5%',  w:'28%', h:'55%', clip:[[36,0],[100,16],[66,100],[0,84]] },
    { src:'/brand-assets/72A92FE4-7AD2-41D9-8D3A-A497D7EF1230_1_105_c.jpeg', left:'76%', top:'3%',  w:'20%', h:'36%', clip:[[20,0],[100,12],[82,100],[0,80]] },
    { src:'/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg', left:'62%', top:'52%', w:'24%', h:'34%', clip:[[0,18],[100,4],[100,82],[0,96]] },
  ],
  mozart: [
    { src:'/brand-assets/79BC2A0E-D55B-44F2-8C68-6E2ECA3D4992_1_105_c.jpeg', left:'52%', top:'6%',  w:'30%', h:'58%', clip:[[38,0],[100,18],[64,100],[0,82]] },
    { src:'/brand-assets/8EBB4AE6-A558-4DE7-B19F-1696CDE96607_4_5005_c.jpeg', left:'78%', top:'4%',  w:'18%', h:'34%', clip:[[20,0],[100,12],[82,100],[0,80]] },
    { src:'/brand-assets/5A1171F6-5AA9-4F1C-AED8-33882BA1F89D_4_5005_c.jpeg', left:'58%', top:'54%', w:'26%', h:'32%', clip:[[0,18],[100,4],[100,82],[0,96]] },
  ],
  committee: [
    { src:'/brand-assets/4AC1B940-6A42-4DA7-801E-E3DB7637AE95_1_105_c.jpeg', left:'54%', top:'6%',  w:'30%', h:'54%', clip:[[36,0],[100,16],[66,100],[0,84]] },
    { src:'/brand-assets/BC90F61B-5C87-4AC1-96D6-D67F79C1AF97_4_5005_c.jpeg', left:'78%', top:'3%',  w:'18%', h:'34%', clip:[[20,0],[100,12],[82,100],[0,80]] },
  ],
  queries: [
    { src:'/brand-assets/B3C9A915-88E4-4549-A99F-464AFB01C1F5_1_105_c.jpeg', left:'56%', top:'5%',  w:'28%', h:'56%', clip:[[36,0],[100,16],[66,100],[0,84]] },
    { src:'/brand-assets/0E0C117E-396D-4805-872C-03ABDE0AE155_4_5005_c.jpeg', left:'78%', top:'3%',  w:'18%', h:'34%', clip:[[20,0],[100,12],[82,100],[0,80]] },
  ],
}

const TABS = ['OVERVIEW','MOZART','COMMITTEE','QUERIES']

// ── Shard layer ───────────────────────────────────────────────────────────────
function ShardLayer({ shards }) {
  return (
    <div style={{ position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0 }}>
      {shards.map((s,i) => (
        <motion.div key={i} style={{ position:'absolute',left:s.left,top:s.top,width:s.w,height:s.h }}
          initial={{ opacity:0 }} animate={{ opacity:0.45 }} transition={{ duration:1.4,delay:i*0.18,ease:[0.22,1,0.36,1] }}>
          <div style={{ position:'absolute',inset:0,overflow:'hidden',
            clipPath:`polygon(${s.clip.map(([x,y])=>`${x}% ${y}%`).join(',')})` }}>
            <img src={s.src} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',
              filter:'sepia(0.45) saturate(0.45) brightness(0.22)' }} />
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(145deg,rgba(155,110,9,0.1) 0%,rgba(0,0,0,0.5) 100%)',zIndex:2 }} />
          </div>
        </motion.div>
      ))}
      <div style={{ position:'absolute',inset:0,background:'linear-gradient(to right,rgba(5,4,2,0.98) 0%,rgba(5,4,2,0.92) 44%,rgba(5,4,2,0.55) 100%)',zIndex:1 }} />
    </div>
  )
}

// ── Status helpers ────────────────────────────────────────────────────────────
const statusColor = s => ({ allotted:'#9b6e09',contested:'#c8883a',waitlisted:'rgba(155,110,9,0.4)' }[s] || 'rgba(155,110,9,0.3)')
const statusLabel = s => ({ allotted:'CONFIRMED · ALLOTTED',contested:'ALLOTTED · UNDER REVIEW',waitlisted:'PENDING ALLOCATION' }[s] || 'PENDING ALLOCATION')

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab({ registration }) {
  const isAllotted = ['allotted','contested'].includes(registration?.allocation_status)
  const regId     = registration?.registration_id || '—'
  const committee = registration?.allocated_committee
  const portfolio = registration?.allocated_portfolio
  const status    = registration?.allocation_status || 'pending'
  const meta      = COMMITTEE_META[committee] || {}

  const timeline = [
    { label:'Registered',       done:true },
    { label:'Payment Received', done: registration?.payment_status === 'verified' },
    { label:'Portfolio Allotted', done:isAllotted, detail: isAllotted ? `${committee} · ${portfolio}` : null },
    { label:'Conference Entry', done:false, detail:'11–12 July 2026 · SGS Faridabad' },
  ]

  return (
    <div style={{ display:'flex',minHeight:'calc(100vh - 108px)',position:'relative' }}>
      <ShardLayer shards={SHARD_SETS.overview} />

      {/* Left — credential */}
      <div style={{ position:'relative',zIndex:2,width:'46%',minWidth:320,padding:'56px 40px 56px 8vw',display:'flex',flexDirection:'column',justifyContent:'center' }}>
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.8,ease:[0.22,1,0.36,1] }}>

          <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:'rgba(155,110,9,0.5)',marginBottom:32 }}>
            MOSAIC MUN II · DELEGATE CREDENTIAL
          </div>

          {/* Delegate name */}
          <div style={{ fontSize:'7.5px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',marginBottom:8 }}>DELEGATE</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'clamp(1.8rem,3vw,2.6rem)',letterSpacing:'-0.03em',color:'#f0ece2',lineHeight:1.05,marginBottom:32 }}>
            {registration?.full_name || '—'}
          </div>

          {/* Reg ID */}
          <div style={{ fontSize:'7.5px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',marginBottom:8 }}>REGISTRATION ID</div>
          <div style={{ fontFamily:"'Courier New',monospace",fontSize:15,color:'#c8a84e',letterSpacing:'0.12em',marginBottom:32 }}>{regId}</div>

          {/* Committee */}
          <div style={{ fontSize:'7.5px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',marginBottom:8 }}>COMMITTEE</div>
          <div style={{ fontSize:14,fontWeight:700,color:'#e8e4dc',marginBottom:committee?8:32 }}>
            {committee
              ? `${committee} — ${meta.name}`
              : <span style={{ color:'rgba(200,180,140,0.35)',fontStyle:'italic',fontWeight:400,fontSize:13 }}>Pending allocation</span>}
          </div>
          {committee && (
            <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:13,color:'rgba(200,180,140,0.6)',marginBottom:32,lineHeight:1.55 }}>
              {meta.agenda}
            </div>
          )}

          {/* Portfolio */}
          <div style={{ fontSize:'7.5px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',marginBottom:8 }}>PORTFOLIO</div>
          <div style={{ fontSize:18,fontWeight:700,color:'#f0ece2',marginBottom:28 }}>
            {portfolio || <span style={{ color:'rgba(200,180,140,0.35)',fontStyle:'italic',fontWeight:400,fontSize:13 }}>Pending allocation</span>}
          </div>

          {/* Status badge */}
          <motion.div animate={!isAllotted?{opacity:[0.5,1,0.5]}:{}} transition={!isAllotted?{duration:2.2,repeat:Infinity}:{}}
            style={{ display:'inline-block',fontSize:'8px',letterSpacing:'0.32em',textTransform:'uppercase',
              border:`1px solid ${statusColor(status)}`,color:statusColor(status),padding:'6px 16px',marginBottom:36 }}>
            {statusLabel(status)}
          </motion.div>

          {/* QR */}
          {regId !== '—' && (
            <div>
              <div style={{ fontSize:'7px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(155,110,9,0.32)',marginBottom:12 }}>VERIFICATION QR</div>
              <div style={{ border:'1px solid rgba(155,110,9,0.2)',padding:12,display:'inline-block',background:'rgba(255,255,255,0.02)' }}>
                <QRCode value={`${SITE}/verify/${regId}`} size={96} fgColor="#9b6e09" bgColor="transparent" />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right — timeline */}
      <div style={{ position:'relative',zIndex:2,flex:1,padding:'56px 8vw 56px 52px',display:'flex',flexDirection:'column',justifyContent:'center' }}>
        <motion.div initial={{ opacity:0,x:24 }} animate={{ opacity:1,x:0 }} transition={{ duration:0.8,delay:0.2,ease:[0.22,1,0.36,1] }}>

          <div style={{ fontSize:'7px',letterSpacing:'0.5em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',marginBottom:14 }}>ALLOTMENT JOURNEY</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'clamp(2rem,4vw,3rem)',letterSpacing:'-0.04em',color:'#f0ece2',lineHeight:0.95,marginBottom:52 }}>
            Your<br/>status.
          </div>

          <div style={{ maxWidth:420 }}>
            {timeline.map((step, i) => (
              <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:22,marginBottom:0 }}>
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0 }}>
                  <motion.div
                    animate={!step.done && i===timeline.findIndex(t=>!t.done)?{scale:[1,1.2,1],opacity:[0.4,1,0.4]}:{}}
                    transition={{ duration:1.8,repeat:Infinity }}
                    style={{ width:12,height:12,borderRadius:'50%',marginTop:4,flexShrink:0,
                      background:step.done?'#9b6e09':'transparent',
                      border:`1.5px solid ${step.done?'#9b6e09':'rgba(155,110,9,0.28)'}` }}
                  />
                  {i < timeline.length-1 && (
                    <div style={{ width:1,height:44,background:step.done?'rgba(155,110,9,0.35)':'rgba(155,110,9,0.1)',marginTop:4 }} />
                  )}
                </div>
                <div style={{ paddingBottom:i<timeline.length-1?0:0,paddingTop:2 }}>
                  <div style={{ fontSize:'8px',letterSpacing:'0.36em',textTransform:'uppercase',
                    color:step.done?'#c8a84e':'rgba(180,160,120,0.3)',marginBottom:4 }}>
                    {step.label}
                  </div>
                  {step.detail && (
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:13,
                      color:'rgba(200,180,140,0.55)',lineHeight:1.5,marginBottom:i<timeline.length-1?22:0 }}>
                      {step.detail}
                    </div>
                  )}
                  {!step.detail && i<timeline.length-1 && <div style={{ height:22 }} />}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── MOZART TAB ────────────────────────────────────────────────────────────────
function MozartTab({ registration }) {
  const [messages, setMessages] = useState([{
    role:'mozart',
    text:`I am Mozart — the intelligence of Mosaic MUN II.\n\nI know your delegation, your committee's agenda, and everything about this conference. Ask me anything.\n\n— Mozart`,
    ts:Date.now()
  }])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [displayedLast, setDisplayedLast] = useState('')
  const bottomRef = useRef(null)

  const delegate = {
    name:registration?.full_name,
    registration_id:registration?.registration_id,
    committee:registration?.allocated_committee,
    portfolio:registration?.allocated_portfolio,
    status:registration?.allocation_status,
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages,displayedLast])

  const typewrite = useCallback((text, cb) => {
    let i = 0; setDisplayedLast('')
    const tick = () => {
      i++; setDisplayedLast(text.slice(0,i))
      if (i < text.length) setTimeout(tick, 16)
      else { setDisplayedLast(''); cb(text) }
    }
    setTimeout(tick, 16)
  }, [])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(m => [...m, { role:'user', text:msg, ts:Date.now() }])
    setLoading(true)
    try {
      const r = await fetch('/api/mozart', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ message:msg, delegate }),
      })
      const data = await r.json()
      const reply = data.reply || 'I encountered an issue. Please try again.\n\n— Mozart'
      setLoading(false)
      typewrite(reply, full => setMessages(m => [...m, { role:'mozart', text:full, ts:Date.now() }]))
    } catch {
      setLoading(false)
      setMessages(m => [...m, { role:'mozart', text:'I encountered an issue. Please try again.\n\n— Mozart', ts:Date.now() }])
    }
  }

  return (
    <div style={{ position:'relative',minHeight:'calc(100vh - 108px)',display:'flex',flexDirection:'column' }}>
      <ShardLayer shards={SHARD_SETS.mozart} />

      {/* Header */}
      <div style={{ position:'relative',zIndex:2,padding:'36px 8vw 20px',borderBottom:'1px solid rgba(155,110,9,0.1)' }}>
        <div style={{ fontSize:'7px',letterSpacing:'0.5em',textTransform:'uppercase',color:'rgba(155,110,9,0.38)',marginBottom:6 }}>DELEGATE INTELLIGENCE SYSTEM</div>
        <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'clamp(1.8rem,3.5vw,2.8rem)',letterSpacing:'-0.04em',color:'#f0ece2',lineHeight:1 }}>Mozart</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:13,color:'rgba(200,180,140,0.45)',marginTop:6 }}>
          Mosaic MUN AI · Conference Intelligence · Always in session
        </div>
      </div>

      {/* Messages */}
      <div style={{ position:'relative',zIndex:2,flex:1,overflowY:'auto',padding:'32px 8vw',display:'flex',flexDirection:'column',gap:24 }}>
        <AnimatePresence>
          {messages.map((m,i) => (
            <motion.div key={i} initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.45,ease:[0.22,1,0.36,1] }}
              style={{ display:'flex',flexDirection:'column',alignItems:m.role==='user'?'flex-end':'flex-start',
                maxWidth:'70%',alignSelf:m.role==='user'?'flex-end':'flex-start' }}>
              {m.role==='mozart' && (
                <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:'rgba(155,110,9,0.45)',marginBottom:8,paddingLeft:2 }}>
                  MOZART · MOSAIC MUN AI
                </div>
              )}
              <div style={{
                padding:'16px 22px',
                background:m.role==='user'?'rgba(155,110,9,0.14)':'rgba(12,10,6,0.92)',
                border:m.role==='user'?'1px solid rgba(155,110,9,0.4)':'1px solid rgba(155,110,9,0.16)',
                borderLeft:m.role==='mozart'?'2px solid rgba(155,110,9,0.6)':undefined,
                fontSize:14.5,lineHeight:1.85,
                color:m.role==='user'?'#f0ece2':'#d4c8a8',
                fontFamily:"'Cormorant Garamond',serif",
                fontStyle:m.role==='mozart'?'italic':'normal',
                whiteSpace:'pre-wrap',maxWidth:540,
              }}>
                {m.text}
              </div>
            </motion.div>
          ))}

          {displayedLast && (
            <motion.div key="typing" initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }}
              style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',maxWidth:'70%' }}>
              <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:'rgba(155,110,9,0.45)',marginBottom:8,paddingLeft:2 }}>
                MOZART · MOSAIC MUN AI
              </div>
              <div style={{ padding:'16px 22px',background:'rgba(12,10,6,0.92)',border:'1px solid rgba(155,110,9,0.16)',
                borderLeft:'2px solid rgba(155,110,9,0.6)',fontSize:14.5,lineHeight:1.85,color:'#d4c8a8',
                fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',whiteSpace:'pre-wrap',maxWidth:540 }}>
                {displayedLast}
                <motion.span animate={{ opacity:[0,1,0] }} transition={{ duration:0.7,repeat:Infinity }}>▌</motion.span>
              </div>
            </motion.div>
          )}

          {loading && !displayedLast && (
            <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex',alignItems:'center',gap:6,paddingLeft:4,marginTop:4 }}>
              {[0,1,2].map(i => (
                <motion.div key={i} animate={{ opacity:[0.2,1,0.2],y:[0,-5,0] }}
                  transition={{ duration:0.85,delay:i*0.18,repeat:Infinity }}
                  style={{ width:6,height:6,borderRadius:'50%',background:'#9b6e09' }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position:'relative',zIndex:2,padding:'20px 8vw 32px',borderTop:'1px solid rgba(155,110,9,0.1)',
        background:'rgba(5,4,2,0.92)',backdropFilter:'blur(14px)' }}>
        <div style={{ display:'flex',gap:12,alignItems:'flex-end',maxWidth:760 }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} rows={2}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
            placeholder="Ask Mozart anything about your delegation, committee, or the conference..."
            style={{ flex:1,background:'transparent',border:'none',borderBottom:'1px solid rgba(155,110,9,0.22)',
              padding:'10px 0',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:15,
              color:'#f0ece2',resize:'none',outline:'none',lineHeight:1.6 }} />
          <button onClick={send} disabled={!input.trim()||loading}
            style={{ background:'#9b6e09',color:'#000',border:'none',padding:'12px 24px',
              fontFamily:"'Poppins',sans-serif",fontSize:'8px',fontWeight:500,letterSpacing:'0.3em',
              textTransform:'uppercase',cursor:'pointer',flexShrink:0,
              opacity:(!input.trim()||loading)?0.35:1 }}>
            Send
          </button>
        </div>
        <div style={{ fontSize:'9px',color:'rgba(155,110,9,0.22)',marginTop:8,letterSpacing:'0.1em' }}>
          ↵ Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}

// ── COMMITTEE TAB ─────────────────────────────────────────────────────────────
function CommitteeTab({ registration }) {
  const committee = registration?.allocated_committee
  const portfolio = registration?.allocated_portfolio
  const meta      = COMMITTEE_META[committee] || {}
  const [peers, setPeers] = useState([])

  useEffect(() => {
    if (!committee) return
    supabase.from('registrations')
      .select('full_name,allocated_portfolio,allocation_status')
      .eq('allocated_committee', committee)
      .in('allocation_status',['allotted','contested'])
      .order('allocated_portfolio')
      .then(({ data }) => setPeers(data || []))
  }, [committee])

  if (!committee) return (
    <div style={{ position:'relative',minHeight:'calc(100vh - 108px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <ShardLayer shards={SHARD_SETS.committee} />
      <div style={{ position:'relative',zIndex:2,textAlign:'center',padding:'0 8vw' }}>
        <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'clamp(2rem,5vw,4rem)',
          letterSpacing:'-0.04em',color:'rgba(155,110,9,0.2)',lineHeight:1 }}>Pending.</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:15,
          color:'rgba(200,180,140,0.35)',marginTop:14 }}>
          Your committee will appear here once your portfolio is confirmed.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position:'relative',minHeight:'calc(100vh - 108px)' }}>
      <ShardLayer shards={SHARD_SETS.committee} />
      <div style={{ position:'relative',zIndex:2,padding:'52px 8vw' }}>

        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.7,ease:[0.22,1,0.36,1] }}>
          <div style={{ fontSize:'7px',letterSpacing:'0.5em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',marginBottom:10 }}>YOUR COMMITTEE</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'clamp(2.2rem,5vw,4rem)',
            letterSpacing:'-0.045em',color:'#f0ece2',lineHeight:0.95,marginBottom:10 }}>{committee}</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:16,color:'rgba(200,180,140,0.7)',marginBottom:8 }}>{meta.name}</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:13,
            color:'rgba(200,180,140,0.5)',marginBottom:48,borderLeft:'2px solid rgba(155,110,9,0.3)',
            paddingLeft:16,lineHeight:1.65 }}>Agenda: {meta.agenda}</div>
        </motion.div>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,maxWidth:880 }}>
          <motion.div initial={{ opacity:0,x:-20 }} animate={{ opacity:1,x:0 }} transition={{ duration:0.7,delay:0.1,ease:[0.22,1,0.36,1] }}
            style={{ border:'1px solid rgba(155,110,9,0.22)',background:'rgba(155,110,9,0.05)',padding:'28px 24px' }}>
            <div style={{ fontSize:'7.5px',letterSpacing:'0.42em',textTransform:'uppercase',color:'rgba(155,110,9,0.5)',marginBottom:14 }}>YOUR PORTFOLIO</div>
            <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'1.7rem',
              letterSpacing:'-0.03em',color:'#f0ece2',marginBottom:16 }}>{portfolio}</div>
            <div style={{ fontSize:12,color:'rgba(200,180,140,0.55)',lineHeight:1.9 }}>
              Research your portfolio's historical position on this agenda. Understand their geopolitical interests, past voting patterns, and likely alliances in committee.
            </div>
          </motion.div>

          <motion.div initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} transition={{ duration:0.7,delay:0.15,ease:[0.22,1,0.36,1] }}
            style={{ border:'1px solid rgba(155,110,9,0.14)',padding:'28px 24px' }}>
            <div style={{ fontSize:'7.5px',letterSpacing:'0.42em',textTransform:'uppercase',color:'rgba(155,110,9,0.5)',marginBottom:14 }}>CONFERENCE</div>
            {[['Dates','11–12 July 2026'],['Venue','Saraswati Global School, Faridabad'],['Edition','Mosaic MUN II']].map(([k,v]) => (
              <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(155,110,9,0.06)' }}>
                <span style={{ fontSize:'7.5px',letterSpacing:'0.28em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)' }}>{k}</span>
                <span style={{ fontFamily:"'Courier New',monospace",fontSize:12,color:'#d4c8a8' }}>{v}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {peers.length > 0 && (
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.7,delay:0.25,ease:[0.22,1,0.36,1] }}
            style={{ marginTop:44,maxWidth:880 }}>
            <div style={{ fontSize:'7px',letterSpacing:'0.5em',textTransform:'uppercase',color:'rgba(155,110,9,0.38)',marginBottom:20 }}>
              COMMITTEE ROSTER — {peers.length} DELEGATES
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8 }}>
              {peers.map((p,i) => (
                <div key={i} style={{ padding:'12px 16px',border:'1px solid rgba(155,110,9,0.1)',
                  background:p.allocated_portfolio===portfolio?'rgba(155,110,9,0.08)':'transparent' }}>
                  <div style={{ fontSize:'7px',letterSpacing:'0.28em',textTransform:'uppercase',color:'rgba(155,110,9,0.35)',marginBottom:4 }}>
                    {p.allocated_portfolio===portfolio?'YOU':'DELEGATE'}
                  </div>
                  <div style={{ fontSize:13,fontWeight:700,color:'#e0d8c8' }}>{p.allocated_portfolio}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div style={{ marginTop:44,padding:'20px 22px',border:'1px solid rgba(155,110,9,0.14)',background:'rgba(5,4,2,0.6)',maxWidth:500 }}>
          <div style={{ fontSize:'7px',letterSpacing:'0.42em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',marginBottom:8 }}>NEED A DEEPER BRIEF?</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:14,color:'rgba(200,180,140,0.65)',lineHeight:1.7,marginBottom:10 }}>
            Ask Mozart for a full briefing on your portfolio's position, research priorities, and what to expect in committee.
          </div>
          <div style={{ fontSize:'8px',letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(155,110,9,0.45)' }}>Open the Mozart tab →</div>
        </div>
      </div>
    </div>
  )
}

// ── QUERIES TAB ───────────────────────────────────────────────────────────────
function QueriesTab({ registration, userId }) {
  const [queries, setQueries]     = useState([])
  const [subject, setSubject]     = useState('')
  const [message, setMessage]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('queries').select('*').eq('user_id',userId).order('created_at',{ ascending:false })
    setQueries(data || [])
  }, [userId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!subject.trim() || !message.trim()) { setError('Both fields are required.'); return }
    setSubmitting(true); setError('')
    try {
      const { error:err } = await supabase.from('queries').insert({
        user_id:userId, registration_id:registration?.registration_id,
        subject:subject.trim(), message:message.trim(), status:'open',
      })
      if (err) throw err
      setSubject(''); setMessage(''); setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3500)
      load()
    } catch { setError('Submission failed. Please try again.') }
    finally { setSubmitting(false) }
  }

  const statusColors = { open:'rgba(155,110,9,0.85)', under_review:'#c8883a', resolved:'rgba(120,180,120,0.85)' }

  return (
    <div style={{ position:'relative',minHeight:'calc(100vh - 108px)' }}>
      <ShardLayer shards={SHARD_SETS.queries} />
      <div style={{ position:'relative',zIndex:2,padding:'52px 8vw',maxWidth:740 }}>

        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.7,ease:[0.22,1,0.36,1] }}>
          <div style={{ fontSize:'7px',letterSpacing:'0.5em',textTransform:'uppercase',color:'rgba(155,110,9,0.38)',marginBottom:10 }}>SECRETARIAT CORRESPONDENCE</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'clamp(2.2rem,5vw,3.8rem)',
            letterSpacing:'-0.04em',color:'#f0ece2',lineHeight:0.95,marginBottom:48 }}>Raise a<br/>query.</div>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.7,delay:0.1,ease:[0.22,1,0.36,1] }}
          style={{ border:'1px solid rgba(155,110,9,0.18)',padding:'32px 28px',marginBottom:44,background:'rgba(5,4,2,0.65)' }}>
          <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:'rgba(155,110,9,0.45)',marginBottom:20 }}>NEW QUERY</div>

          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block',fontSize:'7.5px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(155,110,9,0.45)',marginBottom:8 }}>SUBJECT</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Brief subject line"
              style={{ width:'100%',boxSizing:'border-box',background:'transparent',border:'none',
                borderBottom:'1px solid rgba(155,110,9,0.18)',padding:'10px 0',
                fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:15,
                color:'#f0ece2',outline:'none' }} />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block',fontSize:'7.5px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(155,110,9,0.45)',marginBottom:8 }}>MESSAGE</label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={5}
              placeholder="Describe your query in detail..."
              style={{ width:'100%',boxSizing:'border-box',background:'transparent',border:'none',
                borderBottom:'1px solid rgba(155,110,9,0.18)',padding:'10px 0',
                fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:15,
                color:'#f0ece2',outline:'none',resize:'none',lineHeight:1.7 }} />
          </div>

          {error && <div style={{ fontSize:11,color:'#c87070',marginBottom:12 }}>{error}</div>}

          <div style={{ display:'flex',alignItems:'center',gap:16 }}>
            <button onClick={submit} disabled={submitting}
              style={{ background:'#9b6e09',color:'#000',border:'none',padding:'14px 28px',
                fontFamily:"'Poppins',sans-serif",fontSize:'8.5px',fontWeight:500,letterSpacing:'0.3em',
                textTransform:'uppercase',cursor:'pointer',opacity:submitting?0.45:1 }}>
              {submitting?'Submitting...':'Submit to Secretariat →'}
            </button>
            {submitted && <span style={{ fontSize:'8.5px',letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(155,110,9,0.7)' }}>Submitted ✓</span>}
          </div>
        </motion.div>

        {/* Query threads */}
        {queries.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6,delay:0.2 }}>
            <div style={{ fontSize:'7px',letterSpacing:'0.5em',textTransform:'uppercase',color:'rgba(155,110,9,0.38)',marginBottom:20 }}>
              YOUR QUERIES ({queries.length})
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {queries.map(q => (
                <div key={q.id} style={{ border:'1px solid rgba(155,110,9,0.13)',padding:'22px 22px',background:'rgba(5,4,2,0.6)' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,gap:16 }}>
                    <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:'#e8e4dc' }}>{q.subject}</div>
                    <span style={{ fontSize:'7px',letterSpacing:'0.28em',textTransform:'uppercase',padding:'3px 10px',flexShrink:0,
                      color:statusColors[q.status],border:`1px solid ${statusColors[q.status]}33` }}>
                      {q.status.replace('_',' ')}
                    </span>
                  </div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:14,color:'rgba(200,180,140,0.7)',lineHeight:1.75,marginBottom:q.secretariat_reply?14:0 }}>
                    {q.message}
                  </div>
                  {q.secretariat_reply && (
                    <div style={{ marginTop:14,padding:'12px 16px',background:'rgba(155,110,9,0.04)',borderLeft:'2px solid rgba(155,110,9,0.4)' }}>
                      <div style={{ fontSize:'7px',letterSpacing:'0.38em',textTransform:'uppercase',color:'rgba(155,110,9,0.5)',marginBottom:6 }}>SECRETARIAT REPLY</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:13,color:'rgba(200,180,140,0.75)',lineHeight:1.75 }}>
                        {q.secretariat_reply}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize:'9px',color:'rgba(155,110,9,0.25)',marginTop:12,letterSpacing:'0.12em' }}>
                    {new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Dashboard CSS ─────────────────────────────────────────────────────────────
const CSS = `
.db-topbar{position:sticky;top:0;z-index:100;background:rgba(5,4,2,0.97);backdrop-filter:blur(14px);border-bottom:1px solid rgba(155,110,9,0.1);padding:14px 8vw;display:flex;align-items:center;justify-content:space-between;}
.db-tab-strip{position:sticky;top:57px;z-index:90;background:rgba(5,4,2,0.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(155,110,9,0.08);padding:0 8vw;display:flex;align-items:center;}
.db-tab{padding:17px 22px;font-size:7.5px;letter-spacing:0.44em;text-transform:uppercase;color:rgba(155,110,9,0.3);border-bottom:1.5px solid transparent;cursor:pointer;transition:color 0.25s,border-color 0.25s;background:none;border-left:none;border-right:none;border-top:none;font-family:'Poppins',sans-serif;}
.db-tab:hover{color:rgba(155,110,9,0.6);}
.db-tab.active{color:#c8a84e;border-bottom-color:#9b6e09;}
@media(max-width:700px){
  .db-tab-strip{padding:0 16px;}
  .db-tab{padding:14px 10px;font-size:6.5px;letter-spacing:0.28em;}
}
`

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('OVERVIEW')
  const [registration, setRegistration] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const el = document.createElement('style'); el.id='db-css'; el.textContent=CSS
    if (!document.getElementById('db-css')) document.head.appendChild(el)
    return () => document.getElementById('db-css')?.remove()
  }, [])

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    supabase.from('registrations').select('*').eq('user_id',user.id)
      .order('created_at',{ ascending:false }).limit(1)
      .then(({ data }) => { setRegistration(data?.[0]||null); setLoading(false) })
  }, [user,navigate])

  const handleLogout = async () => { await logout(); navigate('/') }

  if (!user) return null
  if (loading) return (
    <div style={{ minHeight:'100vh',background:'#050402',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <motion.div animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:1.8,repeat:Infinity }}
        style={{ fontSize:'7.5px',letterSpacing:'0.44em',textTransform:'uppercase',color:'rgba(155,110,9,0.5)',fontFamily:"'Poppins',sans-serif" }}>
        Loading your credential...
      </motion.div>
    </div>
  )

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Delegate'

  return (
    <div style={{ minHeight:'100vh',background:'#050402',fontFamily:"'Poppins',sans-serif" }}>
      {/* Topbar */}
      <div className="db-topbar">
        <div style={{ display:'flex',alignItems:'center',gap:20 }}>
          <img src="/brand-assets/mosaic-logo-nobg.png" alt="Mosaic MUN" height={22} style={{ opacity:0.85 }} />
          <span style={{ fontSize:'7px',letterSpacing:'0.42em',textTransform:'uppercase',color:'rgba(155,110,9,0.38)' }}>DELEGATE PORTAL</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:20 }}>
          <span style={{ fontSize:'9px',color:'rgba(200,180,140,0.45)',letterSpacing:'0.1em' }}>{firstName}</span>
          <button onClick={handleLogout}
            style={{ fontSize:'7.5px',letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(155,110,9,0.4)',
              background:'none',border:'none',cursor:'pointer',transition:'color 0.2s',fontFamily:"'Poppins',sans-serif" }}
            onMouseEnter={e=>e.target.style.color='rgba(155,110,9,0.85)'}
            onMouseLeave={e=>e.target.style.color='rgba(155,110,9,0.4)'}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tab strip */}
      <div className="db-tab-strip">
        {TABS.map(t => (
          <button key={t} className={`db-tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }}
          transition={{ duration:0.32,ease:[0.22,1,0.36,1] }}>
          {tab==='OVERVIEW'  && <OverviewTab  registration={registration} />}
          {tab==='MOZART'    && <MozartTab    registration={registration} />}
          {tab==='COMMITTEE' && <CommitteeTab registration={registration} />}
          {tab==='QUERIES'   && <QueriesTab   registration={registration} userId={user.id} />}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid rgba(155,110,9,0.07)',padding:'20px 8vw',display:'flex',
        alignItems:'center',justifyContent:'space-between',background:'rgba(5,4,2,0.6)',flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <img src="/brand-assets/mosaic-logo-nobg.png" height={18} style={{ opacity:0.4 }} alt="Mosaic MUN" />
          <span style={{ fontSize:'7.5px',letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(90,78,56,0.65)' }}>
            Mosaic MUN II · 11–12 July 2026
          </span>
        </div>
        <div style={{ display:'flex',gap:16,alignItems:'center' }}>
          <Link to="/" style={{ fontSize:'8px',letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(155,110,9,0.3)',textDecoration:'none' }}>Home</Link>
          <span style={{ color:'rgba(155,110,9,0.12)',fontSize:8 }}>·</span>
          <a href="https://instagram.com/mosaicmunofficial" target="_blank" rel="noopener noreferrer"
            style={{ fontSize:'8px',letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(155,110,9,0.38)',textDecoration:'none' }}>
            Instagram ↗
          </a>
        </div>
      </footer>
    </div>
  )
}
