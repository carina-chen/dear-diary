import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Journal from './Journal'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <p className="text-indigo-400 text-sm animate-pulse">Loading…</p>
    </div>
  )

  return session ? <Journal session={session} /> : <Auth />
}
