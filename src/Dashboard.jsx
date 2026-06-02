import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, set, onValue } from 'firebase/database'
import { db } from './firebase.js'
import { PALETTE, BASE_CSS, genId, toInput, fromInput, daysBetween, dayKey, MON_SHORT, MON_RU, DOW } from './shared.js'

const css = BASE_CSS + `
  body{padding:0}
  .dash-wrap{max-width:900px;margin:0 auto;padding:32px 20px 60px}

  .dash-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;gap:16px;flex-wrap:wrap}
  .dash-hdr h1{font-family:'Syne',sans-serif;font-size:clamp(22px,4vw,30px);font-weight:800;letter-spacing:-.5px;line-height:1.1}
  .dash-hdr p{font-size:13px;color:var(--muted);margin-top:5px}
  .hdr-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

  .user-pill{display:flex;align-items:center;gap:8px;background:var(--surface);border:1.5px solid var(--border);border-radius:100px;padding:6px 14px 6px 8px;font-size:13px;font-weight:500;box-shadow:var(--shadow);cursor:pointer;transition:border-color .18s;white-space:nowrap}
  .user-pill:hover{border-color:var(--accent)}
  .user-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}

  .section-label{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}

  /* Master busy card */
  .master-card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:20px;box-shadow:var(--shadow);margin-bottom:32px}
  .master-card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap}
  .master-card-hdr h2{font-family:'Syne',sans-serif;font-size:16px;font-weight:800}
  .master-card-hdr p{font-size:12px;color:var(--muted);margin-top:3px}
  .master-months{display:flex;gap:20px;overflow-x:auto;padding-bottom:4px}
  .mini-month{flex-shrink:0}
  .mini-month-title{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;letter-spacing:.04em;text-transform:uppercase}
  .mini-dow{display:grid;grid-template-columns:repeat(7,28px);gap:2px;margin-bottom:2px}
  .mini-dow-lbl{width:28px;text-align:center;font-size:9px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding:1px 0}
  .mini-dow-lbl.we{color:var(--accent)}
  .mini-grid{display:grid;grid-template-columns:repeat(7,28px);gap:2px}
  .mini-dc{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;cursor:pointer;background:var(--surface2);border:1.5px solid transparent;transition:all .1s;user-select:none;position:relative}
  .mini-dc:hover{background:#ede7df;transform:scale(1.08)}
  .mini-dc.empty{background:transparent;pointer-events:none}
  .mini-dc.we{color:var(--accent)}
  .mini-dc.today{border-color:var(--accent);background:var(--accent-light)}
  .mini-dc.busy{background:color-mix(in srgb,var(--mycolor) 18%,var(--surface2));border-color:var(--mycolor)}
  .mini-dc.busy .mini-dn{color:var(--mycolor);font-weight:700}
  .mini-dc.has-note::after{content:'';position:absolute;top:2px;right:2px;width:4px;height:4px;border-radius:50%;background:var(--accent)}
  .mini-dn{font-size:11px;line-height:1}
  .master-hint{font-size:11px;color:var(--muted);margin-top:12px}

  /* cal grid */
  .cal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:32px}
  .cal-card{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:16px;box-shadow:var(--shadow);cursor:pointer;transition:border-color .18s,transform .12s,box-shadow .12s;position:relative;animation:fadeUp .25s ease both}
  .cal-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 6px 24px rgba(26,20,16,.1)}
  .cal-card-accent{height:4px;border-radius:4px;margin-bottom:12px}
  .cal-card h3{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:4px;color:var(--ink)}
  .cal-card-meta{font-size:11px;color:var(--muted);line-height:1.5}
  .cal-card-actions{display:flex;gap:6px;margin-top:12px}
  .new-card{border:1.5px dashed var(--border);background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:130px;color:var(--muted);font-size:13px;font-weight:500;transition:border-color .18s,color .18s}
  .new-card:hover{border-color:var(--accent);color:var(--accent)}
  .new-card-icon{font-size:28px}

  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;letter-spacing:.04em}
  .badge-owner{background:var(--accent-light);color:var(--accent)}
  .badge-member{background:#f0f0f0;color:var(--muted)}

  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .login-card{background:var(--surface);border:1.5px solid var(--border);border-radius:24px;padding:36px 32px;width:100%;max-width:400px;box-shadow:var(--shadow);animation:fadeUp .3s ease both}
  .login-card h2{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:6px}
  .login-card>p{font-size:13px;color:var(--muted);margin-bottom:22px}
  .form-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
  .form-field label{font-size:12px;color:var(--muted);font-weight:500}
  .empty-state{text-align:center;padding:40px 20px;color:var(--muted)}
  .empty-icon{font-size:40px;margin-bottom:12px}

  @media(max-width:500px){.cal-grid{grid-template-columns:1fr}.master-months{flex-direction:column}}
`

// ─── Day modal (for master calendar) ─────────────────────────────────────
function DayModal({ day, color, existingNote, onSave, onRemove, onClose }) {
  const [note, setNote] = useState(existingNote || '')
  const ref_ = useRef(null)
  useEffect(() => ref_.current?.focus(), [])
  const { y, m, d } = day
  const isEdit = existingNote !== undefined
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title" style={{ color }}>
          {isEdit ? '✏️ Изменить день' : '🚫 Отметить занятость'}
        </div>
        <div className="modal-sub">{d} {MON_SHORT[m]} {y} · Мой календарь</div>
        <textarea ref={ref_} className="inp"
          placeholder="Причина (необязательно): командировка, свадьба…"
          value={note} onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave(note) }}
          maxLength={200}/>
        <div style={{fontSize:10,color:'var(--muted)',marginTop:4,textAlign:'right'}}>{note.length}/200</div>
        <div className="modal-actions">
          {isEdit && <button className="btn btn-danger" onClick={onRemove}>Снять</button>}
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn" onClick={() => onSave(note)}>{isEdit ? 'Сохранить' : 'Отметить'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────
function CreateModal({ userName, userColor, onCreated, onClose }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const inp = useRef(null)
  useEffect(() => inp.current?.focus(), [])
  const now = new Date()

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    const calId = genId(10)
    await set(ref(db, `calendars/${calId}`), {
      name: name.trim(), createdBy: userName, createdAt: Date.now(),
      startDate: toInput(now.getFullYear(), now.getMonth()),
      endDate: toInput(now.getFullYear(), now.getMonth() + 1),
      people: { [userName]: { color: userColor, busy: {} } }
    })
    await set(ref(db, `cal_index/${calId}`), { name: name.trim(), createdBy: userName, createdAt: Date.now() })
    setLoading(false)
    onCreated(calId)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">📅 Новый календарь</div>
        <div className="modal-sub">Создай и поделись ссылкой с нужными людьми</div>
        <div className="form-field">
          <label>Название</label>
          <input ref={inp} className="inp" placeholder="Встреча с подругами, Отпуск с Колей…"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()} maxLength={50}/>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn" onClick={create} disabled={!name.trim() || loading}>
            {loading ? 'Создаём…' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Rename modal ─────────────────────────────────────────────────────────
function RenameModal({ calId, currentName, onSaved, onClose }) {
  const [name, setName] = useState(currentName)
  const inp = useRef(null)
  useEffect(() => { inp.current?.focus(); inp.current?.select() }, [])
  const save = async () => {
    if (!name.trim()) return
    await set(ref(db, `calendars/${calId}/name`), name.trim())
    await set(ref(db, `cal_index/${calId}/name`), name.trim())
    onSaved()
  }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">✏️ Переименовать</div>
        <div className="modal-sub" style={{marginBottom:14}}></div>
        <input ref={inp} className="inp" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} maxLength={50}/>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn" onClick={save} disabled={!name.trim()}>Сохранить</button>
        </div>
      </div>
    </div>
  )
}

// ─── Mini calendar (master busy editor) ──────────────────────────────────
function MasterCalendar({ me, myBusy, onDayClick }) {
  const now  = new Date()
  // Show current month + next 2
  const months = daysBetween(now.getFullYear(), now.getMonth(),
                             now.getFullYear(), now.getMonth() + 2)
  const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate()

  return (
    <div className="master-months">
      {months.map(({ y, m, dim }) => {
        const fd = (new Date(y, m, 1).getDay() + 6) % 7
        return (
          <div className="mini-month" key={`${y}-${m}`}>
            <div className="mini-month-title">{MON_RU[m]} {y}</div>
            <div className="mini-dow">
              {DOW.map((d, i) => <div key={i} className={'mini-dow-lbl' + (i >= 5 ? ' we' : '')}>{d}</div>)}
            </div>
            <div className="mini-grid">
              {Array(fd).fill(null).map((_, i) => <div key={'e' + i} className="mini-dc empty"/>)}
              {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
                const k       = dayKey(y, m, d)
                const entry   = myBusy?.[k]
                const isBusy  = entry !== undefined && entry !== null
                const hasNote = typeof entry === 'string' && entry.length > 0
                const isToday = y === todayY && m === todayM && d === todayD
                const isWe    = ((new Date(y, m, d).getDay() + 6) % 7) >= 5
                const tip     = isBusy ? (hasNote ? entry : 'Занят(а)') : 'Свободен(на)'
                return (
                  <div key={d} title={tip}
                    className={'mini-dc' + (isWe ? ' we' : '') + (isToday ? ' today' : '') + (isBusy ? ' busy' : '') + (hasNote ? ' has-note' : '')}
                    style={{ '--mycolor': me.color }}
                    onClick={() => onDayClick(y, m, d)}>
                    <span className="mini-dn">{d}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cal_me')) } catch { return null }
  })
  const [loginName, setLoginName]   = useState('')
  const [loginColor, setLoginColor] = useState(PALETTE[0])

  const [allCals, setAllCals]       = useState({})
  const [loadingCals, setLoadingCals] = useState(true)
  const [myBusy, setMyBusy]         = useState({})   // user_busy/{name}

  const [showCreate, setShowCreate] = useState(false)
  const [renaming, setRenaming]     = useState(null)
  const [dayModal, setDayModal]     = useState(null)  // {y,m,d}

  // Subscribe cal index
  useEffect(() => {
    if (!me) return
    const u1 = onValue(ref(db, 'cal_index'), snap => {
      setAllCals(snap.exists() ? snap.val() : {})
      setLoadingCals(false)
    })
    // Subscribe personal busy
    const u2 = onValue(ref(db, `user_busy/${me.name}`), snap => {
      setMyBusy(snap.exists() ? snap.val() : {})
    })
    return () => { u1(); u2() }
  }, [me])

  const saveBusy = async (newBusy) => {
    await set(ref(db, `user_busy/${me.name}`), newBusy)
  }

  const handleDayClick = (y, m, d) => setDayModal({ y, m, d })

  const saveDayModal = async (note) => {
    const k = dayKey(dayModal.y, dayModal.m, dayModal.d)
    const nb = { ...myBusy, [k]: note.trim() || true }
    await saveBusy(nb)
    setDayModal(null)
  }

  const removeDayModal = async () => {
    const k = dayKey(dayModal.y, dayModal.m, dayModal.d)
    const nb = { ...myBusy }; delete nb[k]
    await saveBusy(nb)
    setDayModal(null)
  }

  const handleLogin = (name, color) => {
    if (!name.trim()) return
    const user = { name: name.trim(), color }
    localStorage.setItem('cal_me', JSON.stringify(user))
    setMe(user)
  }

  const logout = () => { localStorage.removeItem('cal_me'); setMe(null) }

  const deleteCalendar = async (calId, e) => {
    e.stopPropagation()
    if (!confirm('Удалить календарь? Это действие нельзя отменить.')) return
    await set(ref(db, `calendars/${calId}`), null)
    await set(ref(db, `cal_index/${calId}`), null)
  }

  // ── Login ────────────────────────────────────────────────────────────
  if (!me) return (
    <><style>{css}</style>
    <div className="login-wrap">
      <div className="login-card">
        <h2>Привет! 👋</h2>
        <p>Введи имя чтобы войти. Оно будет видно другим участникам.</p>
        <div className="form-field" style={{marginBottom:12}}>
          <label>Твоё имя</label>
          <input className="inp" placeholder="Имя" value={loginName}
            onChange={e => setLoginName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin(loginName, loginColor)}
            autoFocus maxLength={20}/>
        </div>
        <div className="form-field">
          <label>Цвет</label>
          <div className="color-pick">
            {PALETTE.map(c => (
              <div key={c} className={'cswatch' + (c === loginColor ? ' sel' : '')}
                style={{background:c,'--sw-color':c}} onClick={() => setLoginColor(c)}/>
            ))}
          </div>
        </div>
        <button className="btn" style={{width:'100%',marginTop:8}}
          onClick={() => handleLogin(loginName, loginColor)} disabled={!loginName.trim()}>
          Войти →
        </button>
      </div>
    </div></>
  )

  const calEntries = Object.entries(allCals)
  const myCals     = calEntries.filter(([, c]) => c.createdBy === me.name)
  const otherCals  = calEntries.filter(([, c]) => c.createdBy !== me.name)
  const busyCount  = Object.keys(myBusy).length
  const fmtDate    = ts => { const d = new Date(ts); return `${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}` }

  const modalEntry = dayModal ? myBusy[dayKey(dayModal.y, dayModal.m, dayModal.d)] : undefined

  return (
    <><style>{css}</style>
    <div className="dash-wrap">

      <div className="dash-hdr">
        <div>
          <h1>📅 Мои календари</h1>
          <p>Создай календарь и поделись ссылкой с нужными людьми</p>
        </div>
        <div className="hdr-right">
          <div className="user-pill" onClick={logout}>
            <div className="user-dot" style={{background:me.color}}/>{me.name}
            <span style={{fontSize:10,color:'#9a8f84',marginLeft:2}}>↩</span>
          </div>
        </div>
      </div>

      {/* ── Master busy card ── */}
      <div className="master-card">
        <div className="master-card-hdr">
          <div>
            <h2>🗓 Мои занятые дни</h2>
            <p>
              Кликай по дням чтобы отметить занятость.
              {busyCount > 0
                ? <> Отмечено <strong style={{color:me.color}}>{busyCount} {busyCount === 1 ? 'день' : busyCount < 5 ? 'дня' : 'дней'}</strong> — они автоматически видны во всех твоих календарях.</>
                : <> Они автоматически подгрузятся во все твои календари.</>
              }
            </p>
          </div>
        </div>
        <MasterCalendar me={me} myBusy={myBusy} onDayClick={handleDayClick}/>
        <div className="master-hint">
          💡 Нажми на день чтобы отметить занятость или добавить причину. Изменения сразу появятся во всех календарях.
        </div>
      </div>

      {/* ── My calendars ── */}
      <div className="section-label">Мои календари</div>
      <div className="cal-grid">
        {myCals.map(([calId, cal], idx) => (
          <div key={calId} className="cal-card" style={{animationDelay:`${idx*40}ms`}}
            onClick={() => navigate(`/cal/${calId}`)}>
            <div className="cal-card-accent"
              style={{background:`linear-gradient(90deg,${me.color},${PALETTE[(idx+3)%PALETTE.length]})`}}/>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
              <h3>{cal.name}</h3>
              <span className="badge badge-owner">Создатель</span>
            </div>
            <div className="cal-card-meta">Создан {fmtDate(cal.createdAt)}</div>
            <div className="cal-card-actions" onClick={e => e.stopPropagation()}>
              <button className="btn btn-outline btn-sm" style={{flex:1}}
                onClick={() => navigate(`/cal/${calId}`)}>Открыть</button>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setRenaming(calId)} title="Переименовать">✏️</button>
              <button className="btn btn-ghost btn-sm"
                onClick={e => deleteCalendar(calId, e)} title="Удалить">🗑</button>
            </div>
          </div>
        ))}
        <div className="cal-card new-card" onClick={() => setShowCreate(true)}>
          <div className="new-card-icon">+</div>
          <span>Создать календарь</span>
        </div>
      </div>

      {/* ── Other calendars ── */}
      {otherCals.length > 0 && (<>
        <div className="section-label" style={{marginTop:8}}>Чужие календари (приглашена)</div>
        <div className="cal-grid">
          {otherCals.map(([calId, cal], idx) => (
            <div key={calId} className="cal-card" style={{animationDelay:`${idx*40}ms`}}
              onClick={() => navigate(`/cal/${calId}`)}>
              <div className="cal-card-accent" style={{background:'linear-gradient(90deg,#9a8f84,#c8bfb0)'}}/>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <h3>{cal.name}</h3>
                <span className="badge badge-member">Участница</span>
              </div>
              <div className="cal-card-meta">Создал(а) {cal.createdBy} · {fmtDate(cal.createdAt)}</div>
              <div className="cal-card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-outline btn-sm" style={{flex:1}}
                  onClick={() => navigate(`/cal/${calId}`)}>Открыть</button>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {calEntries.length === 0 && !loadingCals && (
        <div className="empty-state">
          <div className="empty-icon">🗓</div>
          <p>Пока нет ни одного календаря.<br/>Создай первый!</p>
          <button className="btn" onClick={() => setShowCreate(true)}>+ Создать календарь</button>
        </div>
      )}
      {loadingCals && <div className="no-msg" style={{padding:40}}>Загружаем…</div>}
    </div>

    {showCreate && <CreateModal userName={me.name} userColor={me.color}
      onCreated={id => { setShowCreate(false); navigate(`/cal/${id}`) }}
      onClose={() => setShowCreate(false)}/>}

    {renaming && <RenameModal calId={renaming} currentName={allCals[renaming]?.name || ''}
      onSaved={() => setRenaming(null)} onClose={() => setRenaming(null)}/>}

    {dayModal && (
      <DayModal day={dayModal} color={me.color}
        existingNote={typeof modalEntry === 'string' ? modalEntry : modalEntry === true ? '' : undefined}
        onSave={saveDayModal} onRemove={removeDayModal} onClose={() => setDayModal(null)}/>
    )}
    </>
  )
}
