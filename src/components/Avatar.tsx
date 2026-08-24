import AnimeAvatar, { isAnimeAvatar } from './avatars'

// User avatar. Two tiers:
//  1. A chosen anime avatar (Profile.avatar key, e.g. 'female-3') → the matching
//     hand-drawn SVG from avatars.tsx.
//  2. Otherwise a default silhouette that varies by gender (male = blue person,
//     female = pink female silhouette, other/unset = purple neutral) — the
//     fallback for users who never picked a look.
// Pure CSS + inline SVG throughout — no image assets.
export type AvatarGender = 'male' | 'female' | 'other' | 'prefer_not' | ''

interface Props {
  gender?: AvatarGender
  avatar?: string
  className?: string
}

export default function Avatar({ gender, avatar, className }: Props) {
  const size = className ?? 'w-8 h-8'

  if (avatar && isAnimeAvatar(avatar)) {
    return (
      <span className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${size}`} aria-hidden>
        <AnimeAvatar avatar={avatar} className="w-full h-full" />
      </span>
    )
  }

  const kind = gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'neutral'
  const grad =
    kind === 'male'
      ? 'from-sky-400 to-blue-600'
      : kind === 'female'
        ? 'from-pink-400 to-rose-500'
        : 'from-violet-400 to-purple-600'
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${grad} text-white select-none shrink-0 ${size}`}
      aria-hidden
    >
      <Glyph kind={kind} />
    </span>
  )
}

function Glyph({ kind }: { kind: 'male' | 'female' | 'neutral' }) {
  if (kind === 'female') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[55%] h-[55%]">
        {/* head */}
        <circle cx="12" cy="8.2" r="3.4" />
        {/* hair cap */}
        <path d="M8.6 7.4a3.4 3.4 0 0 1 6.8 0c0 .3-.5.2-1 .4-.6.2-1.1-.5-2.4-.5s-1.8.7-2.4.5c-.5-.2-1-.1-1-.4z" />
        {/* shoulders + dress neckline */}
        <path d="M4.2 20.5c0-3.6 3.5-5.4 7.8-5.4s7.8 1.8 7.8 5.4v.5H4.2z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[55%] h-[55%]">
      <circle cx="12" cy="8" r="3.9" />
      <path d="M4 20.5c0-4.3 3.6-6.4 8-6.4s8 2.1 8 6.4v.5H4z" />
    </svg>
  )
}
