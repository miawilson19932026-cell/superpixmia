import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from '../i18n'
import type { ToolType } from '../types'
import CatMascot from './CatMascot'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/x-icon', 'image/tiff', 'image/vnd.microsoft.icon']
const MAX_SIZE = 500 * 1024 * 1024

const toolLabelKey: Record<ToolType, string> = {
  resize: 'toolResize',
  compress: 'toolCompress',
  'remove-bg': 'toolRemoveBg',
  convert: 'toolConvert',
}

interface Props {
  onImage: (file: File) => void
  hasImage: boolean
  activeTool: ToolType
  batch?: boolean
  maxBatch?: number
  onImages?: (files: File[]) => void
  imageCount?: number
  mode: 'single' | 'batch'
  onToggleMode: () => void
  onClear?: () => void
}

export default function DropZone({
  onImage, hasImage, activeTool,
  batch = false, maxBatch = 9, onImages, imageCount = 0,
  mode, onToggleMode, onClear,
}: Props) {
  const { t, lang } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!ACCEPTED.includes(file.type)) {
        alert(t.errorUnsupportedFormat)
        return false
      }
      if (file.size > MAX_SIZE) {
        alert(t.errorFileTooBig)
        return false
      }
      return true
    },
    [t]
  )

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter(validateFile)
      if (list.length === 0) return

      if (batch && onImages) {
        onImages(list.slice(0, maxBatch))
      } else {
        onImage(list[0])
      }
    },
    [batch, maxBatch, onImages, onImage, validateFile]
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const openFile = () => inputRef.current?.click()

  // ── Mode toggle segment ──
  const modeToggle = (
    <div className="flex items-center glass backdrop-blur-xl rounded-[var(--radius-sm)] border border-white/[0.06] p-0.5 shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (mode === 'batch') onToggleMode() }}
        className={`px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] transition-all ${
          mode === 'single'
            ? 'bg-[var(--accent)] text-white shadow-sm'
            : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
        }`}
      >
        {lang === 'zh' ? '单张' : 'Single'}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (mode === 'single') onToggleMode() }}
        className={`px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] transition-all ${
          mode === 'batch'
            ? 'bg-[var(--accent)] text-white shadow-sm'
            : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
        }`}
      >
        {lang === 'zh' ? '批量' : 'Batch'}
      </button>
    </div>
  )

  // ── Compact mode ──
  if (hasImage) {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        className={`
          mx-auto max-w-2xl p-2.5 sm:p-3 rounded-[var(--radius-lg)]
          flex flex-wrap items-center justify-between gap-2 transition-all
          ${isDragOver
            ? 'shadow-[0_0_20px_var(--accent-glow)] scale-[1.02]'
            : ''
          }
        `}
        style={isDragOver
          ? {
              border: '1px dashed rgba(96,165,250,0.5)',
              background: 'rgba(59,130,246,0.06)',
              backdropFilter: 'blur(24px) saturate(120%)',
              WebkitBackdropFilter: 'blur(24px) saturate(120%)',
            }
          : {
              border: '1px solid rgba(139,92,246,0.18)',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(24px) saturate(120%)',
              WebkitBackdropFilter: 'blur(24px) saturate(120%)',
            }
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] sm:text-xs font-medium text-[var(--accent)] bg-[var(--accent-glow)]/30 px-2 py-0.5 rounded-md border border-[var(--accent)]/10 shrink-0">
            {t[toolLabelKey[activeTool] as keyof typeof t] as string}
          </span>
          {batch && imageCount > 0 && (
            <span className="text-[11px] sm:text-xs text-[var(--text-dim)]">
              {imageCount}/{maxBatch}
              {imageCount < maxBatch && (
                <span className="text-[var(--text-dim)]/50 ml-1 hidden sm:inline">
                  ({lang === 'zh' ? `还可添加 ${maxBatch - imageCount} 张` : `${maxBatch - imageCount} left`})
                </span>
              )}
            </span>
          )}
          {isDragOver && (
            <span className="text-[11px] text-[var(--accent)] animate-pulse">
              {batch
                ? (lang === 'zh' ? '释放以添加' : 'Release to add')
                : (lang === 'zh' ? '释放以替换' : 'Release to replace')
              }
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {modeToggle}

          {batch && (
            <>
              {imageCount < maxBatch && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openFile() }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] sm:text-xs font-medium
                    text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12]
                    transition-all cursor-pointer shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="hidden sm:inline">{t.dropNewImage}</span>
                </button>
              )}
              {onClear && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClear() }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] sm:text-xs font-medium
                    text-red-400/70 hover:text-red-400 hover:bg-red-400/8 border border-red-400/10 hover:border-red-400/20
                    transition-all cursor-pointer shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                  <span className="hidden sm:inline">{t.clearAll as string}</span>
                </button>
              )}
            </>
          )}

          {!batch && (
            <>
              {onClear && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClear() }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] sm:text-xs font-medium
                    text-red-400/70 hover:text-red-400 hover:bg-red-400/8 border border-red-400/10 hover:border-red-400/20
                    transition-all cursor-pointer shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                  <span className="hidden sm:inline">{t.clearAll as string}</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openFile() }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] sm:text-xs font-medium
                  text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12]
                  transition-all cursor-pointer shrink-0"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="hidden sm:inline">{t.dropNewImage}</span>
              </button>
            </>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp,image/svg+xml,image/x-icon,image/tiff"
          multiple={batch}
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
          className="hidden"
        />
      </div>
    )
  }

  // ── Full DropZone ──
  return (
    <div className="relative mx-auto max-w-2xl mt-20 sm:mt-24">
      {/* Stacked album cards — dark glass, more opaque */}
      <div
        className="absolute -inset-x-5 -inset-y-8 rounded-[var(--radius-xl)] -rotate-[3deg]"
        style={{
          background: 'linear-gradient(135deg, rgba(18,18,40,0.78), rgba(14,14,36,0.85), rgba(22,18,44,0.75))',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 0 40px rgba(139,92,246,0.05), 0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      />
      <div
        className="absolute -inset-x-3 -inset-y-5 rounded-[var(--radius-xl)] rotate-[2.5deg]"
        style={{
          background: 'linear-gradient(135deg, rgba(20,18,42,0.78), rgba(16,16,40,0.85), rgba(20,20,46,0.75))',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 0 36px rgba(99,102,241,0.04), 0 6px 28px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      />
      <div
        className="absolute -inset-x-1.5 -inset-y-3 rounded-[var(--radius-xl)] -rotate-[1.5deg]"
        style={{
          background: 'linear-gradient(135deg, rgba(18,18,42,0.78), rgba(16,16,42,0.85), rgba(20,18,44,0.75))',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 0 28px rgba(59,130,246,0.03), 0 4px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      />

      {/* Main card */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        tabIndex={0}
        onClick={openFile}
        className={`
          relative p-6 sm:p-10 rounded-[var(--radius-xl)]
          flex flex-col items-center justify-center gap-3 cursor-pointer
          transition-all duration-300 outline-none glass neon-top-line
          ${isDragOver
            ? 'shadow-[0_0_24px_var(--accent-glow)] scale-[1.01]'
            : ''
          }
        `}
        style={{
          border: isDragOver ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(59,130,246,0.12)',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.025) 0%, rgba(20,20,50,0.50) 30%, rgba(15,15,40,0.55) 60%, rgba(255,255,255,0.02) 100%)',
        }}
      >
        {/* Top row: tool badge + mode toggle */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-[var(--accent)] bg-[var(--accent-glow)]/30 px-2 py-0.5 rounded-md border border-[var(--accent)]/10">
            {t[toolLabelKey[activeTool] as keyof typeof t] as string}
          </span>
          {modeToggle}
        </div>

        {/* Upload icon */}
        <div className={`
          w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center transition-all duration-300 mt-4
          ${isDragOver ? 'bg-[var(--accent)]/12 scale-110 ring-1 ring-[var(--accent)]/25' : 'bg-white/[0.04]'}
        `}>
          {batch ? (
            /* Batch: photo grid + upload */
            <svg className={`w-24 h-24 sm:w-28 sm:h-28 transition-all duration-300 ${isDragOver ? 'text-[var(--accent)] scale-110' : 'text-[var(--text-dim)]/55'}`}
              fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              {/* Outer card frame */}
              <rect x="3" y="5" width="42" height="32" rx="6" />
              {/* Grid lines — 2x2 layout */}
              <line x1="24" y1="5" x2="24" y2="37" opacity="0.3" />
              <line x1="3" y1="21" x2="45" y2="21" opacity="0.3" />
              {/* Top-left: sun + hill */}
              <circle cx="14" cy="13" r="3" opacity="0.7" />
              <path d="M5 19l3-3 2 1.5 2.5-2 1.5 1" opacity="0.5" />
              {/* Top-right: sun + hill */}
              <circle cx="34" cy="13" r="3" opacity="0.7" />
              <path d="M25 19l3-3 2 1.5 2.5-2 1.5 1" opacity="0.5" />
              {/* Bottom-left: sun + hill */}
              <circle cx="14" cy="29" r="3" opacity="0.7" />
              <path d="M5 35l3-3 2 1.5 2.5-2 1.5 1" opacity="0.5" />
              {/* Bottom-right: upload badge */}
              <circle cx="34" cy="29" r="7" fill="currentColor" opacity="0.12" />
              <path d="M34 25.5v7" strokeWidth={2.3} />
              <path d="M30.5 29l3.5-3.5 3.5 3.5" strokeWidth={2.3} />
            </svg>
          ) : (
            /* Single: original upload icon */
            <svg className={`w-24 h-24 sm:w-28 sm:h-28 transition-all duration-300 ${isDragOver ? 'text-[var(--accent)] scale-110' : 'text-[var(--text-dim)]/55'}`}
              fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="38" height="29" rx="6" opacity="0.2" />
              <rect x="5" y="12.5" width="38" height="29" rx="5.5" />
              <circle cx="32" cy="21" r="4" />
              <path d="M5 35.5l9-8 5 3.5 8-7 6.5 4.5 4.5-2.5" opacity="0.4" />
              <path d="M24 3.5v9" strokeWidth={2.2} />
              <path d="M18 8l6-5 6 5" strokeWidth={2.2} />
            </svg>
          )}
        </div>

        {/* Drop text */}
        <div className="text-center -mt-[5px]">
          {batch ? (
            <p className="text-base sm:text-lg leading-relaxed">
              {lang === 'zh' ? (
                <><span className="text-gradient font-bold">批量上传</span><span className="text-white/70 font-medium">最多支持 15 张图片</span></>
              ) : (
                <><span className="text-gradient font-bold">Batch upload</span><span className="text-white/70 font-medium"> up to 15 images</span></>
              )}
            </p>
          ) : (
            <p className="text-lg sm:text-xl leading-relaxed">
              {lang === 'zh' ? (
                <><span className="text-gradient font-bold">拖拽图片</span><span className="text-white/70 font-medium">到此处</span></>
              ) : (
                <><span className="text-gradient font-bold">Drop</span><span className="text-white/70 font-medium"> your image here</span></>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openFile() }}
          className="px-5 py-2.5 btn-gradient text-sm font-medium rounded-[var(--radius-md)]"
        >
          {t.dropBrowse}
        </button>

        <div className="flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] text-[var(--text-dim)] text-center leading-relaxed">
          <span className="max-w-[280px] sm:max-w-none">{t.dropFormats}</span>
          <span>{t.dropMaxSize}</span>
        </div>

        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp,image/svg+xml,image/x-icon,image/tiff"
          multiple={batch}
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
          className="hidden"
        />
      </div>

      <CatMascot />
    </div>
  )
}
