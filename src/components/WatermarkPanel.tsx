import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n'
import type { WatermarkOptions, WatermarkPosition } from '../utils'

const POSITIONS: WatermarkPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]

const DEFAULT_OPTS: WatermarkOptions = {
  type: 'text',
  text: '',
  color: '#ffffff',
  fontSize: 0.05,
  opacity: 0.5,
  position: 'bottom-right',
  tiled: false,
  imageUrl: null,
  imageScale: 0.2,
}

// Mini glyph: 3×3 outline box with a dot at the current position cell.
function PositionIcon({ pos, active }: { pos: WatermarkPosition; active: boolean }) {
  const idx = POSITIONS.indexOf(pos)
  const col = idx % 3
  const row = Math.floor(idx / 3)
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4">
      <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth={1.2} opacity={active ? 0.8 : 0.35} />
      <circle cx={4.5 + col * 4.5} cy={4.5 + row * 4.5} r="1.8" fill="currentColor" />
    </svg>
  )
}

interface Props {
  onWatermark: (opts: WatermarkOptions) => void
  processing: boolean
  hasResult: boolean
}

export default function WatermarkPanel({ onWatermark, processing, hasResult }: Props) {
  const { t } = useTranslation()
  const [type, setType] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('')
  const [color, setColor] = useState(DEFAULT_OPTS.color)
  const [fontSize, setFontSize] = useState(5)           // % of image width
  const [imageScale, setImageScale] = useState(20)      // % of image width
  const [opacity, setOpacity] = useState(50)            // %
  const [position, setPosition] = useState<WatermarkPosition>(DEFAULT_OPTS.position)
  const [tiled, setTiled] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevOptsRef = useRef('')
  const optsRef = useRef<WatermarkOptions>({ ...DEFAULT_OPTS })

  // Latest opts + debounced auto-apply, so every control tweak re-renders the
  // result live (same pattern as ResizePanel's 400ms schedule).
  const commit = useCallback((partial: Partial<WatermarkOptions>) => {
    const next = { ...optsRef.current, ...partial }
    optsRef.current = next
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (next.type === 'text' && !next.text.trim()) return
      if (next.type === 'image' && !next.imageUrl) return
      const key = JSON.stringify(next)
      if (key !== prevOptsRef.current) {
        prevOptsRef.current = key
        onWatermark(next)
      }
    }, 400)
  }, [onWatermark])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const pickLogo = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setImageUrl(dataUrl)
      commit({ imageUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const switchType = (next: 'text' | 'image') => {
    setType(next)
    commit({ type: next })
  }

  const sliderClass =
    'w-full h-2 bg-[var(--bg-input)] rounded-full appearance-none cursor-pointer ' +
    'accent-[var(--accent)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 ' +
    '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] ' +
    '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer'

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.watermarkTitle}</h3>

      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => switchType('text')}
          className={`py-2.5 text-sm font-medium rounded-[var(--radius-md)] border transition-all ${
            type === 'text'
              ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t.watermarkText}
        </button>
        <button
          onClick={() => switchType('image')}
          className={`py-2.5 text-sm font-medium rounded-[var(--radius-md)] border transition-all ${
            type === 'image'
              ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t.watermarkImage}
        </button>
      </div>

      {type === 'text' ? (
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={text}
              onChange={(e) => { setText(e.target.value); commit({ text: e.target.value }) }}
              placeholder={t.watermarkTextPlaceholder}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)]
                text-[var(--text-primary)] text-sm rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors"
            />
            <p className="mt-1.5 text-[11px] text-[var(--text-dim)]">{t.watermarkTextHint}</p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-[11px] text-[var(--text-dim)] mb-1.5 uppercase tracking-wide">{t.watermarkSize}</label>
              <input
                type="range" min={1} max={15} value={fontSize}
                onChange={(e) => { const v = Number(e.target.value); setFontSize(v); commit({ fontSize: v / 100 }) }}
                className={sliderClass}
              />
              <span className="block text-right text-[11px] text-[var(--text-dim)]">{fontSize}%</span>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-dim)] mb-1.5 uppercase tracking-wide">{t.watermarkColor}</label>
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); commit({ color: e.target.value }) }}
                className="h-9 w-12 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="Logo" className="h-12 w-12 object-contain rounded-lg border border-white/[0.1] bg-[var(--bg-input)] p-1" />
              <div className="flex-1">
                <p className="text-xs text-[var(--text-primary)]">{t.watermarkLogo}</p>
                <button
                  onClick={() => { setImageUrl(null); commit({ imageUrl: null }) }}
                  className="mt-1 text-[11px] text-[var(--text-dim)] hover:text-red-400 transition-colors"
                >
                  {t.clearAll}
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--accent)]/50 cursor-pointer py-6 transition-colors">
              <span className="text-2xl">🖼️</span>
              <span className="text-xs font-medium text-[var(--text-dim)]">{t.watermarkLogo}</span>
              <span className="text-[11px] text-[var(--text-dim)]/70">{t.watermarkLogoHint}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
            </label>
          )}

          <div>
            <label className="block text-[11px] text-[var(--text-dim)] mb-1.5 uppercase tracking-wide">{t.watermarkSize}</label>
            <input
              type="range" min={10} max={50} value={imageScale}
              onChange={(e) => { const v = Number(e.target.value); setImageScale(v); commit({ imageScale: v / 100 }) }}
              className={sliderClass}
            />
            <span className="block text-right text-[11px] text-[var(--text-dim)]">{imageScale}%</span>
          </div>
        </div>
      )}

      {/* Position: 3×3 grid */}
      <div>
        <p className="text-[11px] text-[var(--text-dim)] mb-2 uppercase tracking-wide">{t.watermarkPosition}</p>
        <div className="grid grid-cols-3 gap-1.5 w-36 sm:w-40">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => { setPosition(pos); commit({ position: pos }) }}
              className={`flex items-center justify-center aspect-square rounded-lg border transition-all ${
                position === pos && !tiled
                  ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
              aria-label={pos}
            >
              <PositionIcon pos={pos} active={position === pos && !tiled} />
            </button>
          ))}
        </div>
      </div>

      {/* Tiled toggle */}
      <button
        onClick={() => { setTiled(!tiled); commit({ tiled: !tiled }) }}
        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
          tiled
            ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
            : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span>{t.watermarkTiled}</span>
        <span className={`h-5 w-9 rounded-full transition-colors ${tiled ? 'bg-[var(--accent)]' : 'bg-white/10'}`}>
          <span className={`block h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${tiled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </span>
      </button>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">{t.watermarkOpacity}</label>
          <span className="text-sm font-mono tabular-nums text-[var(--text-primary)]">{opacity}%</span>
        </div>
        <input
          type="range" min={10} max={100} value={opacity}
          onChange={(e) => { const v = Number(e.target.value); setOpacity(v); commit({ opacity: v / 100 }) }}
          className={sliderClass}
        />
      </div>

      {processing && (
        <p className="text-xs text-center text-[var(--text-dim)]">{t.processing}</p>
      )}
      {!processing && hasResult && type === 'text' && !text.trim() && (
        <p className="text-xs text-center text-[var(--accent)] animate-pulse">{t.watermarkTextHint}</p>
      )}
    </div>
  )
}
