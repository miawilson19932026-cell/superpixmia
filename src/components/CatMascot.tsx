import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from '../i18n'
import { useBackdropDismiss } from '../lib/useBackdropDismiss'

// SSR-safe: prerender runs in Node where navigator is undefined.
const isWeChat = typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)

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

type Dot = { top: string; left: string; w: number; bg: number; d: string; delay: string }

// Dot trail from the cat's mouth toward the bubble — two orientations:
//  DOTS_LEFT → bubble sits to the RIGHT of the cat (default) → trail LEFT toward it
//  DOTS_UP   → bubble sits BELOW the cat (help/blog, cat centered) → trail UP toward it
const DOTS_LEFT: Dot[] = [
  { top: '58%', left: '-42px', w: 16, bg: 0.22, d: '2.0s', delay: '0s' },
  { top: '48%', left: '-34px', w: 22, bg: 0.18, d: '2.5s', delay: '0.4s' },
  { top: '38%', left: '-26px', w: 28, bg: 0.15, d: '2.2s', delay: '0.8s' },
  { top: '28%', left: '-18px', w: 24, bg: 0.13, d: '2.8s', delay: '0.2s' },
  { top: '18%', left: '-10px', w: 20, bg: 0.11, d: '2.6s', delay: '0.6s' },
]
const DOTS_UP: Dot[] = [
  { top: '-34px', left: '54%', w: 16, bg: 0.22, d: '2.0s', delay: '0s' },
  { top: '-26px', left: '46%', w: 22, bg: 0.18, d: '2.5s', delay: '0.4s' },
  { top: '-18px', left: '52%', w: 28, bg: 0.15, d: '2.2s', delay: '0.8s' },
  { top: '-12px', left: '48%', w: 24, bg: 0.13, d: '2.8s', delay: '0.2s' },
  { top: '-6px',  left: '50%', w: 20, bg: 0.11, d: '2.6s', delay: '0.6s' },
]

// Glass tail connecting the bubble to the cat (transform differs per orientation)
const TAIL_STYLE = {
  width: '18px',
  height: '16px',
  clipPath: 'polygon(100% 0%, 25% 35%, 0% 50%, 25% 65%, 100% 100%)',
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  border: '2.5px solid rgba(255,255,255,0.14)',
  borderRight: 'none',
  borderRadius: '40% 0 0 40%',
} as const

const renderDots = (dots: Dot[], extraCls = '') =>
  dots.map((dot, i) => (
    <span
      key={i}
      className={`absolute rounded-full ${extraCls}`}
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
  ))

export default function CatMascot({ positionClass, bubbleBelow }: { positionClass?: string; bubbleBelow?: boolean }) {
  const { t, lang } = useTranslation()
  const [frame, setFrame] = useState(1)
  const [winking, setWinking] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const idxRef = useRef(0)
  const { onBackdropPointerDown, onBackdropClick } = useBackdropDismiss()

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

  // Click: WeChat shows guide overlay, PC toggles bookmark hint
  const handleClick = useCallback(() => {
    if (isWeChat) {
      setShowGuide(true)
      return
    }
    setClicked((c) => !c)
    if (winking) return
    setWinking(true)
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
    <>
    {/* div role=button (not <button>) so the speech-bubble <button> inside
        doesn't nest interactive elements — that nesting breaks React hydration. */}
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
      className={`${positionClass ?? 'absolute -bottom-32 -left-4 sm:-bottom-44 sm:left-auto sm:-right-28'} z-10 w-[150px] h-[150px] sm:w-[280px] sm:h-[280px]
        rounded-full cursor-pointer select-none
        hover:scale-110 active:scale-95 transition-transform duration-200
        animate-float`}
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

      {/* Speech bubble + tail + dots wrapper.
          Mobile placement depends on the cat's position:
          - default (cat bottom-left): bubble sits to the RIGHT of the cat, wide.
          - bubbleBelow (help/blog, cat centered): bubble sits BELOW the cat, wide.
          Desktop (sm+) is unchanged everywhere: above-right of the cat. */}
      <div className={`absolute z-20 animate-float pointer-events-none ${
        bubbleBelow
          ? 'top-full mt-2 inset-x-0 flex justify-center sm:top-[-12%] sm:left-[75%] sm:inset-x-auto sm:block sm:mt-0'
          : 'top-[2%] left-full ml-2.5 sm:top-[-12%] sm:left-[75%] sm:ml-0'
      }`}>
        {/* Bubble dots trail from the cat's mouth (LEFT-trail on mobile, shown always) */}
        {renderDots(DOTS_LEFT, bubbleBelow ? 'hidden sm:block' : '')}
        {/* Up-pointing dots for the below-cat bubble (mobile only) */}
        {bubbleBelow && renderDots(DOTS_UP, 'sm:hidden')}

        {/* Tail — irregular glass point connecting the bubble to the cat */}
        <div
          className={`absolute bottom-[12%] left-0 ${bubbleBelow ? 'hidden sm:block' : ''}`}
          style={{ ...TAIL_STYLE, transform: 'translateX(-14px) rotate(-15deg)' }}
        />
        {bubbleBelow && (
          <div
            className="absolute top-0 left-1/2 sm:hidden"
            style={{ ...TAIL_STYLE, transform: 'translate(-50%, -14px) rotate(75deg)' }}
          />
        )}

        <button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="relative px-5 py-3.5 sm:px-6 sm:py-4
            min-w-[190px] sm:min-w-[220px] max-w-[calc(100vw-1.5rem)]
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
              ? (t.catBubble as string)
              : (hovered || clicked)
                ? (lang === 'zh' ? '⌘+D / Ctrl+D\n收藏我吧 💜' : '⌘+D / Ctrl+D\nto bookmark 💜')
                : (t.catBubble as string)
            }
          </p>
        </button>
      </div>
    </div>

      {/* WeChat bookmark guide overlay */}
      {showGuide && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onPointerDownCapture={onBackdropPointerDown}
          onClick={(e) => onBackdropClick(e, () => setShowGuide(false))}
        >
          {/* Top bar mockup — WeChat browser chrome */}
          <div className="w-full max-w-sm mb-6 animate-in">
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl"
              style={{ background: 'rgba(30,30,50,0.95)' }}
            >
              {/* Mock WeChat top bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5"
                style={{ background: '#1a1a2e' }}
              >
                <span className="text-xs text-white/40">🌐 superpixmia.com</span>
                <div className="relative">
                  {/* The ··· button with finger pointer */}
                  <span className="text-xl text-white/80 font-bold tracking-[3px]">···</span>
                  {/* Animated finger */}
                  <span className="absolute -top-6 -right-1 text-2xl" style={{ animation: 'bouncePoint 0.8s ease-in-out infinite' }}>
                    👆
                  </span>
                </div>
              </div>

              {/* Mock WeChat menu dropdown */}
              <div className="px-2 py-3 space-y-1">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/30">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 1024 1024" fill="none">
                    <path d="M919.272727 416.581818L607.418182 79.127273c-11.636364-11.636364-32.581818-11.636364-44.218182 0-6.981818 6.981818-9.309091 16.290909-9.309091 25.6v181.527272c-258.327273 0-465.454545 207.127273-465.454545 463.127273 0 62.836364 13.963636 125.672727 39.563636 183.854546 37.236364-193.163636 221.090909-339.781818 425.890909-339.781819v181.527273c-2.327273 9.309091 2.327273 18.618182 9.309091 25.6 4.654545 6.981818 13.963636 9.309091 23.272727 9.309091s18.618182-4.654545 23.272728-11.636364L919.272727 465.454545c6.981818-6.981818 9.309091-13.963636 9.309091-23.272727s-4.654545-18.618182-9.309091-25.6z" fill="#07C160"/>
                  </svg> {lang === 'zh' ? '分享给朋友' : 'Share'}
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'rgba(255,215,0,0.15)', color: '#ffd700' }}>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 1038 1024" fill="none">
                    <path d="M519.41878 2.21928l465.305548 225.654276a20.428048 20.428048 0 0 1 0 36.50568L519.986226 508.948371a21.184643 21.184643 0 0 1-18.91486 0L35.765818 264.379236a20.617197 20.617197 0 0 1 0-36.50568L501.638812 2.21928a18.91486 18.91486 0 0 1 17.779968 0z" fill="#00AEFF"/>
                    <path d="M469.861848 1005.08514L11.554798 783.592134a20.428048 20.428048 0 0 1-11.538065-18.91486V309.58575a20.428048 20.428048 0 0 1 29.885479-18.91486l458.307049 237.759787a20.049751 20.049751 0 0 1 10.970619 18.914859v439.39219a20.428048 20.428048 0 0 1-29.318032 18.347414z" fill="#FFC817"/>
                    <path d="M533.037479 528.430677L991.344529 291.427485a20.428048 20.428048 0 0 1 29.885478 18.91486v454.902375a20.428048 20.428048 0 0 1-11.538064 18.914859L551.384893 1005.08514a20.428048 20.428048 0 0 1-29.318033-18.914859V546.588942a20.049751 20.049751 0 0 1 10.970619-18.158265z" fill="#EA4748"/>
                  </svg>
                  <span className="font-semibold">{lang === 'zh' ? '收藏' : 'Favorite'}</span>
                  {/* Pointing hand */}
                  <span className="ml-auto text-xl" style={{ animation: 'bouncePoint 0.8s ease-in-out infinite' }}>
                    👈
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/30">
                  <span className="text-base">⚙️</span> {lang === 'zh' ? '设置' : 'Settings'}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom hint */}
          <p className="text-sm text-white/50 animate-pulse mt-2">
            {lang === 'zh' ? '👆 点击右上角 ···，然后点 收藏' : '👆 Tap ··· then Favorite'}
          </p>
          <p className="text-xs text-white/30 mt-1">
            {lang === 'zh' ? '（点击任意处关闭）' : '(tap anywhere to close)'}
          </p>

          <style>{`
            @keyframes bouncePoint {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
