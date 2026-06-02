import { useState, useEffect, useCallback, useRef } from 'react'
import { ref, onValue, set, get } from 'firebase/database'
import { db } from './firebase.js'

// ─── Constants ────────────────────────────────────────────────────────────
const PALETTE = [
  '#f87171','#fb923c','#fbbf24','#a3e635',
  '#34d399','#22d3ee','#60a5fa','#a78bfa',
  '#f472b6','#e879f9','#ff6b9d','#c084fc'
]

const MON_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MON_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const DB_PATH = 'calendar/main'

// ─── Firebase helpers ──────────────────────────────────────────────────────
async function fbGet() {
  try {
    const snap = await get(ref(db, DB_PATH))
    return snap.exists() ? snap.val() : null
  } catch { return null }
}

async function fbSet(data) {
  try {
    await set(ref(db, DB_PATH), data)
    return true
  } catch (e) {
    console.error('Firebase write error:', e)
    return false
  }
}

// ─── Date utils ───────────────────────────────────────────────────────────
function daysBetween(startY, startM, endY, endM) {
  const days = []
  let y = startY, m = startM
  while (y < endY || (y === endY && m <= endM)) {
    const dim = new Date(y, m + 1, 0).getDate()
    days.push({ y, m, dim })
    m++; if (m > 11) { m = 0; y++ }
  }
  return days
}

function dayKey(y, m, d) { return `${y}_${m}_${d}` }

function toInputDate(y, m) {
  return `${y}-${String(m + 1).padStart(2, '0')}`
}
function fromInputDate(s) {
  const [y, m] = s.split('-').map(Number)
  return { y, m: m - 1 }
}

function emptyState() {
  const now = new Date()
  return {
    startDate: toInputDate(now.getFullYear(), now.getMonth()),
    endDate: toInputDate(now.getFullYear(), now.getMonth() + 1),
    people: {}
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #faf8f4;
    --ink: #1a1410;
    --muted: #9a8f84;
    --surface: #ffffff;
    --surface2: #f2ede8;
    --border: #e8e0d8;
    --accent: #d4622a;
    --accent-light: #fce9df;
    --green: #2d7a47;
    --green-bg: #eaf7ee;
    --green-border: #b6e4c5;
    --radius: 16px;
    --shadow: 0 2px 16px rgba(26,20,16,.07);
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
    padding: 28px 20px 60px;
  }

  .app { max-width: 980px; margin: 0 auto; }

  .hdr { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .hdr-left h1 {
    font-family: 'Syne', sans-serif;
    font-size: clamp(22px, 4vw, 32px);
    font-weight: 800;
    letter-spacing: -.5px;
    color: var(--ink);
    line-height: 1;
  }
  .hdr-left p { font-size: 13px; color: var(--muted); margin-top: 5px; }
  .user-pill {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 100px;
    padding: 6px 14px 6px 8px;
    font-size: 13px; font-weight: 500;
    box-shadow: var(--shadow);
    cursor: pointer;
    transition: border-color .18s;
  }
  .user-pill:hover { border-color: var(--accent); }
  .user-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  .login-wrap { min-height: 70vh; display: flex; align-items: center; justify-content: center; }
  .login-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 36px 32px;
    width: 100%; max-width: 400px;
    box-shadow: var(--shadow);
    animation: fadeUp .3s ease both;
  }
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(16px); }
    to   { opacity:1; transform: translateY(0); }
  }
  .login-card h2 { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 6px; }
  .login-card > p { font-size: 13px; color: var(--muted); margin-bottom: 22px; }
  .login-name-row { display: flex; gap: 8px; margin-bottom: 12px; }

  .inp {
    flex: 1;
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    color: var(--ink);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    padding: 10px 13px;
    outline: none;
    transition: border-color .18s;
  }
  .inp:focus { border-color: var(--accent); }
  .inp::placeholder { color: var(--muted); }

  .color-pick { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 20px; }
  .cswatch {
    width: 26px; height: 26px; border-radius: 50%;
    cursor: pointer; border: 2.5px solid transparent;
    transition: transform .15s, box-shadow .15s;
    flex-shrink: 0;
  }
  .cswatch:hover { transform: scale(1.15); }
  .cswatch.sel { box-shadow: 0 0 0 2px white, 0 0 0 4.5px var(--sw-color); }

  .btn {
    background: var(--accent); color: white;
    border: none; border-radius: 10px;
    padding: 10px 20px;
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 700;
    cursor: pointer;
    transition: opacity .18s, transform .1s;
    letter-spacing: .02em;
    white-space: nowrap;
  }
  .btn:hover { opacity: .88; }
  .btn:active { transform: scale(.97); }
  .btn:disabled { opacity: .4; cursor: default; }
  .btn-sm { padding: 7px 13px; font-size: 11px; }

  .existing-people { margin-top: 18px; }
  .existing-people > p { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
  .ep-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .ep-chip {
    display: flex; align-items: center; gap: 6px;
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 100px; padding: 5px 12px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    transition: border-color .15s;
  }
  .ep-chip:hover { border-color: var(--accent); }
  .ep-chip-dot { width: 8px; height: 8px; border-radius: 50%; }

  .layout { display: flex; gap: 20px; align-items: flex-start; }
  .sidebar { width: 230px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
  .main-col { flex: 1; min-width: 0; }

  .card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    box-shadow: var(--shadow);
  }
  .card-title {
    font-family: 'Syne', sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--muted); margin-bottom: 12px;
  }

  .period-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
  .period-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .period-field label { font-size: 11px; color: var(--muted); font-weight: 500; }
  input[type="month"] {
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 8px; color: var(--ink);
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    padding: 7px 10px; outline: none; width: 100%;
    transition: border-color .18s;
  }
  input[type="month"]:focus { border-color: var(--accent); }

  .p-list { display: flex; flex-direction: column; gap: 5px; }
  .p-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 9px; border-radius: 9px;
    border: 1.5px solid transparent; cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .p-item:hover { background: var(--surface2); }
  .p-item.active { background: color-mix(in srgb, var(--pc) 10%, var(--surface)); border-color: var(--pc); }
  .p-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .p-name { font-size: 13px; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .p-cnt { font-size: 11px; color: var(--muted); flex-shrink: 0; }
  .you-badge {
    font-size: 9px; font-weight: 700; letter-spacing: .05em;
    background: var(--accent-light); color: var(--accent);
    border-radius: 4px; padding: 1px 5px; flex-shrink: 0;
  }
  .p-del {
    background: none; border: none; cursor: pointer;
    font-size: 15px; color: var(--muted); padding: 0 2px;
    opacity: 0; transition: opacity .12s; line-height: 1;
  }
  .p-item:hover .p-del { opacity: 1; }
  .p-del:hover { color: #ef4444; }

  .hint-box {
    background: var(--accent-light); border: 1.5px solid #f4c4a8;
    border-radius: 10px; padding: 10px 12px;
    font-size: 12px; line-height: 1.5; color: #8b3a18;
  }
  .hint-box strong { color: var(--accent); }

  .fw-list { display: flex; flex-direction: column; gap: 5px; }
  .fw-item {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 10px; border-radius: 9px;
    background: var(--green-bg); border: 1px solid var(--green-border);
    font-size: 12px; font-weight: 600; color: var(--green);
  }
  .no-msg { font-size: 12px; color: var(--muted); text-align: center; padding: 10px 0; }

  .sync-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
  .sync-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
  .sync-dot.live { animation: pulse 2s infinite; }
  .sync-dot.saving { background: var(--accent); }
  .sync-dot.error { background: #ef4444; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

  .share-row { display: flex; gap: 8px; align-items: center; }
  .share-url {
    flex: 1; font-size: 11px; color: var(--muted);
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 8px; padding: 6px 10px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-family: monospace; cursor: pointer; transition: border-color .15s;
  }
  .share-url:hover { border-color: var(--accent); }

  .cal { display: flex; flex-direction: column; gap: 24px; }
  .m-title {
    font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
    color: var(--ink); margin-bottom: 8px;
    display: flex; align-items: center; gap: 8px;
  }
  .m-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .dow-row { display: grid; grid-template-columns: repeat(7,1fr); margin-bottom: 4px; }
  .dow-lbl {
    text-align: center; font-size: 10px; font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase;
    color: var(--muted); padding: 2px 0;
  }
  .dow-lbl.we { color: var(--accent); }
  .day-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; }
  .dc {
    position: relative; aspect-ratio: 1;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    border-radius: 9px; font-size: 12px; font-weight: 500;
    cursor: pointer; background: var(--surface2);
    border: 1.5px solid transparent;
    transition: background .1s, border-color .1s, transform .08s;
    min-height: 34px; user-select: none; overflow: visible;
  }
  .dc:hover { background: #ede7df; transform: scale(1.06); z-index: 2; }
  .dc.empty { background: transparent; pointer-events: none; }
  .dc.we .dnum { color: var(--accent); }
  .dc.today { border-color: var(--accent) !important; background: var(--accent-light) !important; }
  .dc.all-free { background: var(--green-bg) !important; border-color: var(--green-border) !important; }
  .dc.all-free .dnum { color: var(--green) !important; font-weight: 700; }
  .dnum { font-size: 12px; line-height: 1; z-index: 1; }
  .dot-row { display: flex; gap: 2px; margin-top: 2px; z-index: 1; flex-wrap: wrap; justify-content: center; max-width: 100%; }
  .pdot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  .dc:hover .tip { display: block; }
  .tip {
    display: none; position: absolute; bottom: calc(100% + 6px); left: 50%;
    transform: translateX(-50%);
    background: var(--ink); color: #fff;
    font-size: 10px; padding: 5px 9px; border-radius: 7px;
    white-space: nowrap; z-index: 200;
    pointer-events: none; box-shadow: 0 4px 14px rgba(0,0,0,.2);
    line-height: 1.6;
  }
  .tip::after {
    content: ''; position: absolute; top: 100%; left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent; border-top-color: var(--ink);
  }

  @media (max-width: 680px) {
    .layout { flex-direction: column; }
    .sidebar { width: 100%; }
  }
`

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [me, setMe] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const [activePerson, setActivePerson] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [loginColor, setLoginColor] = useState(PALETTE[0])
  const [copied, setCopied] = useState(false)

  // ── Subscribe to Firebase realtime updates ───────────────────────────
  useEffect(() => {
    const dbRef = ref(db, DB_PATH)
    const unsub = onValue(dbRef, (snap) => {
      if (snap.exists()) {
        setData(snap.val())
      } else {
        const init = emptyState()
        setData(init)
        fbSet(init)
      }
      setLoading(false)
    }, (err) => {
      console.error('Firebase read error:', err)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // ── Save to Firebase ─────────────────────────────────────────────────
  const saveData = useCallback(async (newData) => {
    setSaving(true); setSaveErr(false)
    const ok = await fbSet(newData)
    setSaving(false)
    if (!ok) setSaveErr(true)
    return ok
  }, [])

  // ── Login ────────────────────────────────────────────────────────────
  const handleLogin = async (name, color) => {
    if (!name.trim() || !data) return
    const n = name.trim()
    const existingColor = data.people?.[n]?.color
    const finalColor = existingColor || color

    if (!data.people?.[n]) {
      const newData = {
        ...data,
        people: {
          ...data.people,
          [n]: { color: finalColor, busy: {} }
        }
      }
      await saveData(newData)
    }
    setMe({ name: n, color: finalColor })
    setActivePerson(n)
  }

  // ── Toggle busy day ──────────────────────────────────────────────────
  const toggleDay = useCallback(async (y, m, d) => {
    if (!me || !data) return
    const k = dayKey(y, m, d)
    const personData = data.people?.[me.name] || { color: me.color, busy: {} }
    const currentBusy = personData.busy || {}
    const newBusy = { ...currentBusy }
    if (newBusy[k]) delete newBusy[k]
    else newBusy[k] = true

    const newData = {
      ...data,
      people: {
        ...data.people,
        [me.name]: { ...personData, busy: newBusy }
      }
    }
    await saveData(newData)
  }, [me, data, saveData])

  // ── Update period ────────────────────────────────────────────────────
  const updatePeriod = useCallback(async (field, val) => {
    if (!data) return
    await saveData({ ...data, [field]: val })
  }, [data, saveData])

  // ── Remove person ────────────────────────────────────────────────────
  const removePerson = useCallback(async (name) => {
    if (!data) return
    const newPeople = { ...data.people }
    delete newPeople[name]
    await saveData({ ...data, people: newPeople })
    if (activePerson === name) setActivePerson(me?.name || null)
  }, [data, saveData, activePerson, me])

  // ── Derived state ────────────────────────────────────────────────────
  const people = data
    ? Object.entries(data.people || {}).map(([name, p]) => ({ name, ...p }))
    : []

  function isBusy(personName, y, m, d) {
    return !!(data?.people?.[personName]?.busy?.[dayKey(y, m, d)])
  }

  function getBusyPeople(y, m, d) {
    return people.filter(p => isBusy(p.name, y, m, d))
  }

  function getMonths() {
    if (!data?.startDate || !data?.endDate) return []
    const s = fromInputDate(data.startDate)
    const e = fromInputDate(data.endDate)
    if (s.y > e.y || (s.y === e.y && s.m > e.m)) return []
    return daysBetween(s.y, s.m, e.y, e.m).slice(0, 24)
  }

  function getFreeWindows() {
    if (people.length < 2) return []
    const months = getMonths()
    const wins = []; let cur = null
    for (const { y, m, dim } of months) {
      for (let d = 1; d <= dim; d++) {
        const bp = getBusyPeople(y, m, d)
        if (bp.length === 0) {
          if (!cur) cur = { y, m, d }
        } else {
          if (cur) { wins.push({ s: cur, e: { y, m, d: d - 1 } }); cur = null }
        }
      }
    }
    if (cur && months.length > 0) {
      const last = months[months.length - 1]
      wins.push({ s: cur, e: { y: last.y, m: last.m, d: last.dim } })
    }
    return wins
  }

  const fmtRange = (w) => {
    const s = `${w.s.d} ${MON_SHORT[w.s.m]}`
    const e = `${w.e.d} ${MON_SHORT[w.e.m]}`
    return (w.s.m === w.e.m && w.s.d === w.e.d) ? s : `${s} — ${e}`
  }

  const todayY = new Date().getFullYear()
  const todayM = new Date().getMonth()
  const todayD = new Date().getDate()

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Render: loading ──────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{css}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', fontFamily:'DM Sans,sans-serif', color:'#9a8f84', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:28 }}>📅</div>
        Подключаемся…
      </div>
    </>
  )

  // ── Render: login ────────────────────────────────────────────────────
  if (!me) return (
    <>
      <style>{css}</style>
      <div className="login-wrap">
        <div className="login-card">
          <h2>Привет! 👋</h2>
          <p>Введи своё имя чтобы войти и отметить занятые дни</p>
          <div className="login-name-row">
            <input
              className="inp" placeholder="Твоё имя"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin(loginName, loginColor)}
              autoFocus maxLength={20}
            />
          </div>
          <div className="color-pick">
            {PALETTE.map(c => (
              <div
                key={c}
                className={'cswatch' + (c === loginColor ? ' sel' : '')}
                style={{ background: c, '--sw-color': c }}
                onClick={() => setLoginColor(c)}
              />
            ))}
          </div>
          <button
            className="btn"
            onClick={() => handleLogin(loginName, loginColor)}
            disabled={!loginName.trim()}
          >
            Войти →
          </button>

          {people.length > 0 && (
            <div className="existing-people">
              <p>Уже добавлены — кликни чтобы войти как:</p>
              <div className="ep-list">
                {people.map(p => (
                  <div key={p.name} className="ep-chip" onClick={() => handleLogin(p.name, p.color)}>
                    <div className="ep-chip-dot" style={{ background: p.color }} />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )

  // ── Render: main app ─────────────────────────────────────────────────
  const freeWindows = getFreeWindows()
  const months = getMonths()

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Header */}
        <div className="hdr">
          <div className="hdr-left">
            <h1>Когда все свободны?</h1>
            <p>Кликай по дням — отмечай занятость. Зелёные дни — все свободны!</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div className="sync-row">
              <div className={'sync-dot' + (saving ? ' saving' : saveErr ? ' error' : ' live')} />
              {saving ? 'Сохраняем…' : saveErr ? 'Ошибка!' : 'Онлайн'}
            </div>
            <div className="user-pill" onClick={() => setMe(null)} title="Сменить пользователя">
              <div className="user-dot" style={{ background: me.color }} />
              {me.name}
              <span style={{ fontSize:10, color:'#9a8f84', marginLeft:2 }}>↩</span>
            </div>
          </div>
        </div>

        <div className="layout">
          {/* Sidebar */}
          <div className="sidebar">

            {/* Period */}
            <div className="card">
              <div className="card-title">Период</div>
              <div className="period-row">
                <div className="period-field">
                  <label>С</label>
                  <input type="month" value={data.startDate || ''}
                    onChange={e => updatePeriod('startDate', e.target.value)} />
                </div>
                <div className="period-field">
                  <label>По</label>
                  <input type="month" value={data.endDate || ''}
                    onChange={e => updatePeriod('endDate', e.target.value)} />
                </div>
              </div>
            </div>

            {/* People */}
            <div className="card">
              <div className="card-title">Участники</div>
              {people.length === 0
                ? <div className="no-msg">Пока никого нет</div>
                : <div className="p-list">
                    {people.map(p => {
                      const busyCount = Object.keys(p.busy || {}).length
                      return (
                        <div
                          key={p.name}
                          className={'p-item' + (activePerson === p.name ? ' active' : '')}
                          style={{ '--pc': p.color }}
                          onClick={() => setActivePerson(prev => prev === p.name ? null : p.name)}
                        >
                          <div className="p-dot" style={{ background: p.color }} />
                          <div className="p-name">{p.name}</div>
                          {p.name === me.name && <span className="you-badge">Ты</span>}
                          <div className="p-cnt">{busyCount > 0 ? `${busyCount} дн.` : ''}</div>
                          {p.name !== me.name && (
                            <button className="p-del" onClick={e => { e.stopPropagation(); removePerson(p.name) }}>×</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
              }
            </div>

            {/* Hint */}
            <div className="hint-box">
              {activePerson
                ? activePerson === me.name
                  ? <>Кликай по дням чтобы отметить свою занятость</>
                  : <>Просмотр: <strong>{activePerson}</strong>. Переключись на себя чтобы редактировать</>
                : <>Выбери участника выше чтобы выделить его дни</>
              }
            </div>

            {/* Free windows */}
            <div className="card">
              <div className="card-title">🟢 Все свободны</div>
              {freeWindows.length === 0
                ? <div className="no-msg">
                    {people.length < 2 ? 'Нужно минимум 2 участника' : 'Нет общих свободных дней 😢'}
                  </div>
                : <div className="fw-list">
                    {freeWindows.slice(0, 8).map((w, i) => (
                      <div key={i} className="fw-item">🗓 {fmtRange(w)}</div>
                    ))}
                    {freeWindows.length > 8 && <div className="no-msg">+{freeWindows.length - 8} ещё…</div>}
                  </div>
              }
            </div>

            {/* Share */}
            <div className="card">
              <div className="card-title">Поделиться</div>
              <div className="share-row">
                <div className="share-url" onClick={copyUrl}>{window.location.href}</div>
                <button className="btn btn-sm" onClick={copyUrl}>{copied ? '✓' : 'Копировать'}</button>
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:8, lineHeight:1.5 }}>
                Отправь ссылку подругам — они войдут под своим именем и отметят свои дни
              </div>
            </div>

          </div>

          {/* Calendar */}
          <div className="main-col">
            <div className="card">
              {months.length === 0
                ? <div className="no-msg" style={{ padding:40 }}>Выбери период слева</div>
                : <div className="cal">
                    {months.map(({ y, m, dim }) => {
                      const fd = (new Date(y, m, 1).getDay() + 6) % 7
                      return (
                        <div key={`${y}-${m}`}>
                          <div className="m-title">{MON_RU[m]} {y}</div>
                          <div className="dow-row">
                            {DOW.map((d, i) => (
                              <div key={i} className={'dow-lbl' + (i >= 5 ? ' we' : '')}>{d}</div>
                            ))}
                          </div>
                          <div className="day-grid">
                            {Array(fd).fill(null).map((_, i) => (
                              <div key={'e' + i} className="dc empty" />
                            ))}
                            {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
                              const bp = getBusyPeople(y, m, d)
                              const allFree = people.length >= 2 && bp.length === 0
                              const isToday = y === todayY && m === todayM && d === todayD
                              const isWe = ((new Date(y, m, d).getDay() + 6) % 7) >= 5
                              const ap = activePerson ? data?.people?.[activePerson] : null
                              const activeIsBusy = activePerson ? isBusy(activePerson, y, m, d) : false
                              const meIsBusy = isBusy(me.name, y, m, d)

                              let cellStyle = {}
                              if (activeIsBusy && ap) {
                                cellStyle = {
                                  background: `color-mix(in srgb, ${ap.color} 18%, var(--surface2))`,
                                  borderColor: ap.color
                                }
                              } else if (!activePerson && meIsBusy) {
                                cellStyle = {
                                  background: `color-mix(in srgb, ${me.color} 14%, var(--surface2))`,
                                  borderColor: me.color
                                }
                              }

                              const tipLines = []
                              if (allFree) tipLines.push('✅ Все свободны!')
                              if (bp.length > 0) tipLines.push('❌ ' + bp.map(p => p.name).join(', '))
                              if (bp.length === 0 && !allFree) tipLines.push('—')

                              return (
                                <div
                                  key={d}
                                  className={'dc' + (isWe ? ' we' : '') + (isToday ? ' today' : '') + (allFree ? ' all-free' : '')}
                                  style={cellStyle}
                                  onClick={() => toggleDay(y, m, d)}
                                >
                                  <div className="dnum">{d}</div>
                                  {bp.length > 0 && (
                                    <div className="dot-row">
                                      {bp.slice(0, 5).map(p => (
                                        <div key={p.name} className="pdot" style={{ background: p.color }} />
                                      ))}
                                    </div>
                                  )}
                                  <div className="tip">{tipLines.join('\n')}</div>
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
    </>
  )
}
