import { useState, type FormEvent } from 'react'
import { useTranslation } from '../i18n'
import { useAuth, getProfile } from '../lib/auth'
import type { AvatarGender } from './Avatar'
import Avatar from './Avatar'
import ProfileForm, { genderLabel, occupationLabel, reasonLabel } from './ProfileForm'
import { countryLabel } from '../lib/countries'

// /profile — Personal Center. Shows the optional persona fields collected on
// first login, the default (gender-distinct) avatar, and a change-password
// form. Empty values show a dash; "Edit" swaps to the shared profile form.
export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, loading, openLogin } = useAuth()
  const [editing, setEditing] = useState(false)

  if (loading) {
    return <div className="mx-auto max-w-md py-16 text-center text-sm text-[var(--text-dim)]">{t.authSubmitting}</div>
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-16 px-4 space-y-4 text-center">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t.profilePageTitle}</h1>
        <p className="text-sm text-[var(--text-dim)]">{t.profileSignInHint}</p>
        <button onClick={() => openLogin()} className="mx-auto block px-5 py-2.5 btn-gradient text-sm font-semibold rounded-[var(--radius-md)]">
          {t.authSignIn}
        </button>
      </div>
    )
  }

  const profile = getProfile(user)
  const displayName = profile.nickname || user.email || '—'
  const avatarGender = (profile.gender ?? '') as AvatarGender

  return (
    <div className="mx-auto max-w-md py-8 px-4 space-y-5">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t.profilePageTitle}</h1>

      {editing ? (
        <>
          <div className="rounded-[var(--radius-lg)] glass border border-white/10 p-5">
            <ProfileForm initial={profile} submitLabel={t.profileSave} onDone={() => setEditing(false)} />
          </div>
          <button onClick={() => setEditing(false)} className="w-full text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors">
            {t.authBack}
          </button>
        </>
      ) : (
        <>
          <div className="rounded-[var(--radius-lg)] glass border border-white/10 p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar gender={avatarGender} avatar={profile?.avatar} className="w-14 h-14" />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[var(--text-primary)] truncate">{displayName}</p>
                  <p className="text-[11px] text-[var(--text-dim)] truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 glass rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
              >
                {t.profileEdit}
              </button>
            </div>

            <div className="border-t border-white/[0.06] pt-4 space-y-3.5">
              <Field label={t.profileNickname} value={profile.nickname} />
              <Field label={t.profileBirthday} value={profile.birthday} />
              <Field label={t.profileGender} value={profile.gender ? genderLabel(t, profile.gender) : undefined} />
              <Field label={t.profileCountry} value={profile.country ? countryLabel(profile.country) : undefined} />
              <Field label={t.profileOccupation} value={profile.occupation ? occupationLabel(t, profile.occupation) : undefined} />
              {profile.occupation === 'other' && <Field label={t.profileOccupationOther} value={profile.occupationOther} />}
              <Field label={t.profileReason} value={profile.reasons?.length ? profile.reasons.map((r) => reasonLabel(t, r)).join(' · ') : undefined} />
            </div>
          </div>

          <ChangePasswordCard />
        </>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-[var(--text-primary)]">{value || '—'}</p>
    </div>
  )
}

// Change-password card. Verifies the current password first (via a sign-in,
// which also refreshes the session Supabase requires for updateUser password).
function ChangePasswordCard() {
  const { t } = useTranslation()
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const inputCls =
    'w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] text-[var(--text-primary)] text-sm rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors'
  const labelCls = 'block text-[11px] text-[var(--text-dim)] mb-1.5 uppercase tracking-wide'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setOk(null)
    if (next.length < 6) {
      setError(t.authPasswordTooShort)
      return
    }
    if (next !== confirm) {
      setError(t.authPasswordMismatch)
      return
    }
    setBusy(true)
    const err = await changePassword(current, next)
    setBusy(false)
    if (err) {
      setError(/invalid login/i.test(err.message) ? t.profilePasswordWrongCurrent : t.profilePasswordChangeFailed)
      return
    }
    setOk(t.profilePasswordChanged)
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  return (
    <div className="rounded-[var(--radius-lg)] glass border border-white/10 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.profileChangePasswordTitle}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>{t.profileCurrentPassword}</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} autoComplete="current-password" />
        </div>
        <div>
          <label className={labelCls}>{t.profileNewPassword}</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} autoComplete="new-password" />
        </div>
        <div>
          <label className={labelCls}>{t.authConfirmPassword}</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} autoComplete="new-password" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {ok && <p className="text-xs text-emerald-300">{ok}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-[var(--radius-md)] btn-gradient text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? t.authSubmitting : t.profileChangePassword}
        </button>
      </form>
    </div>
  )
}
