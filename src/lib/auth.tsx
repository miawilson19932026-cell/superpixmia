import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
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
  // Reason the login modal was opened (e.g. 'download-limit') so it can show
  // contextual copy; cleared when the modal closes.
  loginReason: string | null
  openLogin: (reason?: string) => void
  closeLogin: () => void
  // A brand-new account that just signed in via the email link and has no
  // password yet — LoginModal shows the set-password form for it.
  passwordSetupOpen: boolean
  closePasswordSetup: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// localStorage flag: set once a user has been offered (or completed) a password,
// so the "set a password" prompt shows at most once per account + device.
export function passwordFlagKey(email: string): string {
  return 'spm:pw:' + email.trim().toLowerCase()
}
function hasPasswordFlag(user: User): boolean {
  try {
    return !!localStorage.getItem(passwordFlagKey(user.email ?? ''))
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<string | null>(null)
  const [passwordSetupOpen, setPasswordSetupOpen] = useState(false)
  // True while a session is being established by the app itself (password
  // login / code login / code sign-up). A SIGNED_IN that appears WITHOUT this
  // flag means the user arrived via a link they clicked in the email — for a
  // brand-new account that means "set a password".
  const appSessionRef = useRef(false)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    let mounted = true

    // Handle the email confirmation link (magic link): Supabase emails include a
    // "confirm" URL with ?token_hash=…&type=email. Exchange it for a session so
    // clicking the link signs the user in. Brand-new accounts created this way
    // have no password yet → prompt them to set one (so they can sign in with
    // email+password next time).
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const tokenType = params.get('type')
    if (tokenHash && (tokenType === 'email' || tokenType === 'magiclink')) {
      supabase.auth.verifyOtp({ type: tokenType as 'email', token_hash: tokenHash }).then(({ data, error }) => {
        if (mounted) history.replaceState({}, '', window.location.pathname) // clean the URL
        if (!error && data.user && !hasPasswordFlag(data.user)) {
          // New account = created moments ago by this very link.
          const createdMs = Date.parse(data.user.created_at)
          if (Date.now() - createdMs < 2 * 60 * 1000) setPasswordSetupOpen(true)
        }
      })
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // A brand-new account that just signed in via the email link — either the
      // new ?token_hash= format or the legacy /auth/v1/verify redirect, which
      // the SDK recovers as the initial session — has no password yet → ask
      // them to set one. Sessions the app itself created (password / code /
      // sign-up) carry appSessionRef and are skipped: the sign-up flow already
      // handles its own password step. The passwordFlag prevents re-prompting.
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        session?.user &&
        !appSessionRef.current &&
        !hasPasswordFlag(session.user)
      ) {
        const createdMs = Date.parse(session.user.created_at)
        if (Date.now() - createdMs < 2 * 60 * 1000) setPasswordSetupOpen(true)
      }
      appSessionRef.current = false
      // Note: the modal closes itself (LoginModal calls closeLogin()) so the
      // OTP sign-up flow can keep the modal open through the "set password"
      // step after the session is established.
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const openLogin = useCallback((reason?: string) => {
    setLoginReason(reason ?? null)
    setLoginOpen(true)
  }, [])
  const closeLogin = useCallback(() => {
    setLoginReason(null)
    setLoginOpen(false)
  }, [])
  const closePasswordSetup = useCallback(() => setPasswordSetupOpen(false), [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    appSessionRef.current = true
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) appSessionRef.current = false
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
    appSessionRef.current = true
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email',
    })
    if (error) appSessionRef.current = false
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
      value={{ user, loading, signIn, sendCode, verifyCode, setPassword, signOut, loginOpen, loginReason, openLogin, closeLogin, passwordSetupOpen, closePasswordSetup }}
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

// ── Site-wide free-download quota ────────────────────────────────────────────
// New visitors get FREE_DL_LIMIT downloads across ALL tools (home tools, Studio,
// batch ZIP) before being asked to sign in; signed-in users are unlimited. The
// counter lives in localStorage (per browser) under a fixed key so e2e tests
// can reset it. Only ever called from event handlers — safe from SSR/prerender.
const FREE_DL_KEY = 'spm-free-dl'
export const FREE_DL_LIMIT = 1

export function getFreeDlUsed(): number {
  try {
    return Math.min(parseInt(localStorage.getItem(FREE_DL_KEY) || '0', 10) || 0, FREE_DL_LIMIT)
  } catch {
    return 0
  }
}

// Consume one free download for a logged-out user. Returns true when the
// download may proceed (signed in, or quota left — consuming it); false when
// the quota is exhausted and the login modal has been opened instead.
export function tryConsumeFreeDownload(user: User | null, openLogin: (reason?: string) => void): boolean {
  if (user) return true
  const used = getFreeDlUsed()
  if (used >= FREE_DL_LIMIT) {
    openLogin('download-limit')
    return false
  }
  try {
    localStorage.setItem(FREE_DL_KEY, String(used + 1))
  } catch {
    /* storage unavailable — still allow the download */
  }
  return true
}
