import { useState, useRef, type FormEvent } from 'react'
import { useTranslation } from '../i18n'
import type { Translations } from '../i18n/types'
import { useAuth, saveProfile, type Profile } from '../lib/auth'
import AnimeAvatar, { ANIME_AVATARS, COOL_AVATARS, defaultAvatarFor, type AnimeAvatarDef, type AnimeAvatarKey } from './avatars'
import { COUNTRIES } from '../lib/countries'

// Optional persona fields, shared by the first-login ProfileModal and the
// /profile personal center edit form. Every field is optional — an empty form
// still saves (which just marks the profile as completed).
//
// `compact` is used inside the first-login modal: shorter fields pair up in
// two-column rows, the avatar grid shrinks and reason tags tighten to a 3-col
// grid so the whole prompt fits without a long scroll.
interface Props {
  initial?: Profile
  submitLabel: string
  onDone?: () => void
  compact?: boolean
}

export const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not'] as const
export const OCCUPATION_OPTIONS = ['developer', 'designer', 'product', 'marketing', 'creator', 'student', 'other'] as const
export const REASON_OPTIONS = ['bg', 'compress', 'convert', 'resize', 'edit', 'gif', 'avatar', 'ecommerce', 'social', 'restore', 'other'] as const

// Birthday is stored as YYYY-MM-DD but picked with three selects (year / month /
// day). Month/day overflow (e.g. Feb 31) is clamped to that month's real last
// day so the combination always stays a valid date.
function birthdayFromParts(y: string, m: string, d: string): string {
  if (!y || !m || !d) return ''
  const yy = Number(y)
  const lastDay = new Date(yy, Number(m), 0).getDate()
  return `${yy}-${String(Number(m)).padStart(2, '0')}-${String(Math.min(Number(d), lastDay)).padStart(2, '0')}`
}

// Label lookups shared by the form and the /profile display (values are the
// short option keys stored in user_metadata).
export function genderLabel(t: Translations, v: string): string {
  return v === 'male' ? t.profileGenderMale : v === 'female' ? t.profileGenderFemale : v === 'other' ? t.profileGenderOther : t.profileGenderPreferNot
}

export function occupationLabel(t: Translations, v: string): string {
  switch (v) {
    case 'developer':
      return t.profileOccupationDeveloper
    case 'designer':
      return t.profileOccupationDesigner
    case 'product':
      return t.profileOccupationProduct
    case 'marketing':
      return t.profileOccupationMarketing
    case 'creator':
      return t.profileOccupationCreator
    case 'student':
      return t.profileOccupationStudent
    default:
      return t.profileOccupationOther
  }
}

export function reasonLabel(t: Translations, v: string): string {
  switch (v) {
    case 'bg':
      return t.profileReasonBg
    case 'compress':
      return t.profileReasonCompress
    case 'convert':
      return t.profileReasonConvert
    case 'resize':
      return t.profileReasonResize
    case 'edit':
      return t.profileReasonEdit
    case 'gif':
      return t.profileReasonGif
    case 'avatar':
      return t.profileReasonAvatar
    case 'ecommerce':
      return t.profileReasonEcommerce
    case 'social':
      return t.profileReasonSocial
    case 'restore':
      return t.profileReasonRestore
    default:
      return t.profileReasonOther
  }
}

export default function ProfileForm({ initial, submitLabel, onDone, compact }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const initBirth = (initial?.birthday ?? '').split('-')
  const [birthY, setBirthY] = useState(initBirth[0] || '')
  const [birthM, setBirthM] = useState(initBirth[1] || '')
  const [birthD, setBirthD] = useState(initBirth[2] || '')
  const [gender, setGender] = useState(initial?.gender ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const [avatar, setAvatar] = useState<string | undefined>(initial?.avatar)
  const [occupation, setOccupation] = useState(initial?.occupation ?? '')
  const [occupationOther, setOccupationOther] = useState(initial?.occupationOther ?? '')
  const [reasons, setReasons] = useState<string[]>(initial?.reasons ?? [])
  const [reasonOther, setReasonOther] = useState(initial?.reasonOther ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The avatar picker is collapsed to a single large preview; "change avatar"
  // expands the 20-avatar grid. Picking one selects it and collapses again.
  const [avatarOpen, setAvatarOpen] = useState(false)
  // Once the user taps an avatar, gender changes stop overriding their choice
  // (until then the picker follows the gender default, per the "default look by
  // gender" requirement).
  const avatarTouched = useRef(Boolean(initial?.avatar))
  // Year range for the birthday selects — no one filling a profile is under 18
  // or over ~76, so keep the list short enough to scroll quickly.
  const curYear = new Date().getFullYear()
  const birthYears = Array.from({ length: curYear - 1949 }, (_, i) => curYear - i)
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

  // Same styling tokens as LoginModal so the forms read as one system.
  const inputCls =
    'w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] text-[var(--text-primary)] text-sm rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors'
  const labelCls = 'block text-[11px] text-[var(--text-dim)] mb-1.5 uppercase tracking-wide'

  const toggleReason = (v: string) =>
    setReasons((prev) => (prev.includes(v) ? prev.filter((r) => r !== v) : [...prev, v]))

  // Picking a gender pre-selects that gender's default avatar — but only until
  // the user taps one explicitly (avatarTouched), so they can freely mix.
  const onGenderChange = (v: string) => {
    setGender(v)
    if (!avatarTouched.current) setAvatar(v === 'male' || v === 'female' ? defaultAvatarFor(v) : undefined)
  }
  const pickAvatar = (key: string) => {
    avatarTouched.current = true
    setAvatar(key)
    setAvatarOpen(false)
  }
  // The collapsed preview shows the chosen avatar, or the gender's default look
  // before anything is chosen (so there is always something to look at).
  const shownAvatar = (avatar || (gender ? defaultAvatarFor(gender) : undefined)) as AnimeAvatarKey | undefined

  // One shared cell renderer for both avatar groups. Compact shrinks the cells
  // (w-9 vs w-11) so the picker takes less room inside the first-login modal.
  const avatarGrid = (list: AnimeAvatarDef[]) => (
    <div className="grid grid-cols-5 gap-2">
      {list.map((a) => {
        const selected = avatar === a.key
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => pickAvatar(a.key)}
            aria-pressed={selected}
            aria-label={`${a.gender} avatar ${a.key}`}
            className={`${compact ? 'w-9 h-9' : 'w-11 h-11'} rounded-full transition-all outline-none ${
              selected
                ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-input)]'
                : 'opacity-75 hover:opacity-100 hover:scale-105'
            }`}
          >
            <span className={`block rounded-full overflow-hidden ${compact ? 'w-9 h-9' : 'w-11 h-11'}`}>
              <AnimeAvatar avatar={a.key} className="w-full h-full" />
            </span>
          </button>
        )
      })}
    </div>
  )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || saving) return
    setSaving(true)
    setError(null)
    const profile: Profile = {}
    if (nickname.trim()) profile.nickname = nickname.trim()
    const birthday = birthdayFromParts(birthY, birthM, birthD)
    if (birthday) profile.birthday = birthday
    if (gender) profile.gender = gender
    if (country) profile.country = country
    if (avatar) profile.avatar = avatar
    if (occupation) {
      profile.occupation = occupation
      if (occupation === 'other' && occupationOther.trim()) profile.occupationOther = occupationOther.trim()
    }
    if (reasons.length) profile.reasons = reasons
    if (reasons.includes('other') && reasonOther.trim()) profile.reasonOther = reasonOther.trim()
    const err = await saveProfile(profile)
    setSaving(false)
    if (err) {
      setError(t.profileSaveError)
      return
    }
    onDone?.()
  }

  return (
    <form onSubmit={onSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <label className={labelCls}>{t.profileNickname}</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t.profileNicknamePlaceholder}
          className={inputCls}
          maxLength={40}
        />
      </div>

      {/* Birthday + gender share a row in compact mode to halve the height. */}
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'space-y-4'}>
        <div>
          <label className={labelCls}>{t.profileBirthday}</label>
          {/* Three selects instead of a native date picker — faster to fill and
              reads clearly. Values stay numeric; the combo is clamped to a real
              date on save (see birthdayFromParts). */}
          <div className="grid grid-cols-3 gap-2">
            <select value={birthY} onChange={(e) => setBirthY(e.target.value)} className={inputCls}>
              <option value="">{t.profileBirthYear}</option>
              {birthYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select value={birthM} onChange={(e) => setBirthM(e.target.value)} className={inputCls}>
              <option value="">{t.profileBirthMonth}</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select value={birthD} onChange={(e) => setBirthD(e.target.value)} className={inputCls}>
              <option value="">{t.profileBirthDay}</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>{t.profileGender}</label>
          <select value={gender} onChange={(e) => onGenderChange(e.target.value)} className={inputCls}>
            <option value="">{t.profileOccupationPlaceholder}</option>
            {GENDER_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {genderLabel(t, v)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Country + occupation share a row in compact mode. */}
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'space-y-4'}>
        <div>
          <label className={labelCls}>{t.profileCountry}</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
            <option value="">{t.profileCountryPlaceholder}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.en} {c.native}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>{t.profileOccupation}</label>
          <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputCls}>
            <option value="">{t.profileOccupationPlaceholder}</option>
            {OCCUPATION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {occupationLabel(t, v)}
              </option>
            ))}
          </select>
          {occupation === 'other' && (
            <input
              type="text"
              value={occupationOther}
              onChange={(e) => setOccupationOther(e.target.value)}
              placeholder={t.profileOccupationOtherPlaceholder}
              className={`${inputCls} mt-2`}
              maxLength={40}
            />
          )}
        </div>
      </div>

      {/* Anime avatar picker — collapsed to one large preview; "change avatar"
          expands the 20 looks in two groups. Picking a gender pre-selects its
          default preview; tapping any avatar in the grid overrides it. */}
      <div>
        <label className={labelCls}>{t.profileAvatar}</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAvatarOpen((o) => !o)}
            aria-label={t.profileAvatarChange}
            className={`shrink-0 rounded-full transition-all outline-none ${
              avatarOpen ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-input)]' : ''
            }`}
          >
            <span className="block w-16 h-16 rounded-full overflow-hidden bg-[var(--bg-input)] border border-[var(--border)]">
              {shownAvatar ? (
                <AnimeAvatar avatar={shownAvatar} className="w-full h-full" />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-2xl text-[var(--text-dim)]">?</span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAvatarOpen((o) => !o)}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
          >
            {t.profileAvatarChange}
          </button>
        </div>
        {avatarOpen && (
          <div className="mt-3 space-y-3">
            <p className="text-[11px] text-[var(--text-dim)]">{t.profileAvatarClassic}</p>
            {avatarGrid(ANIME_AVATARS)}
            <p className="text-[11px] text-[var(--text-dim)]">{t.profileAvatarCool}</p>
            {avatarGrid(COOL_AVATARS)}
          </div>
        )}
      </div>

      {/* Usage reasons — a tight 3-col grid in compact mode; the chips carry
          generous padding so they are easy to tap. */}
      <div>
        <label className={labelCls}>{t.profileReason}</label>
        <div className={compact ? 'grid grid-cols-3 gap-1.5' : 'flex flex-wrap gap-1.5'}>
          {REASON_OPTIONS.map((v) => {
            const active = reasons.includes(v)
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleReason(v)}
                aria-pressed={active}
                className={`min-h-[36px] flex items-center justify-center px-2 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                }`}
              >
                {reasonLabel(t, v)}
              </button>
            )
          })}
        </div>
        {reasons.includes('other') && (
          <input
            type="text"
            value={reasonOther}
            onChange={(e) => setReasonOther(e.target.value)}
            placeholder={t.profileReasonOtherPlaceholder}
            className={`${inputCls} mt-2`}
            maxLength={60}
          />
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button type="submit" disabled={saving} className="w-full py-2.5 rounded-[var(--radius-md)] btn-gradient text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? t.authSubmitting : submitLabel}
      </button>
    </form>
  )
}
