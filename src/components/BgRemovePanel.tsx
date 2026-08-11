import { useState } from 'react'
import { useTranslation } from '../i18n'

type BgMode = 'transparent' | 'white' | 'black'

interface Props {
  resultUrl: string | null
  onRemoveBg: (index?: number) => void
  processing: boolean
  progress: number // 0-1
  imageCount: number
  currentIndex: number
  onPrev: () => void
  onNext: () => void
}

export default function BgRemovePanel({ resultUrl, onRemoveBg, processing, progress, imageCount, currentIndex, onPrev, onNext }: Props) {
  const { t } = useTranslation()
  const [bgMode, setBgMode] = useState<BgMode>('transparent')

  const bgStyle: Record<BgMode, React.CSSProperties> = {
    transparent: {},
    white: { backgroundColor: '#ffffff' },
    black: { backgroundColor: '#0a0a0a' },
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.bgRemoveTitle}</h3>

      {/* Progress / Active state */}
      {processing && (
        <div className="p-4 rounded-[var(--radius-lg)] glass backdrop-blur-xl space-y-3">
          <p className="text-sm text-center text-[var(--text-dim)]">{t.removingBg}</p>
          <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-center text-[var(--text-dim)] font-mono tabular-nums">
            {Math.round(progress * 100)}%
          </p>
        </div>
      )}

      {/* Bg preview controls */}
      {resultUrl && !processing && (
        <div>
          <p className="text-[11px] text-[var(--text-dim)] mb-2 uppercase tracking-wide">{t.bgPreview}</p>
          <div className="flex gap-1.5">
            {([
              { key: 'transparent', label: t.bgTransparent, icon: true },
              { key: 'white', label: t.bgWhite },
              { key: 'black', label: t.bgBlack },
            ] as { key: BgMode; label: string; icon?: boolean }[]).map((m) => (
              <button
                key={m.key}
                onClick={() => setBgMode(m.key)}
                className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] border transition-all
                  ${
                    bgMode === m.key
                      ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                  }
                `}
              >
                {m.key === 'transparent' && (
                  <span
                    className="inline-block w-4 h-4 rounded-sm mr-1.5 align-middle checkerboard"
                    style={{ verticalAlign: 'middle' }}
                  />
                )}
                {m.key !== 'transparent' && (
                  <span
                    className="inline-block w-4 h-4 rounded-sm mr-1.5 align-middle border border-[var(--border)]"
                    style={{ backgroundColor: m.key === 'white' ? '#fff' : '#0a0a0a', verticalAlign: 'middle' }}
                  />
                )}
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result preview with bg option + navigation */}
      {resultUrl && !processing && (
        <div className="flex items-center gap-2">
          {/* Prev button */}
          {imageCount > 1 && (
            <button
              onClick={onPrev}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div
            className={`flex-1 rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border)] flex items-center justify-center p-4 min-h-[200px] ${
              bgMode === 'transparent' ? 'checkerboard' : ''
            }`}
            style={bgMode !== 'transparent' ? bgStyle[bgMode] : undefined}
          >
            <img src={resultUrl} alt="Background removed" className="max-w-full max-h-[300px] object-contain" />
          </div>

          {/* Next button */}
          {imageCount > 1 && (
            <button
              onClick={onNext}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Image indicator (when multiple) */}
      {!processing && imageCount > 1 && (
        <p className="text-center text-[11px] text-[var(--text-dim)] font-mono tabular-nums">
          {currentIndex + 1} / {imageCount}
        </p>
      )}

      {/* Action button */}
      {!resultUrl && (
        <div>
          <p className="text-xs text-center text-[var(--accent)] mb-2 animate-pulse">{t.bgRemoveGuide}</p>
          <button
            onClick={() => onRemoveBg()}
            disabled={processing}
            className="w-full py-2.5 btn-gradient text-sm font-medium rounded-[var(--radius-md)] disabled:opacity-40 disabled:pointer-events-none"
          >
            {processing ? t.removingBg : t.removeBgBtn}
          </button>
        </div>
      )}
    </div>
  )
}
