import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useTranslation } from '../i18n'

type Mode = 'signin' | 'signup'

// Map the most common supabase error strings to friendly localized copy.
// Anything unrecognized falls through to the raw message.
function friendlyError(msg: string, signInErr: string, existsErr: string): string {
  if (/invalid login credentials/i.test(msg)) return signInErr
  if (/already registered|already been registered/i.test(msg)) return existsErr
  return msg
}

export default function LoginModal() {
  const { loginOpen, closeLogin, signIn, signUp } = useAuth()
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!loginOpen) return null // SSR-safe: false during prerender

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)

    if (mode === 'signin') {
      const err = await signIn(email.trim(), password)
      if (err) setError(friendlyError(err.message, t.authErrorInvalid, t.authErrorExists))
    } else {
      const { error: err, needsEmailConfirm } = await signUp(email.trim(), password)
      if (err) {
        setError(friendlyError(err.message, t.authErrorInvalid, t.authErrorExists))
      } else if (needsEmailConfirm) {
        setNotice(t.authCheckEmail)
        setSubmitting(false)
        return // keep modal open; confirmation is pending
      }
      // else a session exists → onAuthStateChange in AuthProvider closes the modal
    }
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={closeLogin}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl glass border border-white/10 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sign in / Create account tabs */}
        <div className="flex rounded-[var(--radius-sm)] border border-[var(--border)] p-0.5 gap-0.5">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
                setNotice(null)
              }}
              className={`flex-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all ${
                mode === m ? 'glass-active text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
            >
              {m === 'signin' ? t.authSignIn : t.authSignUp}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.authEmail}
            autoComplete="email"
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] text-[var(--text-primary)] text-sm rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.authPassword}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] text-[var(--text-primary)] text-sm rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
          {notice && <p className="text-xs text-emerald-300">{notice}</p>}

          <button
            type="submit"
            disabled={submitting || !valid}
            className="w-full py-2.5 rounded-[var(--radius-md)] btn-gradient text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t.authSubmitting : mode === 'signin' ? t.authSignIn : t.authSignUp}
          </button>
        </form>

        {/* Privacy-assuring copy — login is identity only, images never leave the device */}
        <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">{t.authPrivacyNote}</p>

        <button
          type="button"
          onClick={closeLogin}
          aria-label={t.authClose}
          className="absolute right-3 top-3 flex items-center justify-center w-8 h-8 rounded-full glass hover:border-white/[0.14] transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
