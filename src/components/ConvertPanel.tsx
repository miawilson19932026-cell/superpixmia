import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../i18n'
import type { OutputFormat } from '../types'
import { formatSize } from '../utils'

const FORMATS: { value: OutputFormat; label: string; ext: string; desc: string }[] = [
  { value: 'png', label: 'PNG', ext: '.png', desc: 'Lossless' },
  { value: 'jpeg', label: 'JPEG', ext: '.jpg', desc: 'Universal' },
  { value: 'webp', label: 'WebP', ext: '.webp', desc: 'Balanced' },
  { value: 'avif', label: 'AVIF', ext: '.avif', desc: 'Next-gen' },
  { value: 'bmp', label: 'BMP', ext: '.bmp', desc: 'Legacy' },
  { value: 'ico', label: 'ICO', ext: '.ico', desc: 'Favicon' },
]

interface Props {
  file: File
  resultSize: number | null
  onConvert: (format: OutputFormat, quality?: number) => void
  processing: boolean
  hasResult: boolean
  batch?: boolean
}

export default function ConvertPanel({ file, resultSize, onConvert, processing, hasResult, batch = false }: Props) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<OutputFormat>('png')
  const [quality, setQuality] = useState(92)
  const originalSize = file.size
  const prevFileRef = useRef<File | null>(null)

  const isLossy = format === 'jpeg' || format === 'webp' || format === 'avif'

  // Auto-convert when a new file arrives; skip in batch mode
  useEffect(() => {
    if (!batch && !hasResult && file !== prevFileRef.current) {
      prevFileRef.current = file
      onConvert(format, isLossy ? quality : undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, hasResult, file])

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.convertTitle}</h3>

      {/* Format selector */}
      <div>
        <p className="text-[11px] text-[var(--text-dim)] mb-2 uppercase tracking-wide">{t.convertTo}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
          {FORMATS.map((f) => {
            const isLossyFmt = f.value === 'jpeg' || f.value === 'webp' || f.value === 'avif'
            return (
              <button
                key={f.value}
                onClick={() => {
                  setFormat(f.value)
                  onConvert(f.value, isLossyFmt ? quality : undefined)
                }}
                className={`py-3 text-sm font-medium rounded-[var(--radius-md)] border transition-all
                  ${
                    format === f.value
                      ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)] shadow-lg shadow-[var(--accent-glow)]'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                  }
                `}
              >
                <span>{f.label}</span>
                <span className="block text-[11px] opacity-50 mt-0.5 font-normal">{f.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quality slider for lossy formats */}
      {isLossy && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">{t.quality}</label>
            <span className="text-sm font-mono tabular-nums text-[var(--text-primary)]">{quality}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => {
              setQuality(Number(e.target.value))
              onConvert(format, Number(e.target.value))
            }}
            className="w-full h-2 bg-[var(--bg-input)] rounded-full appearance-none cursor-pointer
              accent-[var(--accent)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)]
              [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-[var(--text-dim)]">1%</span>
            <span className="text-[11px] text-[var(--text-dim)]">100%</span>
          </div>
        </div>
      )}

      {/* Size info */}
      <div className="flex items-center justify-center gap-4 p-4 rounded-[var(--radius-lg)] glass backdrop-blur-xl">
        <div className="text-center">
          <p className="text-[11px] text-[var(--text-dim)] mb-1">{t.originalSize}</p>
          <p className="text-sm font-mono tabular-nums text-[var(--text-primary)]">{formatSize(originalSize)}</p>
        </div>
        <svg className="w-5 h-5 text-[var(--text-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
        <div className="text-center">
          <p className="text-[11px] text-[var(--text-dim)] mb-1">{t.convertSize}</p>
          <p className="text-sm font-mono tabular-nums text-[var(--text-primary)]">
            {resultSize != null ? formatSize(resultSize) : '—'}
          </p>
        </div>
      </div>

      {processing && (
        <p className="text-xs text-center text-[var(--text-dim)]">{t.processing}</p>
      )}
    </div>
  )
}
