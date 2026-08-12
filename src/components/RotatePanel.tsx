import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n'
import type { RotateOptions } from '../utils'

interface Props {
  onRotate: (opts: RotateOptions) => void
  processing: boolean
  hasResult: boolean
}

export default function RotatePanel({ onRotate, processing, hasResult }: Props) {
  const { t } = useTranslation()
  const [angle, setAngle] = useState(0)
  const [flipX, setFlipX] = useState(false)
  const [flipY, setFlipY] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevOptsRef = useRef('')
  const optsRef = useRef<RotateOptions>({ angle: 0, flipX: false, flipY: false })

  // Debounced auto-apply (same 400ms pattern as ResizePanel/WatermarkPanel).
  const commit = useCallback((partial: Partial<RotateOptions>) => {
    const next = { ...optsRef.current, ...partial }
    optsRef.current = next
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const key = JSON.stringify(next)
      if (key !== prevOptsRef.current) {
        prevOptsRef.current = key
        onRotate(next)
      }
    }, 400)
  }, [onRotate])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Snap-turn buttons accumulate on top of the current angle (and keep any flip).
  const turn = (delta: number) => {
    const next = angle + delta
    setAngle(next)
    commit({ angle: next })
  }

  const toggleFlip = (axis: 'x' | 'y') => {
    if (axis === 'x') {
      const next = !flipX
      setFlipX(next)
      commit({ flipX: next })
    } else {
      const next = !flipY
      setFlipY(next)
      commit({ flipY: next })
    }
  }

  const reset = () => {
    setAngle(0)
    setFlipX(false)
    setFlipY(false)
    const next: RotateOptions = { angle: 0, flipX: false, flipY: false }
    optsRef.current = next
    clearTimeout(timerRef.current)
    prevOptsRef.current = JSON.stringify(next)
    onRotate(next)
  }

  const sliderClass =
    'w-full h-2 bg-[var(--bg-input)] rounded-full appearance-none cursor-pointer ' +
    'accent-[var(--accent)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 ' +
    '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] ' +
    '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer'

  const stepBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`py-2.5 text-sm font-medium rounded-[var(--radius-md)] border transition-all ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
          : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.rotateTitle}</h3>

      {/* 90° steps */}
      <div className="grid grid-cols-3 gap-1.5">
        {stepBtn(`⟲ ${t.rotateLeft}`, false, () => turn(-90))}
        {stepBtn(`⟳ ${t.rotateRight}`, false, () => turn(90))}
        {stepBtn(`↻ 180°`, false, () => turn(180))}
      </div>

      {/* Mirror (flip) */}
      <div className="grid grid-cols-2 gap-1.5">
        {stepBtn(`⇋ ${t.rotateFlipH}`, flipX, () => toggleFlip('x'))}
        {stepBtn(`⇕ ${t.rotateFlipV}`, flipY, () => toggleFlip('y'))}
      </div>

      {/* Free angle slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">{t.rotateAngle}</label>
          <span className="text-sm font-mono tabular-nums text-[var(--text-primary)]">
            {((angle % 360) + 360) % 360}°
          </span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          value={Math.max(-180, Math.min(180, angle))}
          onChange={(e) => { const v = Number(e.target.value); setAngle(v); commit({ angle: v }) }}
          className={sliderClass}
        />
      </div>

      <button
        onClick={reset}
        className="w-full py-2.5 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
      >
        ↺ {t.rotateReset}
      </button>

      {processing && <p className="text-xs text-center text-[var(--text-dim)]">{t.processing}</p>}
      {!processing && hasResult && (
        <p className="text-xs text-center text-[var(--accent)] animate-pulse">{t.rotateHint}</p>
      )}
    </div>
  )
}
