import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ref, onValue, set } from 'firebase/database'
import { db } from './firebase.js'
import { PALETTE, BASE_CSS, MON_RU, MON_SHORT, DOW, daysBetween, dayKey, toInput, fromInput } from './shared.js'

const DB_PATH = calId => `calendars/${calId}`

async function fbSet(calId, data) {
  try { await set(ref(db, DB_PATH(calId)), data); return true }
  catch (e) { console.error(e); return false }
}

// ─── CSS ──────────────────────────────────────────────────────────────────
const css = BASE_CSS + `
  body{padding:0}
  .cal-wrap{max-width:980px;margin:0 auto;padding:24px 20px 60px}
  .topbar{display:flex;align-items:center;gap:10px;margin-bottom:24px;flex-wrap:wrap}
  .back-btn{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s;font-family:'DM Sans',sans-serif}
  .back-btn:hover{background:var(--surface2);color:var(--ink)}
  .cal-name{font-family:'Syne',sans-serif;font-size:clamp(16px,3vw,22px);font-weight:800;flex:1;letter-spacing:-.3px}
  .hdr-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .user-pill{display:flex;align-items:center;gap:7px;background:var(--surface);border:1.5px solid var(--border);border-radius:100px;padding:5px 12px 5px 7px;font-size:12px;font-weight:500;box-shadow:var(--shadow);cursor:pointer;transition:border-color .18s}
  .user-pill:hover{border-color:var(--accent)}
  .user-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
  .sync-row{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}
  .sync-dot{width:7px;height:7px;border-radius:50%;background:var(--green)}
  .sync-dot.live{animation:pulse 2s infinite}
  .sync-dot.saving{background:var(--accent)}
  .sync-dot.error{background:#ef4444}

  .layout{display:flex;gap:18px;align-items:flex-start}
  .sidebar{width:224px;flex-shrink:0;display:flex;flex-direction:column;gap:13px}
  .main-col{flex:1;min-width:0}
  .period-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
  .period-field{display:flex;flex-direction:column;gap:4px;flex:1}
  .period-field label{font-size:11px;color:var(--muted);font-weight:500}
  input[type=month]{background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;color:var(--ink);font-family:'DM Sans',sans-serif;font-size:13px;padding:7px 10px;outline:none;width:100%;transition:border-color .18s}
  input[type=month]:focus{border-color:var(--accent)}

  .p-list{display:flex;flex-direction:column;gap:5px}
  .p-item{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:9px;border:1.5px solid transparent;cursor:pointer;transition:background .12s,border-color .12s}
  .p-item:hover{background:var(--surface2)}
  .p-item.active{background:color-mix(in srgb,var(--pc) 10%,var(--surface));border-color:var(--pc)}
  .p-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
  .p-name{font-size:13px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .p-cnt{font-size:11px;color:var(--muted);flex-shrink:0}
  .you-badge{font-size:9px;font-weight:700;letter-spacing:.05em;background:var(--accent-light);color:var(--accent);border-radius:4px;padding:1px 5px;flex-shrink:0}
  .master-badge{font-size:9px;font-weight:700;letter-spacing:.04em;background:#f0f7ff;color:#3b82f6;border-radius:4px;padding:1px 5px;flex-shrink:0}
  .p-del{background:none;border:none;cursor:pointer;font-size:15px;color:var(--muted);padding:0 2px;opacity:0;transition:opacity .12s;line-height:1}
  .p-item:hover .p-del{opacity:1}
  .p-del:hover{color:#ef4444}

  .hint-box{background:var(--accent-light);border:1.5px solid #f4c4a8;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.5;color:#8b3a18}
  .hint-box strong{color:var(--accent)}
  .master-info{background:#f0f7ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:9px 12px;font-size:11px;line-height:1.5;color:#1e40af}

  .fw-list{display:flex;flex-direction:column;gap:5px}
  .fw-item{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:9px;background:var(--green-bg);border:1px solid var(--green-border);font-size:12px;font-weight:600;color:var(--green)}
  .no-msg{font-size:12px;color:var(--muted);text-align:center;padding:10px 0}

  .share-row{display:flex;gap:8px;align-items:center}
  .share-url{flex:1;font-size:11px;color:var(--muted);background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;cursor:pointer;transition:border-color .15s}
  .share-url:hover{border-color:var(--accent)}

  .cal{display:flex;flex-direction:column;gap:24px}
  .m-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .m-title::after{content:'';flex:1;height:1px;background:var(--border)}
  .dow-row{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px}
  .dow-lbl{text-align:center;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:2px 0}
  .dow-lbl.we{color:var(--accent)}
  .day-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
  .dc{position:relative;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:9px;font-size:12px;font-weight:500;cursor:pointer;background:var(--surface2);border:1.5px solid transparent;transition:background .1s,border-color .1s,transform .08s;min-height:34px;user-select:none;overflow:visible}
  .dc:hover{background:#ede7df;transform:scale(1.06);z-index:2}
  .dc.empty{background:transparent;pointer-events:none}
  .dc.we .dnum{color:var(--accent)}
  .dc.today{border-color:var(--accent)!important;background:var(--accent-light)!important}
  .dc.all-free{background:var(--green-bg)!important;border-color:var(--green-border)!important}
  .dc.all-free .dnum{color:var(--green)!important;font-weight:700}
  .dnum{font-size:12px;line-height:1;z-index:1}
  .dot-row{display:flex;gap:2px;margin-top:2px;z-index:1;flex-wrap:wrap;justify-content:center;max-width:100%}
  .pdot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
  .has-note::after{content:'';position:absolute;top:3px;right:3px;width:5px;height:5px;border-radius:50%;background:var(--accent);z-index:2}

  .dc:hover .tip{display:block}
  .tip{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;font-size:10px;padding:6px 10px;border-radius:7px;white-space:pre-line;z-index:200;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.2);line-height:1.6;max-width:200px;text-align:left}
  .tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--ink)}

  .join-banner{background:var(--accent-light);border:1.5px solid #f4c4a8;border-radius:12px;padding:14px 16px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .join-banner p{font-size:13px;color:#8b3a18;line-height:1.4}

  .inline-login{background:var(--surface);border:1.5px solid var(--border);border-radius:20px;padding:28px;max-width:400px;margin:60px auto;box-shadow:var(--shadow);animation:fadeUp .3s ease both}
  .inline-login h2{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:5px}
  .inline-login>p{font-size:13px;color:var(--muted);margin-bottom:20px}

  @media(max-width:680px){.layout{flex-direction:column}.sidebar{width:100%}}
`

// ─── Day modal ────────────────────────────────────────────────────────────
function DayModal({ day, personColor, personName, existingNote, isMasterDay, onSave, onRemove, onClose }) {
  const [note, setNote] = useState(existingNote || '')
  const r = useRef(null)
  useEffect(() => r.current?.focus(), [])
  const { y, m, d } = day
  const isEdit = existingNote !== undefined
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title" style={{ color: personColor }}>
          {isEdit ? '✏️ Изменить день' : '🚫 Отметить занятость'}
        </div>
        <div className="modal-sub">
          {personName} · {d} {MON_SHORT[m]} {y}
          {isMasterDay && <span style={{marginLeft:6,fontSize:10,background:'#f0f7ff',color:'#3b82f6',borderRadius:4,padding:'1px 6px',fontWeight:600}}>из твоего календаря</span>}
        </div>
        {isMasterDay && (
          <div style={{background:'#f0f7ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#1e40af',marginBottom:12,lineHeight:1.5}}>
            Этот день занят в твоём личном календаре. Изменить можно на дашборде в разделе «Мои занятые дни».
          </div>
        )}
        {!isMasterDay && <>
          <textarea ref={r} className="inp"
            placeholder="Причина (необязательно): командировка, свадьба…"
            value={note} onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave(note) }}
            maxLength={200}/>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:4,textAlign:'right'}}>{note.length}/200</div>
        </>}
        <div className="modal-actions">
          {isEdit && !isMasterDay && <button className="btn btn-danger" onClick={onRemove}>Снять</button>}
          <button className="btn btn-ghost" onClick={onClose}>{isMasterDay ? 'Закрыть' : 'Отмена'}</button>
          {!isMasterDay && (
            <button className="btn" onClick={() => onSave(note)}>{isEdit ? 'Сохранить' : 'Отметить'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CalendarPage ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { calId } = useParams()
  const navigate  = useNavigate()

  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cal_me')) } catch { return null }
  })
  const [loginName, setLoginName]   = useState('')
  const [loginColor, setLoginColor] = useState(PALETTE[0])

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const [activePerson, setActive] = useState(null)
  const [copied, setCopied]   = useState(false)
  const [modal, setModal]     = useState(null)

  // Master busy maps: { [personName]: { [dayKey]: true|string } }
  const [masterBusy, setMasterBusy] = useState({})

  // Firebase: calendar data
  useEffect(() => {
    const unsub = onValue(ref(db, DB_PATH(calId)), snap => {
      if (snap.exists()) setData(snap.val())
      else setData(null)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [calId])

  // Firebase: subscribe to user_busy for all people in this calendar
  useEffect(() => {
    if (!data?.people) return
    const names = Object.keys(data.people)
    const unsubs = names.map(name =>
      onValue(ref(db, `user_busy/${name}`), snap => {
        setMasterBusy(prev => ({ ...prev, [name]: snap.exists() ? snap.val() : {} }))
      })
    )
    return () => unsubs.forEach(u => u())
  }, [JSON.stringify(Object.keys(data?.people || {}))])

  useEffect(() => { if (me && !activePerson) setActive(me.name) }, [me])

  const saveData = useCallback(async nd => {
    setSaving(true); setSaveErr(false)
    const ok = await fbSet(calId, nd)
    setSaving(false); if (!ok) setSaveErr(true)
    return ok
  }, [calId])

  const joinCalendar = async (name, color) => {
    if (!name.trim() || !data) return
    const n   = name.trim()
    const col = data.people?.[n]?.color || color
    const user = { name: n, color: col }
    localStorage.setItem('cal_me', JSON.stringify(user))
    setMe(user); setActive(n)
    try {
      await set(ref(db, `cal_index/${calId}`), { name: data.name, createdBy: data.createdBy, createdAt: data.createdAt })
    } catch {}
    if (!data.people?.[n]) {
      await saveData({ ...data, people: { ...data.people, [n]: { color: col, busy: {} } } })
    }
  }

  const handleDayClick = (y, m, d) => { if (!me) return; setModal({ y, m, d }) }

  const saveBusyDay = useCallback(async (y, m, d, note) => {
    if (!me || !data) return
    const k  = dayKey(y, m, d)
    const pd = data.people?.[me.name] || { color: me.color, busy: {} }
    const nb = { ...(pd.busy || {}), [k]: note.trim() || true }
    await saveData({ ...data, people: { ...data.people, [me.name]: { ...pd, busy: nb } } })
    setModal(null)
  }, [me, data, saveData])

  const removeBusyDay = useCallback(async (y, m, d) => {
    if (!me || !data) return
    const k  = dayKey(y, m, d)
    const pd = data.people?.[me.name] || { color: me.color, busy: {} }
    const nb = { ...(pd.busy || {}) }; delete nb[k]
    await saveData({ ...data, people: { ...data.people, [me.name]: { ...pd, busy: nb } } })
    setModal(null)
  }, [me, data, saveData])

  const updatePeriod = useCallback(async (field, val) => {
    if (!data) return
    await saveData({ ...data, [field]: val })
  }, [data, saveData])

  const removePerson = useCallback(async name => {
    if (!data) return
    const np = { ...data.people }; delete np[name]
    await saveData({ ...data, people: np })
    if (activePerson === name) setActive(me?.name || null)
  }, [data, saveData, activePerson, me])

  // ── Derived ──────────────────────────────────────────────────────────

  // Get busy entry: calendar-specific first, then master fallback
  // Returns: undefined (free) | true | string (note)
  function getBusyEntry(pName, y, m, d) {
    const k = dayKey(y, m, d)
    const calVal    = data?.people?.[pName]?.busy?.[k]
    const masterVal = masterBusy?.[pName]?.[k]
    if (calVal    !== undefined && calVal    !== null) return calVal
    if (masterVal !== undefined && masterVal !== null) return masterVal
    return undefined
  }

  function isMasterEntry(pName, y, m, d) {
    const k = dayKey(y, m, d)
    const calVal = data?.people?.[pName]?.busy?.[k]
    return (calVal === undefined || calVal === null) && masterBusy?.[pName]?.[k] !== undefined
  }

  function isBusy(pName, y, m, d)    { return getBusyEntry(pName, y, m, d) !== undefined }
  function getBusyPeople(y, m, d)    { return people.filter(p => isBusy(p.name, y, m, d)) }

  const people = data ? Object.entries(data.people || {}).map(([name, p]) => ({ name, ...p })) : []

  function getMonths() {
    if (!data?.startDate || !data?.endDate) return []
    const s = fromInput(data.startDate), e = fromInput(data.endDate)
    if (s.y > e.y || (s.y === e.y && s.m > e.m)) return []
    return daysBetween(s.y, s.m, e.y, e.m).slice(0, 24)
  }

  function getFreeWindows() {
    if (people.length < 2) return []
    const months = getMonths(); const wins = []; let cur = null
    for (const { y, m, dim } of months) {
      for (let d = 1; d <= dim; d++) {
        if (getBusyPeople(y, m, d).length === 0) { if (!cur) cur = { y, m, d } }
        else { if (cur) { wins.push({ s: cur, e: { y, m, d: d - 1 } }); cur = null } }
      }
    }
    if (cur && months.length > 0) { const l = months.at(-1); wins.push({ s: cur, e: { y: l.y, m: l.m, d: l.dim } }) }
    return wins
  }

  const fmtRange = w => {
    const s = `${w.s.d} ${MON_SHORT[w.s.m]}`, e = `${w.e.d} ${MON_SHORT[w.e.m]}`
    return (w.s.m === w.e.m && w.s.d === w.e.d) ? s : `${s} — ${e}`
  }

  const copyUrl = () => navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })

  const todayY = new Date().getFullYear(), todayM = new Date().getMonth(), todayD = new Date().getDate()
  const modalEntry   = modal && me ? getBusyEntry(me.name, modal.y, modal.m, modal.d) : undefined
  const modalIsMaster = modal && me ? isMasterEntry(me.name, modal.y, modal.m, modal.d) : false

  // ── Screens ──────────────────────────────────────────────────────────
  if (loading) return (
    <><style>{css}</style>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',fontFamily:'DM Sans,sans-serif',color:'#9a8f84',flexDirection:'column',gap:12}}>
      <div style={{fontSize:28}}>📅</div>Загружаем…
    </div></>
  )

  if (!data) return (
    <><style>{css}</style>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:16,fontFamily:'DM Sans,sans-serif'}}>
      <div style={{fontSize:40}}>😕</div>
      <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20}}>Календарь не найден</div>
      <p style={{color:'#9a8f84',fontSize:13}}>Ссылка устарела или календарь был удалён</p>
      <button className="btn" onClick={() => navigate('/')}>← На главную</button>
    </div></>
  )

  if (!me) return (
    <><style>{css}</style>
    <div style={{padding:'20px',maxWidth:480,margin:'0 auto'}}>
      <button className="back-btn" onClick={() => navigate('/')}>← Все календари</button>
      <div className="inline-login">
        <h2>Привет! 👋</h2>
        <p>Тебя пригласили в «{data.name}». Введи имя чтобы войти.</p>
        <div style={{marginBottom:12}}>
          <input className="inp" placeholder="Твоё имя" value={loginName}
            onChange={e => setLoginName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinCalendar(loginName, loginColor)}
            autoFocus maxLength={20}/>
        </div>
        <div className="color-pick" style={{marginBottom:16}}>
          {PALETTE.map(c => (
            <div key={c} className={'cswatch' + (c === loginColor ? ' sel' : '')}
              style={{background:c,'--sw-color':c}} onClick={() => setLoginColor(c)}/>
          ))}
        </div>
        <button className="btn" style={{width:'100%'}}
          onClick={() => joinCalendar(loginName, loginColor)} disabled={!loginName.trim()}>
          Войти →
        </button>
        {people.length > 0 && (
          <div style={{marginTop:16}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Уже есть — выбери себя:</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {people.map(p => (
                <div key={p.name} onClick={() => joinCalendar(p.name, p.color)}
                  style={{display:'flex',alignItems:'center',gap:6,background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:100,padding:'5px 12px',fontSize:12,fontWeight:500,cursor:'pointer'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:p.color}}/>{p.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div></>
  )

  const iAmMember  = data?.people?.[me.name]
  const freeWindows = getFreeWindows()
  const months     = getMonths()

  // Count how many of my master-busy days fall in this calendar's period
  const myMasterInRange = months.reduce((acc, { y, m, dim }) => {
    for (let d = 1; d <= dim; d++) {
      if (isMasterEntry(me.name, y, m, d)) acc++
    }
    return acc
  }, 0)

  return (
    <><style>{css}</style>
    <div className="cal-wrap">

      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/')}>← Все календари</button>
        <div className="cal-name">{data.name}</div>
        <div className="hdr-right">
          <div className="sync-row">
            <div className={'sync-dot' + (saving ? ' saving' : saveErr ? ' error' : ' live')}/>
            {saving ? 'Сохраняем…' : saveErr ? 'Ошибка!' : 'Онлайн'}
          </div>
          <div className="user-pill" onClick={() => { localStorage.removeItem('cal_me'); setMe(null) }}>
            <div className="user-dot" style={{background:me.color}}/>{me.name}
            <span style={{fontSize:10,color:'#9a8f84',marginLeft:2}}>↩</span>
          </div>
        </div>
      </div>

      {!iAmMember && (
        <div className="join-banner">
          <p>Ты ещё не добавлена в этот календарь.<br/>Нажми кнопку чтобы начать отмечать свои дни.</p>
          <button className="btn btn-sm" onClick={() => joinCalendar(me.name, me.color)}>Присоединиться</button>
        </div>
      )}

      <div className="layout">
        <div className="sidebar">

          <div className="card">
            <div className="card-title">Период</div>
            <div className="period-row">
              <div className="period-field">
                <label>С</label>
                <input type="month" value={data.startDate || ''} onChange={e => updatePeriod('startDate', e.target.value)}/>
              </div>
              <div className="period-field">
                <label>По</label>
                <input type="month" value={data.endDate || ''} onChange={e => updatePeriod('endDate', e.target.value)}/>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Участники</div>
            {people.length === 0
              ? <div className="no-msg">Пока никого нет</div>
              : <div className="p-list">
                  {people.map(p => {
                    const calBusy    = Object.keys(p.busy || {}).length
                    const masterDays = Object.keys(masterBusy?.[p.name] || {}).length
                    const total      = new Set([...Object.keys(p.busy || {}), ...Object.keys(masterBusy?.[p.name] || {})]).size
                    return (
                      <div key={p.name} className={'p-item' + (activePerson === p.name ? ' active' : '')}
                        style={{'--pc': p.color}}
                        onClick={() => setActive(prev => prev === p.name ? null : p.name)}>
                        <div className="p-dot" style={{background:p.color}}/>
                        <div className="p-name">{p.name}</div>
                        {p.name === me.name && <span className="you-badge">Ты</span>}
                        {masterDays > 0 && p.name === me.name && <span className="master-badge">+{masterDays}</span>}
                        <div className="p-cnt">{total > 0 ? `${total} дн.` : ''}</div>
                        {p.name !== me.name && data.createdBy === me.name && (
                          <button className="p-del" onClick={e => { e.stopPropagation(); removePerson(p.name) }}>×</button>
                        )}
                      </div>
                    )
                  })}
                </div>
            }
          </div>

          {myMasterInRange > 0 && (
            <div className="master-info">
              📌 {myMasterInRange} {myMasterInRange === 1 ? 'день' : myMasterInRange < 5 ? 'дня' : 'дней'} подтянуто из твоего личного календаря. Редактировать — на дашборде.
            </div>
          )}

          <div className="hint-box">
            {activePerson
              ? activePerson === me.name
                ? <>Кликай по дням — можно указать причину занятости</>
                : <>Просмотр: <strong>{activePerson}</strong>. Переключись на себя чтобы редактировать</>
              : <>Выбери участника чтобы выделить его дни</>
            }
          </div>

          <div className="card">
            <div className="card-title">🟢 Все свободны</div>
            {freeWindows.length === 0
              ? <div className="no-msg">{people.length < 2 ? 'Нужно минимум 2 участника' : 'Нет общих свободных дней 😢'}</div>
              : <div className="fw-list">
                  {freeWindows.slice(0, 8).map((w, i) => (
                    <div key={i} className="fw-item">🗓 {fmtRange(w)}</div>
                  ))}
                  {freeWindows.length > 8 && <div className="no-msg">+{freeWindows.length - 8} ещё…</div>}
                </div>
            }
          </div>

          <div className="card">
            <div className="card-title">Поделиться</div>
            <div className="share-row">
              <div className="share-url" onClick={copyUrl}>{window.location.href}</div>
              <button className="btn btn-sm" onClick={copyUrl}>{copied ? '✓' : 'Копировать'}</button>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:8,lineHeight:1.5}}>
              Отправь ссылку — откроется именно этот календарь
            </div>
          </div>

        </div>

        <div className="main-col">
          <div className="card">
            {months.length === 0
              ? <div className="no-msg" style={{padding:40}}>Выбери период слева</div>
              : <div className="cal">
                  {months.map(({ y, m, dim }) => {
                    const fd = (new Date(y, m, 1).getDay() + 6) % 7
                    return (
                      <div key={`${y}-${m}`}>
                        <div className="m-title">{MON_RU[m]} {y}</div>
                        <div className="dow-row">
                          {DOW.map((d, i) => <div key={i} className={'dow-lbl' + (i >= 5 ? ' we' : '')}>{d}</div>)}
                        </div>
                        <div className="day-grid">
                          {Array(fd).fill(null).map((_, i) => <div key={'e' + i} className="dc empty"/>)}
                          {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
                            const bp         = getBusyPeople(y, m, d)
                            const allFree    = people.length >= 2 && bp.length === 0
                            const isToday    = y === todayY && m === todayM && d === todayD
                            const isWe       = ((new Date(y, m, d).getDay() + 6) % 7) >= 5
                            const ap         = activePerson ? data?.people?.[activePerson] : null
                            const activeIsBusy = activePerson ? isBusy(activePerson, y, m, d) : false
                            const meIsBusy   = isBusy(me.name, y, m, d)
                            const meEntry    = getBusyEntry(me.name, y, m, d)
                            const hasNote    = typeof meEntry === 'string' && meEntry.length > 0

                            let cellStyle = {}
                            if (activeIsBusy && ap) cellStyle = { background: `color-mix(in srgb,${ap.color} 18%,var(--surface2))`, borderColor: ap.color }
                            else if (!activePerson && meIsBusy) cellStyle = { background: `color-mix(in srgb,${me.color} 14%,var(--surface2))`, borderColor: me.color }

                            const tipParts = []
                            if (allFree) tipParts.push('✅ Все свободны!')
                            bp.forEach(p => {
                              const entry = getBusyEntry(p.name, y, m, d)
                              const isMaster = isMasterEntry(p.name, y, m, d)
                              const note  = typeof entry === 'string' && entry.length > 0 ? `: ${entry}` : ''
                              const src   = isMaster ? ' 📌' : ''
                              tipParts.push(`❌ ${p.name}${note}${src}`)
                            })
                            if (bp.length === 0 && !allFree) tipParts.push('—')

                            return (
                              <div key={d}
                                className={'dc' + (isWe ? ' we' : '') + (isToday ? ' today' : '') + (allFree ? ' all-free' : '') + (hasNote ? ' has-note' : '')}
                                style={cellStyle}
                                onClick={() => handleDayClick(y, m, d)}>
                                <div className="dnum">{d}</div>
                                {bp.length > 0 && (
                                  <div className="dot-row">
                                    {bp.slice(0, 5).map(p => (
                                      <div key={p.name} className="pdot" style={{background:p.color}}/>
                                    ))}
                                  </div>
                                )}
                                <div className="tip">{tipParts.join('\n')}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
            }
          </div>
        </div>
      </div>
    </div>

    {modal && (
      <DayModal
        day={modal}
        personColor={me.color}
        personName={me.name}
        existingNote={typeof modalEntry === 'string' ? modalEntry : modalEntry === true ? '' : undefined}
        isMasterDay={modalIsMaster}
        onSave={note => saveBusyDay(modal.y, modal.m, modal.d, note)}
        onRemove={() => removeBusyDay(modal.y, modal.m, modal.d)}
        onClose={() => setModal(null)}
      />
    )}
    </>
  )
}
