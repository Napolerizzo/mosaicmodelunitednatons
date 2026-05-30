import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
      <div style={{ position:'absolute',inset:0,background:'linear-gradient(to right,rgba(22,18,14,0.98) 0%,rgba(22,18,14,0.88) 44%,rgba(22,18,14,0.45) 100%)',zIndex:1 }} />
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

// ── MOZART LOCAL INTELLIGENCE ─────────────────────────────────────────────────
// Handles ~25 common intents locally. API only called when nothing matches.

const COMMITTEE_FULL_AGENDAS = {
  UNGA:  { full:'United Nations General Assembly', agenda:'Discussing the Voting Rights of States Under Foreign Military Occupation', brief:'Military occupation strips a state of territorial control. Debate focuses on whether occupied states retain full UNGA voting rights — engaging Palestinian observer status, Western Sahara, Crimea, and what statehood means when boots are on the ground.' },
  UNCSW: { full:'UN Commission on the Status of Women', agenda:'Deliberation upon Surrogate Motherhood as International Labor', brief:'Commercial surrogacy sits at the collision point of reproductive rights, labor law, migration, and bodily autonomy. Women from lower-income countries often carry children for wealthier clients abroad, raising urgent questions about informed consent, fair compensation, and exploitation.' },
  UNHRC: { full:'UN Human Rights Council', agenda:'The Right to Be Forgotten vs. The Right to Truth in Atrocity Documentation', brief:'Perpetrators of genocide and war crimes have begun invoking the right to be forgotten to scrub their names from atrocity documentation. The committee confronts cases from the Balkans, Rwanda, and Syria: when do privacy rights yield to historical accountability?' },
  AIPPM: { full:'All India Political Parties Meet', agenda:'Operation Sindoor and the Question of Parliamentary War Powers', brief:'In May 2025, India launched Operation Sindoor — precision strikes on terrorist infrastructure in Pakistan-administered Kashmir. The committee debates whether the executive branch has authority to conduct offensive military operations abroad without explicit parliamentary sanction.' },
  IPL:   { full:'Indian Premier League Committee', agenda:'Mega Auction', brief:'Delegates represent IPL franchises and bid for players within strict budget constraints, use RTM cards strategically, and build balanced squads. The committee involves real-time bidding, negotiation between franchises, and decisions under significant time pressure.' },
  IP:    { full:'International Press Corps', agenda:'Photography, Caricature, and Journalism', brief:'Reporters are assigned one of three tracks. Photojournalists cover sessions and moments. Caricaturists produce editorial commentary on the day\'s debates. Journalists write communiques and file stories under tight deadlines.' },
  USSIC: { full:'US Senate Intelligence Committee', agenda:'Discussing and Declassifying The Epstein Files', brief:'Jeffrey Epstein\'s documented connections to intelligence networks, foreign governments, and powerful political figures were never fully investigated. This crisis committee simulates a live Senate hearing as sealed documents are released in real time, witnesses appear under subpoena, and new information forces the committee to adapt.' },
}

function localIntelligence(msg, delegate) {
  const q = msg.toLowerCase().trim()
  const committee = delegate?.committee
  const portfolio = delegate?.portfolio
  const status    = delegate?.status
  const name      = delegate?.name?.split(' ')[0] || 'Delegate'
  const meta      = COMMITTEE_FULL_AGENDAS[committee]

  // ── Transfer / refund intent ─────────────────────────────────────────────────
  if (/transfer|give|swap|trade|refund|don'?t want|no longer|withdraw|exit|leave/.test(q)) {
    return { type: 'TRANSFER_WIDGET' }
  }

  // ── Raise a query intent ─────────────────────────────────────────────────────
  if (/query|complain|issue|problem|raise|contact|secr|help with|need help|support/.test(q)) {
    return { type: 'QUERY_WIDGET' }
  }

  // ── Allotment status ─────────────────────────────────────────────────────────
  if (/allot|status|committee|portfolio|assign|confirm|my (seat|position|role|place)/.test(q)) {
    if (status === 'allotted' || status === 'contested') {
      const note = status === 'contested' ? '\n\nYour allotment is flagged for manual review by the Secretariat. It will be confirmed shortly.' : ''
      return { type: 'TEXT', text: `Your portfolio has been confirmed.\n\nCommittee: **${committee}** — ${meta?.full}\nPortfolio: **${portfolio}**\nAgenda: *${meta?.agenda}*${note}\n\n— Mozart` }
    }
    return { type: 'TEXT', text: `Your allotment is currently pending. The Secretariat is processing registrations and you will receive an email confirmation as soon as your portfolio is confirmed.\n\n— Mozart` }
  }

  // ── Committee agenda ─────────────────────────────────────────────────────────
  if (/agenda|topic|discuss|debate|about (the |my )?(committee|session)|what.*committee/.test(q)) {
    if (meta) {
      return { type: 'TEXT', text: `**${committee} — ${meta.full}**\n\nAgenda: *${meta.agenda}*\n\n${meta.brief}\n\n— Mozart` }
    }
    return { type: 'TEXT', text: `Your committee assignment is pending. Once allotted, I can brief you fully on your agenda.\n\n— Mozart` }
  }

  // ── Research / preparation ───────────────────────────────────────────────────
  if (/research|prepare|study|read|what.*know|how.*prepare|position paper|what.*expect/.test(q)) {
    if (committee && portfolio) {
      return { type: 'TEXT', text: `To prepare for **${committee}** as **${portfolio}**, I recommend:\n\n1. Research ${portfolio}'s historical position on: *${meta?.agenda}*\n2. Understand key alliances — who are your natural partners in this committee?\n3. Review recent developments (last 2 years) relevant to the agenda\n4. Draft a position paper outlining your stance and proposed resolutions\n5. Prepare at least 2 working papers with actionable clauses\n\n— Mozart` }
    }
    return { type: 'TEXT', text: `Once your portfolio is confirmed, I can give you a tailored research brief. For now, familiarise yourself with the committee structure and rules of procedure.\n\n— Mozart` }
  }

  // ── Venue / dates / logistics ────────────────────────────────────────────────
  if (/venue|location|where|faridabad|school|address|how.*get|travel|report/.test(q)) {
    return { type: 'TEXT', text: `Mosaic MUN II will be held at:\n\n**Saraswati Global School, Faridabad, Haryana**\n\nDates: **11–12 July 2026** (two days)\n\nFurther logistics — reporting time, schedule, dress code — will be shared via email closer to the conference.\n\n— Mozart` }
  }

  // ── Dates ────────────────────────────────────────────────────────────────────
  if (/when|date|day|july|schedule|time|start|end|how long/.test(q)) {
    return { type: 'TEXT', text: `Mosaic MUN II runs for **two days: 11–12 July 2026** at Saraswati Global School, Faridabad.\n\nThe full schedule will be released closer to the conference.\n\n— Mozart` }
  }

  // ── Payment / fees ───────────────────────────────────────────────────────────
  if (/pay|fee|amount|rupee|cost|price|money|₹/.test(q)) {
    return { type: 'TEXT', text: `Registration fees:\n\n• SGS delegates: **₹1,600**\n• External delegates: **₹2,200**\n\nPayment is made via UPI or bank transfer during registration. Your payment screenshot is submitted as part of the registration form.\n\nFor payment issues, use the **Queries** tab or contact sameer.jhamb1719@gmail.com\n\n— Mozart` }
  }

  // ── Secretariat / contact ────────────────────────────────────────────────────
  if (/contact|email|reach|secretariat|organis|who.*run|who.*behind/.test(q)) {
    return { type: 'TEXT', text: `The Secretariat of Mosaic MUN II can be reached at:\n\n**sameer.jhamb1719@gmail.com**\n\nFor formal queries, please use the **Queries** tab in your dashboard — responses are tracked and logged there.\n\nFor urgent matters, email directly.\n\n— Mozart` }
  }

  // ── Rules of procedure ───────────────────────────────────────────────────────
  if (/rule|procedure|rop|motion|point of|speak|yield|caucus|amendment|resolution|clause/.test(q)) {
    return { type: 'TEXT', text: `Mosaic MUN II follows standard United Nations rules of procedure. Key points:\n\n• Delegates speak only when recognised by the Chair\n• Motions require a seconder\n• Amendments to working papers require 2/3 majority\n• Unmoderated caucus allows informal negotiation\n• Points of Information, Order, and Personal Privilege are recognised\n\nA full RoP document will be shared before the conference.\n\n— Mozart` }
  }

  // ── ID / registration ────────────────────────────────────────────────────────
  if (/registration id|reg id|id number|my id|reference|accredit/.test(q)) {
    return { type: 'TEXT', text: `Your registration ID is your unique conference identifier. You will need it at the accreditation desk on the day of the conference.\n\nYou can find it displayed prominently in the **Overview** tab of your dashboard.\n\n— Mozart` }
  }

  // ── Who am I / identity ──────────────────────────────────────────────────────
  if (/who are you|what are you|what is mozart|are you (an ai|a bot|gpt|gemini|claude|chatgpt)/.test(q)) {
    return { type: 'TEXT', text: `I am Mozart — the official intelligence of Mosaic Model United Nations II. I was built specifically for this conference.\n\nI am not GPT, Gemini, Claude, or any other general AI. My purpose is singular: to serve you throughout Mosaic MUN II.\n\n— Mozart` }
  }

  // ── Greeting ──────────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|sup|yo|hiya|good (morning|evening|afternoon)|howdy)[\s!?.]*$/.test(q)) {
    return { type: 'TEXT', text: `${name}.\n\nI am at your service. Ask me about your committee, portfolio, research priorities, or the conference.\n\n— Mozart` }
  }

  // ── Thanks ────────────────────────────────────────────────────────────────────
  if (/^(thanks?|thank you|thx|cheers|appreciated|great|awesome|perfect|brilliant)[\s!.]*$/.test(q)) {
    return { type: 'TEXT', text: `Of course. Is there anything else you need?\n\n— Mozart` }
  }

  // ── No match → escalate to API ────────────────────────────────────────────────
  return { type: 'API' }
}

// ── MOZART TAB ────────────────────────────────────────────────────────────────
const MOZART_SUGGESTIONS = [
  'Brief me on my committee agenda',
  'What should I research for my portfolio?',
  'Transfer my portfolio',
  'Tell me about the conference',
]

// ── Widget: Transfer Portfolio ────────────────────────────────────────────────
function TransferWidget({ registration, onClose, onSuccess }) {
  const [step,        setStep]        = useState('confirm') // confirm | details | final | done
  const [transferee,  setTransferee]  = useState({ name:'', email:'', institution:'' })
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  const doTransfer = async () => {
    if (!transferee.name.trim() || !transferee.email.trim()) { setError('Name and email are required.'); return }
    if (!/\S+@\S+\.\S+/.test(transferee.email)) { setError('Enter a valid email address.'); return }
    if (!registration?.id) { setError('Registration data missing. Please refresh and try again.'); return }

    setSubmitting(true); setError('')
    try {
      const newRegId = `TRF-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
      // Generate temp password: word + numbers + symbol
      const tempPwd = Math.random().toString(36).slice(2,8) +
                      Math.floor(1000 + Math.random() * 9000) + '!'

      // 1. Create auth account for transferee using public signUp
      //    (admin.createUser is server-side only — not available in browser SDK)
      let transfereeUserId = null
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email:    transferee.email.toLowerCase(),
          password: tempPwd,
          options:  { data: { full_name: transferee.name.trim() } },
        })
        if (!signUpErr) transfereeUserId = signUpData?.user?.id || null
        // If email already exists, that's fine — user_id stays null, they already have an account
      } catch { /* non-blocking */ }

      // 2. Insert new registration for transferee
      const { error: insertErr } = await supabase.from('registrations').insert({
        registration_id:      newRegId,
        type:                 registration.type || 'external',
        full_name:            transferee.name.trim(),
        email:                transferee.email.toLowerCase(),
        institution:          transferee.institution.trim() || 'Transferred',
        allocated_committee:  registration.allocated_committee,
        allocated_portfolio:  registration.allocated_portfolio,
        allocation_status:    'allotted',
        allotment_score:      registration.allotment_score || 0.8,
        allotment_confidence: registration.allotment_confidence || 0.9,
        is_allotment_stable:  true,
        mun_count:            0,
        committee_pref_1:     registration.allocated_committee,
        portfolio_pref_1:     registration.allocated_portfolio,
        user_id:              transfereeUserId,
      })
      if (insertErr) throw new Error(`Could not create transferee registration: ${insertErr.message}`)

      // 3. Remove allotment from original delegate (match by registration_id — safer than id)
      const { error: updateErr } = await supabase.from('registrations').update({
        allocation_status:   'transferred',
        allocated_committee: null,
        allocated_portfolio: null,
        updated_at:          new Date().toISOString(),
      }).eq('registration_id', registration.registration_id)
      if (updateErr) throw new Error(`Could not update original registration: ${updateErr.message}`)

      // 4. Send emails via Railway (non-blocking — don't fail transfer if email fails)
      fetch('https://mosaic-allot-engine-production.up.railway.app/send-transfer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Secret': 'mosaic-mun-allot-2026' },
        body: JSON.stringify({
          original: {
            name:      registration.full_name,
            email:     registration.email,
            reg_id:    registration.registration_id,
            committee: registration.allocated_committee,
            portfolio: registration.allocated_portfolio,
          },
          transferee: {
            name:      transferee.name.trim(),
            email:     transferee.email.toLowerCase(),
            reg_id:    newRegId,
            password:  tempPwd,
            committee: registration.allocated_committee,
            portfolio: registration.allocated_portfolio,
          },
        }),
      }).catch(e => console.warn('Transfer email failed (non-blocking):', e))

      setStep('done')
      onSuccess?.()
    } catch (e) {
      console.error('Transfer error:', e)
      setError(e.message || 'Transfer failed. Please raise a query to the Secretariat.')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = (placeholder, key) => (
    <input value={transferee[key]} onChange={e => setTransferee(t => ({...t, [key]: e.target.value}))}
      placeholder={placeholder}
      style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(200,168,78,0.25)', borderRadius:8, padding:'10px 14px',
        color:'#f0ece2', fontSize:14, outline:'none', fontFamily:"'Poppins',sans-serif",
        marginBottom:10 }} />
  )

  return (
    <div style={{ background:'rgba(14,11,8,0.96)', border:'1px solid rgba(200,168,78,0.3)',
      borderRadius:12, padding:'20px 20px', borderLeft:'3px solid #c8a84e', maxWidth:420 }}>
      <div style={{ fontSize:'7px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(200,168,78,0.5)',marginBottom:10 }}>
        PORTFOLIO TRANSFER
      </div>

      {step === 'confirm' && <>
        <div style={{ fontSize:14,color:'#f0ece2',lineHeight:1.7,marginBottom:16,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic' }}>
          You want to transfer your portfolio — <strong style={{fontStyle:'normal'}}>{registration?.allocated_portfolio}</strong> in <strong style={{fontStyle:'normal'}}>{registration?.allocated_committee}</strong> — to another person?<br/><br/>
          This is <strong style={{color:'#c85050',fontStyle:'normal'}}>permanent and irreversible</strong>. You will lose your seat.
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={() => setStep('details')} style={{ background:'#c8a84e',color:'#000',border:'none',padding:'9px 20px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',fontWeight:600,letterSpacing:'0.28em',textTransform:'uppercase',cursor:'pointer' }}>
            Proceed
          </button>
          <button onClick={onClose} style={{ background:'transparent',color:'rgba(200,168,78,0.5)',border:'1px solid rgba(200,168,78,0.2)',padding:'9px 16px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',letterSpacing:'0.28em',textTransform:'uppercase',cursor:'pointer' }}>
            Cancel
          </button>
        </div>
      </>}

      {step === 'details' && <>
        <div style={{ fontSize:13,color:'rgba(232,228,220,0.7)',marginBottom:14,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic' }}>
          Enter the details of the person receiving the portfolio:
        </div>
        {inp('Full name *', 'name')}
        {inp('Email address *', 'email')}
        {inp('Institution (optional)', 'institution')}
        {error && <div style={{ fontSize:11,color:'#c85050',marginBottom:8 }}>{error}</div>}
        <div style={{ display:'flex',gap:10,marginTop:4 }}>
          <button onClick={() => setStep('final')} style={{ background:'#c8a84e',color:'#000',border:'none',padding:'9px 20px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',fontWeight:600,letterSpacing:'0.28em',textTransform:'uppercase',cursor:'pointer' }}>
            Review →
          </button>
          <button onClick={() => setStep('confirm')} style={{ background:'transparent',color:'rgba(200,168,78,0.5)',border:'1px solid rgba(200,168,78,0.2)',padding:'9px 16px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',letterSpacing:'0.28em',textTransform:'uppercase',cursor:'pointer' }}>
            Back
          </button>
        </div>
      </>}

      {step === 'final' && <>
        <div style={{ fontSize:13,color:'rgba(232,228,220,0.8)',lineHeight:1.8,marginBottom:16,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic' }}>
          Confirm this transfer:<br/>
          <strong style={{color:'#c8a84e',fontStyle:'normal'}}>{transferee.name}</strong> ({transferee.email})<br/>
          will receive <strong style={{fontStyle:'normal'}}>{registration?.allocated_portfolio}</strong> in <strong style={{fontStyle:'normal'}}>{registration?.allocated_committee}</strong>.<br/><br/>
          <span style={{color:'#c85050'}}>This action cannot be undone.</span>
        </div>
        {error && <div style={{ fontSize:11,color:'#c85050',marginBottom:8 }}>{error}</div>}
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={doTransfer} disabled={submitting}
            style={{ background:'#c85050',color:'#fff',border:'none',padding:'9px 20px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',fontWeight:600,letterSpacing:'0.28em',textTransform:'uppercase',cursor:submitting?'default':'pointer',opacity:submitting?0.5:1 }}>
            {submitting ? 'Transferring...' : 'Confirm Transfer'}
          </button>
          <button onClick={() => setStep('details')} style={{ background:'transparent',color:'rgba(200,168,78,0.5)',border:'1px solid rgba(200,168,78,0.2)',padding:'9px 16px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',letterSpacing:'0.28em',textTransform:'uppercase',cursor:'pointer' }}>
            Edit
          </button>
        </div>
      </>}

      {step === 'done' && (
        <div style={{ fontSize:14,color:'rgba(80,200,120,0.9)',lineHeight:1.7,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic' }}>
          ✓ Transfer complete.<br/><br/>
          {transferee.name} has been notified at <strong style={{fontStyle:'normal'}}>{transferee.email}</strong> with their portfolio details and account credentials.<br/><br/>
          You have been notified that your portfolio has been transferred.
        </div>
      )}
    </div>
  )
}

// ── Widget: Raise Query ────────────────────────────────────────────────────────
function QueryWidget({ registration, userId, onClose }) {
  const [subject,    setSubject]    = useState('')
  const [message,    setMessage]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')

  const submit = async () => {
    if (!subject.trim() || !message.trim()) { setError('Both fields are required.'); return }
    setSubmitting(true); setError('')
    try {
      const { error: err } = await supabase.from('queries').insert({
        user_id: userId, registration_id: registration?.registration_id,
        subject: subject.trim(), message: message.trim(), status: 'open',
      })
      if (err) throw err
      setDone(true)
    } catch { setError('Failed to submit. Please try the Queries tab.') }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ background:'rgba(14,11,8,0.96)', border:'1px solid rgba(200,168,78,0.3)',
      borderRadius:12, padding:'20px 20px', borderLeft:'3px solid #c8a84e', maxWidth:420 }}>
      <div style={{ fontSize:'7px',letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(200,168,78,0.5)',marginBottom:10 }}>
        RAISE A QUERY
      </div>
      {!done ? <>
        <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject *"
          style={{ width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,168,78,0.25)',borderRadius:8,padding:'10px 14px',color:'#f0ece2',fontSize:14,outline:'none',fontFamily:"'Poppins',sans-serif",marginBottom:10 }} />
        <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3} placeholder="Describe your issue *"
          style={{ width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,168,78,0.25)',borderRadius:8,padding:'10px 14px',color:'#f0ece2',fontSize:14,outline:'none',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',resize:'none',lineHeight:1.65,marginBottom:10 }} />
        {error && <div style={{ fontSize:11,color:'#c85050',marginBottom:8 }}>{error}</div>}
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={submit} disabled={submitting} style={{ background:'#c8a84e',color:'#000',border:'none',padding:'9px 20px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',fontWeight:600,letterSpacing:'0.28em',textTransform:'uppercase',cursor:submitting?'default':'pointer',opacity:submitting?0.5:1 }}>
            {submitting?'Submitting...':'Submit to Secretariat'}
          </button>
          <button onClick={onClose} style={{ background:'transparent',color:'rgba(200,168,78,0.5)',border:'1px solid rgba(200,168,78,0.2)',padding:'9px 16px',borderRadius:6,fontFamily:"'Poppins',sans-serif",fontSize:'8px',letterSpacing:'0.28em',textTransform:'uppercase',cursor:'pointer' }}>
            Cancel
          </button>
        </div>
      </> : (
        <div style={{ fontSize:14,color:'rgba(80,200,120,0.9)',lineHeight:1.7,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic' }}>
          ✓ Query submitted to the Secretariat.<br/>You can track responses in the <strong style={{fontStyle:'normal'}}>Queries</strong> tab.
        </div>
      )}
    </div>
  )
}

// ── Render markdown-ish bold text ─────────────────────────────────────────────
function MozartText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i} style={{ fontWeight:700, fontStyle:'normal', color:'#f0ece2' }}>{p.slice(2,-2)}</strong>
        if (p.startsWith('*') && p.endsWith('*'))
          return <em key={i}>{p.slice(1,-1)}</em>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

function MozartTab({ registration }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([{
    role: 'mozart',
    text: `I am Mozart — the intelligence of Mosaic MUN II.\n\nI know your delegation, your committee's agenda, and everything about this conference. Ask me anything.\n\n— Mozart`,
    ts: Date.now(),
  }])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [displayedLast,setDisplayedLast]= useState('')
  const [showSuggest,  setShowSuggest]  = useState(true)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const messagesRef = useRef(null)

  const delegate = {
    name:            registration?.full_name,
    registration_id: registration?.registration_id,
    committee:       registration?.allocated_committee,
    portfolio:       registration?.allocated_portfolio,
    status:          registration?.allocation_status,
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, displayedLast])

  const typewrite = useCallback((text, cb) => {
    let i = 0; setDisplayedLast('')
    const tick = () => {
      i++; setDisplayedLast(text.slice(0, i))
      if (i < text.length) setTimeout(tick, 14)
      else { setDisplayedLast(''); cb(text) }
    }
    setTimeout(tick, 14)
  }, [])

  const addMozartMsg = useCallback((text) => {
    setMessages(m => [...m, { role: 'mozart', text, ts: Date.now() }])
  }, [])

  const send = async (msgOverride) => {
    const msg = (msgOverride || input).trim()
    if (!msg || loading) return
    setInput('')
    setShowSuggest(false)
    const userMsg = { role: 'user', text: msg, ts: Date.now() }
    setMessages(m => [...m, userMsg])

    // ── Local intelligence first — no API call ────────────────────────────────
    const local = localIntelligence(msg, delegate)

    if (local.type === 'TRANSFER_WIDGET') {
      if (!delegate.committee || !delegate.portfolio) {
        setMessages(m => [...m, { role: 'mozart', text: 'Your portfolio has not been allotted yet. Once you have a portfolio assigned, you can transfer it.\n\n— Mozart', ts: Date.now() }])
        return
      }
      setMessages(m => [...m, { role: 'widget', widget: 'TRANSFER', ts: Date.now() }])
      return
    }

    if (local.type === 'QUERY_WIDGET') {
      setMessages(m => [...m, { role: 'mozart', text: 'I\'ll open a query form for you. Fill in the details and the Secretariat will respond directly.\n\n— Mozart', ts: Date.now() }])
      setTimeout(() => setMessages(m => [...m, { role: 'widget', widget: 'QUERY', ts: Date.now() }]), 400)
      return
    }

    if (local.type === 'TEXT') {
      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        typewrite(local.text, full => addMozartMsg(full))
      }, 350 + Math.random() * 300) // slight delay feels natural
      return
    }

    // ── Fallback: call API ────────────────────────────────────────────────────
    setLoading(true)
    try {
      const r = await fetch('/api/mozart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, delegate }),
      })
      const data = await r.json()
      const reply = data.reply || 'I encountered an issue. Please try again.\n\n— Mozart'
      setLoading(false)
      typewrite(reply, full => addMozartMsg(full))
    } catch {
      setLoading(false)
      addMozartMsg('I encountered an issue. Please try again.\n\n— Mozart')
    }
  }

  return (
    <div style={{
      position: 'relative',
      height: 'calc(100vh - 108px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Shard background — full height, stays fixed */}
      <ShardLayer shards={SHARD_SETS.mozart} />

      {/* Top identity bar */}
      <div style={{
        position: 'relative', zIndex: 2, flexShrink: 0,
        padding: '20px clamp(16px,5vw,48px) 16px',
        borderBottom: '1px solid rgba(200,168,78,0.1)',
        background: 'rgba(22,18,14,0.82)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Mozart monogram */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,rgba(200,168,78,0.2) 0%,rgba(200,168,78,0.05) 100%)',
          border: '1px solid rgba(200,168,78,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Montserrat',sans-serif", fontWeight: 900,
          fontSize: 16, color: '#c8a84e', letterSpacing: '-0.04em',
        }}>M</div>
        <div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontWeight: 900, fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', letterSpacing: '-0.03em', color: '#f0ece2', lineHeight: 1 }}>Mozart</div>
          <div style={{ fontSize: 10, color: 'rgba(200,168,78,0.45)', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 3 }}>
            Mosaic MUN Intelligence
          </div>
        </div>
        {/* Live indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
          <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:2,repeat:Infinity }}
            style={{ width:6, height:6, borderRadius:'50%', background:'#50c878', flexShrink:0 }} />
          <span style={{ fontSize: 9, color: 'rgba(80,200,120,0.7)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Live</span>
        </div>
      </div>

      {/* Message feed */}
      <div ref={messagesRef} style={{
        position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto',
        padding: 'clamp(16px,4vw,32px) clamp(12px,5vw,48px)',
        display: 'flex', flexDirection: 'column', gap: 'clamp(14px,3vw,24px)',
        scrollBehavior: 'smooth',
        /* Custom scrollbar */
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(200,168,78,0.2) transparent',
      }}>
        {/* Suggestion chips — only shown before first user message */}
        {showSuggest && (
          <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5,delay:0.3 }}
            style={{ display:'flex', flexWrap:'wrap', gap:8, paddingBottom:8 }}>
            {MOZART_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{
                  background: 'rgba(200,168,78,0.07)', border: '1px solid rgba(200,168,78,0.22)',
                  color: 'rgba(200,168,78,0.75)', padding: '8px 14px',
                  fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic',
                  fontSize: 'clamp(12px,1.5vw,13px)', cursor: 'pointer',
                  lineHeight: 1.4, textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e=>{ e.target.style.background='rgba(200,168,78,0.12)'; e.target.style.color='#c8a84e' }}
                onMouseLeave={e=>{ e.target.style.background='rgba(200,168,78,0.07)'; e.target.style.color='rgba(200,168,78,0.75)' }}
              >{s}</button>
            ))}
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            // ── Widget messages ───────────────────────────────────────────────
            if (m.role === 'widget') {
              return (
                <motion.div key={i} initial={{ opacity:0,y:12,scale:0.98 }} animate={{ opacity:1,y:0,scale:1 }}
                  transition={{ duration:0.38,ease:[0.22,1,0.36,1] }}
                  style={{ alignSelf:'flex-start', maxWidth:'min(92%,480px)' }}>
                  {m.widget === 'TRANSFER' && (
                    <TransferWidget registration={registration}
                      onClose={() => setMessages(ms => ms.filter((_,j) => j !== i))}
                      onSuccess={() => addMozartMsg('Transfer complete. The Secretariat has been notified and both parties will receive email confirmations.\n\n— Mozart')}
                    />
                  )}
                  {m.widget === 'QUERY' && (
                    <QueryWidget registration={registration} userId={user?.id}
                      onClose={() => setMessages(ms => ms.filter((_,j) => j !== i))}
                    />
                  )}
                </motion.div>
              )
            }

            // ── Normal text messages ──────────────────────────────────────────
            return (
            <motion.div key={i}
              initial={{ opacity:0, y:12, scale:0.98 }}
              animate={{ opacity:1, y:0, scale:1 }}
              transition={{ duration:0.38, ease:[0.22,1,0.36,1] }}
              style={{
                display: 'flex',
                flexDirection: m.role==='user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 10,
                alignSelf: m.role==='user' ? 'flex-end' : 'flex-start',
                maxWidth: 'min(86%, 600px)',
              }}>

              {/* Avatar */}
              {m.role === 'mozart' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginBottom: 2,
                  background: 'linear-gradient(135deg,rgba(200,168,78,0.18) 0%,rgba(200,168,78,0.04) 100%)',
                  border: '1px solid rgba(200,168,78,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: 11, color: '#c8a84e',
                }}>M</div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:4,
                alignItems: m.role==='user' ? 'flex-end' : 'flex-start' }}>

                {m.role === 'mozart' && i > 0 && (
                  <div style={{ fontSize:'6.5px', letterSpacing:'0.36em', textTransform:'uppercase', color:'rgba(200,168,78,0.4)', paddingLeft:2 }}>
                    MOZART
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  padding: 'clamp(12px,2vw,16px) clamp(14px,2.5vw,20px)',
                  background: m.role==='user'
                    ? 'linear-gradient(135deg,rgba(200,168,78,0.18) 0%,rgba(200,168,78,0.08) 100%)'
                    : 'rgba(14,11,8,0.88)',
                  border: m.role==='user'
                    ? '1px solid rgba(200,168,78,0.4)'
                    : '1px solid rgba(200,168,78,0.13)',
                  borderLeft: m.role==='mozart' ? '2px solid rgba(200,168,78,0.55)' : undefined,
                  borderRadius: m.role==='user' ? '16px 16px 2px 16px' : '2px 16px 16px 16px',
                  fontSize: 'clamp(13px,1.6vw,15px)',
                  lineHeight: 1.82,
                  color: m.role==='user' ? '#f0ece2' : '#ddd4b8',
                  fontFamily: "'Cormorant Garamond',serif",
                  fontStyle: m.role==='mozart' ? 'italic' : 'normal',
                  whiteSpace: 'pre-wrap',
                  backdropFilter: m.role==='mozart' ? 'blur(8px)' : undefined,
                  boxShadow: m.role==='mozart' ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 12px rgba(200,168,78,0.08)',
                }}>
                  {m.role === 'mozart' ? <MozartText text={m.text} /> : m.text}
                </div>

                {/* Timestamp */}
                <div style={{ fontSize:9, color:'rgba(200,168,78,0.22)', letterSpacing:'0.1em',
                  paddingLeft: m.role==='mozart' ? 2 : 0, paddingRight: m.role==='user' ? 2 : 0 }}>
                  {new Date(m.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            </motion.div>
            )
          })}

          {/* Typewriter bubble */}
          {displayedLast && (
            <motion.div key="typewriting"
              initial={{ opacity:0, y:12, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }}
              style={{ display:'flex', flexDirection:'row', alignItems:'flex-end', gap:10,
                alignSelf:'flex-start', maxWidth:'min(86%, 600px)' }}>
              <div style={{
                width:28, height:28, borderRadius:'50%', flexShrink:0, marginBottom:2,
                background:'linear-gradient(135deg,rgba(200,168,78,0.18) 0%,rgba(200,168,78,0.04) 100%)',
                border:'1px solid rgba(200,168,78,0.3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'Montserrat',sans-serif", fontWeight:900, fontSize:11, color:'#c8a84e',
              }}>M</div>
              <div style={{
                padding: 'clamp(12px,2vw,16px) clamp(14px,2.5vw,20px)',
                background:'rgba(14,11,8,0.88)', border:'1px solid rgba(200,168,78,0.13)',
                borderLeft:'2px solid rgba(200,168,78,0.55)',
                borderRadius:'2px 16px 16px 16px',
                fontSize:'clamp(13px,1.6vw,15px)', lineHeight:1.82, color:'#ddd4b8',
                fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic',
                whiteSpace:'pre-wrap', backdropFilter:'blur(8px)',
                boxShadow:'0 4px 24px rgba(0,0,0,0.25)',
              }}>
                {displayedLast}
                <motion.span animate={{ opacity:[0,1,0] }} transition={{ duration:0.65, repeat:Infinity }}>▌</motion.span>
              </div>
            </motion.div>
          )}

          {/* Thinking indicator */}
          {loading && !displayedLast && (
            <motion.div key="thinking" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', flexDirection:'row', alignItems:'flex-end', gap:10, alignSelf:'flex-start' }}>
              <div style={{
                width:28, height:28, borderRadius:'50%',
                background:'linear-gradient(135deg,rgba(200,168,78,0.18) 0%,rgba(200,168,78,0.04) 100%)',
                border:'1px solid rgba(200,168,78,0.3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'Montserrat',sans-serif", fontWeight:900, fontSize:11, color:'#c8a84e',
              }}>M</div>
              <div style={{
                padding:'14px 20px',
                background:'rgba(14,11,8,0.88)', border:'1px solid rgba(200,168,78,0.13)',
                borderLeft:'2px solid rgba(200,168,78,0.55)', borderRadius:'2px 16px 16px 16px',
                display:'flex', gap:6, alignItems:'center', backdropFilter:'blur(8px)',
              }}>
                {[0,1,2].map(i => (
                  <motion.div key={i}
                    animate={{ opacity:[0.2,1,0.2], y:[0,-4,0] }}
                    transition={{ duration:0.9, delay:i*0.2, repeat:Infinity }}
                    style={{ width:7, height:7, borderRadius:'50%', background:'#c8a84e' }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input bar — sticky at bottom, safe area aware */}
      <div style={{
        position: 'relative', zIndex: 2, flexShrink: 0,
        borderTop: '1px solid rgba(200,168,78,0.1)',
        background: 'rgba(18,14,10,0.95)',
        backdropFilter: 'blur(20px)',
        padding: 'clamp(12px,2vw,18px) clamp(12px,5vw,48px)',
        paddingBottom: 'max(clamp(12px,2vw,18px), env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', maxWidth:760 }}>
          <div style={{ flex:1, position:'relative' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask Mozart anything…"
              rows={1}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(200,168,78,0.2)',
                borderRadius: 12,
                padding: 'clamp(10px,1.5vw,13px) clamp(12px,2vw,16px)',
                paddingRight: 48,
                fontFamily: "'Cormorant Garamond',serif",
                fontStyle: 'italic',
                fontSize: 'clamp(14px,1.6vw,16px)',
                color: '#f0ece2',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.55,
                maxHeight: 120,
                overflowY: 'auto',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor='rgba(200,168,78,0.5)'}
              onBlur={e => e.target.style.borderColor='rgba(200,168,78,0.2)'}
            />
          </div>

          {/* Send button */}
          <motion.button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            whileTap={{ scale: 0.93 }}
            style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !loading
                ? 'linear-gradient(135deg,#c8a84e 0%,#9b6e09 100%)'
                : 'rgba(200,168,78,0.1)',
              border: '1px solid rgba(200,168,78,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              transition: 'all 0.2s',
              fontSize: 18,
              color: input.trim() && !loading ? '#000' : 'rgba(200,168,78,0.3)',
            }}
          >
            ↑
          </motion.button>
        </div>

        <div style={{ fontSize:9, color:'rgba(200,168,78,0.2)', marginTop:7, letterSpacing:'0.1em' }}>
          ↵ Enter to send &nbsp;·&nbsp; Shift+Enter for new line
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
.db-topbar{position:sticky;top:0;z-index:100;background:rgba(22,18,14,0.97);backdrop-filter:blur(14px);border-bottom:1px solid rgba(200,168,78,0.12);padding:14px 8vw;display:flex;align-items:center;justify-content:space-between;}
.db-tab-strip{position:sticky;top:57px;z-index:90;background:rgba(20,16,12,0.97);backdrop-filter:blur(10px);border-bottom:1px solid rgba(200,168,78,0.1);padding:0 8vw;display:flex;align-items:center;}
.db-tab{padding:17px 22px;font-size:7.5px;letter-spacing:0.44em;text-transform:uppercase;color:rgba(200,168,78,0.4);border-bottom:1.5px solid transparent;cursor:pointer;transition:color 0.25s,border-color 0.25s;background:none;border-left:none;border-right:none;border-top:none;font-family:'Poppins',sans-serif;}
.db-tab:hover{color:rgba(200,168,78,0.75);}
.db-tab.active{color:#c8a84e;border-bottom-color:#c8a84e;}
@media(max-width:700px){
  .db-tab-strip{padding:0 16px;}
  .db-tab{padding:14px 10px;font-size:6.5px;letter-spacing:0.28em;}
}
`

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('OVERVIEW')
  const [registration, setRegistration] = useState(null)
  const [dataLoading, setDataLoading]   = useState(false)

  useEffect(() => {
    const el = document.createElement('style'); el.id='db-css'; el.textContent=CSS
    if (!document.getElementById('db-css')) document.head.appendChild(el)
    return () => document.getElementById('db-css')?.remove()
  }, [])

  // Fetch registration — try user_id first, fall back to email match
  const fetchRegistration = useCallback(async (u) => {
    setDataLoading(true)
    try {
      // Primary: match by user_id
      let { data } = await supabase.from('registrations').select('*')
        .eq('user_id', u.id).order('created_at', { ascending: false }).limit(1)

      // Fallback: match by email (handles registrations made before account creation)
      if (!data?.length && u.email) {
        const res = await supabase.from('registrations').select('*')
          .ilike('email', u.email).order('created_at', { ascending: false }).limit(1)
        data = res.data

        // Opportunistically link this registration to the user account
        if (data?.length && !data[0].user_id) {
          await supabase.from('registrations').update({ user_id: u.id })
            .eq('id', data[0].id)
        }
      }
      setRegistration(data?.[0] || null)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    fetchRegistration(user)
  }, [user, authLoading, navigate, fetchRegistration])

  // Real-time: re-fetch when registration row changes (allotment updates)
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('registration-updates')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'registrations',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setRegistration(payload.new)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const handleLogout = async () => { await logout(); navigate('/') }

  // Show loader while Supabase restores session OR while fetching data
  if (authLoading || dataLoading) return (
    <div style={{ minHeight:'100vh',background:'#1a1612',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <motion.div animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:1.8,repeat:Infinity }}
        style={{ fontSize:'7.5px',letterSpacing:'0.44em',textTransform:'uppercase',color:'rgba(200,168,78,0.5)',fontFamily:"'Poppins',sans-serif" }}>
        Loading your credential...
      </motion.div>
    </div>
  )

  // Session fully restored and no user → navigate already fired above, show nothing
  if (!user) return null

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Delegate'

  return (
    <div style={{ minHeight:'100vh',background:'#1a1612',fontFamily:"'Poppins',sans-serif" }}>
      {/* Topbar */}
      <div className="db-topbar">
        <div style={{ display:'flex',alignItems:'center',gap:20 }}>
          <img src="/brand-assets/mosaic-logo-nobg.png" alt="Mosaic MUN" height={22} style={{ opacity:0.9 }} />
          <span style={{ fontSize:'7px',letterSpacing:'0.42em',textTransform:'uppercase',color:'rgba(200,168,78,0.5)' }}>DELEGATE PORTAL</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:20 }}>
          <span style={{ fontSize:'11px',color:'rgba(232,228,220,0.7)',letterSpacing:'0.05em' }}>{firstName}</span>
          <button onClick={handleLogout}
            style={{ fontSize:'7.5px',letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(200,168,78,0.55)',
              background:'none',border:'none',cursor:'pointer',transition:'color 0.2s',fontFamily:"'Poppins',sans-serif" }}
            onMouseEnter={e=>e.target.style.color='rgba(200,168,78,0.95)'}
            onMouseLeave={e=>e.target.style.color='rgba(200,168,78,0.55)'}>
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
      <footer style={{ borderTop:'1px solid rgba(200,168,78,0.1)',padding:'20px 8vw',display:'flex',
        alignItems:'center',justifyContent:'space-between',background:'rgba(16,12,8,0.8)',flexWrap:'wrap',gap:12 }}>
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
