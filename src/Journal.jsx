import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'

// ── Constants ─────────────────────────────────────────────────────────────────
const THEMES_EN = ["gratitude","peace","clarity","hope","struggle","growth","faith","rest","courage","joy","patience","surrender","trust","doubt","renewal","purpose","grief","resilience","forgiveness","focus","anxiety","love","breakthrough","discipline"]
const THEMES_ZH = ["感恩","平静","清晰","希望","挣扎","成长","信仰","休息","勇气","喜悦","耐心","交托","信任","怀疑","更新","目标","悲伤","韧性","宽恕","专注","焦虑","爱","突破","自律"]
const MOODS = ["😔","😕","😐","🙂","😊","😄","🌟","✨","💫","🔥"]
const ENERGY = ["🪫","🪫","🔋","🔋","⚡","⚡","💪","💪","🚀","🔥"]
const STOP = new Set(["the","and","a","to","of","in","is","it","i","my","me","was","that","this","for","on","are","with","so","but","have","had","did","do","not","what","at","be","an","as","or","if","we","they","he","she","his","her","its","our","their","from","by","up","out","about","just","also","when","which","how","all","one","more","no","would","could","should","very","there","then","you","your","into","over","after","before","been","has","can","will","like","some","than","them","these","those","yet","even","any"])
const TONE_COLORS = {"Energized":"#fde68a","Grounded":"#bbf7d0","Reflective":"#bfdbfe","Hopeful":"#fef9c3","Strained":"#c7d2fe","Heavy":"#e9d5ff","Anxious":"#fed7aa","Grateful":"#fbcfe8","Joyful":"#fef08a","Peaceful":"#cffafe","充满活力":"#fde68a","踏实":"#bbf7d0","反思中":"#bfdbfe","充满希望":"#fef9c3","紧绷":"#c7d2fe","沉重":"#e9d5ff","焦虑":"#fed7aa","感恩":"#fbcfe8","喜悦":"#fef08a","平静":"#cffafe"}
const TONE_ICONS = {"Energized":"🔆","Grounded":"🌿","Reflective":"🌊","Hopeful":"🌤","Strained":"🌧","Heavy":"⛈","Anxious":"🌀","Grateful":"🌸","Joyful":"☀️","Peaceful":"🕊","充满活力":"🔆","踏实":"🌿","反思中":"🌊","充满希望":"🌤","紧绷":"🌧","沉重":"⛈","焦虑":"🌀","感恩":"🌸","喜悦":"☀️","平静":"🕊"}
const TONE_ORDER = ["Heavy","Strained","Anxious","Reflective","Grounded","Peaceful","Hopeful","Grateful","Energized","Joyful"]
const TONES_EN = "Energized,Grounded,Reflective,Hopeful,Strained,Heavy,Anxious,Grateful,Joyful,Peaceful"
const TONES_ZH = "充满活力,踏实,反思中,充满希望,紧绷,沉重,焦虑,感恩,喜悦,平静"

const defaultEntry = () => ({
  date: new Date().toISOString().split("T")[0],
  mood: 5, energy: 5, theme: "",
  whatHappened: "", emotions: "", triggers: "", gratitude: "", reframe: "", unresolved: "",
  passage: "", keyVerse: "", lifeConnection: "",
  action: "", closing: "",
  aiVerses: [], tone: null, toneReason: "", clarityMoment: null,
  carryoverResult: null, carryoverNote: "", carryoverAction: ""
})

// ── DB helpers ────────────────────────────────────────────────────────────────
function toRow(e, uid) {
  return {
    user_id: uid, date: e.date, mood: e.mood, energy: e.energy, theme: e.theme,
    what_happened: e.whatHappened, emotions: e.emotions, triggers: e.triggers,
    gratitude: e.gratitude, reframe: e.reframe, unresolved: e.unresolved,
    passage: e.passage, key_verse: e.keyVerse, life_connection: e.lifeConnection,
    action: e.action, closing: e.closing, ai_verses: e.aiVerses,
    tone: e.tone, tone_reason: e.toneReason, clarity_moment: e.clarityMoment,
    carryover_result: e.carryoverResult, carryover_note: e.carryoverNote, carryover_action: e.carryoverAction
  }
}
function fromRow(r) {
  return {
    date: r.date, mood: r.mood, energy: r.energy, theme: r.theme || "",
    whatHappened: r.what_happened || "", emotions: r.emotions || "", triggers: r.triggers || "",
    gratitude: r.gratitude || "", reframe: r.reframe || "", unresolved: r.unresolved || "",
    passage: r.passage || "", keyVerse: r.key_verse || "", lifeConnection: r.life_connection || "",
    action: r.action || "", closing: r.closing || "", aiVerses: r.ai_verses || [],
    tone: r.tone || null, toneReason: r.tone_reason || "", clarityMoment: r.clarity_moment || null,
    carryoverResult: r.carryover_result || null, carryoverNote: r.carryover_note || "", carryoverAction: r.carryover_action || ""
  }
}

// ── API (proxied through Vercel serverless) ───────────────────────────────────
async function callClaude(messages, maxTokens = 600) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, messages })
  })
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text || ''
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Section({ title, children, optional, accent }) {
  const [open, setOpen] = useState(true)
  const bg = accent || "from-indigo-50 to-purple-50"
  return (
    <div className="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r ${bg} transition-all`}>
        <span className="font-semibold text-gray-800 text-sm">
          {title}{optional && <span className="ml-2 text-xs text-gray-400">{optional}</span>}
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, rows }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea rows={rows || 3} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-gray-50" />
    </div>
  )
}

function Slider({ label, value, onChange, emoji }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span>{emoji[value - 1]} <span className="text-sm font-bold text-indigo-600">{value}/10</span></span>
      </div>
      <input type="range" min="1" max="10" value={value}
        onChange={e => onChange(Number(e.target.value))} className="w-full accent-indigo-500" />
    </div>
  )
}

function ThemePicker({ value, onChange, lang }) {
  const themes = lang === 'zh' ? THEMES_ZH : THEMES_EN
  const isCustom = value && !themes.includes(value)
  const [showCustom, setShowCustom] = useState(false)
  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {themes.map(th => (
          <button key={th} type="button"
            onClick={() => { setShowCustom(false); onChange(th) }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${value === th ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
            {th}
          </button>
        ))}
        <button type="button" onClick={() => setShowCustom(s => !s)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${showCustom || isCustom ? "bg-purple-600 text-white border-purple-600" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
          ✏️ {lang === 'zh' ? '自定义' : 'custom'}
        </button>
      </div>
      {(showCustom || isCustom) && (
        <input type="text" value={isCustom ? value : ""}
          onChange={e => onChange(e.target.value)}
          placeholder={lang === 'zh' ? "输入你自己的主题…" : "Type your own theme…"}
          className="w-full border border-purple-200 rounded-lg p-2 text-sm bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-300" />
      )}
      {value && <p className="text-xs text-indigo-500 mt-1">{lang === 'zh' ? '已选：' : 'Selected:'} <span className="font-semibold">{value}</span></p>}
    </div>
  )
}

// ── Dove Mascot ───────────────────────────────────────────────────────────────
function Dove({ entries, lang }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (!open || fetched.current) return
    fetched.current = true
    setLoading(true)
    const hour = new Date().getHours()
    const tod = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
    const recent = entries.slice(-5)
    const lowMood = recent.filter(e => e.mood <= 4).length
    let streak = 0
    if (entries.length) {
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
      let d = new Date(); d.setHours(0, 0, 0, 0)
      for (const e of sorted) {
        const ed = new Date(e.date); ed.setHours(0, 0, 0, 0)
        if (Math.abs(d - ed) <= 86400000) { streak++; d = new Date(ed - 86400000) } else break
      }
    }
    const lastDate = entries.length ? new Date(entries[entries.length - 1].date) : null
    const missed = lastDate ? Math.floor((new Date() - lastDate) / 86400000) : 3
    let context = ""
    if (lowMood >= 3) context = `The user has had ${lowMood} low-mood entries recently. Offer gentle compassion.`
    else if (streak >= 3) context = `The user has journaled ${streak} days in a row. Celebrate warmly.`
    else if (missed >= 2) context = `The user hasn't journaled in ${missed} days. Gently invite them back.`
    else context = `Greet the user warmly for the ${tod}.`

    callClaude([{ role: "user", content: `You are a gentle dove mascot for a faith journaling app. Be warm, brief (2-3 sentences). ${context} ${lang === 'zh' ? 'Respond in Chinese.' : ''} End with a short Bible verse about God's love (reference + max 8 words).` }], 120)
      .then(text => setMsg(text || "You are loved. 🕊"))
      .catch(() => setMsg(lang === 'zh' ? "你被爱着。愿平安与你同在 🕊" : "You are seen and loved. 🕊"))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-4 w-72">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🕊️</span>
            <div className="flex-1">
              {loading
                ? <p className="text-sm text-indigo-400 animate-pulse">…</p>
                : <p className="text-sm text-gray-700 leading-relaxed">{msg}</p>}
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform border-2 border-white">
        🕊️
      </button>
    </div>
  )
}

// ── Action Carryover ──────────────────────────────────────────────────────────
function ActionCarryover({ yesterday, onRespond, lang }) {
  const [done, setDone] = useState(false)
  const [note, setNote] = useState("")
  if (!yesterday?.action || done) return null
  const respond = r => { onRespond(r, note); setDone(true) }
  return (
    <div className="mb-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-4">
      <p className="text-sm font-bold text-emerald-700 mb-1">{lang === 'zh' ? '✅ 昨天的承诺' : "✅ Yesterday's Commitment"}</p>
      <p className="text-sm text-gray-700 italic mb-3">"{yesterday.action}"</p>
      <p className="text-xs font-semibold text-gray-600 mb-2">{lang === 'zh' ? '你做到了吗？' : 'Did you follow through?'}</p>
      <div className="flex gap-2 mb-2 flex-wrap">
        <button onClick={() => respond("yes")} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:opacity-90">{lang === 'zh' ? '做到了！🙌' : 'Yes, I did it! 🙌'}</button>
        <button onClick={() => respond("no")} className="px-3 py-1.5 bg-orange-400 text-white text-xs font-semibold rounded-xl hover:opacity-90">{lang === 'zh' ? '没有完全做到…' : 'Not quite…'}</button>
        <button onClick={() => respond("skip")} className="px-3 py-1.5 bg-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:opacity-90">{lang === 'zh' ? '跳过' : 'Skip'}</button>
      </div>
      <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
        placeholder={lang === 'zh' ? "发生了什么？（可选）" : "What happened? (optional)"}
        className="w-full border border-emerald-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
    </div>
  )
}

// ── Charts ────────────────────────────────────────────────────────────────────
function MoodChart({ entries }) {
  if (entries.length < 2) return <p className="text-sm text-gray-400 text-center py-4">Add more entries to see trends</p>
  const last14 = entries.slice(-14)
  return (
    <div className="flex items-end gap-1 h-20 mt-2">
      {last14.map((e, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full rounded-t-sm bg-indigo-400 opacity-80" style={{ height: `${(e.mood / 10) * 60}px` }} />
          <div className="w-full rounded-t-sm bg-purple-300 opacity-60" style={{ height: `${(e.energy / 10) * 36}px` }} />
          <span className="text-gray-400" style={{ fontSize: "8px" }}>{new Date(e.date).getDate()}</span>
        </div>
      ))}
    </div>
  )
}

function ToneChart({ entries }) {
  const scored = entries.filter(e => e.tone).slice(-20)
  if (scored.length < 2) return <p className="text-sm text-gray-400 text-center py-4">Save a few entries with AI tone analysis to see dynamics</p>
  const toneVal = tn => Math.max(0, TONE_ORDER.indexOf(tn))
  const vals = scored.map(e => toneVal(e.tone))
  const maxV = Math.max(...vals), minV = Math.min(...vals)
  const norm = v => maxV === minV ? 0.5 : (v - minV) / (maxV - minV)
  const W = 300, H = 80
  const pts = scored.map((e, i) => {
    const x = (i / (scored.length - 1)) * W
    const y = H - norm(toneVal(e.tone)) * (H - 10) - 5
    return `${x},${y}`
  })
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">📈 Trend</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "80px" }}>
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>
        <polyline points={pts.join(" ")} fill="none" stroke="url(#tg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {scored.map((e, i) => {
          const [x, y] = pts[i].split(",").map(Number)
          return <circle key={i} cx={x} cy={y} r="4" fill={TONE_COLORS[e.tone] || "#c4b5fd"} stroke="#fff" strokeWidth="1.5" />
        })}
      </svg>
      <p className="text-xs text-gray-400 mt-3 mb-1">📊 Daily</p>
      <div className="flex items-end gap-1" style={{ height: "56px" }}>
        {scored.map((e, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={e.tone}>
            <div className="w-full rounded-t-sm" style={{ height: `${(norm(toneVal(e.tone)) * 0.8 + 0.2) * 44}px`, backgroundColor: TONE_COLORS[e.tone] || "#c4b5fd" }} />
            <span className="text-gray-400" style={{ fontSize: "7px" }}>{new Date(e.date).getDate()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WordCloud({ entries }) {
  const freq = {}
  entries.forEach(e => {
    const text = [e.whatHappened, e.emotions, e.triggers, e.gratitude, e.reframe, e.unresolved, e.closing, e.theme].join(" ")
    text.toLowerCase().replace(/[^a-z\u4e00-\u9fff\s]/g, "").split(/\s+/).forEach(w => {
      if (w.length > 3 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
    })
  })
  const words = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40)
  if (!words.length) return <p className="text-sm text-gray-400 text-center py-4">Write more entries to generate a word cloud</p>
  const max = words[0][1]
  const colors = ["text-indigo-600", "text-purple-600", "text-pink-500", "text-blue-500", "text-teal-500", "text-orange-500", "text-rose-500"]
  return (
    <div className="flex flex-wrap gap-2 justify-center py-2">
      {words.map(([w, c], i) => (
        <span key={i} className={`${colors[i % colors.length]} font-semibold inline-block`}
          style={{ fontSize: `${0.7 + (c / max) * 1.6}rem`, opacity: 0.5 + (c / max) * 0.5 }}>
          {w}
        </span>
      ))}
    </div>
  )
}

function ReviewForm({ draft, setDraft, onSave, onReset, sections, saveBtn, accent }) {
  const upd = k => e => setDraft(d => ({ ...d, [k]: e.target.value }))
  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <button onClick={onReset} className="text-xs text-gray-400 underline">← Regenerate</button>
        <span className="text-xs text-indigo-500">✨ AI draft ready — edit and save</span>
      </div>
      {sections.map((sec, si) => (
        <div key={si} className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
          <div className={`px-4 py-2 bg-gradient-to-r ${accent}`}><p className="text-sm font-semibold text-gray-700">{sec.title}</p></div>
          <div className="p-4 space-y-3">
            {sec.items.map(({ k, label }) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <textarea rows={2} value={draft[k] || ""} onChange={upd(k)}
                  className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={onSave} className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-base shadow-lg hover:opacity-90 mb-8">{saveBtn}</button>
    </div>
  )
}

// ── Main Journal ──────────────────────────────────────────────────────────────
export default function Journal({ session }) {
  const [lang, setLang] = useState('en')
  const [tab, setTab] = useState(0)
  const [entry, setEntry] = useState(defaultEntry())
  const [entries, setEntries] = useState([])
  const [savedWeekly, setSavedWeekly] = useState([])
  const [savedMonthly, setSavedMonthly] = useState([])
  const [clarityMoments, setClarityMoments] = useState([])
  const [weeklyDraft, setWeeklyDraft] = useState(null)
  const [monthlyDraft, setMonthlyDraft] = useState(null)
  const [versesLoading, setVersesLoading] = useState(false)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [aiNote, setAiNote] = useState("")
  const [claritySaved, setClaritySaved] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [histFilter, setHistFilter] = useState("daily")
  const [histEntry, setHistEntry] = useState(null)
  const uid = session.user.id

  const tabs = lang === 'zh'
    ? ["日记", "每周", "每月", "仪表盘", "历史"]
    : ["Journal", "Weekly", "Monthly", "Dashboard", "History"]

  // Load all data from Supabase
  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from('entries').select('*').eq('user_id', uid).order('date')
      if (e) setEntries(e.map(fromRow))
      const { data: w } = await supabase.from('weekly_reflections').select('*').eq('user_id', uid)
      if (w) setSavedWeekly(w.map(r => ({ ...r.data, weekOf: r.week_of })))
      const { data: m } = await supabase.from('monthly_reflections').select('*').eq('user_id', uid)
      if (m) setSavedMonthly(m.map(r => ({ ...r.data, month: r.month })))
      const { data: c } = await supabase.from('clarity_moments').select('*').eq('user_id', uid).order('saved_at')
      if (c) setClarityMoments(c)
    })()
  }, [uid])

  const yesterday = (() => {
    const yd = new Date(); yd.setDate(yd.getDate() - 1)
    const yds = yd.toISOString().split("T")[0]
    return entries.find(e => e.date === yds) || null
  })()

  const upd = f => v => setEntry(e => ({ ...e, [f]: v }))

  const analyzeTone = async () => {
    const text = [entry.whatHappened, entry.emotions, entry.triggers, entry.gratitude, entry.reframe, entry.unresolved].filter(Boolean).join(" ")
    if (!text.trim()) { setAiNote(lang === 'zh' ? "请先填写反思内容。" : "Please fill in your reflection first."); return }
    setAnalyzeLoading(true); setAiNote("")
    const tones = lang === 'zh' ? TONES_ZH : TONES_EN
    try {
      const raw = await callClaude([{ role: "user", content: `Analyze this journal reflection. Return ONLY valid JSON, no markdown:\n\n"${text}"\n\n{"mood":7,"energy":6,"tone":"Grounded","toneReason":"one sentence","clarityMoment":"one key insight or null"}\n\ntone must be one of: ${tones}` }], 300)
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim())
      setEntry(e => ({ ...e, mood: parsed.mood || e.mood, energy: parsed.energy || e.energy, tone: parsed.tone || e.tone, toneReason: parsed.toneReason || "", clarityMoment: parsed.clarityMoment || null }))
      setAiNote((lang === 'zh' ? "AI 建议：" : "AI suggests: ") + (parsed.toneReason || ""))
      setClaritySaved(false)
    } catch { setAiNote(lang === 'zh' ? "分析失败，请重试。" : "Analysis failed. Please try again.") }
    setAnalyzeLoading(false)
  }

  const fetchVerses = useCallback(async () => {
    const text = [entry.whatHappened, entry.emotions, entry.triggers, entry.unresolved].filter(Boolean).join(" ")
    if (!text.trim()) return
    setVersesLoading(true)
    try {
      const raw = await callClaude([{ role: "user", content: `Suggest 2-3 Bible verses for this reflection. Return ONLY a JSON array, no markdown:\n"${text}"\n[{"reference":"Book Ch:V","text":"verse","relevance":"why it fits"}]` }], 700)
      setEntry(e => ({ ...e, aiVerses: JSON.parse(raw.replace(/```json|```/g, "").trim()) }))
    } catch {}
    setVersesLoading(false)
  }, [entry.whatHappened, entry.emotions, entry.triggers, entry.unresolved])

  const saveEntry = async () => {
    const row = toRow(entry, uid)
    await supabase.from('entries').upsert(row, { onConflict: 'user_id,date' })
    const idx = entries.findIndex(e => e.date === entry.date)
    const updated = idx >= 0 ? entries.map((e, i) => i === idx ? entry : e) : [...entries, entry]
    setEntries(updated)
    setSaveMsg(lang === 'zh' ? "✅ 已保存！" : "✅ Entry saved!")
    setTimeout(() => setSaveMsg(""), 2500)
  }

  const handleCarryover = async (result, note) => {
    await supabase.from('entries').update({ carryover_result: result, carryover_note: note, carryover_action: yesterday?.action }).eq('user_id', uid).eq('date', entry.date)
    setEntries(entries.map(e => e.date === entry.date ? { ...e, carryoverResult: result, carryoverNote: note } : e))
  }

  const saveClarityMoment = async () => {
    if (!entry.clarityMoment) return
    const { data } = await supabase.from('clarity_moments').insert({ user_id: uid, date: entry.date, text: entry.clarityMoment }).select()
    if (data) setClarityMoments(c => [...c, data[0]])
    setClaritySaved(true)
  }

  const generateReview = async (type) => {
    setReviewLoading(true)
    const cutoff = type === "weekly"
      ? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
      : new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split("T")[0]
    const relevant = entries.filter(e => e.date >= cutoff)
    if (!relevant.length) { setReviewLoading(false); return }
    const summary = relevant.map(e => `Date:${e.date} Mood:${e.mood} Energy:${e.energy} Tone:${e.tone || "N/A"}\nReflection:${e.whatHappened}\nGratitude:${e.gratitude}\nAction:${e.action}\nClosing:${e.closing}`).join("\n---\n")
    const wKeys = "weekOf,avgMood,avgEnergy,dominantTheme,highlights,lowlights,emotionPatterns,stressPatterns,energyPatterns,thoughtPatterns,bibleThemes,keyVerse,applied,alignmentCheck,intentionGap,gapReason,changePattern,continueHabit,adjustment,gratitude,challenge,goodWeek,priorities,closing"
    const mKeys = "month,overallTrend,keyTheme,growth,stagnation,surprises,persistentPatterns,helpingBehaviors,hurtingBehaviors,systemicIssues,bibleConsistency,bibleDepth,scriptureApplied,resistingGrowth,becomingPerson,identityTraits,identityChange,avoiding,excuses,integrity,focusAreas,spiritualGoal,experiment,carryForward,lettingGo"
    try {
      const raw = await callClaude([{ role: "user", content: `Generate a thoughtful ${type} reflection. Return ONLY a JSON object with keys: ${type === "weekly" ? wKeys : mKeys}. 1-3 sentences each. Language: ${lang === 'zh' ? "Chinese" : "English"}.\n\nEntries:\n${summary}` }], 1000)
      const draft = JSON.parse(raw.replace(/```json|```/g, "").trim())
      type === "weekly" ? setWeeklyDraft(draft) : setMonthlyDraft(draft)
    } catch (err) { console.error(err) }
    setReviewLoading(false)
  }

  const saveReview = async (type, draft) => {
    if (type === "weekly") {
      await supabase.from('weekly_reflections').upsert({ user_id: uid, week_of: draft.weekOf || new Date().toISOString().split("T")[0], data: draft }, { onConflict: 'user_id,week_of' })
      setSavedWeekly(w => [...w.filter(x => x.weekOf !== draft.weekOf), draft])
      setSaveMsg(lang === 'zh' ? "✅ 每周反思已保存！" : "✅ Weekly reflection saved!")
    } else {
      await supabase.from('monthly_reflections').upsert({ user_id: uid, month: draft.month || new Date().toISOString().slice(0, 7), data: draft }, { onConflict: 'user_id,month' })
      setSavedMonthly(m => [...m.filter(x => x.month !== draft.month), draft])
      setSaveMsg(lang === 'zh' ? "✅ 每月反思已保存！" : "✅ Monthly reflection saved!")
    }
    setTimeout(() => setSaveMsg(""), 2500)
  }

  // Dashboard stats
  const avgMood = entries.length ? (entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1) : "—"
  const avgEnergy = entries.length ? (entries.reduce((s, e) => s + e.energy, 0) / entries.length).toFixed(1) : "—"
  const streak = (() => {
    if (!entries.length) return 0
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    let s = 0, d = new Date(); d.setHours(0, 0, 0, 0)
    for (const e of sorted) { const ed = new Date(e.date); ed.setHours(0, 0, 0, 0); if (Math.abs(d - ed) <= 86400000) { s++; d = new Date(ed - 86400000) } else break }
    return s
  })()
  const tonedEntries = entries.filter(e => e.tone)
  const topTone = tonedEntries.length ? (() => { const c = {}; tonedEntries.forEach(e => { c[e.tone] = (c[e.tone] || 0) + 1 }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0] })() : null
  const themes = entries.map(e => e.theme).filter(Boolean)
  const themeCounts = themes.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a }, {})
  const topThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const wSections = [
    { title: "1. Week Snapshot", items: [{ k: "weekOf", label: "Week of" }, { k: "avgMood", label: "Avg Mood" }, { k: "avgEnergy", label: "Avg Energy" }, { k: "dominantTheme", label: "Dominant Theme" }] },
    { title: "2. Highlights & Lowlights", items: [{ k: "highlights", label: "Highlights" }, { k: "lowlights", label: "Lowlights" }] },
    { title: "3. Pattern Recognition", items: [{ k: "emotionPatterns", label: "Emotion patterns" }, { k: "stressPatterns", label: "Stress triggers" }, { k: "energyPatterns", label: "Energy sources" }, { k: "thoughtPatterns", label: "Negative patterns" }] },
    { title: "4. Bible Reflection", items: [{ k: "bibleThemes", label: "Bible themes" }, { k: "keyVerse", label: "Key verse" }, { k: "applied", label: "Applied?" }] },
    { title: "5. Alignment Check", items: [{ k: "alignmentCheck", label: "Living my values?" }, { k: "intentionGap", label: "Intention gap" }, { k: "gapReason", label: "Why?" }] },
    { title: "6. Behavior Adjustment", items: [{ k: "changePattern", label: "Change" }, { k: "continueHabit", label: "Continue" }, { k: "adjustment", label: "Adjustment" }] },
    { title: "7. Gratitude", items: [{ k: "gratitude", label: "Grateful for" }, { k: "challenge", label: "Shaping challenge" }] },
    { title: "8. Weekly Reset", items: [{ k: "goodWeek", label: "Good week looks like" }, { k: "priorities", label: "Priorities" }, { k: "closing", label: "Closing prayer" }] },
  ]
  const mSections = [
    { title: "1. Month Overview", items: [{ k: "month", label: "Month" }, { k: "overallTrend", label: "Overall trend" }, { k: "keyTheme", label: "Key theme" }] },
    { title: "2. Progress & Regression", items: [{ k: "growth", label: "Where I grew" }, { k: "stagnation", label: "Where I stagnated" }, { k: "surprises", label: "Surprises" }] },
    { title: "3. Deep Patterns", items: [{ k: "persistentPatterns", label: "Persistent patterns" }, { k: "helpingBehaviors", label: "Helping behaviors" }, { k: "hurtingBehaviors", label: "Hurting behaviors" }, { k: "systemicIssues", label: "Systemic issues" }] },
    { title: "4. Spiritual Growth", items: [{ k: "bibleConsistency", label: "Consistency" }, { k: "bibleDepth", label: "Depth" }, { k: "scriptureApplied", label: "Applied" }, { k: "resistingGrowth", label: "Resisting" }] },
    { title: "5. Identity & Direction", items: [{ k: "becomingPerson", label: "Becoming who I want?" }, { k: "identityTraits", label: "Reinforcing traits" }, { k: "identityChange", label: "Deeper change needed" }] },
    { title: "6. Hard Truths", items: [{ k: "avoiding", label: "Avoiding" }, { k: "excuses", label: "Excuses" }, { k: "integrity", label: "Out of integrity" }] },
    { title: "7. Next Month Strategy", items: [{ k: "focusAreas", label: "Focus areas" }, { k: "spiritualGoal", label: "Spiritual goal" }, { k: "experiment", label: "Experiment" }] },
    { title: "8. Closing Reflection", items: [{ k: "carryForward", label: "Carrying forward" }, { k: "lettingGo", label: "Letting go" }] },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-indigo-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-indigo-800">📔 {lang === 'zh' ? '亲爱的日记' : 'Dear Diary'}</h1>
            <p className="text-xs text-gray-400">{session.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
            <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all">
              {lang === 'en' ? '中文' : 'English'}
            </button>
            <button onClick={() => supabase.auth.signOut()}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
              {lang === 'zh' ? '退出' : 'Sign out'}
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto">
          {tabs.map((name, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${tab === i ? "bg-indigo-600 text-white shadow" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">

        {/* JOURNAL */}
        {tab === 0 && (
          <div>
            <ActionCarryover yesterday={yesterday} onRespond={handleCarryover} lang={lang} />
            <Section title={lang === 'zh' ? "1. 今日快照" : "1. Context Snapshot"}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500">{lang === 'zh' ? '日期' : 'Date'}</label>
                  <input type="date" value={entry.date} onChange={e => upd("date")(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">{lang === 'zh' ? '一词主题' : 'One-Word Theme'}</label>
                  <ThemePicker value={entry.theme} onChange={upd("theme")} lang={lang} />
                </div>
              </div>
              <p className="text-xs text-gray-400 italic mb-3">{lang === 'zh' ? '先填写反思内容，然后点击检测情绪状态' : 'Fill in your reflection below first, then tap to detect emotional tone'}</p>
              <Slider label={lang === 'zh' ? '整体心情' : 'Overall Mood'} value={entry.mood} onChange={upd("mood")} emoji={MOODS} />
              <Slider label={lang === 'zh' ? '能量水平' : 'Energy Level'} value={entry.energy} onChange={upd("energy")} emoji={ENERGY} />
              {entry.tone && (
                <div className="mt-2 mb-3 p-3 rounded-xl border flex items-center gap-3"
                  style={{ backgroundColor: (TONE_COLORS[entry.tone] || "#e0e7ff") + "66", borderColor: TONE_COLORS[entry.tone] || "#e0e7ff" }}>
                  <span className="text-2xl">{TONE_ICONS[entry.tone] || "🌊"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{entry.tone}</p>
                    {entry.toneReason && <p className="text-xs text-gray-500 mt-0.5">{entry.toneReason}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{lang === 'zh' ? '情绪状态' : 'Emotional Tone'}</span>
                </div>
              )}
              <button onClick={analyzeTone} disabled={analyzeLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow">
                {analyzeLoading ? (lang === 'zh' ? '✨ 正在分析…' : '✨ Analyzing…') : (lang === 'zh' ? '✨ 分析我的情绪状态' : '✨ Analyze My Emotional Tone')}
              </button>
              {aiNote && <p className="mt-2 text-xs text-teal-700 bg-teal-50 rounded-lg p-2">{aiNote}</p>}
            </Section>

            <Section title={lang === 'zh' ? "2. 每日反思与感恩" : "2. Daily Reflection & Gratitude"}>
              <Field label={lang === 'zh' ? "今天有什么让你印象深刻的事？" : "What stood out today?"} value={entry.whatHappened} onChange={upd("whatHappened")} placeholder={lang === 'zh' ? "捕捉重点…" : "Capture the signal…"} />
              <Field label={lang === 'zh' ? "我感受最强烈的情绪是什么？为什么？" : "What emotions did I feel most strongly, and why?"} value={entry.emotions} onChange={upd("emotions")} placeholder={lang === 'zh' ? "诚实而具体…" : "Be honest and specific…"} />
              <Field label={lang === 'zh' ? "什么引发了压力、喜悦或沮丧？" : "What triggered stress, joy, or frustration?"} value={entry.triggers} onChange={upd("triggers")} placeholder={lang === 'zh' ? "寻找根本原因…" : "Look for root causes…"} />
              <Field label={lang === 'zh' ? "今天我感恩什么？" : "What am I grateful for today?"} value={entry.gratitude} onChange={upd("gratitude")} placeholder={lang === 'zh' ? "大事小事都可以…" : "Small or large…"} />
              <Field label={lang === 'zh' ? "有什么事情可以用更积极的方式重新理解？" : "Is there anything I can reframe more positively?"} value={entry.reframe} onChange={upd("reframe")} placeholder={lang === 'zh' ? "我可以如何转变叙事？" : "What narrative can I shift?"} rows={2} />
              <Field label={lang === 'zh' ? "有什么事情感觉没有解决？" : "Did anything feel unresolved?"} value={entry.unresolved} onChange={upd("unresolved")} placeholder={lang === 'zh' ? "说出来…" : "Name it…"} rows={2} />
              <button onClick={fetchVerses}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow">
                {versesLoading ? (lang === 'zh' ? '✨ 正在寻找经文…' : '✨ Finding scriptures…') : (lang === 'zh' ? '✨ 为我推荐相关圣经经文' : '✨ Suggest Related Bible Verses')}
              </button>
              {entry.aiVerses?.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-indigo-500 uppercase">{lang === 'zh' ? '✨ 相关经文' : '✨ Related Scriptures'}</p>
                  {entry.aiVerses.map((v, i) => (
                    <div key={i} className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-700">{v.reference}</p>
                      <p className="text-sm text-gray-700 mt-1 italic">"{v.text}"</p>
                      <p className="text-xs text-gray-500 mt-1">{v.relevance}</p>
                    </div>
                  ))}
                </div>
              )}
              {entry.clarityMoment && (
                <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                  <p className="text-xs font-bold text-amber-600 uppercase mb-1">{lang === 'zh' ? '✨ 清醒时刻' : '✨ Clarity Moment'}</p>
                  <p className="text-sm text-gray-800 italic">"{entry.clarityMoment}"</p>
                  <button onClick={saveClarityMoment} disabled={claritySaved}
                    className={`mt-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${claritySaved ? "bg-amber-100 text-amber-500" : "bg-amber-400 text-white hover:bg-amber-500"}`}>
                    {claritySaved ? (lang === 'zh' ? '已保存 ✓' : 'Saved ✓') : (lang === 'zh' ? '保存这个洞见' : 'Save this insight')}
                  </button>
                </div>
              )}
            </Section>

            <Section title={lang === 'zh' ? "3. 圣经 / 经文" : "3. Bible / Verse"} optional={lang === 'zh' ? "（可选）" : "(optional)"} accent="from-blue-50 to-indigo-50">
              <p className="text-xs text-gray-400 mb-3 italic">{lang === 'zh' ? "如果今天没有读经，可以跳过！" : "Skip if not reading today — use AI verse suggestions above!"}</p>
              <Field label={lang === 'zh' ? "段落" : "Passage(s)"} value={entry.passage} onChange={upd("passage")} placeholder="e.g. John 15:1–17" rows={1} />
              <Field label={lang === 'zh' ? "关键经文" : "Key Verse(s)"} value={entry.keyVerse} onChange={upd("keyVerse")} placeholder={lang === 'zh' ? "写出让你印象深刻的经文…" : "Write the verse that stood out…"} rows={2} />
              <Field label={lang === 'zh' ? "这段经文如何与我今天的生活相关？" : "How does this speak into my life today?"} value={entry.lifeConnection} onChange={upd("lifeConnection")} placeholder={lang === 'zh' ? "具体而个人化…" : "Make it personal…"} />
            </Section>

            <Section title={lang === 'zh' ? "4. 结语 / 祷告" : "4. Closing Thought / Prayer"} accent="from-purple-50 to-pink-50">
              <Field label={lang === 'zh' ? "明天我要采取的一个小行动" : "One small action I'll take tomorrow"} value={entry.action} onChange={upd("action")} placeholder={lang === 'zh' ? "保持具体且简单…" : "Keep it concrete and tiny…"} rows={2} />
              <Field label={lang === 'zh' ? "自由反思、祷告或对明天的意图" : "Free reflection, prayer, or intention"} value={entry.closing} onChange={upd("closing")} placeholder={lang === 'zh' ? "自由表达…" : "Speak freely…"} rows={4} />
            </Section>

            <button onClick={saveEntry} className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-base shadow-lg hover:opacity-90 mb-8">
              {lang === 'zh' ? '💾 保存今日日记' : '💾 Save Entry'}
            </button>
          </div>
        )}

        {/* WEEKLY */}
        {tab === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">📅 {lang === 'zh' ? '每周反思' : 'Weekly Reflection'}</h2>
            <p className="text-xs text-gray-400 mb-4">{lang === 'zh' ? 'AI 从你过去 7 天的日记中提取内容。' : 'AI draws from your last 7 days of entries.'}</p>
            {!weeklyDraft ? (
              <div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border mb-4 text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    {lang === 'zh' ? '你有' : 'You have'} <span className="font-bold text-indigo-600">{entries.filter(e => e.date >= new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]).length}</span> {lang === 'zh' ? '条过去7天的记录。' : 'entries from the last 7 days.'}
                  </p>
                  <button onClick={() => generateReview("weekly")} disabled={reviewLoading}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 disabled:opacity-50">
                    {reviewLoading ? '✨ Generating…' : (lang === 'zh' ? '✨ 生成每周草稿' : '✨ Generate AI Weekly Draft')}
                  </button>
                </div>
                {savedWeekly.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">{lang === 'zh' ? '已保存的每周反思' : 'Saved Weekly Reflections'}</h3>
                    {savedWeekly.map((w, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-sm border mb-2">
                        <p className="font-semibold text-indigo-700 text-sm">{w.weekOf}</p>
                        <p className="text-xs text-gray-500 mt-1">{w.dominantTheme}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ReviewForm draft={weeklyDraft} setDraft={setWeeklyDraft} onSave={() => saveReview("weekly", weeklyDraft)} onReset={() => setWeeklyDraft(null)} sections={wSections} saveBtn={lang === 'zh' ? '💾 保存每周反思' : '💾 Save Weekly Reflection'} accent="from-indigo-50 to-purple-50" />
            )}
          </div>
        )}

        {/* MONTHLY */}
        {tab === 2 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🗓️ {lang === 'zh' ? '每月反思' : 'Monthly Reflection'}</h2>
            <p className="text-xs text-gray-400 mb-4">{lang === 'zh' ? 'AI 综合你过去 30 天的内容。' : 'AI synthesizes your last 30 days.'}</p>
            {!monthlyDraft ? (
              <div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border mb-4 text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    {lang === 'zh' ? '你有' : 'You have'} <span className="font-bold text-purple-600">{entries.filter(e => e.date >= new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split("T")[0]).length}</span> {lang === 'zh' ? '条过去30天的记录。' : 'entries from the last 30 days.'}
                  </p>
                  <button onClick={() => generateReview("monthly")} disabled={reviewLoading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 disabled:opacity-50">
                    {reviewLoading ? '✨ Generating…' : (lang === 'zh' ? '✨ 生成每月草稿' : '✨ Generate AI Monthly Draft')}
                  </button>
                </div>
                {savedMonthly.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">{lang === 'zh' ? '已保存的每月反思' : 'Saved Monthly Reflections'}</h3>
                    {savedMonthly.map((m, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-sm border mb-2">
                        <p className="font-semibold text-purple-700 text-sm">{m.month}</p>
                        <p className="text-xs text-gray-500 mt-1">{m.keyTheme}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ReviewForm draft={monthlyDraft} setDraft={setMonthlyDraft} onSave={() => saveReview("monthly", monthlyDraft)} onReset={() => setMonthlyDraft(null)} sections={mSections} saveBtn={lang === 'zh' ? '💾 保存每月反思' : '💾 Save Monthly Reflection'} accent="from-purple-50 to-pink-50" />
            )}
          </div>
        )}

        {/* DASHBOARD */}
        {tab === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">📊 {lang === 'zh' ? '洞见仪表盘' : 'Insights Dashboard'}</h2>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: lang === 'zh' ? '平均心情' : 'Avg Mood', value: avgMood, icon: "😊", c: "from-indigo-400 to-indigo-600" },
                { label: lang === 'zh' ? '平均能量' : 'Avg Energy', value: avgEnergy, icon: "⚡", c: "from-purple-400 to-purple-600" },
                { label: lang === 'zh' ? '连续天数' : 'Day Streak', value: streak, icon: "🔥", c: "from-orange-400 to-red-500" },
                { label: lang === 'zh' ? '主要情绪' : 'Top Tone', value: topTone ? TONE_ICONS[topTone] || "🌊" : "—", icon: "", c: "from-teal-400 to-emerald-500" },
              ].map((s, i) => (
                <div key={i} className={`bg-gradient-to-br ${s.c} rounded-2xl p-2 text-white text-center shadow`}>
                  <p className="text-xl">{s.icon || s.value}</p>
                  {s.icon && <p className="text-lg font-bold">{s.value}</p>}
                  <p className="text-xs opacity-80 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-2xl p-3 shadow-sm border text-center"><p className="text-2xl font-bold text-indigo-600">{entries.length}</p><p className="text-xs text-gray-400">{lang === 'zh' ? '总记录数' : 'Total Entries'}</p></div>
              <div className="bg-white rounded-2xl p-3 shadow-sm border text-center"><p className="text-2xl font-bold text-amber-500">{clarityMoments.length}</p><p className="text-xs text-gray-400">{lang === 'zh' ? '清醒时刻' : 'Clarity Moments'}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-4">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">🌊 {lang === 'zh' ? '情绪状态动态' : 'Emotional Tone Dynamics'}</h3>
              <ToneChart entries={entries} />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-4">
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">☁️ {lang === 'zh' ? '词云' : 'Word Cloud'}</h3>
              <WordCloud entries={entries} />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-4">
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">📈 {lang === 'zh' ? '心情与能量趋势' : 'Mood & Energy Trend'}</h3>
              <div className="flex gap-3 mb-1 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block" /> {lang === 'zh' ? '心情' : 'Mood'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-300 inline-block" /> {lang === 'zh' ? '能量' : 'Energy'}</span>
              </div>
              <MoodChart entries={entries} />
            </div>
            {topThemes.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border mb-4">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">🏷️ {lang === 'zh' ? '热门主题' : 'Top Themes'}</h3>
                <div className="flex flex-wrap gap-2">
                  {topThemes.map(([th, c], i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{th} <span className="opacity-60">×{c}</span></span>
                  ))}
                </div>
              </div>
            )}
            {entries.length === 0 && <div className="text-center py-8 text-gray-400"><p className="text-4xl mb-2">📔</p><p className="text-sm">{lang === 'zh' ? '开始写日记，在这里查看你的洞见' : 'Start journaling to see your insights here'}</p></div>}
          </div>
        )}

        {/* HISTORY */}
        {tab === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">📚 {lang === 'zh' ? '所有记录' : 'All Records'}</h2>
            {!histEntry && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {[["daily", lang === 'zh' ? "每日" : "Daily"], ["weekly", lang === 'zh' ? "每周" : "Weekly"], ["monthly", lang === 'zh' ? "每月" : "Monthly"], ["clarity", lang === 'zh' ? "✨ 洞见" : "✨ Clarity"]].map(([f, label]) => (
                  <button key={f} onClick={() => setHistFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${histFilter === f ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {histEntry ? (
              <div>
                <button onClick={() => setHistEntry(null)} className="mb-4 text-sm text-indigo-600 font-semibold">{lang === 'zh' ? '← 返回' : '← Back'}</button>
                <div className="bg-white rounded-2xl p-5 shadow border border-gray-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-indigo-700">{histEntry.date}</h3>
                    <div className="text-right text-xs text-gray-500">
                      <p>😊{histEntry.mood}/10 ⚡{histEntry.energy}/10</p>
                      {histEntry.tone && <p className="font-semibold mt-0.5">{TONE_ICONS[histEntry.tone] || "🌊"} {histEntry.tone}</p>}
                    </div>
                  </div>
                  {histEntry.theme && <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">{histEntry.theme}</span>}
                  {histEntry.carryoverResult && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-700">{histEntry.carryoverResult === "yes" ? "✅ Followed through" : "⚠️ Didn't quite make it"}</p>
                      {histEntry.carryoverNote && <p className="text-xs text-gray-600 mt-0.5">{histEntry.carryoverNote}</p>}
                    </div>
                  )}
                  {[["whatHappened", "What Happened"], ["emotions", "Emotions"], ["gratitude", "Gratitude"], ["action", "Action"], ["closing", "Closing"]].map(([k, label]) => histEntry[k] ? (
                    <div key={k}><p className="text-xs text-gray-500 font-semibold uppercase">{label}</p><p className="text-sm text-gray-700">{histEntry[k]}</p></div>
                  ) : null)}
                  {histEntry.aiVerses?.length > 0 && (
                    <div>
                      <p className="text-xs text-indigo-500 font-semibold uppercase mb-2">Related Scriptures</p>
                      {histEntry.aiVerses.map((v, i) => (
                        <div key={i} className="p-2 bg-indigo-50 rounded-lg mb-1">
                          <p className="text-xs font-bold text-indigo-700">{v.reference}</p>
                          <p className="text-xs italic text-gray-600">"{v.text}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {histFilter === "daily" && (
                  entries.length === 0
                    ? <p className="text-gray-400 text-sm text-center py-8">{lang === 'zh' ? '还没有记录。' : 'No entries yet.'}</p>
                    : [...entries].sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
                      <button key={i} onClick={() => setHistEntry(e)}
                        className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow transition-all">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">{e.date} <span className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString("en-US", { weekday: "short" })}</span></p>
                            {e.theme && <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">{e.theme}</span>}
                          </div>
                          <div className="text-right text-xs text-gray-500 space-y-0.5">
                            <p>😊{e.mood}/10 ⚡{e.energy}/10</p>
                            {e.tone && <p className="font-semibold" style={{ color: "#7c3aed" }}>{TONE_ICONS[e.tone] || "🌊"} {e.tone}</p>}
                          </div>
                        </div>
                        {e.whatHappened && <p className="mt-2 text-xs text-gray-500 line-clamp-2">{e.whatHappened}</p>}
                      </button>
                    ))
                )}
                {histFilter === "weekly" && (
                  savedWeekly.length === 0
                    ? <p className="text-gray-400 text-sm text-center py-8">{lang === 'zh' ? '还没有每周记录。' : 'No weekly records yet.'}</p>
                    : [...savedWeekly].reverse().map((w, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border">
                        <p className="font-semibold text-indigo-700">📅 {w.weekOf}</p>
                        {w.dominantTheme && <p className="text-xs text-gray-500 mt-1">{w.dominantTheme}</p>}
                        {w.highlights && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{w.highlights}</p>}
                      </div>
                    ))
                )}
                {histFilter === "monthly" && (
                  savedMonthly.length === 0
                    ? <p className="text-gray-400 text-sm text-center py-8">{lang === 'zh' ? '还没有每月记录。' : 'No monthly records yet.'}</p>
                    : [...savedMonthly].reverse().map((m, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border">
                        <p className="font-semibold text-purple-700">🗓️ {m.month}</p>
                        {m.keyTheme && <p className="text-xs text-gray-500 mt-1">{m.keyTheme}</p>}
                        {m.growth && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{m.growth}</p>}
                      </div>
                    ))
                )}
                {histFilter === "clarity" && (
                  clarityMoments.length === 0
                    ? <p className="text-gray-400 text-sm text-center py-8">{lang === 'zh' ? '还没有清醒时刻。' : 'No clarity moments yet.'}</p>
                    : [...clarityMoments].reverse().map((c, i) => (
                      <div key={i} className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100">
                        <p className="text-xs text-amber-500 font-semibold mb-1">{c.date}</p>
                        <p className="text-sm text-gray-800 italic">"{c.text}"</p>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dove entries={entries} lang={lang} />
    </div>
  )
}
