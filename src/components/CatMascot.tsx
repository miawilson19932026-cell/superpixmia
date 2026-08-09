import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from '../i18n'

const isWeChat = /MicroMessenger/i.test(navigator.userAgent)

// [frame, duration_ms] — frames 4-5 slower
const FRAME_SEQ: [number, number][] = [
  [1, 400],
  [2, 400],
  [3, 400],
  [4, 800],
  [5, 800],
]

// Sparkle positions: [x%, y%, size, delay, duration] — toned down
const SPARKLES: number[][] = [
  [10, 5,  0.6, 0,    2.0],
  [80, -2, 0.7, 0.6,  2.4],
  [90, 40, 0.5, 1.1,  1.8],
  [82, 80, 0.6, 1.5,  2.2],
  [50, 96, 0.5, 0.4,  1.9],
  [2,  55, 0.6, 1.2,  2.6],
  [25, -5, 0.5, 1.8,  2.1],
]

export default function CatMascot() {
  const { t, lang } = useTranslation()
  const [frame, setFrame] = useState(1)
  const [winking, setWinking] = useState(false)
  const [hovered, setHovered] = useState(false)
  const idxRef = useRef(0)

  // Cycle frames with per-frame timing
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const next = (idxRef.current + 1) % FRAME_SEQ.length
      idxRef.current = next
      setFrame(FRAME_SEQ[next][0])
      timer = setTimeout(tick, FRAME_SEQ[next][1])
    }
    timer = setTimeout(tick, FRAME_SEQ[0][1])
    return () => clearTimeout(timer)
  }, [])

  // Click: double-blink + pause
  const handleClick = useCallback(() => {
    if (winking) return
    setWinking(true)
    // Rapid blink sequence
    let count = 0
    const blink = setInterval(() => {
      count++
      setFrame(count % 2 === 0 ? 2 : 1)
      if (count >= 6) {
        clearInterval(blink)
        setWinking(false)
        setFrame(1)
      }
    }, 80)
  }, [winking])

  // Hover to show bookmark shortcut
  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])

  // Sparkle colors — muted
  const colors = useMemo(() =>
    ['rgba(139,92,246,0.4)', 'rgba(168,85,247,0.35)', 'rgba(99,102,241,0.4)', 'rgba(59,130,246,0.35)', 'rgba(192,132,252,0.35)'],
    []
  )

  return (
    <button
      onClick={handleClick}
      className="absolute -bottom-32 -left-4 sm:-bottom-44 sm:left-auto sm:-right-28 z-10 w-[150px] h-[150px] sm:w-[280px] sm:h-[280px]
        rounded-full cursor-pointer select-none
        hover:scale-110 active:scale-95 transition-transform duration-200
        animate-float"
      title="Click me! 🐱"
      aria-label="Cat mascot"
    >
      {/* Sparkle stars */}
      {SPARKLES.map(([x, y, size, delay, dur], i) => (
        <span
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            fontSize: `${10 * size}px`,
            animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
            color: colors[i % colors.length],
          }}
        >
          ✦
        </span>
      ))}

      <img
        src={`/mascot/frame${frame}.webp`}
        alt=""
        className="relative w-full h-full object-contain pointer-events-none drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        draggable={false}
      />

      {/* Speech bubble + tail + dots wrapper */}
      <div className="absolute top-[2%] left-[80%] sm:-top-[12%] sm:left-[75%] z-20 animate-float pointer-events-none">
        {/* Bubble dots trail from mouth */}
        {[
          { top: '58%', left: '-42px', w: 16, bg: 0.22, d: '2.0s', delay: '0s' },
          { top: '48%', left: '-34px', w: 22, bg: 0.18, d: '2.5s', delay: '0.4s' },
          { top: '38%', left: '-26px', w: 28, bg: 0.15, d: '2.2s', delay: '0.8s' },
          { top: '28%', left: '-18px', w: 24, bg: 0.13, d: '2.8s', delay: '0.2s' },
          { top: '18%', left: '-10px', w: 20, bg: 0.11, d: '2.6s', delay: '0.6s' },
        ].map((dot, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              top: dot.top,
              left: dot.left,
              width: `${dot.w}px`,
              height: `${dot.w}px`,
              background: `rgba(255,255,255,${dot.bg})`,
              border: '1px solid rgba(255,255,255,0.06)',
              animation: `bubbleDot${1 + (i % 3)} ${dot.d} ease-in-out ${dot.delay} infinite`,
            }}
          />
        ))}

        {/* Tail — irregular point at bottom-left, angled */}
        <div
          className="absolute bottom-[12%] left-0"
          style={{
            width: '18px',
            height: '16px',
            transform: 'translateX(-14px) rotate(-15deg)',
            clipPath: 'polygon(100% 0%, 25% 35%, 0% 50%, 25% 65%, 100% 100%)',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '2.5px solid rgba(255,255,255,0.14)',
            borderRight: 'none',
            borderRadius: '40% 0 0 40%',
          }}
        />

        <button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="relative px-5 py-3.5 sm:px-6 sm:py-4
            min-w-[170px] sm:min-w-[220px]
            pointer-events-auto cursor-pointer
            hover:scale-105 active:scale-95 transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '2.5px solid rgba(255,255,255,0.14)',
            borderRadius: '35% 65% 50% 55% / 45% 40% 60% 50%',
            transform: 'rotate(-1.2deg)',
            outline: '1.5px dashed rgba(255,255,255,0.08)',
            outlineOffset: '3px',
            boxShadow: `
              0 8px 40px rgba(139,92,246,0.15),
              0 0 60px rgba(236,72,153,0.08),
              inset 0 1px 0 rgba(255,255,255,0.06),
              5px 3px 0 rgba(255,255,255,0.03),
              -4px -2px 0 rgba(255,255,255,0.02),
              3px -3px 0 rgba(255,255,255,0.02)
            `,
          }}
        >
          <p className="text-[12px] sm:text-[14px] leading-loose text-white/85 text-center whitespace-pre-line"
            style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>
            {isWeChat
              ? (lang === 'zh'
                ? '点击右上角 ···\n→ 收藏我\n下次在「我→收藏」\n找到 MiaDun 💜'
                : 'Tap ··· → Favorite\nFind me later in\nMe → Favorites 💜')
              : hovered
                ? (lang === 'zh' ? '⌘+D / Ctrl+D\n收藏我吧 💜' : '⌘+D / Ctrl+D\nto bookmark 💜')
                : (t.catBubble as string)
            }
          </p>
        </button>
      </div>
    </button>
  )
}
