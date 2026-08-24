import { useTranslation } from '../i18n'
import { useAuth, getProfile, skipProfile } from '../lib/auth'
import ProfileForm from './ProfileForm'

// Optional first-login profile-completion prompt, rendered inside AuthProvider
// (like LoginModal). Two exits only — Save or Skip — both mark the profile as
// handled in user_metadata so the prompt never repeats. No X button: closing by
// accident would silently skip, which is worse than an explicit choice.
export default function ProfileModal() {
  const { t } = useTranslation()
  const { user, profileOpen, closeProfile } = useAuth()

  if (!profileOpen || !user) return null

  const onSkip = async () => {
    await skipProfile()
    closeProfile()
  }

  // Same overlay + glass card pattern as LoginModal, just wider (max-w-md) for
  // the extra fields and vertically scrollable on short viewports.
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl glass border border-white/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onSkip}
          aria-label={t.profileSkip}
          className="absolute right-3 top-3 flex items-center justify-center w-8 h-8 rounded-full glass hover:border-white/[0.14] transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{t.profileTitle}</h2>
        <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t.profileSubtitle}</p>
        <ProfileForm initial={getProfile(user)} submitLabel={t.profileSave} onDone={closeProfile} />
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors py-1"
        >
          {t.profileSkip}
        </button>
      </div>
    </div>
  )
}
