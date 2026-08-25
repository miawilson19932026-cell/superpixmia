import { useEffect, useState, type FormEvent } from 'react'
import { useAuth, passwordFlagKey } from '../lib/auth'
import { useBackdropDismiss } from '../lib/useBackdropDismiss'
import { useTranslation } from '../i18n'

type Mode = 'signin' | 'signup'
// Sign-in can be password, or email-code (covers accounts that were created via
// OTP but never finished setting a password).
type SigninMethod = 'password' | 'code'
// Sign-up is a 3-step flow: send code → verify code → set password.
type SignupStep = 'send' | 'verify' | 'password'

interface Translations {
  authErrorInvalid: string
  authErrorExists: string
  authEmailNotFound: string
  authCodeInvalid: string
}

// Map the most common supabase error strings to friendly localized copy.
// Anything unrecognized falls through to the raw message.
function friendlyError(msg: string, t: Translations): string {
  if (/invalid login credentials/i.test(msg)) return t.authErrorInvalid
  if (/already registered|already been registered/i.test(msg)) return t.authErrorExists
  if (/not found/i.test(msg)) return t.authEmailNotFound
  if (/expired or is invalid/i.test(msg)) return t.authCodeInvalid
  return msg
}

export default function LoginModal() {
  const { loginOpen, closeLogin, signIn, sendCode, verifyCode, setPassword, resetPassword, user, passwordSetupOpen, passwordSetupReason, closePasswordSetup, loginReason } = useAuth()
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('signin')
  const [signinMethod, setSigninMethod] = useState<SigninMethod>('password')
  const [signupStep, setSignupStep] = useState<SignupStep>('send')
  const [codeSent, setCodeSent] = useState(false) // sign-in code method: code delivered
  const [email, setEmail] = useState('')
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Forgot-password view: replaces the sign-in form with a "send reset email"
  // prompt. resetSent switches from the form to a "check your inbox" note.
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  // Seconds remaining before the code can be sent again (12s guard against
  // double-sends / resend spam).
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])
  // Arrived via an expired recovery link (the mail client's security pre-check
  // consumed the one-time token before the user clicked) → land straight on the
  // "send a new reset email" view so the user can recover in one step.
  useEffect(() => {
    if (loginOpen && loginReason === 'link-expired') {
      setForgotOpen(true)
      setResetSent(false)
      setError(null)
      setNotice(null)
    }
  }, [loginOpen, loginReason])

  // Drag-to-close guard (shared with the lightbox + dialogs): see useBackdropDismiss.
  const { onBackdropPointerDown, onBackdropClick } = useBackdropDismiss()

  const inputCls =
    'w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] text-[var(--text-primary)] text-sm rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors'
  const btnCls =
    'w-full py-2.5 rounded-[var(--radius-md)] btn-gradient text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed'

  // New account that just signed in via the email link → finish by setting a
  // password so they can sign in with email+password later. Only offered once:
  // mark the account so future visits (reload within the created_at window)
  // don't re-prompt.
  if (passwordSetupOpen) {
    const markPasswordDone = () => {
      try { localStorage.setItem(passwordFlagKey(user?.email ?? email), '1') } catch { /* ignore */ }
    }
    const finish = async () => {
      if (password.length < 6) { setError(t.authPasswordTooShort); return }
      if (password !== confirm) { setError(t.authPasswordMismatch); return }
      setError(null); setNotice(null); setSubmitting(true)
      const err = await setPassword(password)
      setSubmitting(false)
      if (err) { setError(friendlyError(err.message, t)); return }
      markPasswordDone()
      closeLogin()
      closePasswordSetup()
    }
    const skip = () => { markPasswordDone(); closeLogin(); closePasswordSetup() }
    return (
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onPointerDownCapture={onBackdropPointerDown}
        onClick={(e) => onBackdropClick(e, skip)}
      >
        <div
          className="relative w-full max-w-sm rounded-2xl glass modal-card border border-white/10 p-5 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold text-gradient">{passwordSetupReason === 'recovery' ? t.authResetTitle : t.authSetPasswordTitle}</h3>
          <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{t.authSetPasswordHint}</p>
          <p className="text-xs text-[var(--text-primary)] truncate glass rounded-[var(--radius-sm)] px-3 py-2">
            {user?.email ?? email}
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); finish() }}
            className="space-y-3"
          >
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder={t.authSetPassword}
              autoComplete="new-password"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t.authConfirmPassword}
              autoComplete="new-password"
              className={inputCls}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={submitting || password.length < 6 || confirm.length < 6} className={btnCls}>
              {submitting ? t.authSubmitting : t.authSetPassword}
            </button>
            <button
              type="button"
              onClick={skip}
              className="w-full text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)]"
            >
              {t.authSkip}
            </button>
          </form>
          <button
            type="button"
            onClick={skip}
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

  if (!loginOpen) return null // SSR-safe: false during prerender

  const emailValid = /\S+@\S+\.\S+/.test(email.trim())

  const reset = (m: Mode) => {
    setMode(m)
    setSigninMethod('password')
    setSignupStep('send')
    setCodeSent(false)
    setCooldown(0)
    setError(null)
    setNotice(null)
    // email/password persist — switching tabs shouldn't lose what was typed
  }

  const switchMethod = (m: SigninMethod) => {
    setSigninMethod(m)
    setCodeSent(false)
    setCooldown(0)
    setError(null)
    setNotice(null)
  }

  // Sign-in with email + password
  const submitPassword = async () => {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const err = await signIn(email.trim(), password)
    setSubmitting(false)
    if (err) {
      setError(friendlyError(err.message, t))
      return
    }
    closeLogin() // session established → AuthProvider updates user
  }

  // Send the OTP email (sign-in code method, or sign-up step 1 / resend)
  const sendCodeNow = async () => {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const err = await sendCode(email.trim(), mode === 'signup')
    setSubmitting(false)
    if (err) {
      setError(friendlyError(err.message, t))
      return
    }
    setCodeSent(true)
    setNotice(t.authCodeSent)
    setCooldown(12)
    if (mode === 'signup') setSignupStep('verify')
  }

  // Verify the OTP code (sign-in code method, or sign-up step 2)
  const submitCode = async () => {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const err = await verifyCode(email.trim(), code)
    setSubmitting(false)
    if (err) {
      setError(friendlyError(err.message, t))
      return
    }
    if (mode === 'signup') {
      setSignupStep('password') // verified → now choose a password
    } else {
      closeLogin() // code sign-in done
    }
  }

  // Sign-up step 3: set the account password
  const finishSignup = async () => {
    if (password.length < 6) {
      setError(t.authPasswordTooShort)
      return
    }
    if (password !== confirm) {
      setError(t.authPasswordMismatch)
      return
    }
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const err = await setPassword(password)
    setSubmitting(false)
    if (err) {
      setError(friendlyError(err.message, t))
      return
    }
    try { localStorage.setItem(passwordFlagKey(email.trim()), '1') } catch { /* ignore */ }
    closeLogin() // account created + verified + password set → done
  }

  // Forgot-password: send the recovery email (the link lands back on the app,
  // where AuthProvider opens the set-password overlay).
  const submitReset = async () => {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const err = await resetPassword(email.trim())
    setSubmitting(false)
    if (err) {
      setError(friendlyError(err.message, t))
      return
    }
    setResetSent(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'signin') return signinMethod === 'password' ? submitPassword() : codeSent ? submitCode() : sendCodeNow()
    if (signupStep === 'send') return sendCodeNow()
    if (signupStep === 'verify') return submitCode()
    return finishSignup()
  }

  const primaryLabel =
    mode === 'signin'
      ? signinMethod === 'password'
        ? t.authSignIn
        : t.authVerify
      : signupStep === 'send'
        ? t.authSendCode
        : signupStep === 'verify'
          ? t.authVerify
          : t.authDone

  const canSubmit =
    mode === 'signin'
      ? signinMethod === 'password'
        ? emailValid && password.length >= 6
        : codeSent && code.trim().length >= 6
      : signupStep === 'send'
        ? emailValid
        : signupStep === 'verify'
          ? code.trim().length >= 6
          : emailValid && password.length >= 6 && confirm.length >= 6

  // Which step label shows above the fields (progress indicator)
  const stepLabel =
    mode === 'signup'
      ? signupStep === 'send'
        ? t.authStepEmail
        : signupStep === 'verify'
          ? t.authStepCode
          : t.authStepPassword
      : null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onPointerDownCapture={onBackdropPointerDown}
      onClick={(e) => onBackdropClick(e, closeLogin)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl glass modal-card border border-white/10 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sign in / Create account tabs */}
        <div className="flex rounded-[var(--radius-sm)] border border-[var(--border)] p-0.5 gap-0.5">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => reset(m)}
              className={`flex-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all ${
                mode === m ? 'glass-active text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
            >
              {m === 'signin' ? t.authSignIn : t.authSignUp}
            </button>
          ))}
        </div>

        {/* Contextual reason for the gate that opened the modal (e.g. the free
            download quota ran out) — sign-in removes the limit entirely. */}
        {loginReason === 'download-limit' && (
          <p className="text-[11px] text-[var(--accent)] font-medium">{t.authDlLimit}</p>
        )}

        {/* Forgot-password view replaces the whole sign-in form */}
        {forgotOpen ? (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gradient">{t.authResetTitle}</h3>
            <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{t.authResetHint}</p>
            {loginReason === 'link-expired' && !resetSent && (
              <p className="text-xs text-amber-300/90 leading-relaxed">{t.authLinkExpired}</p>
            )}
            {resetSent ? (
              <p className="text-xs text-emerald-300 leading-relaxed">{t.authResetSent}</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); submitReset() }} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.authEmail}
                  autoComplete="email"
                  className={inputCls}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button type="submit" disabled={submitting || !emailValid} className={btnCls}>
                  {submitting ? t.authSubmitting : t.authResetSend}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => { setForgotOpen(false); setResetSent(false); setError(null); setNotice(null) }}
              className="w-full text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)]"
            >
              {t.authBackToSignin}
            </button>
          </div>
        ) : (
          <>
        {stepLabel && <p className="text-[11px] text-[var(--text-dim)]">{stepLabel}</p>}

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Email — hidden at sign-up step 3 (already provided) */}
          {!(mode === 'signup' && signupStep === 'password') ? (
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.authEmail}
              autoComplete="email"
              className={inputCls}
            />
          ) : (
            <p className="text-xs text-[var(--text-dim)] truncate">{email.trim()}</p>
          )}

          {/* Password fields */}
          {mode === 'signin' && signinMethod === 'password' && (
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder={t.authPassword}
              autoComplete="current-password"
              className={inputCls}
            />
          )}
          {mode === 'signin' && signinMethod === 'password' && (
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => { setForgotOpen(true); setResetSent(false); setError(null); setNotice(null) }}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                {t.authForgotPassword}
              </button>
            </div>
          )}
          {mode === 'signup' && signupStep === 'password' && (
            <>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder={t.authSetPassword}
                autoComplete="new-password"
                className={inputCls}
              />
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t.authConfirmPassword}
                autoComplete="new-password"
                className={inputCls}
              />
            </>
          )}

          {/* Code field — sign-in code method (after send) or sign-up step 2 */}
          {((mode === 'signin' && signinMethod === 'code' && codeSent) ||
            (mode === 'signup' && signupStep === 'verify')) && (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.authCode}
              className={inputCls}
            />
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {notice && <p className="text-xs text-emerald-300">{notice}</p>}

          {/* Sign-in code method: a dedicated "send code" button comes first */}
          {mode === 'signin' && signinMethod === 'code' && !codeSent ? (
            <button type="button" onClick={sendCodeNow} disabled={submitting || cooldown > 0 || !emailValid} className={btnCls}>
              {submitting ? t.authSubmitting : cooldown > 0 ? t.authCodeCooldown.replace('{s}', String(cooldown)) : t.authSendCode}
            </button>
          ) : (
            <button type="submit" disabled={submitting || !canSubmit} className={btnCls}>
              {submitting ? t.authSubmitting : primaryLabel}
            </button>
          )}

          {/* Sign-in: switch between password and email-code */}
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => switchMethod(signinMethod === 'password' ? 'code' : 'password')}
              className="w-full text-xs text-[var(--accent)] hover:underline"
            >
              {signinMethod === 'password' ? t.authUseCodeLogin : t.authUsePassword}
            </button>
          )}

          {/* Sign-in code method, after sending: resend link with countdown */}
          {mode === 'signin' && signinMethod === 'code' && codeSent && (
            <div className="flex justify-center text-xs">
              <button
                type="button"
                onClick={sendCodeNow}
                disabled={submitting || cooldown > 0}
                className="text-[var(--accent)] hover:underline disabled:opacity-50 disabled:hover:no-underline"
              >
                {submitting ? t.authSubmitting : cooldown > 0 ? t.authCodeCooldown.replace('{s}', String(cooldown)) : t.authResendCode}
              </button>
            </div>
          )}

          {/* Sign-up step 2: back to re-enter email + resend code */}
          {mode === 'signup' && signupStep === 'verify' && (
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setSignupStep('send')
                  setCodeSent(false)
                  setCooldown(0)
                  setError(null)
                  setNotice(null)
                }}
                className="text-[var(--text-dim)] hover:text-[var(--text-primary)]"
              >
                ← {t.authBack}
              </button>
              <button
                type="button"
                onClick={sendCodeNow}
                disabled={submitting || cooldown > 0}
                className="text-[var(--accent)] hover:underline disabled:opacity-50 disabled:hover:no-underline"
              >
                {submitting ? t.authSubmitting : cooldown > 0 ? t.authCodeCooldown.replace('{s}', String(cooldown)) : t.authResendCode}
              </button>
            </div>
          )}
        </form>

          </>
        )}

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
