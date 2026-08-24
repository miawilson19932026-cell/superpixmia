import type { ReactNode } from 'react'

// Anime avatar set — 20 hand-drawn pure-SVG busts, zero image assets.
//
// Two looks, both config-driven off one shared chibi-bust renderer:
//   ANIME_AVATARS — 10 classic looks (5 male + 5 female), soft anime palette.
//   COOL_AVATARS  — 10 "cool international" looks (5 male + 5 female): slicked
//     blond undercut, afro, dreads, mohawk, long waves, high ponytail… with
//     deeper skin tones spanning European / Latin / Middle-Eastern / African
//     cues. The chosen key is stored in user_metadata (Profile.avatar); gender
//     decides the silhouette fallback.
//
// The renderer is config-driven: one shared chibi face + per-avatar flags for
// hair back (long / twin-tails / side-ponytail / bob / dreads / waves /
// ponytail), top details (spikes / ahoge / headband / ribbon / flower / ties /
// mohawk), accessories (glasses, earring), plus afro / curly / slicked caps.
// Kept in one file so ProfileForm's picker and Avatar can share it.

export type AnimeAvatarKey =
  | 'male-1' | 'male-2' | 'male-3' | 'male-4' | 'male-5'
  | 'female-1' | 'female-2' | 'female-3' | 'female-4' | 'female-5'
  | 'cool-1' | 'cool-2' | 'cool-3' | 'cool-4' | 'cool-5'
  | 'cool-6' | 'cool-7' | 'cool-8' | 'cool-9' | 'cool-10'

export interface AnimeAvatarDef {
  key: AnimeAvatarKey
  gender: 'male' | 'female'
  bg: string   // soft circle backdrop color
  skin: string
  hair: string
  eye: string
  hairBack?: 'long' | 'twintail' | 'side' | 'bob' | 'dreads' | 'waves' | 'ponytail' | 'afro' | 'curly' | 'slicked' | 'buns'
  spikes?: boolean
  ahoge?: boolean
  swept?: boolean
  headband?: boolean
  headbandColor?: string
  ribbon?: boolean
  flower?: boolean
  ties?: boolean
  mohawk?: boolean
  glasses?: boolean
  earring?: boolean
}

export const ANIME_AVATARS: AnimeAvatarDef[] = [
  // ── Male (5) — cool / warm distinct silhouettes ──
  { key: 'male-1', gender: 'male', bg: '#c7dbf7', skin: '#f7c9a3', hair: '#274b7a', eye: '#3b82f6', spikes: true },
  { key: 'male-2', gender: 'male', bg: '#fce9c2', skin: '#f7c9a3', hair: '#6b4a2f', eye: '#b45309', glasses: true },
  { key: 'male-3', gender: 'male', bg: '#c9f0d6', skin: '#f7c9a3', hair: '#e0b52e', eye: '#16a34a', ahoge: true },
  { key: 'male-4', gender: 'male', bg: '#d9dfe8', skin: '#f7c9a3', hair: '#b7c3d6', eye: '#64748b', swept: true, headband: true, headbandColor: '#7f1d1d' },
  { key: 'male-5', gender: 'male', bg: '#ddd6fe', skin: '#f7c9a3', hair: '#553a74', eye: '#7c3aed', earring: true },
  // ── Female (5) ──
  { key: 'female-1', gender: 'female', bg: '#fbd6ea', skin: '#fce3cf', hair: '#f084b4', eye: '#ec4899', hairBack: 'twintail', ties: true },
  { key: 'female-2', gender: 'female', bg: '#fde3c3', skin: '#fce3cf', hair: '#33333d', eye: '#92400e', hairBack: 'bob', ribbon: true },
  { key: 'female-3', gender: 'female', bg: '#c9eaf7', skin: '#fce3cf', hair: '#ecc53f', eye: '#3b82f6', hairBack: 'long' },
  { key: 'female-4', gender: 'female', bg: '#dde3f9', skin: '#fce3cf', hair: '#7cc4e0', eye: '#8b5cf6', hairBack: 'long', flower: true },
  { key: 'female-5', gender: 'female', bg: '#fcdcd5', skin: '#fce3cf', hair: '#8a5a3b', eye: '#65a30d', hairBack: 'side', ribbon: true },
]

// ── Cool international looks — slick / spiky / textured hair, deeper skins.
// Kept deliberately non-repetitive: each hairstyle appears at most twice, in
// clearly different colors/genders, so the set reads as 10 distinct people.
export const COOL_AVATARS: AnimeAvatarDef[] = [
  // cool-1 Nordic blond (slicked back), cool-2 Afro, cool-3 Latin curls,
  // cool-4 red mohawk, cool-5 black long straight (rock-star).
  { key: 'cool-1', gender: 'male', bg: '#c7e0f5', skin: '#f1b88e', hair: '#dfb84a', eye: '#3b82f6', hairBack: 'slicked' },
  { key: 'cool-2', gender: 'male', bg: '#d9c9a3', skin: '#6d4432', hair: '#221209', eye: '#4a2f1a', hairBack: 'afro', headband: true, headbandColor: '#16a34a', earring: true },
  { key: 'cool-3', gender: 'male', bg: '#f7d9a8', skin: '#c68b56', hair: '#3a2415', eye: '#3f2a17', hairBack: 'curly', earring: true },
  { key: 'cool-4', gender: 'male', bg: '#f5c6c6', skin: '#f7c9a3', hair: '#e11d48', eye: '#7c3aed', mohawk: true, earring: true },
  { key: 'cool-5', gender: 'male', bg: '#dcd7ce', skin: '#f1b88e', hair: '#17130f', eye: '#3b82f6', hairBack: 'long', earring: true },
  // cool-6 Nordic waves, cool-7 African dreads, cool-8 black big waves,
  // cool-9 space buns, cool-10 East-Euro silver high ponytail.
  { key: 'cool-6', gender: 'female', bg: '#cfe8f2', skin: '#fce3cf', hair: '#e0b94a', eye: '#3b82f6', hairBack: 'waves' },
  { key: 'cool-7', gender: 'female', bg: '#d6b98a', skin: '#7a4c2e', hair: '#1d1109', eye: '#3f2412', hairBack: 'dreads', headband: true, headbandColor: '#7f1d1d', earring: true },
  { key: 'cool-8', gender: 'female', bg: '#eadfd6', skin: '#f1b88e', hair: '#191512', eye: '#4a2f1a', hairBack: 'waves', flower: true },
  { key: 'cool-9', gender: 'female', bg: '#f0d3ef', skin: '#fce3cf', hair: '#d946ef', eye: '#a855f7', hairBack: 'buns', earring: true },
  { key: 'cool-10', gender: 'female', bg: '#d8dcec', skin: '#f1b88e', hair: '#c9c3b5', eye: '#3b82f6', hairBack: 'ponytail', headband: true, headbandColor: '#e11d48' },
]

export const ALL_AVATARS: AnimeAvatarDef[] = [...ANIME_AVATARS, ...COOL_AVATARS]

export const animeAvatarMap = Object.fromEntries(ALL_AVATARS.map((a) => [a.key, a])) as Record<AnimeAvatarKey, AnimeAvatarDef>

export function isAnimeAvatar(key: unknown): key is AnimeAvatarKey {
  return typeof key === 'string' && key in animeAvatarMap
}

// The default avatar a gender maps to in the profile form (so the picker comes
// pre-filled with a matching look). Unknown / unset genders fall back to male-1.
export function defaultAvatarFor(gender?: string): AnimeAvatarKey {
  return gender === 'female' ? 'female-1' : 'male-1'
}

// ── Shared chibi-bust geometry ────────────────────────────────────────────────
const SHIRT = '#2b313c'
const SHIRT_F = '#5b3a52'

export default function AnimeAvatar({ avatar, className }: { avatar: AnimeAvatarKey; className?: string }) {
  const a = animeAvatarMap[avatar]
  return (
    <svg viewBox="0 0 64 64" className={className} data-avatar={a.key} aria-hidden>
      <circle cx="32" cy="32" r="32" fill={a.bg} />
      {/* body / shoulders — slight V-neckline for female busts */}
      <path d="M13 64 Q13 54 17 49 Q23 44 30 43.5 L34 43.5 Q41 44 47 49 Q51 54 51 64 Z" fill={a.gender === 'female' ? SHIRT_F : SHIRT} />
      <path d={a.gender === 'female' ? 'M29 43.5 Q32 47 35 43.5' : 'M30 43.5 Q32 46.5 34 43.5'} fill="none" stroke="#ffffff22" strokeWidth="1.2" strokeLinecap="round" />
      <HairBack a={a} />
      {/* neck + head + ears */}
      <rect x="29.5" y="43" width="5" height="7" rx="2" fill={a.skin} />
      <ellipse cx="32" cy="33" rx="13" ry="14" fill={a.skin} />
      <ellipse cx="19.5" cy="36" rx="2.6" ry="4" fill={a.skin} />
      <ellipse cx="44.5" cy="36" rx="2.6" ry="4" fill={a.skin} />
      {/* hair cap + front strands */}
      <path d="M18.5 33 Q19 15 32 15 Q45 15 45.5 33 Q43 25 37 21 Q32 19 27 21 Q21 25 18.5 33 Z" fill={a.hair} />
      <path d="M18.5 33 Q19 15 32 15 Q45 15 45.5 33 Q43 25 37 21 Q32 19 27 21 Q21 25 18.5 33 Z" fill="none" stroke="#00000014" strokeWidth="1" />
      {a.swept ? (
        <path d="M20 32 Q22 25 28 23 Q34 21 41 24 Q45 26 46 32 Q43 26 37 24 Q31 22 25 26 Q22 28 20 32 Z" fill={a.hair} />
      ) : (
        <>
          {/* bangs — roots attach to the cap (wide top), tips point DOWN across
              the forehead; drawn as hanging triangles, not upside-down leaves. */}
          <path d="M20 33 Q23.5 31.6 27 33 Q25.8 34.5 23.5 35.3 Q21.2 34.5 20 33 Z" fill={a.hair} />
          <path d="M26.5 33 Q30 31.5 33.5 33 Q32.3 34.8 30 35.7 Q27.7 34.8 26.5 33 Z" fill={a.hair} />
          <path d="M33 33 Q36.5 31.6 40 33 Q38.8 34.5 36.5 35.3 Q34.2 34.5 33 33 Z" fill={a.hair} />
        </>
      )}
      <TexturedCap a={a} />
      <TopDetail a={a} />
      {/* face */}
      <Eyes eye={a.eye} />
      <path d="M20.5 31.5 Q24 30 27.5 31.5" stroke="#4a2f1a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M36.5 31.5 Q40 30 43.5 31.5" stroke="#4a2f1a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <ellipse cx="20" cy="43.5" rx="2.4" ry="1.3" fill="#f29696" opacity="0.5" />
      <ellipse cx="44" cy="43.5" rx="2.4" ry="1.3" fill="#f29696" opacity="0.5" />
      <path d="M29.5 46.5 Q32 48.8 34.5 46.5" stroke="#a05a40" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <Accessory a={a} />
    </svg>
  )
}

// Hair that hangs behind the head / body (drawn first, under the shoulders).
function HairBack({ a }: { a: AnimeAvatarDef }) {
  if (a.hairBack === 'long') {
    // straight long hair — two NARROW parallel ribbons falling from the crown
    // to the bottom edge. Straight, not a blob: ~4 wide, ~38 long, edges
    // nearly parallel so it reads as long STRAIGHT hair even at header size.
    return (
      <>
        <path d="M19.5 21 Q17 30 16.5 40 Q16 52 18.5 59 Q20 62.5 22.5 60 Q23.5 52 23 42 Q22.5 32 21.5 24 Q21 21.5 19.5 21 Z" fill={a.hair} />
        <path d="M44.5 21 Q47 30 47.5 40 Q48 52 45.5 59 Q44 62.5 41.5 60 Q40.5 52 41 42 Q41.5 32 42.5 24 Q43 21.5 44.5 21 Z" fill={a.hair} />
      </>
    )
  }
  if (a.hairBack === 'twintail') {
    return (
      <>
        <path d="M16 34 Q8 36 7 44 Q6 52 12 54 Q18 56 19 49 Q20 43 19 37 Z" fill={a.hair} />
        <path d="M48 34 Q56 36 57 44 Q58 52 52 54 Q46 56 45 49 Q44 43 45 37 Z" fill={a.hair} />
      </>
    )
  }
  if (a.hairBack === 'side') {
    return <path d="M42 34 Q50 35 52 44 Q53 52 47 55 Q41 57 41 50 Q41 44 41 38 Z" fill={a.hair} />
  }
  if (a.hairBack === 'bob') {
    // short blunt bob: side curtains framing the jaw
    return (
      <>
        <path d="M19 33 Q17 39 18 45 Q19 48 22 47 Q24 45 22 39 Q21 35 19 33 Z" fill={a.hair} />
        <path d="M45 33 Q47 39 46 45 Q45 48 42 47 Q40 45 42 39 Q43 35 45 33 Z" fill={a.hair} />
      </>
    )
  }
  if (a.hairBack === 'dreads') {
    // rasta braids — straight ropes hanging either side of the shoulders
    return (
      <>
        <rect x="15.5" y="12" width="3" height="30" rx="1.5" transform="rotate(-10 17 12)" fill={a.hair} />
        <rect x="22" y="11" width="3" height="34" rx="1.5" fill={a.hair} />
        <rect x="28" y="12" width="3" height="30" rx="1.5" fill={a.hair} />
        <rect x="36" y="12" width="3" height="30" rx="1.5" fill={a.hair} />
        <rect x="42" y="11" width="3" height="34" rx="1.5" fill={a.hair} />
        <rect x="47.5" y="13" width="3" height="28" rx="1.5" transform="rotate(9 49 13)" fill={a.hair} />
      </>
    )
  }
  if (a.hairBack === 'waves') {
    // BIG WAVES — overlapping tilted spiral curls falling to the chest, each
    // loop clearly wider than the shaft so the volume reads at header size.
    return (
      <g fill={a.hair}>
        <ellipse cx="17" cy="43" rx="4.2" ry="7" transform="rotate(-20 17 43)" />
        <ellipse cx="14.5" cy="52.5" rx="5.2" ry="7.6" transform="rotate(14 14.5 52.5)" />
        <ellipse cx="18.5" cy="60.5" rx="5.6" ry="6.4" transform="rotate(-12 18.5 60.5)" />
        <ellipse cx="24.5" cy="50" rx="4" ry="7.2" transform="rotate(16 24.5 50)" />
        <ellipse cx="39.5" cy="50" rx="4" ry="7.2" transform="rotate(-16 39.5 50)" />
        <ellipse cx="47" cy="43" rx="4.2" ry="7" transform="rotate(20 47 43)" />
        <ellipse cx="49.5" cy="52.5" rx="5.2" ry="7.6" transform="rotate(-14 49.5 52.5)" />
        <ellipse cx="45.5" cy="60.5" rx="5.6" ry="6.4" transform="rotate(12 45.5 60.5)" />
      </g>
    )
  }
  if (a.hairBack === 'ponytail') {
    // high ponytail flicking up from the back of the head
    return (
      <>
        <path d="M42 32 Q52 26 51 16 Q49 8 44 7 Q41 11 43 17 Q45 23 42 30 Q41 32 42 32 Z" fill={a.hair} />
        <path d="M43 29 Q53 25 52 18" fill="none" stroke="#00000018" strokeWidth="1" />
      </>
    )
  }
  if (a.hairBack === 'buns') {
    // space buns — two round buns on the crown, trendy and unmistakable
    return (
      <>
        <circle cx="21" cy="14" r="6.5" fill={a.hair} />
        <circle cx="43" cy="14" r="6.5" fill={a.hair} />
        <path d="M26 16 Q28 12 32 12 Q36 12 38 16 L38 18 Q36 15 32 15 Q28 15 26 18 Z" fill={a.hair} />
      </>
    )
  }
  return null
}

// Caps drawn OVER the hair cap: afro puff / curly top / slicked-back strands.
function TexturedCap({ a }: { a: AnimeAvatarDef }) {
  if (a.hairBack === 'afro') {
    // big round puff wrapping the crown, tapering at the forehead
    return (
      <path
        d="M19.5 33 Q16 22 20 14 Q24 8 32 8 Q40 8 44 14 Q48 22 44.5 33 Q43 26 37 24 Q32 22 27 24 Q21 26 19.5 33 Z"
        fill={a.hair}
        stroke="#00000014"
        strokeWidth="1"
      />
    )
  }
  if (a.hairBack === 'curly') {
    // a crown of tight curls
    return (
      <g fill={a.hair}>
        <circle cx="21" cy="20" r="5" />
        <circle cx="28" cy="16" r="5" />
        <circle cx="36" cy="16" r="5" />
        <circle cx="43" cy="20" r="5" />
        <circle cx="24.5" cy="27" r="4" />
        <circle cx="32" cy="26" r="4" />
        <circle cx="39.5" cy="27" r="4" />
      </g>
    )
  }
  if (a.hairBack === 'slicked') {
    // sleek hair swept back — a few strong strands over the cap
    return (
      <g stroke={a.hair} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M24 18 Q27 24 29 31" />
        <path d="M32 17 Q33 24 32 31" />
        <path d="M40 18 Q38 24 36 31" />
      </g>
    )
  }
  return null
}

// Details on top of the hair: spikes, ahoge, headband, flower, hair ties, mohawk.
function TopDetail({ a }: { a: AnimeAvatarDef }) {
  const parts: ReactNode[] = []
  if (a.spikes) {
    parts.push(
      <path key="sp1" d="M27 17 L29 10 L32 17 Z" fill={a.hair} />,
      <path key="sp2" d="M32 16 L34 8 L36 16 Z" fill={a.hair} />,
      <path key="sp3" d="M36 17 L39 11 L41 18 Z" fill={a.hair} />,
      <path key="sp4" d="M24 18 L26 12 L28 18 Z" fill={a.hair} />,
    )
  }
  if (a.mohawk) {
    // a row of tall spikes up the centre — shaved sides read from the plain cap
    parts.push(
      <path key="m1" d="M28 18 L30 6 L32 18 Z" fill={a.hair} />,
      <path key="m2" d="M31 17 L33 5 L35 17 Z" fill={a.hair} />,
      <path key="m3" d="M34 18 L36 7 L38 18 Z" fill={a.hair} />,
      <path key="m4" d="M25 19 L27 10 L29 19 Z" fill={a.hair} />,
      <path key="m5" d="M37 19 L39 10 L41 19 Z" fill={a.hair} />,
    )
  }
  if (a.ahoge) {
    parts.push(
      <path key="ah" d="M33 15 q2 -6 7 -7 q-1 3 0 5 q-3 2 -4 6 q-2 -2 -3 -4 Z" fill={a.hair} />,
    )
  }
  if (a.headband) {
    parts.push(
      <rect key="hb" x="19.5" y="29" width="25" height="3.4" rx="1.7" fill={a.headbandColor} />,
      <circle key="hbk" cx="32" cy="27.3" r="2.2" fill={a.headbandColor} />,
    )
  }
  if (a.flower) {
    parts.push(
      <g key="fl">
        <circle cx="32" cy="22" r="2.1" fill="#f8fafc" />
        <circle cx="34.6" cy="23.6" r="2.1" fill="#f8fafc" />
        <circle cx="34" cy="26.6" r="2.1" fill="#f8fafc" />
        <circle cx="30" cy="26.6" r="2.1" fill="#f8fafc" />
        <circle cx="29.4" cy="23.6" r="2.1" fill="#f8fafc" />
        <circle cx="32" cy="24.5" r="1.5" fill="#f472b6" />
      </g>,
    )
  }
  if (a.ties) {
    parts.push(
      <circle key="t1" cx="15" cy="34" r="2" fill="#e11d48" />,
      <circle key="t2" cx="49" cy="34" r="2" fill="#e11d48" />,
    )
  }
  return <>{parts}</>
}

// Big anime eyes — white sclera, tall iris, dark pupil + catchlight, lash line.
function Eyes({ eye }: { eye: string }) {
  return (
    <g>
      <path d="M20.6 34 Q24 32.8 27.4 34" stroke="#1c1210" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M36.6 34 Q40 32.8 43.4 34" stroke="#1c1210" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="24" cy="38.8" rx="3.3" ry="4.6" fill="#fff" />
      <ellipse cx="40" cy="38.8" rx="3.3" ry="4.6" fill="#fff" />
      <ellipse cx="24" cy="38.8" rx="2.6" ry="4" fill={eye} />
      <ellipse cx="40" cy="38.8" rx="2.6" ry="4" fill={eye} />
      <circle cx="24" cy="39.4" r="1.4" fill="#180f0c" />
      <circle cx="40" cy="39.4" r="1.4" fill="#180f0c" />
      <circle cx="25.1" cy="37.2" r="1" fill="#fff" opacity="0.95" />
      <circle cx="41.1" cy="37.2" r="1" fill="#fff" opacity="0.95" />
    </g>
  )
}

// Face-level accessories: glasses / earring / ribbon bow.
function Accessory({ a }: { a: AnimeAvatarDef }) {
  const parts: ReactNode[] = []
  if (a.glasses) {
    parts.push(
      <circle key="gl1" cx="24" cy="38.8" r="4.4" fill="none" stroke="#3a3a46" strokeWidth="0.9" />,
      <circle key="gl2" cx="40" cy="38.8" r="4.4" fill="none" stroke="#3a3a46" strokeWidth="0.9" />,
      <path key="glb" d="M28.4 38.8 h7.2" stroke="#3a3a46" strokeWidth="0.9" />,
      <path key="glt" d="M19.6 38.8 h-2.2 M44.4 38.8 h2.2" stroke="#3a3a46" strokeWidth="0.9" />,
    )
  }
  if (a.earring) {
    parts.push(<circle key="er" cx="19" cy="42" r="1.2" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.4" />)
  }
  if (a.ribbon) {
    parts.push(
      <g key="rb">
        <path d="M45 27 l-4.2 -3.2 v6.4 Z" fill="#dc2626" />
        <path d="M45 27 l4.2 -3.2 v6.4 Z" fill="#b91c1c" />
        <circle cx="45" cy="27" r="1.8" fill="#7f1d1d" />
      </g>,
    )
  }
  return <>{parts}</>
}
