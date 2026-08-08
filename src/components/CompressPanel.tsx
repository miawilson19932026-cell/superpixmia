import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '../i18n'
import type { OutputFormat } from '../types'
import { getOutputFormat, formatSize } from '../utils'

interface Props {
  file: File
  resultSize: number | null
  onCompress: (quality: number, format: OutputFormat) => void
  processing: boolean
  hasResult: boolean
  batch?: boolean
}

export default function CompressPanel({ file, resultSize, onCompress, processing, hasResult, batch = false }: Props) {
  const { t } = useTranslation()
  const originalFormat = getOutputFormat(file)
  const originalSize = file.size

  const [quality, setQuality] = useState(80)
  const prevFileRef = useRef<File | null>(null)

  // Auto-compress on file arrival (both single & batch)
  useEffect(() => {
    if (!hasResult && file !== prevFileRef.current) {
      prevFileRef.current = file
      onCompress(quality, originalFormat)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult, file])

  const handleQualityChange = useCallback(
    (val: number) => {
      setQuality(val)
      onCompress(val, originalFormat)
    },
    [originalFormat, onCompress]
  )

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.compressTitle}</h3>

      {/* Quality slider */}
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
          onChange={(e) => handleQualityChange(Number(e.target.value))}
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

      {/* Size comparison — single mode only; batch shows per-image sizes in grid */}
      {!batch && (
        <div className="flex items-center justify-center gap-4 p-4 rounded-[var(--radius-lg)] glass backdrop-blur-xl">
          <div className="text-center">
            <p className="text-[11px] text-[var(--text-dim)] mb-1">{t.originalSize}</p>
            <p className="text-sm font-mono tabular-nums text-[var(--text-primary)]">{formatSize(originalSize)}</p>
          </div>
          <svg className="w-5 h-5 text-[var(--text-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <div className="text-center">
            <p className="text-[11px] text-[var(--text-dim)] mb-1">{t.compressedSize}</p>
            <p className={`text-sm font-mono tabular-nums ${resultSize && resultSize < originalSize ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
              {resultSize != null ? formatSize(resultSize) : '—'}
            </p>
          </div>
        </div>
      )}

      {processing && (
        <p className="text-xs text-center text-[var(--text-dim)]">{t.processing}</p>
      )}
    </div>
  )
}
