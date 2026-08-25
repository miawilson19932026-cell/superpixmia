import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import LoginModal from '../components/LoginModal'
import ProfileModal from '../components/ProfileModal'

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
  // Send the "reset password" email. The recovery link (token_hash type=recovery)
  // is captured by AuthProvider on return, which opens the set-password overlay.
  resetPassword: (email: string) => Promise<Error | null>
  // Verify the current password, then set a new one. updateUser({password})
  // requires a fresh session, so this signs in first (proving ownership).
  changePassword: (current: string, next: string) => Promise<Error | null>
  signOut: () => Promise<void>
  loginOpen: boolean
  // Reason the login modal was opened (e.g. 'download-limit') so it can show
  // contextual copy; cleared when the modal closes.
  loginReason: string | null
  openLogin: (reason?: string) => void
  closeLogin: () => void
  // A brand-new account that just signed in via the email link and has no
  // password yet, OR a password reset via the recovery email link — LoginModal
  // shows the set-password form for both; the reason only changes the heading.
  passwordSetupOpen: boolean
  passwordSetupReason: 'signup' | 'recovery'
  closePasswordSetup: () => void
  // Optional first-login profile-completion prompt (ProfileModal). All fields
  // optional; saving or skipping sets profile_completed so it never repeats.
  profileOpen: boolean
  openProfile: () => void
  closeProfile: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// localStorage flag: set once a user has been offered (or completed) a password,
// so the "set a password" prompt shows at most once per account + device.
export function passwordFlagKey(email: string): string {
  return 'spm:pw:' + email.trim().toLowerCase()
}
// localStorage flag: set once the first-login profile prompt has been shown for
// this account + browser, so a refresh doesn't re-open it mid-flow. The durable
// "done" flag lives in user_metadata (profile_completed).
function profileFlagKey(userId: string): string {
  return 'spm:profile:' + userId
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
  const [passwordSetupReason, setPasswordSetupReason] = useState<'signup' | 'recovery'>('signup')
  const [profileOpen, setProfileOpen] = useState(false)
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

    // Captured BEFORE supabase-js cleans the URL (its detectSessionInUrl strips
    // the #access_token=… hash as it restores the session). A legacy recovery
    // link (…/auth/v1/verify?token=…&type=recovery) lands here as
    // #access_token=…&type=recovery — flag it so the set-password overlay opens
    // for accounts of ANY age (the SIGNED_IN handler below only covers
    // brand-new signups via the created_at window).
    const recoveryFromHash = window.location.hash.includes('type=recovery')
    let recoveryOpened = false
    const openRecovery = () => {
      if (recoveryOpened) return
      recoveryOpened = true
      setPasswordSetupReason('recovery')
      setPasswordSetupOpen(true)
    }

    // Handle the email confirmation link (magic link): Supabase emails include a
    // "confirm" URL with ?token_hash=…&type=email. Exchange it for a session so
    // clicking the link signs the user in. Brand-new accounts created this way
    // have no password yet → prompt them to set one (so they can sign in with
    // email+password next time).
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const tokenType = params.get('type')
    if (tokenHash && (tokenType === 'email' || tokenType === 'magiclink' || tokenType === 'recovery')) {
      supabase.auth.verifyOtp({ type: tokenType as 'email' | 'recovery', token_hash: tokenHash }).then(({ data, error }) => {
        if (mounted) history.replaceState({}, '', window.location.pathname) // clean the URL
        if (error || !data.user) return
        if (tokenType === 'recovery') {
          // Password reset: the recovery link proves ownership, so the user can
          // set a NEW password without entering the old one. Open the same
          // set-password overlay, with a "reset" heading.
          openRecovery()
          return
        }
        if (!hasPasswordFlag(data.user)) {
          // New account = created moments ago by this very link.
          const createdMs = Date.parse(data.user.created_at)
          if (Date.now() - createdMs < 2 * 60 * 1000) {
            setPasswordSetupReason('signup')
            setPasswordSetupOpen(true)
          }
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
      if (recoveryFromHash && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // User came back through a password-reset link (legacy #type=recovery
        // hash). Open the set-password overlay regardless of account age.
        openRecovery()
      } else if (
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

  // First-login profile prompt: ask once per account+browser until the user
  // saves or skips (profile_completed in user_metadata). Never at the same time
  // as the set-password overlay OR while the login modal is still open — the
  // OTP sign-up flow ends with a set-password step, and a profile prompt sliding
  // in over it made users think sign-up was done (password never saved → the
  // "wrong password" on next login). When the login modal / password overlay
  // closes, this effect re-runs and opens the profile prompt instead.
  useEffect(() => {
    if (!user || passwordSetupOpen || loginOpen) return
    if (user.user_metadata?.profile_completed) return
    try {
      if (localStorage.getItem(profileFlagKey(user.id))) return
      localStorage.setItem(profileFlagKey(user.id), '1')
    } catch {
      /* storage unavailable — still show the prompt */
    }
    setProfileOpen(true)
  }, [user, passwordSetupOpen, loginOpen])

  const openLogin = useCallback((reason?: string) => {
    setLoginReason(reason ?? null)
    setLoginOpen(true)
  }, [])
  const closeLogin = useCallback(() => {
    setLoginReason(null)
    setLoginOpen(false)
  }, [])
  const closePasswordSetup = useCallback(() => {
    setPasswordSetupReason('signup')
    setPasswordSetupOpen(false)
  }, [])
  const openProfile = useCallback(() => setProfileOpen(true), [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    appSessionRef.current = true
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) appSessionRef.current = false
    return error
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Land back on the app root; AuthProvider's token_hash handler picks up
      // the recovery link and opens the set-password overlay.
      redirectTo: `${window.location.origin}/`,
    })
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

  const changePassword = useCallback(async (current: string, next: string) => {
    const supabase = getSupabase()
    if (!supabase) return new Error('Auth is not configured')
    if (!user?.email) return new Error('No email')
    // updateUser({password}) needs a recent session — re-authenticating with
    // the current password both proves ownership and refreshes the session.
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
    if (signInErr) return signInErr
    const { error } = await supabase.auth.updateUser({ password: next })
    return error
  }, [user])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, sendCode, verifyCode, setPassword, resetPassword, changePassword, signOut, loginOpen, loginReason, openLogin, closeLogin, passwordSetupOpen, passwordSetupReason, closePasswordSetup, profileOpen, openProfile, closeProfile }}
    >
      {children}
      <LoginModal />
      <ProfileModal />
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

// ── User profile (persona fields) ────────────────────────────────────────────
// Optional first-login profile: nickname, birthday, gender, occupation, and
// usage reasons. Stored in Supabase user_metadata so it follows the account
// across devices — no DB table / RLS needed. Every field is optional; saving
// or skipping sets profile_completed so the first-login prompt never repeats.
// Values are option keys (e.g. 'developer', 'male', 'bg'), kept as short
// strings so they are easy to aggregate in the Supabase dashboard.
export interface Profile {
  nickname?: string
  birthday?: string // YYYY-MM-DD
  gender?: string
  avatar?: string // anime avatar key, e.g. 'female-3' (avatars.tsx)
  country?: string // ISO 3166-1 alpha-2 code, e.g. 'CN' (countries.ts)
  occupation?: string
  occupationOther?: string // filled when occupation === 'other'
  reasons?: string[]
  reasonOther?: string // custom text filled when reasons includes 'other'
}

// Read persona fields back from user_metadata, normalizing empty values away.
export function getProfile(user: User): Profile {
  const m = user.user_metadata ?? {}
  return {
    nickname: m.nickname || undefined,
    birthday: m.birthday || undefined,
    gender: m.gender || undefined,
    avatar: m.avatar || undefined,
    country: m.country || undefined,
    occupation: m.occupation || undefined,
    occupationOther: m.occupationOther || undefined,
    reasons: Array.isArray(m.reasons) && m.reasons.length ? m.reasons : undefined,
    reasonOther: m.reasonOther || undefined,
  }
}

// Persist the profile (writes to the active session's user_metadata). Only
// call from event handlers / effects — getSupabase() is not safe at module
// scope or during render.
export async function saveProfile(profile: Profile): Promise<Error | null> {
  const supabase = getSupabase()
  if (!supabase) return new Error('Auth is not configured')
  const { error } = await supabase.auth.updateUser({ data: { ...profile, profile_completed: true } })
  return error
}

// Mark the first-login prompt as handled without collecting any fields, so it
// never repeats. The /profile page still lets the user fill it in later.
export async function skipProfile(): Promise<Error | null> {
  const supabase = getSupabase()
  if (!supabase) return new Error('Auth is not configured')
  const { error } = await supabase.auth.updateUser({ data: { profile_completed: true } })
  return error
}
