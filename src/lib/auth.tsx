import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import LoginModal from '../components/LoginModal'

interface AuthContextValue {
  user: User | null
  // true only until the initial getSession() resolves — lets the UI render a
  // neutral placeholder instead of flashing "logged out" on refresh
  loading: boolean
  signIn: (email: string, password: string) => Promise<Error | null>
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirm: boolean }>
  signOut: () => Promise<void>
  loginOpen: boolean
  openLogin: () => void
  closeLogin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session) setLoginOpen(false) // close modal on successful sign-in / sign-up
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const openLogin = useCallback(() => setLoginOpen(true), [])
  const closeLogin = useCallback(() => setLoginOpen(false), [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: new Error('Auth is not configured'), needsEmailConfirm: false }
    const { data, error } = await supabase.auth.signUp({ email, password })
    // When email confirmation is ON, signUp returns no session — the modal must
    // show a "check your inbox" notice instead of closing.
    return { error, needsEmailConfirm: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, loginOpen, openLogin, closeLogin }}>
      {children}
      <LoginModal />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
