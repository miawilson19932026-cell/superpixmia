import { useState, useRef, type FormEvent } from 'react'
import { useTranslation } from '../i18n'
import type { Translations } from '../i18n/types'
import { useAuth, saveProfile, type Profile } from '../lib/auth'
import AnimeAvatar, { ANIME_AVATARS, COOL_AVATARS, defaultAvatarFor, type AnimeAvatarDef } from './avatars'
import { COUNTRIES } from '../lib/countries'

// Optional persona fields, shared by the first-login ProfileModal and the
// /profile personal center edit form. Every field is optional — an empty form
// still saves (which just marks the profile as completed).
interface Props {
  initial?: Profile
  submitLabel: string
  onDone?: () => void
}

export const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not'] as const
export const OCCUPATION_OPTIONS = ['developer', 'designer', 'product', 'marketing', 'creator', 'student', 'other'] as const
export const REASON_OPTIONS = ['bg', 'compress', 'convert', 'resize', 'edit', 'other'] as const

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
    default:
      return t.profileReasonOther
  }
}

export default function ProfileForm({ initial, submitLabel, onDone }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [birthday, setBirthday] = useState(initial?.birthday ?? '')
  const [gender, setGender] = useState(initial?.gender ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const [avatar, setAvatar] = useState<string | undefined>(initial?.avatar)
  const [occupation, setOccupation] = useState(initial?.occupation ?? '')
  const [occupationOther, setOccupationOther] = useState(initial?.occupationOther ?? '')
  const [reasons, setReasons] = useState<string[]>(initial?.reasons ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Once the user taps an avatar, gender changes stop overriding their choice
  // (until then the picker follows the gender default, per the "default look by
  // gender" requirement).
  const avatarTouched = useRef(Boolean(initial?.avatar))

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
  }

  // One shared cell renderer for both avatar groups.
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
            className={`rounded-full transition-all outline-none ${
              selected
                ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-input)]'
                : 'opacity-75 hover:opacity-100 hover:scale-105'
            }`}
          >
            <span className="block rounded-full overflow-hidden w-11 h-11">
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
    if (birthday) profile.birthday = birthday
    if (gender) profile.gender = gender
    if (country) profile.country = country
    if (avatar) profile.avatar = avatar
    if (occupation) {
      profile.occupation = occupation
      if (occupation === 'other' && occupationOther.trim()) profile.occupationOther = occupationOther.trim()
    }
    if (reasons.length) profile.reasons = reasons
    const err = await saveProfile(profile)
    setSaving(false)
    if (err) {
      setError(t.profileSaveError)
      return
    }
    onDone?.()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <div>
        <label className={labelCls}>{t.profileBirthday}</label>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className={`${inputCls} [color-scheme:dark]`}
        />
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

      {/* Anime avatar picker — 20 hand-drawn looks in two groups. Picking a
          gender pre-selects its default; tapping any avatar overrides it. */}
      <div>
        <label className={labelCls}>{t.profileAvatar}</label>
        <p className="text-[11px] text-[var(--text-dim)] mb-1.5">{t.profileAvatarClassic}</p>
        {avatarGrid(ANIME_AVATARS)}
        <p className="text-[11px] text-[var(--text-dim)] mt-3 mb-1.5">{t.profileAvatarCool}</p>
        {avatarGrid(COOL_AVATARS)}
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

      <div>
        <label className={labelCls}>{t.profileReason}</label>
        <div className="flex flex-wrap gap-1.5">
          {REASON_OPTIONS.map((v) => {
            const active = reasons.includes(v)
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleReason(v)}
                aria-pressed={active}
                className={`px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all ${
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
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button type="submit" disabled={saving} className="w-full py-2.5 rounded-[var(--radius-md)] btn-gradient text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? t.authSubmitting : submitLabel}
      </button>
    </form>
  )
}
