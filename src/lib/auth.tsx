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
  // OTP email-code flow. forSignup=true creates the account on first send
  // (sign-up); false requires the account to already exist (code sign-in).
  sendCode: (email: string, forSignup: boolean) => Promise<Error | null>
  verifyCode: (email: string, token: string) => Promise<Error | null>
  setPassword: (password: string) => Promise<Error | null>
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
      // Note: the modal closes itself (LoginModal calls closeLogin()) so the
      // OTP sign-up flow can keep the modal open through the "set password"
      // step after the session is established.
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

  const sendCode = useCallback(async (email: string, forSignup: boolean) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: forSignup },
    })
    return error
  }, [])

  const verifyCode = useCallback(async (email: string, token: string) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email',
    })
    return error
  }, [])

  const setPassword = useCallback(async (password: string) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    const { error } = await supabase.auth.updateUser({ password })
    return error
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, sendCode, verifyCode, setPassword, signOut, loginOpen, openLogin, closeLogin }}
    >
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
