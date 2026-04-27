import { useState } from 'react'
import { supabase } from './supabaseClient'

const PROVIDERS = [
  { id: 'google',   label: 'Google',   bg: 'bg-white border border-gray-200 text-gray-700', icon: '🌐' },
  { id: 'github',   label: 'GitHub',   bg: 'bg-gray-900 text-white', icon: '🐙' },
  { id: 'facebook', label: 'Facebook', bg: 'bg-blue-600 text-white', icon: '📘' },
]

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmail = async e => {
    e.preventDefault()
    setLoading(true); setMsg('')
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) setMsg(error.message)
    else if (mode === 'signup') setMsg('Check your email to confirm your account!')
    setLoading(false)
  }

  const handleSocial = async provider => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">📔</p>
          <h1 className="text-3xl font-bold text-indigo-800">Dear Diary</h1>
          <p className="text-sm text-gray-400 mt-1">Your daily reflection space</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
          {/* Social logins */}
          <div className="space-y-2 mb-5">
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => handleSocial(p.id)}
                className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all ${p.bg}`}>
                <span>{p.icon}</span> Continue with {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" required
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required minLength={6}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
            {msg && (
              <p className={`text-xs px-2 ${msg.includes('Check') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
              {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setMsg('') }}
              className="text-indigo-500 font-semibold hover:underline">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
