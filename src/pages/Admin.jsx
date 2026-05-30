/**
 * Mosaic MUN II — Admin Portal
 * Protected: only admin@sameerjhamb.com can access.
 * Any other user → hard redirect to /
 * URL not referenced anywhere public.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'admin@sameerjhamb.com'

const COMMITTEES = ['UNGA','UNCSW','UNHRC','AIPPM','IPL','IP','USSIC']

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:       '#0e0c0a',
  surface:  '#161310',
  border:   'rgba(200,168,78,0.15)',
  borderHi: 'rgba(200,168,78,0.35)',
  gold:     '#c8a84e',
  goldDim:  'rgba(200,168,78,0.5)',
  text:     '#e8e4dc',
  textDim:  'rgba(232,228,220,0.55)',
  textMute: 'rgba(232,228,220,0.28)',
  green:    '#50c878',
  amber:    '#c8883a',
  red:      '#c85050',
  blue:     '#5090c8',
}

const TABS = ['COMMAND','DELEGATES','ENTRY LOG','QUERIES','MOZART','SYSTEM']

// ── Shared primitives ─────────────────────────────────────────────────────────
const Badge = ({ color, children }) => (
  <span style={{ fontSize:'7px',letterSpacing:'0.32em',textTransform:'uppercase',
    border:`1px solid ${color}44`,color,padding:'3px 8px',whiteSpace:'nowrap' }}>
    {children}
  </span>
)

const Btn = ({ onClick, variant='primary', disabled, children, style={} }) => {
  const bg = { primary:C.gold, danger:C.red, ghost:'transparent', amber:C.amber }[variant] || C.gold
  const col = variant==='ghost' ? C.goldDim : '#000'
  const brd = variant==='ghost' ? `1px solid ${C.border}` : 'none'
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:bg,color:col,border:brd,padding:'8px 18px',
      fontFamily:"'Poppins',sans-serif",fontSize:'7.5px',fontWeight:500,letterSpacing:'0.3em',
      textTransform:'uppercase',cursor:disabled?'default':'pointer',opacity:disabled?0.4:1,
      transition:'opacity 0.2s',whiteSpace:'nowrap',...style,
    }}>{children}</button>
  )
}

const StatCard = ({ label, value, sub, color=C.gold }) => (
  <div style={{ background:C.surface,border:`1px solid ${C.border}`,padding:'20px 22px',minWidth:120 }}>
    <div style={{ fontSize:'7px',letterSpacing:'0.42em',textTransform:'uppercase',color:C.textMute,marginBottom:8 }}>{label}</div>
    <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'2rem',color,lineHeight:1,marginBottom:sub?6:0 }}>{value}</div>
    {sub && <div style={{ fontSize:'10px',color:C.textDim }}>{sub}</div>}
  </div>
)

// ── COMMAND TAB ───────────────────────────────────────────────────────────────
function CommandTab({ stats, activity, onTriggerAllot, onClearMutex }) {
  return (
    <div style={{ padding:'40px 40px' }}>
      <div style={{ fontSize:'7px',letterSpacing:'0.5em',textTransform:'uppercase',color:C.goldDim,marginBottom:12 }}>COMMAND CENTRE</div>
      <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'2.2rem',letterSpacing:'-0.04em',color:C.text,marginBottom:36 }}>God Mode.</div>

      {/* Stats grid */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:36 }}>
        <StatCard label="Registered"   value={stats.total}       color={C.gold}  />
        <StatCard label="Allotted"     value={stats.allotted}    color={C.green} />
        <StatCard label="Waitlisted"   value={stats.waitlisted}  color={C.amber} />
        <StatCard label="SGS"          value={stats.sgs}         color={C.gold}  />
        <StatCard label="External"     value={stats.external}    color={C.gold}  />
        <StatCard label="Day 1 Entry"  value={stats.day1}        sub={`/ ${stats.total} delegates`} color={C.green} />
        <StatCard label="Day 2 Entry"  value={stats.day2}        sub={`/ ${stats.total} delegates`} color={C.blue}  />
        <StatCard label="Queries Open" value={stats.queriesOpen} color={stats.queriesOpen>0?C.amber:C.green} />
        <StatCard label="Mozart Msgs"  value={stats.mozartTotal} color={C.textDim} />
      </div>

      {/* Quick actions */}
      <div style={{ display:'flex',gap:12,flexWrap:'wrap',marginBottom:40 }}>
        <Btn onClick={onTriggerAllot} variant="primary">▶ Trigger Allotment Run</Btn>
        <Btn onClick={onClearMutex}   variant="ghost">⊘ Clear Mutex Lock</Btn>
        <Btn onClick={() => {
          supabase.from('registrations').select('*').then(({ data }) => {
            if (!data) return
            const csv = [
              ['reg_id','name','email','type','committee','portfolio','status','mun_count','created_at'].join(','),
              ...data.map(r => [r.registration_id,r.full_name,r.email,r.type,r.allocated_committee,r.allocated_portfolio,r.allocation_status,r.mun_count,r.created_at].join(','))
            ].join('\n')
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download='delegates.csv'; a.click()
          })
        }} variant="ghost">↓ Export All CSV</Btn>
      </div>

      {/* Recent activity */}
      <div style={{ fontSize:'7px',letterSpacing:'0.42em',textTransform:'uppercase',color:C.textMute,marginBottom:16 }}>RECENT ACTIVITY</div>
      <div style={{ border:`1px solid ${C.border}`,background:C.surface,maxHeight:340,overflowY:'auto' }}>
        {activity.length === 0 && (
          <div style={{ padding:'24px',fontSize:13,color:C.textMute,fontStyle:'italic' }}>No recent activity.</div>
        )}
        {activity.map((a,i) => (
          <div key={i} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 18px',borderBottom:`1px solid ${C.border}`,
            background:i%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
            <div style={{ fontSize:10,color:C.textMute,whiteSpace:'nowrap',flexShrink:0 }}>
              {new Date(a.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            </div>
            <div style={{ width:6,height:6,borderRadius:'50%',background:a.color,flexShrink:0 }} />
            <div style={{ fontSize:13,color:C.text }}>{a.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DELEGATES TAB ─────────────────────────────────────────────────────────────
function DelegatesTab({ onRefresh }) {
  const [delegates, setDelegates] = useState([])
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [editing,   setEditing]   = useState(null)   // { delegate, mode }
  const [vacantPorts, setVacantPorts] = useState([])
  const [newCommittee, setNewCommittee] = useState('')
  const [newPortfolio, setNewPortfolio] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('registrations').select('*').order('created_at', { ascending:false })
    setDelegates(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!newCommittee) return
    supabase.from('portfolios').select('portfolio').eq('committee',newCommittee).eq('status','vacant')
      .then(({ data }) => setVacantPorts((data||[]).map(p=>p.portfolio).sort()))
  }, [newCommittee])

  const filtered = delegates.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.full_name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.registration_id?.toLowerCase().includes(q)
    const matchFilter = filter==='all' || d.allocation_status===filter || d.type===filter
    return matchSearch && matchFilter
  })

  const deleteDelegate = async (d) => {
    if (!window.confirm(`Delete ${d.full_name}? This will release their portfolio.`)) return
    // Release portfolio first
    if (d.allocated_committee && d.allocated_portfolio) {
      await supabase.from('portfolios').update({ status:'vacant',delegate_id:null })
        .eq('committee',d.allocated_committee).eq('portfolio',d.allocated_portfolio)
    }
    await supabase.from('registrations').delete().eq('id',d.id)
    load(); onRefresh()
  }

  const savePortfolioChange = async () => {
    if (!newCommittee || !newPortfolio || !editing) return
    setSaving(true)
    try {
      const d = editing.delegate
      // Release old
      if (d.allocated_committee && d.allocated_portfolio) {
        await supabase.from('portfolios').update({ status:'vacant',delegate_id:null })
          .eq('committee',d.allocated_committee).eq('portfolio',d.allocated_portfolio)
      }
      // Claim new
      await supabase.from('portfolios').update({ status:'allotted',delegate_id:d.id })
        .eq('committee',newCommittee).eq('portfolio',newPortfolio)
      await supabase.from('registrations').update({
        allocated_committee:newCommittee, allocated_portfolio:newPortfolio,
        allocation_status:'allotted', updated_at:new Date().toISOString(),
      }).eq('id',d.id)
      setEditing(null); load(); onRefresh()
    } finally { setSaving(false) }
  }

  const resendEmail = async (d) => {
    await fetch('/api/mozart', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message:'__resend_allotment__', delegate:{ name:d.full_name,email:d.email,committee:d.allocated_committee,portfolio:d.allocated_portfolio,registration_id:d.registration_id } }) })
    alert(`Email queued for ${d.full_name}`)
  }

  const statusCol = s => ({ allotted:C.green,contested:C.amber,waitlisted:C.amber,pending:'rgba(200,168,78,0.3)' }[s]||C.textMute)

  return (
    <div style={{ padding:'32px 40px' }}>
      {/* Controls */}
      <div style={{ display:'flex',gap:12,marginBottom:24,flexWrap:'wrap',alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, reg ID..."
          style={{ flex:1,minWidth:220,background:C.surface,border:`1px solid ${C.border}`,padding:'10px 14px',
            color:C.text,fontSize:13,outline:'none',fontFamily:"'Poppins',sans-serif" }} />
        {['all','allotted','waitlisted','pending','sgs','external'].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'9px 16px',fontSize:'7.5px',letterSpacing:'0.28em',textTransform:'uppercase',
              background:filter===f?C.gold:'transparent',color:filter===f?'#000':C.goldDim,
              border:`1px solid ${filter===f?C.gold:C.border}`,cursor:'pointer',fontFamily:"'Poppins',sans-serif" }}>
            {f}
          </button>
        ))}
        <div style={{ marginLeft:'auto',fontSize:11,color:C.textMute }}>{filtered.length} / {delegates.length}</div>
      </div>

      {/* Table */}
      <div style={{ border:`1px solid ${C.border}`,background:C.surface,overflowX:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse',minWidth:900 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {['Name','Email','Type','Committee','Portfolio','Status','MUNs','Actions'].map(h => (
                <th key={h} style={{ padding:'12px 16px',textAlign:'left',fontSize:'7px',letterSpacing:'0.36em',
                  textTransform:'uppercase',color:C.textMute,fontWeight:400,whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d,i) => (
              <tr key={d.id} style={{ borderBottom:`1px solid rgba(200,168,78,0.07)`,background:i%2?'transparent':'rgba(255,255,255,0.012)' }}>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{d.full_name}</div>
                  <div style={{ fontSize:10,color:C.textMute,fontFamily:"'Courier New',monospace" }}>{d.registration_id}</div>
                </td>
                <td style={{ padding:'12px 16px',fontSize:12,color:C.textDim }}>{d.email}</td>
                <td style={{ padding:'12px 16px' }}><Badge color={d.type==='sgs'?C.blue:C.gold}>{d.type}</Badge></td>
                <td style={{ padding:'12px 16px',fontSize:12,color:C.text }}>{d.allocated_committee||'—'}</td>
                <td style={{ padding:'12px 16px',fontSize:12,color:C.text }}>{d.allocated_portfolio||'—'}</td>
                <td style={{ padding:'12px 16px' }}><Badge color={statusCol(d.allocation_status)}>{d.allocation_status||'pending'}</Badge></td>
                <td style={{ padding:'12px 16px',fontSize:12,color:C.textDim,textAlign:'center' }}>{d.mun_count||0}</td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    <button onClick={()=>{ setEditing({delegate:d}); setNewCommittee(d.allocated_committee||''); setNewPortfolio(d.allocated_portfolio||'') }}
                      style={{ fontSize:'7px',padding:'4px 10px',background:'transparent',border:`1px solid ${C.border}`,color:C.goldDim,cursor:'pointer',letterSpacing:'0.2em',textTransform:'uppercase' }}>
                      Portfolio
                    </button>
                    <button onClick={()=>resendEmail(d)}
                      style={{ fontSize:'7px',padding:'4px 10px',background:'transparent',border:`1px solid ${C.border}`,color:C.textDim,cursor:'pointer',letterSpacing:'0.2em',textTransform:'uppercase' }}>
                      Email
                    </button>
                    <button onClick={()=>deleteDelegate(d)}
                      style={{ fontSize:'7px',padding:'4px 10px',background:'transparent',border:`1px solid rgba(200,80,80,0.3)`,color:C.red,cursor:'pointer',letterSpacing:'0.2em',textTransform:'uppercase' }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit portfolio modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <motion.div initial={{ y:20,opacity:0 }} animate={{ y:0,opacity:1 }} exit={{ y:20,opacity:0 }}
              style={{ background:'#1a1610',border:`1px solid ${C.borderHi}`,padding:36,width:'100%',maxWidth:480 }}>
              <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:C.goldDim,marginBottom:12 }}>CHANGE PORTFOLIO</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:'1.3rem',color:C.text,marginBottom:24 }}>
                {editing.delegate.full_name}
              </div>

              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:'7px',letterSpacing:'0.36em',textTransform:'uppercase',color:C.textMute,marginBottom:8 }}>COMMITTEE</div>
                <select value={newCommittee} onChange={e=>{ setNewCommittee(e.target.value); setNewPortfolio('') }}
                  style={{ width:'100%',background:C.surface,border:`1px solid ${C.border}`,color:C.text,padding:'10px 12px',fontSize:14,outline:'none' }}>
                  <option value="">— Select committee</option>
                  {COMMITTEES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:'7px',letterSpacing:'0.36em',textTransform:'uppercase',color:C.textMute,marginBottom:8 }}>
                  PORTFOLIO <span style={{ color:C.textMute,fontWeight:400 }}>({vacantPorts.length} vacant)</span>
                </div>
                <select value={newPortfolio} onChange={e=>setNewPortfolio(e.target.value)}
                  style={{ width:'100%',background:C.surface,border:`1px solid ${C.border}`,color:C.text,padding:'10px 12px',fontSize:14,outline:'none' }}>
                  <option value="">— Select portfolio</option>
                  {vacantPorts.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display:'flex',gap:12 }}>
                <Btn onClick={savePortfolioChange} disabled={!newCommittee||!newPortfolio||saving}>{saving?'Saving...':'Save Change'}</Btn>
                <Btn onClick={()=>setEditing(null)} variant="ghost">Cancel</Btn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── ENTRY LOG TAB ─────────────────────────────────────────────────────────────
function EntryLogTab({ stats, onRefresh }) {
  const [day,         setDay]         = useState(1)
  const [manualId,    setManualId]    = useState('')
  const [manualNote,  setManualNote]  = useState('')
  const [entries,     setEntries]     = useState([])
  const [scanning,    setScanning]    = useState(false)
  const [lastScan,    setLastScan]    = useState(null)
  const [logging,     setLogging]     = useState(false)
  const inputRef = useRef(null)

  const loadEntries = useCallback(async () => {
    const { data } = await supabase.from('entry_log').select('*').order('created_at',{ ascending:false }).limit(100)
    setEntries(data||[])
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  const logEntry = async (registrationId, method='manual', note='') => {
    if (logging) return
    setLogging(true)
    try {
      // Look up delegate
      const { data:regs } = await supabase.from('registrations').select('full_name,allocation_status,allocated_committee,allocated_portfolio')
        .eq('registration_id', registrationId).limit(1)
      const reg = regs?.[0]

      // Check for duplicate entry today for this day
      const { data:existing } = await supabase.from('entry_log')
        .select('id').eq('registration_id', registrationId).eq('day', day).limit(1)
      const isDuplicate = existing && existing.length > 0

      await supabase.from('entry_log').insert({
        registration_id: registrationId,
        delegate_name:   reg?.full_name || 'Unknown',
        day,
        method,
        admin_note: isDuplicate ? `DUPLICATE ENTRY${note?' — '+note:''}` : (note||null),
      })

      setLastScan({
        name:      reg?.full_name || registrationId,
        committee: reg?.allocated_committee || '?',
        portfolio: reg?.allocated_portfolio || '?',
        status:    reg?.allocation_status || 'unknown',
        duplicate: isDuplicate,
        ok:        !!reg,
      })
      loadEntries(); onRefresh()
    } finally { setLogging(false) }
  }

  const submitManual = async () => {
    if (!manualId.trim()) return
    await logEntry(manualId.trim(), 'manual', manualNote)
    setManualId(''); setManualNote('')
  }

  const todayD1 = entries.filter(e=>e.day===1).length
  const todayD2 = entries.filter(e=>e.day===2).length

  return (
    <div style={{ padding:'32px 40px' }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginBottom:36 }}>

        {/* Left: scanner + manual */}
        <div>
          <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:C.goldDim,marginBottom:20 }}>CHECK-IN STATION</div>

          {/* Day toggle */}
          <div style={{ display:'flex',gap:0,marginBottom:24,border:`1px solid ${C.border}`,width:'fit-content' }}>
            {[1,2].map(d=>(
              <button key={d} onClick={()=>setDay(d)}
                style={{ padding:'10px 28px',background:day===d?C.gold:'transparent',color:day===d?'#000':C.goldDim,
                  border:'none',cursor:'pointer',fontFamily:"'Poppins',sans-serif",fontSize:'8px',letterSpacing:'0.3em',textTransform:'uppercase' }}>
                Day {d}
              </button>
            ))}
          </div>

          {/* Manual entry */}
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,padding:24,marginBottom:20 }}>
            <div style={{ fontSize:'7px',letterSpacing:'0.36em',textTransform:'uppercase',color:C.textMute,marginBottom:14 }}>MANUAL ENTRY</div>
            <input ref={inputRef} value={manualId} onChange={e=>setManualId(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submitManual()}
              placeholder="Registration ID (e.g. EXT-1234-AB5CD)"
              style={{ width:'100%',boxSizing:'border-box',background:'transparent',border:'none',
                borderBottom:`1px solid ${C.border}`,padding:'10px 0',color:C.text,fontSize:14,
                outline:'none',fontFamily:"'Courier New',monospace",marginBottom:14 }} />
            <input value={manualNote} onChange={e=>setManualNote(e.target.value)}
              placeholder="Admin note (optional)"
              style={{ width:'100%',boxSizing:'border-box',background:'transparent',border:'none',
                borderBottom:`1px solid rgba(200,168,78,0.1)`,padding:'8px 0',color:C.textDim,fontSize:13,
                outline:'none',fontFamily:"'Poppins',sans-serif",marginBottom:18 }} />
            <Btn onClick={submitManual} disabled={!manualId.trim()||logging}>
              {logging?'Logging...':'Log Entry — Day '+day}
            </Btn>
          </div>

          {/* Last scan result */}
          {lastScan && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
              style={{ border:`1px solid ${lastScan.duplicate?C.amber:lastScan.ok?C.green:C.red}`,
                background:`rgba(${lastScan.duplicate?'200,136,58':lastScan.ok?'80,200,120':'200,80,80'},0.06)`,
                padding:20 }}>
              <div style={{ fontSize:'7px',letterSpacing:'0.36em',textTransform:'uppercase',
                color:lastScan.duplicate?C.amber:lastScan.ok?C.green:C.red,marginBottom:10 }}>
                {lastScan.duplicate?'⚠ DUPLICATE SCAN':lastScan.ok?'✓ ENTRY LOGGED':'✗ DELEGATE NOT FOUND'}
              </div>
              <div style={{ fontSize:16,fontWeight:700,color:C.text,marginBottom:4 }}>{lastScan.name}</div>
              <div style={{ fontSize:12,color:C.textDim }}>
                {lastScan.committee} · {lastScan.portfolio}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: stats */}
        <div>
          <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:C.goldDim,marginBottom:20 }}>ENTRY STATISTICS</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24 }}>
            <StatCard label="Day 1 Entries" value={stats.day1} sub={`/ ${stats.total} total`} color={C.green} />
            <StatCard label="Day 2 Entries" value={stats.day2} sub={`/ ${stats.total} total`} color={C.blue}  />
            <StatCard label="Today D1" value={todayD1} color={C.green} />
            <StatCard label="Today D2" value={todayD2} color={C.blue}  />
          </div>

          {/* Progress bars */}
          {[{label:'Day 1',val:stats.day1,color:C.green},{label:'Day 2',val:stats.day2,color:C.blue}].map(({label,val,color})=>(
            <div key={label} style={{ marginBottom:16 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                <span style={{ fontSize:'7.5px',letterSpacing:'0.3em',textTransform:'uppercase',color:C.textMute }}>{label}</span>
                <span style={{ fontSize:11,color:C.textDim }}>{stats.total>0?Math.round(val/stats.total*100):0}%</span>
              </div>
              <div style={{ height:4,background:'rgba(255,255,255,0.06)',position:'relative' }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${stats.total>0?val/stats.total*100:0}%` }}
                  transition={{ duration:1,ease:[0.22,1,0.36,1] }}
                  style={{ position:'absolute',left:0,top:0,height:'100%',background:color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entry log */}
      <div style={{ fontSize:'7px',letterSpacing:'0.42em',textTransform:'uppercase',color:C.textMute,marginBottom:14 }}>ENTRY LOG</div>
      <div style={{ border:`1px solid ${C.border}`,background:C.surface,maxHeight:400,overflowY:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {['Time','Delegate','Reg ID','Day','Method','Note'].map(h=>(
                <th key={h} style={{ padding:'10px 16px',textAlign:'left',fontSize:'7px',letterSpacing:'0.3em',textTransform:'uppercase',color:C.textMute,fontWeight:400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e,i)=>(
              <tr key={e.id} style={{ borderBottom:`1px solid rgba(200,168,78,0.06)`,background:i%2?'transparent':'rgba(255,255,255,0.01)' }}>
                <td style={{ padding:'10px 16px',fontSize:11,color:C.textDim,fontFamily:"'Courier New',monospace",whiteSpace:'nowrap' }}>
                  {new Date(e.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                </td>
                <td style={{ padding:'10px 16px',fontSize:13,color:C.text }}>{e.delegate_name}</td>
                <td style={{ padding:'10px 16px',fontSize:11,color:C.textDim,fontFamily:"'Courier New',monospace" }}>{e.registration_id}</td>
                <td style={{ padding:'10px 16px' }}><Badge color={e.day===1?C.green:C.blue}>Day {e.day}</Badge></td>
                <td style={{ padding:'10px 16px' }}><Badge color={e.method==='qr'?C.gold:C.textDim}>{e.method}</Badge></td>
                <td style={{ padding:'10px 16px',fontSize:11,color:e.admin_note?.includes('DUPLICATE')?C.amber:C.textMute }}>{e.admin_note||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length===0 && <div style={{ padding:24,fontSize:13,color:C.textMute,fontStyle:'italic' }}>No entries yet.</div>}
      </div>
    </div>
  )
}

// ── QUERIES TAB ───────────────────────────────────────────────────────────────
function QueriesAdminTab({ onRefresh }) {
  const [queries,  setQueries]  = useState([])
  const [replies,  setReplies]  = useState({})
  const [saving,   setSaving]   = useState({})
  const [filter,   setFilter]   = useState('open')

  const load = useCallback(async () => {
    const { data } = await supabase.from('queries').select('*').order('created_at',{ ascending:false })
    setQueries(data||[])
  }, [])

  useEffect(() => { load() }, [load])

  const sendReply = async (q) => {
    const reply = replies[q.id]?.trim()
    if (!reply) return
    setSaving(s=>({...s,[q.id]:true}))
    await supabase.from('queries').update({ secretariat_reply:reply, status:'resolved', updated_at:new Date().toISOString() }).eq('id',q.id)
    setReplies(r=>({...r,[q.id]:''}))
    setSaving(s=>({...s,[q.id]:false}))
    load(); onRefresh()
  }

  const setStatus = async (id, status) => {
    await supabase.from('queries').update({ status, updated_at:new Date().toISOString() }).eq('id',id)
    load(); onRefresh()
  }

  const statusCol = s => ({ open:C.amber, under_review:C.gold, resolved:C.green }[s]||C.textMute)
  const filtered  = filter==='all' ? queries : queries.filter(q=>q.status===filter)

  return (
    <div style={{ padding:'32px 40px' }}>
      <div style={{ display:'flex',gap:10,marginBottom:24,flexWrap:'wrap',alignItems:'center' }}>
        {['all','open','under_review','resolved'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'8px 16px',fontSize:'7.5px',letterSpacing:'0.28em',textTransform:'uppercase',
              background:filter===f?C.gold:'transparent',color:filter===f?'#000':C.goldDim,
              border:`1px solid ${filter===f?C.gold:C.border}`,cursor:'pointer',fontFamily:"'Poppins',sans-serif" }}>
            {f.replace('_',' ')} ({queries.filter(q=>f==='all'||q.status===f).length})
          </button>
        ))}
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        {filtered.map(q=>(
          <div key={q.id} style={{ border:`1px solid ${C.border}`,background:C.surface,padding:'24px 24px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,gap:16,flexWrap:'wrap' }}>
              <div>
                <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:15,color:C.text,marginBottom:4 }}>{q.subject}</div>
                <div style={{ fontSize:11,color:C.textMute,fontFamily:"'Courier New',monospace" }}>{q.registration_id}</div>
              </div>
              <div style={{ display:'flex',gap:8,alignItems:'center',flexShrink:0 }}>
                <Badge color={statusCol(q.status)}>{q.status.replace('_',' ')}</Badge>
                {q.status!=='under_review'&&<button onClick={()=>setStatus(q.id,'under_review')}
                  style={{ fontSize:'7px',padding:'3px 8px',background:'transparent',border:`1px solid ${C.border}`,color:C.gold,cursor:'pointer',letterSpacing:'0.2em',textTransform:'uppercase' }}>
                  Mark Reviewing
                </button>}
              </div>
            </div>

            <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:14,color:'rgba(232,228,220,0.75)',lineHeight:1.75,marginBottom:16,
              paddingLeft:16,borderLeft:`2px solid rgba(200,168,78,0.2)` }}>
              {q.message}
            </div>

            {q.secretariat_reply && (
              <div style={{ background:'rgba(80,200,120,0.04)',border:`1px solid rgba(80,200,120,0.2)`,padding:'14px 16px',marginBottom:16 }}>
                <div style={{ fontSize:'7px',letterSpacing:'0.3em',textTransform:'uppercase',color:C.green,marginBottom:6 }}>YOUR REPLY</div>
                <div style={{ fontSize:13,color:C.textDim,lineHeight:1.7 }}>{q.secretariat_reply}</div>
              </div>
            )}

            {q.status!=='resolved' && (
              <div style={{ display:'flex',gap:10,alignItems:'flex-end' }}>
                <textarea value={replies[q.id]||''} onChange={e=>setReplies(r=>({...r,[q.id]:e.target.value}))}
                  placeholder="Type reply to delegate..." rows={3}
                  style={{ flex:1,background:'transparent',border:`1px solid ${C.border}`,padding:'10px 14px',
                    color:C.text,fontSize:13,resize:'none',outline:'none',lineHeight:1.65,
                    fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic' }} />
                <Btn onClick={()=>sendReply(q)} disabled={!replies[q.id]?.trim()||saving[q.id]}>
                  {saving[q.id]?'Sending...':'Send Reply'}
                </Btn>
              </div>
            )}

            <div style={{ fontSize:'9.5px',color:C.textMute,marginTop:12,letterSpacing:'0.1em' }}>
              {new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        ))}
        {filtered.length===0 && <div style={{ padding:32,textAlign:'center',fontSize:14,color:C.textMute,fontStyle:'italic' }}>No queries matching this filter.</div>}
      </div>
    </div>
  )
}

// ── MOZART LOGS TAB ───────────────────────────────────────────────────────────
function MozartLogsTab() {
  const [logs,   setLogs]   = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('mozart_logs').select('*').order('created_at',{ ascending:false }).limit(500)
      .then(({ data }) => setLogs(data||[]))
  }, [])

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.delegate_name?.toLowerCase().includes(q) || l.message?.toLowerCase().includes(q) || l.registration_id?.includes(q)
  })

  const modelColor = m => ({ 'glm-4-flash':C.blue,'gemini-flash-lite':C.gold,'local':C.textMute }[m]||C.textMute)

  return (
    <div style={{ padding:'32px 40px' }}>
      <div style={{ display:'flex',gap:14,marginBottom:24,alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search delegate, message..."
          style={{ flex:1,maxWidth:380,background:C.surface,border:`1px solid ${C.border}`,padding:'10px 14px',
            color:C.text,fontSize:13,outline:'none',fontFamily:"'Poppins',sans-serif" }} />
        <div style={{ fontSize:11,color:C.textMute }}>{filtered.length} conversations</div>
        <Btn onClick={()=>{
          const csv=[['delegate','reg_id','message','reply','model','time'].join(','),
            ...filtered.map(l=>[l.delegate_name,l.registration_id,`"${(l.message||'').replace(/"/g,"'")}"`,`"${(l.reply||'').replace(/"/g,"'")}"`,l.model_used,l.created_at].join(','))].join('\n')
          const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv]));a.download='mozart_logs.csv';a.click()
        }} variant="ghost" style={{ flexShrink:0 }}>↓ Export CSV</Btn>
      </div>

      <div style={{ border:`1px solid ${C.border}`,background:C.surface,maxHeight:'calc(100vh - 280px)',overflowY:'auto' }}>
        {filtered.map((l,i)=>(
          <div key={l.id} style={{ padding:'18px 20px',borderBottom:`1px solid rgba(200,168,78,0.06)`,background:i%2?'transparent':'rgba(255,255,255,0.012)' }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8 }}>
              <div style={{ display:'flex',gap:12,alignItems:'center' }}>
                <span style={{ fontSize:13,fontWeight:600,color:C.text }}>{l.delegate_name||'Anonymous'}</span>
                <span style={{ fontFamily:"'Courier New',monospace",fontSize:10,color:C.textMute }}>{l.registration_id||'—'}</span>
                <Badge color={modelColor(l.model_used)}>{l.model_used||'unknown'}</Badge>
              </div>
              <span style={{ fontSize:10,color:C.textMute }}>
                {new Date(l.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
              </span>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
              <div>
                <div style={{ fontSize:'6.5px',letterSpacing:'0.3em',textTransform:'uppercase',color:C.textMute,marginBottom:5 }}>DELEGATE</div>
                <div style={{ fontSize:13,color:C.textDim,lineHeight:1.6 }}>{l.message}</div>
              </div>
              <div>
                <div style={{ fontSize:'6.5px',letterSpacing:'0.3em',textTransform:'uppercase',color:C.textMute,marginBottom:5 }}>MOZART</div>
                <div style={{ fontSize:12,color:'rgba(200,168,78,0.6)',lineHeight:1.65,fontStyle:'italic',fontFamily:"'Cormorant Garamond',serif" }}>
                  {l.reply?.slice(0,280)}{l.reply?.length>280?'…':''}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div style={{ padding:32,textAlign:'center',fontSize:14,color:C.textMute,fontStyle:'italic' }}>No conversations yet.</div>}
      </div>
    </div>
  )
}

// ── SYSTEM TAB ────────────────────────────────────────────────────────────────
function SystemTab({ onTriggerAllot, onClearMutex }) {
  const [portfolioStats, setPortfolioStats] = useState([])
  const [mutexLocked,    setMutexLocked]    = useState(false)
  const [secretKeys,     setSecretKeys]     = useState([])

  useEffect(() => {
    // Portfolio stats per committee
    supabase.from('portfolios').select('committee,status').then(({ data }) => {
      if (!data) return
      const byCommittee = {}
      data.forEach(p => {
        if (!byCommittee[p.committee]) byCommittee[p.committee] = { vacant:0, allotted:0, total:0 }
        byCommittee[p.committee][p.status] = (byCommittee[p.committee][p.status]||0)+1
        byCommittee[p.committee].total++
      })
      setPortfolioStats(Object.entries(byCommittee).map(([c,v])=>({committee:c,...v})))
    })

    // Mutex status
    supabase.from('allotment_mutex').select('run_id,locked_at').eq('id',1).single()
      .then(({ data }) => setMutexLocked(!!data?.run_id))

    // Edge config keys
    supabase.from('edge_config').select('key').then(({ data }) => setSecretKeys((data||[]).map(r=>r.key)))
  }, [])

  return (
    <div style={{ padding:'32px 40px' }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:32 }}>

        {/* Allotment engine */}
        <div>
          <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:C.goldDim,marginBottom:20 }}>ALLOTMENT ENGINE</div>
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,padding:24,marginBottom:16 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
              <span style={{ fontSize:13,color:C.text }}>Mutex Lock</span>
              <Badge color={mutexLocked?C.red:C.green}>{mutexLocked?'LOCKED':'FREE'}</Badge>
            </div>
            <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              <Btn onClick={onTriggerAllot}>▶ Run Allotment</Btn>
              <Btn onClick={async()=>{ await onClearMutex(); setMutexLocked(false) }} variant="ghost">⊘ Force Release Lock</Btn>
            </div>
          </div>

          {/* Portfolio matrix */}
          <div style={{ fontSize:'7px',letterSpacing:'0.42em',textTransform:'uppercase',color:C.textMute,marginBottom:14 }}>PORTFOLIO MATRIX</div>
          <div style={{ border:`1px solid ${C.border}`,background:C.surface }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                  {['Committee','Vacant','Allotted','Total'].map(h=>(
                    <th key={h} style={{ padding:'10px 16px',textAlign:'left',fontSize:'7px',letterSpacing:'0.3em',textTransform:'uppercase',color:C.textMute,fontWeight:400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolioStats.map((p,i)=>(
                  <tr key={p.committee} style={{ borderBottom:`1px solid rgba(200,168,78,0.06)` }}>
                    <td style={{ padding:'10px 16px',fontSize:13,fontWeight:600,color:C.text }}>{p.committee}</td>
                    <td style={{ padding:'10px 16px',fontSize:13,color:C.green }}>{p.vacant||0}</td>
                    <td style={{ padding:'10px 16px',fontSize:13,color:C.amber }}>{p.allotted||0}</td>
                    <td style={{ padding:'10px 16px',fontSize:13,color:C.textDim }}>{p.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secrets */}
        <div>
          <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:C.goldDim,marginBottom:20 }}>EDGE CONFIG SECRETS</div>
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,padding:24 }}>
            {secretKeys.length===0 && <div style={{ fontSize:13,color:C.textMute,fontStyle:'italic' }}>No keys found in edge_config.</div>}
            {secretKeys.map(k=>(
              <div key={k} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid rgba(200,168,78,0.06)` }}>
                <span style={{ fontSize:12,fontFamily:"'Courier New',monospace",color:C.textDim }}>{k}</span>
                <Badge color={C.green}>SET</Badge>
              </div>
            ))}
          </div>

          <div style={{ marginTop:24,fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:C.textMute,marginBottom:14 }}>RAILWAY ENGINE</div>
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,padding:24 }}>
            <div style={{ fontSize:12,color:C.textDim,marginBottom:12 }}>
              <span style={{ color:C.textMute }}>Endpoint: </span>
              <span style={{ fontFamily:"'Courier New',monospace",fontSize:11 }}>mosaic-allot-engine-production.up.railway.app</span>
            </div>
            <Btn onClick={async()=>{
              const r = await fetch('https://mosaic-allot-engine-production.up.railway.app/health')
              const d = await r.json()
              alert(`Health: ${JSON.stringify(d)}`)
            }} variant="ghost">▶ Ping Health</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ADMIN ────────────────────────────────────────────────────────────────
const CSS = `
.adm-wrap{min-height:100vh;background:${C.bg};color:${C.text};font-family:'Poppins',sans-serif;}
.adm-sidebar{position:fixed;left:0;top:0;bottom:0;width:200px;background:${C.surface};border-right:1px solid ${C.border};display:flex;flex-direction:column;z-index:50;}
.adm-content{margin-left:200px;min-height:100vh;}
.adm-tab-btn{width:100%;padding:14px 20px;text-align:left;background:none;border:none;border-left:2px solid transparent;color:rgba(232,228,220,0.35);font-family:'Poppins',sans-serif;font-size:7.5px;letter-spacing:0.38em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;}
.adm-tab-btn:hover{color:${C.goldDim};background:rgba(200,168,78,0.04);}
.adm-tab-btn.active{color:${C.gold};border-left-color:${C.gold};background:rgba(200,168,78,0.06);}
.adm-header{padding:16px 40px;border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;background:${C.surface};}
@media(max-width:768px){
  .adm-sidebar{display:none;}
  .adm-content{margin-left:0;}
}
`

export default function Admin() {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab,   setTab]   = useState('COMMAND')
  const [stats, setStats] = useState({ total:0,allotted:0,waitlisted:0,sgs:0,external:0,day1:0,day2:0,queriesOpen:0,mozartTotal:0 })
  const [activity, setActivity] = useState([])
  const [authChecked, setAuthChecked] = useState(false)

  // Hard gate — wait for session restore, then check email
  useEffect(() => {
    if (authLoading) return  // wait for Supabase to restore session
    if (!user) { navigate('/'); return }
    if (user.email !== ADMIN_EMAIL) { navigate('/'); return }
    setAuthChecked(true)
  }, [user, authLoading, navigate])

  const loadStats = useCallback(async () => {
    const [regs, entries, queries, mozart] = await Promise.all([
      supabase.from('registrations').select('type,allocation_status'),
      supabase.from('entry_log').select('day'),
      supabase.from('queries').select('status'),
      supabase.from('mozart_logs').select('id',{ count:'exact', head:true }),
    ])

    const r = regs.data||[]
    const e = entries.data||[]
    const q = queries.data||[]

    setStats({
      total:     r.length,
      allotted:  r.filter(x=>x.allocation_status==='allotted').length,
      waitlisted:r.filter(x=>x.allocation_status==='waitlisted').length,
      sgs:       r.filter(x=>x.type==='sgs').length,
      external:  r.filter(x=>x.type==='external').length,
      day1:      e.filter(x=>x.day===1).length,
      day2:      e.filter(x=>x.day===2).length,
      queriesOpen: q.filter(x=>x.status==='open').length,
      mozartTotal: mozart.count||0,
    })
  }, [])

  const loadActivity = useCallback(async () => {
    const { data:entries } = await supabase.from('entry_log').select('*').order('created_at',{ ascending:false }).limit(8)
    const { data:queries  } = await supabase.from('queries').select('*').order('created_at',{ ascending:false }).limit(6)
    const { data:regs     } = await supabase.from('registrations').select('full_name,allocation_status,created_at').order('created_at',{ ascending:false }).limit(6)
    const acts = [
      ...(entries||[]).map(e=>({ ts:e.created_at, text:`Entry logged: ${e.delegate_name} — Day ${e.day}`, color:e.day===1?C.green:C.blue })),
      ...(queries||[]).map(q=>({ ts:q.created_at, text:`Query received: ${q.subject}`, color:C.amber })),
      ...(regs||[]).map(r=>({ ts:r.created_at, text:`Registration: ${r.full_name} (${r.allocation_status||'pending'})`, color:C.gold })),
    ].sort((a,b)=>new Date(b.ts)-new Date(a.ts)).slice(0,20)
    setActivity(acts)
  }, [])

  useEffect(() => {
    if (!authChecked) return
    loadStats(); loadActivity()
    const interval = setInterval(() => { loadStats(); loadActivity() }, 30000)
    return () => clearInterval(interval)
  }, [authChecked, loadStats, loadActivity])

  const triggerAllot = async () => {
    if (!window.confirm('Run allotment engine now? This will process all pending delegates.')) return
    const r = await fetch('https://mosaic-allot-engine-production.up.railway.app/allot', {
      method:'POST', headers:{'Content-Type':'application/json','X-Secret':'mosaic-mun-allot-2026'}, body:'{}'
    })
    const d = await r.json()
    alert(`Allotment complete:\n${JSON.stringify(d,null,2)}`)
    loadStats(); loadActivity()
  }

  const clearMutex = async () => {
    await supabase.from('allotment_mutex').update({ run_id:null, locked_at:null }).eq('id',1)
    alert('Mutex released.')
    loadStats()
  }

  // Don't render until auth confirmed
  if (!authChecked) return (
    <div style={{ minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ fontSize:'7.5px',letterSpacing:'0.44em',textTransform:'uppercase',color:'rgba(200,168,78,0.3)' }}>Verifying access...</div>
    </div>
  )

  return (
    <div className="adm-wrap">
      <style>{CSS}</style>

      {/* Sidebar */}
      <div className="adm-sidebar">
        <div style={{ padding:'24px 20px',borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'7px',letterSpacing:'0.44em',textTransform:'uppercase',color:C.goldDim,marginBottom:6 }}>MOSAIC MUN II</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'1.1rem',color:C.gold,letterSpacing:'-0.02em' }}>GOD MODE</div>
        </div>

        <nav style={{ flex:1,padding:'16px 0',overflowY:'auto' }}>
          {TABS.map(t => (
            <button key={t} className={`adm-tab-btn${tab===t?' active':''}`} onClick={()=>setTab(t)}>
              {{ COMMAND:'⌘', DELEGATES:'⊞', 'ENTRY LOG':'⊡', QUERIES:'⊘', MOZART:'◈', SYSTEM:'⊕' }[t]} {t}
            </button>
          ))}
        </nav>

        <div style={{ padding:'16px 20px',borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:10,color:C.textMute,marginBottom:8,letterSpacing:'0.1em' }}>{user?.email}</div>
          <button onClick={async()=>{ await logout(); navigate('/') }}
            style={{ fontSize:'7px',letterSpacing:'0.3em',textTransform:'uppercase',color:C.red,background:'none',border:'none',cursor:'pointer',padding:0 }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="adm-content">
        {/* Header */}
        <div className="adm-header">
          <div style={{ display:'flex',alignItems:'center',gap:16 }}>
            <div style={{ fontFamily:"'Montserrat',sans-serif",fontWeight:900,fontSize:'1rem',color:C.gold,letterSpacing:'-0.02em' }}>
              {tab}
            </div>
            <div style={{ fontSize:10,color:C.textMute }}>Mosaic MUN II Admin Portal</div>
          </div>
          <div style={{ display:'flex',gap:14,alignItems:'center' }}>
            <div style={{ fontSize:11,color:C.textMute }}>
              <span style={{ color:C.green }}>{stats.allotted}</span> allotted ·{' '}
              <span style={{ color:C.amber }}>{stats.queriesOpen}</span> open queries
            </div>
            <button onClick={()=>{ loadStats(); loadActivity() }}
              style={{ fontSize:'7px',padding:'5px 12px',background:'transparent',border:`1px solid ${C.border}`,
                color:C.goldDim,cursor:'pointer',letterSpacing:'0.2em',textTransform:'uppercase',fontFamily:"'Poppins',sans-serif" }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
            transition={{ duration:0.25,ease:[0.22,1,0.36,1] }}>
            {tab==='COMMAND'   && <CommandTab    stats={stats} activity={activity} onTriggerAllot={triggerAllot} onClearMutex={clearMutex} />}
            {tab==='DELEGATES' && <DelegatesTab  onRefresh={()=>{ loadStats(); loadActivity() }} />}
            {tab==='ENTRY LOG' && <EntryLogTab   stats={stats} onRefresh={()=>{ loadStats(); loadActivity() }} />}
            {tab==='QUERIES'   && <QueriesAdminTab onRefresh={()=>{ loadStats(); loadActivity() }} />}
            {tab==='MOZART'    && <MozartLogsTab />}
            {tab==='SYSTEM'    && <SystemTab     onTriggerAllot={triggerAllot} onClearMutex={clearMutex} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
