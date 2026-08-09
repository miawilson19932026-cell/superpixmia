import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from '../i18n'
import type { Dimensions, PresetSize } from '../types'

const PRESETS: PresetSize[] = [
  { label: 'OG Image', width: 1200, height: 630 },
  { label: 'Favicon', width: 32, height: 32 },
  { label: 'Instagram', width: 1080, height: 1080 },
  { label: 'Twitter Header', width: 1500, height: 500 },
  { label: 'GitHub Social', width: 1280, height: 640 },
  { label: 'App Icon', width: 180, height: 180 },
]

interface Props {
  originalWidth: number
  originalHeight: number
  onResize: (dims: Dimensions) => void
  processing: boolean
  hasResult: boolean
  batch?: boolean
}

export default function ResizePanel({ originalWidth, originalHeight, onResize, processing, hasResult, batch = false }: Props) {
  const { t } = useTranslation()
  const ratio = originalWidth / originalHeight
  const [lock, setLock] = useState(true)
  const [w, setW] = useState(originalWidth)
  const [h, setH] = useState(originalHeight)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevDimsRef = useRef('')

  // Auto-resize when a new image arrives; skip in batch mode (handleResize processes all)
  useEffect(() => {
    if (!batch && !hasResult && originalWidth > 0 && originalHeight > 0) {
      const key = `${originalWidth}x${originalHeight}`
      if (key !== prevDimsRef.current) {
        prevDimsRef.current = key
        onResize({ width: originalWidth, height: originalHeight })
      }
    }
  }, [batch, hasResult, originalWidth, originalHeight, onResize])

  // Only reset dimensions on image change in single mode
  useEffect(() => {
    if (!batch) {
      setW(originalWidth)
      setH(originalHeight)
    }
  }, [batch, originalWidth, originalHeight])

  // Auto-apply after 400ms of no input
  const scheduleResize = useCallback(
    (width: number, height: number) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (width > 0 && height > 0) {
          onResize({ width, height })
        }
      }, 400)
    },
    [onResize]
  )

  const updateW = useCallback(
    (val: number) => {
      setW(val)
      const newH = lock ? Math.round(val / ratio) : h
      if (lock) setH(newH)
      scheduleResize(val, newH)
    },
    [lock, ratio, h, scheduleResize]
  )

  const updateH = useCallback(
    (val: number) => {
      setH(val)
      const newW = lock ? Math.round(val * ratio) : w
      if (lock) setW(newW)
      scheduleResize(newW, val)
    },
    [lock, ratio, w, scheduleResize]
  )

  const applyPreset = (p: PresetSize) => {
    setW(p.width)
    setH(p.height)
    setLock(false)
    clearTimeout(timerRef.current)
    onResize({ width: p.width, height: p.height })
  }

  // Cleanup timer
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* Width + Height inputs */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-[11px] text-[var(--text-dim)] mb-1.5 uppercase tracking-wide">{t.width} (px)</label>
          <input
            type="number"
            value={w || ''}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { setW(0); return }
              updateW(Number(raw))
            }}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)]
              text-[var(--text-primary)] text-sm font-mono rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors"
          />
        </div>

        {/* Lock toggle */}
        <button
          onClick={() => setLock(!lock)}
          className={`mt-5 p-2.5 rounded-[var(--radius-sm)] border transition-all ${
            lock
              ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
          }`}
          title={lock ? t.lockRatio : t.unlockRatio}
        >
          {lock ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-3.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <label className="block text-[11px] text-[var(--text-dim)] mb-1.5 uppercase tracking-wide">{t.height} (px)</label>
          <input
            type="number"
            value={h || ''}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { setH(0); return }
              updateH(Number(raw))
            }}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)]
              text-[var(--text-primary)] text-sm font-mono rounded-[var(--radius-sm)] px-3 py-2.5 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="text-[11px] text-[var(--text-dim)] mb-2 uppercase tracking-wide">{t.presets}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="text-left px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--border-hover)]
                hover:bg-[var(--bg-input)] transition-all group"
            >
              <span className="text-xs text-[var(--text-dim)] group-hover:text-[var(--text-primary)]">
                {t.presetLabels[p.label] ?? p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Processing indicator */}
      {processing && (
        <p className="text-xs text-center text-[var(--text-dim)]">{t.processing}</p>
      )}
    </div>
  )
}
