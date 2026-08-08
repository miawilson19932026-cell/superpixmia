import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from './i18n'
import type { ToolType, OutputFormat, Dimensions } from './types'
import { resizeImage, compressImage, convertImage } from './utils'
import { removeImageBackground } from './utils/removeBg'
import JSZip from 'jszip'
import ParticleBg from './components/ParticleBg'
import Header from './components/Header'
import DropZone from './components/DropZone'
import ImagePreview from './components/ImagePreview'
import ResizePanel from './components/ResizePanel'
import CompressPanel from './components/CompressPanel'
import BgRemovePanel from './components/BgRemovePanel'
import ConvertPanel from './components/ConvertPanel'

/* ── Gaming Icons (outline / filled) ── */
const gameIcons: Record<ToolType, { outline: React.ReactNode; filled: React.ReactNode }> = {
  resize: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 8h3M3 16h3M21 8h-3M21 16h-3M8 3v3M16 3v3M8 21v-3M16 21v-3" opacity="0.5" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.12" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 8h5M3 16h5M21 8h-5M21 16h-5M8 3v5M16 3v5M8 21v-5M16 21v-5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  compress: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 14h8M8 11h6M8 17h4" />
        <path d="M17 5l2 2-2 2M7 19l-2-2 2-2" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.12" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <rect x="8" y="9" width="8" height="3" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="8" y="14" width="6" height="2.5" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="8" y="18.5" width="4" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <path d="M17 5l2 2-2 2M7 19l-2-2 2-2" />
      </svg>
    ),
  },
  'remove-bg': {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="3.5" />
        <path d="M6 20v-1.5a5.5 5.5 0 0110.5-2" />
        <path d="M18 14l2 2-2 2M20 16h-8" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="3.5" fill="currentColor" opacity="0.15" />
        <circle cx="12" cy="9" r="3.5" />
        <path d="M6 20v-1.5a5.5 5.5 0 0110.5-2" />
        <path d="M18 14l2 2-2 2M20 16h-8" />
        <circle cx="19" cy="5" r="1.2" fill="currentColor" opacity="0.6" />
        <path d="M19 3.5v3M17.5 5h3" strokeWidth={1} opacity="0.6" />
      </svg>
    ),
  },
  convert: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16l4-4 3 2 4-4 7 6" />
        <path d="M16 5l4 4-4 4M8 19l-4-4 4-4" opacity="0.5" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.12" />
        <text x="7" y="19" textAnchor="middle" fill="currentColor" fontSize="5" fontWeight="700" opacity="0.6">PNG</text>
        <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.15" />
        <text x="17" y="9" textAnchor="middle" fill="currentColor" fontSize="4.5" fontWeight="700">WEBP</text>
        <path d="M7 13V8a2 2 0 012-2h1M17 11v5a2 2 0 01-2 2h-1" />
        <path d="M6 10l2-2 2 2M16 14l2 2-2 2" />
      </svg>
    ),
  },
}

const toolKeys: ToolType[] = ['resize', 'compress', 'remove-bg', 'convert']

const toolLabelMap: Record<ToolType, string> = {
  resize: 'toolResize',
  compress: 'toolCompress',
  'remove-bg': 'toolRemoveBg',
  convert: 'toolConvert',
}

type Mode = 'single' | 'batch'
type ToolResult = { blob: Blob; url: string } | null

interface ImageItem {
  file: File
  url: string
  width: number
  height: number
}

const MAX_BATCH = 15

export default function App() {
  const { t } = useTranslation()

  const [mode, setMode] = useState<Mode>('single')
  const [activeTool, setActiveTool] = useState<ToolType>('resize')
  const [images, setImages] = useState<ImageItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [toolResults, setToolResults] = useState<Record<ToolType, ToolResult[]>>({
    resize: [],
    compress: [],
    'remove-bg': [],
    convert: [],
  })
  const [processingTools, setProcessingTools] = useState<Set<ToolType>>(new Set())
  const [bgProgress, setBgProgress] = useState(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url))
      Object.values(toolResults).forEach((arr) => arr.forEach((r) => { if (r) URL.revokeObjectURL(r.url) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentImage = images[currentIndex] ?? null
  const imageCount = images.length
  const hasImage = imageCount > 0

  // ── Save a single result ──
  const saveToolResult = useCallback((tool: ToolType, blob: Blob, idx: number) => {
    const url = URL.createObjectURL(blob)
    setToolResults((prev) => {
      const next = [...prev[tool]]
      const old = next[idx]
      if (old) URL.revokeObjectURL(old.url)
      next[idx] = { blob, url }
      return { ...prev, [tool]: next }
    })
  }, [])

  const markProcessing = useCallback((tool: ToolType) => {
    setProcessingTools((prev) => new Set(prev).add(tool))
  }, [])

  const markDone = useCallback((tool: ToolType) => {
    setProcessingTools((prev) => {
      const next = new Set(prev)
      next.delete(tool)
      return next
    })
  }, [])

  const clearAllResults = useCallback(() => {
    setToolResults((prev) => {
      Object.values(prev).forEach((arr) => arr.forEach((r) => { if (r) URL.revokeObjectURL(r.url) }))
      return { resize: [], compress: [], 'remove-bg': [], convert: [] }
    })
    setProcessingTools(new Set())
  }, [])

  // ── Load image metadata ──
  const loadImageItem = useCallback((file: File): Promise<ImageItem> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => resolve({ file, url, width: img.width, height: img.height })
      img.src = url
    })
  }, [])

  // ── Mode toggle with transition logic ──
  const handleToggleMode = useCallback(() => {
    setMode((m) => {
      if (m === 'batch') {
        // Batch → Single: keep only first image, discard rest
        setImages((imgs) => {
          imgs.slice(1).forEach((img) => URL.revokeObjectURL(img.url))
          return imgs.slice(0, 1)
        })
        setCurrentIndex(0)
        clearAllResults()
        return 'single'
      }
      // Single → Batch: keep existing image, allow adding more
      return 'batch'
    })
  }, [clearAllResults])

  // ── Handle new images ──
  const handleImages = useCallback(async (files: File[]) => {
    const items = await Promise.all(files.map(loadImageItem))

    if (mode === 'batch' && imageCount > 0) {
      // Batch mode, adding more: append up to MAX_BATCH
      const remaining = MAX_BATCH - imageCount
      if (remaining <= 0) return
      setImages((prev) => [...prev, ...items.slice(0, remaining)])
    } else {
      // First upload (single or batch): replace
      images.forEach((img) => URL.revokeObjectURL(img.url))
      clearAllResults()
      setImages(items)
      setCurrentIndex(0)
    }
  }, [mode, imageCount, images, loadImageItem, clearAllResults])

  const handleSingleImage = useCallback((file: File) => {
    handleImages([file])
  }, [handleImages])

  // Replace image at a given index (drop on grid cell); first file replaces slot, rest inserted after
  const handleReplaceAt = useCallback(async (files: File[], index: number) => {
    const items = await Promise.all(files.map(loadImageItem))
    setImages((prev) => {
      const old = prev[index]
      if (old) URL.revokeObjectURL(old.url)
      const next = [...prev]
      next.splice(index, 1, ...items)
      const overflow = next.splice(MAX_BATCH)
      overflow.forEach((img) => URL.revokeObjectURL(img.url))
      return next
    })
    // Wipe tool results for the replaced slot
    setToolResults((prev) => {
      const next = { ...prev }
      for (const tool of toolKeys) {
        const arr = [...prev[tool]]
        arr.splice(index, 1)
        next[tool] = arr
      }
      return next
    })
  }, [loadImageItem])

  // ── Navigation ──
  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : imageCount - 1))
  }, [imageCount])

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i < imageCount - 1 ? i + 1 : 0))
  }, [imageCount])

  // ── Delete / Clear in batch ──
  const handleDeleteImage = useCallback((index: number) => {
    setImages((prev) => {
      const img = prev[index]
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter((_, i) => i !== index)
    })
    setToolResults((prev) => {
      const next = { ...prev }
      for (const tool of toolKeys) {
        const arr = [...prev[tool]]
        const removed = arr.splice(index, 1)
        removed.forEach((r: ToolResult) => { if (r) URL.revokeObjectURL(r!.url) })
        next[tool] = arr
      }
      return next
    })
    setCurrentIndex((i) => {
      if (imageCount <= 1) return 0
      if (index < i) return i - 1
      if (index === i) return Math.min(i, imageCount - 2)
      return i
    })
  }, [imageCount])

  const handleClearAll = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.url))
    clearAllResults()
    setImages([])
    setCurrentIndex(0)
  }, [images, clearAllResults])

  // ── Tool handlers ──
  // In batch mode: process ALL images with the given parameters.
  // In single mode: process only the current image.

  const handleResize = useCallback(async (dims: Dimensions) => {
    markProcessing('resize')
    const targets = mode === 'batch'
      ? images.map((img, i) => ({ img, idx: i }))
      : currentImage ? [{ img: currentImage, idx: currentIndex }] : []

    for (const { img, idx } of targets) {
      try {
        const blob = await resizeImage(img.file, dims)
        saveToolResult('resize', blob, idx)
      } catch (e) { console.error('Resize failed:', e) }
    }
    markDone('resize')
  }, [mode, images, currentImage, currentIndex, saveToolResult, markProcessing, markDone])

  const handleCompress = useCallback(async (quality: number, format: OutputFormat) => {
    markProcessing('compress')
    const targets = mode === 'batch'
      ? images.map((img, i) => ({ img, idx: i }))
      : currentImage ? [{ img: currentImage, idx: currentIndex }] : []

    for (const { img, idx } of targets) {
      try {
        const blob = await compressImage(img.file, quality / 100, format)
        saveToolResult('compress', blob, idx)
      } catch (e) { console.error('Compress failed:', e) }
    }
    markDone('compress')
  }, [mode, images, currentImage, currentIndex, saveToolResult, markProcessing, markDone])

  const handleConvert = useCallback(async (format: OutputFormat, quality?: number) => {
    markProcessing('convert')
    const targets = mode === 'batch'
      ? images.map((img, i) => ({ img, idx: i }))
      : currentImage ? [{ img: currentImage, idx: currentIndex }] : []

    for (const { img, idx } of targets) {
      try {
        const blob = await convertImage(img.file, format, quality)
        saveToolResult('convert', blob, idx)
      } catch (e) { console.error('Convert failed:', e) }
    }
    markDone('convert')
  }, [mode, images, currentImage, currentIndex, saveToolResult, markProcessing, markDone])

  const handleRemoveBg = useCallback(async () => {
    if (!currentImage) return
    const idx = currentIndex
    markProcessing('remove-bg')
    setBgProgress(0)
    try {
      const blob = await removeImageBackground(currentImage.file, (p) => setBgProgress(p))
      saveToolResult('remove-bg', blob, idx)
    } catch (e) { console.error('Remove BG failed:', e) }
    markDone('remove-bg')
  }, [currentImage, currentIndex, saveToolResult, markProcessing, markDone])

  // ── Batch: process all remaining images for remove-bg only ──
  const processAllRemoveBg = useCallback(async () => {
    markProcessing('remove-bg')
    for (let idx = 0; idx < imageCount; idx++) {
      // Skip already processed
      if (toolResults['remove-bg'][idx]) continue
      const img = images[idx]
      try {
        const blob = await removeImageBackground(img.file, (p) => setBgProgress(p))
        saveToolResult('remove-bg', blob, idx)
      } catch (e) { console.error('Remove BG failed:', e) }
    }
    markDone('remove-bg')
  }, [images, imageCount, toolResults, saveToolResult, markProcessing, markDone])

  // ── Download ──
  const download = useCallback(async () => {
    const results = toolResults[activeTool]
    const validResults = results.filter(Boolean) as { blob: Blob; url: string }[]

    if (validResults.length === 0) return

    if (mode === 'single' || validResults.length === 1) {
      const result = validResults[0]
      const blob = result.blob
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
      const base = (images[0]?.file.name ?? 'image').replace(/\.[^.]+$/, '')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${base}-pixmia.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      const zip = new JSZip()
      validResults.forEach((result, i) => {
        const blob = result.blob
        const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
        const base = (images[i]?.file.name ?? `image-${i + 1}`).replace(/\.[^.]+$/, '')
        zip.file(`${base}-pixmia.${ext}`, blob)
      })
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pixmia-batch.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [toolResults, activeTool, mode, images])

  // ── Derived values ──
  const activeResult = toolResults[activeTool][currentIndex] ?? null
  const isProcessing = processingTools.has(activeTool)
  const hasResult = !!activeResult && !isProcessing
  const allProcessed = imageCount > 0 && toolResults[activeTool].filter(Boolean).length === imageCount

  const previewItems = useMemo(() => images.map((img, i) => ({
    originalUrl: img.url,
    resultUrl: toolResults[activeTool][i]?.url ?? null,
    originalSize: img.file.size,
    resultSize: toolResults[activeTool][i]?.blob.size ?? null,
    fileName: img.file.name,
  })), [images, toolResults, activeTool])

  return (
    <div className="min-h-screen flex flex-col">
      <ParticleBg />
      <div className="scanlines" />
      <Header />

      <main className="flex-1 px-3 sm:px-6 py-5 sm:py-6 pb-24 sm:pb-6 space-y-5">
        {/* Tool Nav */}
        <div className="mx-auto max-w-2xl">
          <div className="flex sm:grid sm:grid-cols-4 gap-2">
            {toolKeys.map((key) => {
              const active = activeTool === key
              const icons = gameIcons[key]
              return (
                <button
                  key={key}
                  onClick={() => setActiveTool(key)}
                  className={`
                    relative flex-1 sm:flex-none flex sm:flex-col items-center gap-1.5 sm:gap-2
                    px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200
                    glass backdrop-blur-xl border-white/[0.06] card-hover
                    ${active
                      ? 'glass-active text-[var(--accent)]'
                      : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <div className="w-6 h-6">
                    {active ? icons.filled : icons.outline}
                  </div>
                  <span className="text-xs sm:text-sm whitespace-nowrap">
                    {t[toolLabelMap[key] as keyof typeof t] as string}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <DropZone
          onImage={handleSingleImage}
          hasImage={hasImage}
          activeTool={activeTool}
          batch={mode === 'batch'}
          maxBatch={MAX_BATCH}
          onImages={handleImages}
          imageCount={imageCount}
          mode={mode}
          onToggleMode={handleToggleMode}
          onClear={handleClearAll}
        />

        {hasImage && (
          <ImagePreview
            items={previewItems}
            currentIndex={currentIndex}
            onPrev={goToPrev}
            onNext={goToNext}
            onGoTo={setCurrentIndex}
            onDelete={handleDeleteImage}
            onClear={handleClearAll}
            onDropFiles={handleImages}
            onDropReplace={mode === 'batch' ? handleReplaceAt : undefined}
            maxItems={MAX_BATCH}
          />
        )}

        {hasImage && (
          <div className="mx-auto max-w-md mt-6 animate-in" key={activeTool}>
            {activeTool === 'resize' && (
              <ResizePanel
                originalWidth={currentImage?.width ?? 0}
                originalHeight={currentImage?.height ?? 0}
                onResize={handleResize}
                processing={isProcessing}
                hasResult={hasResult}
                batch={mode === 'batch'}
              />
            )}
            {activeTool === 'compress' && (
              <CompressPanel
                file={currentImage!.file}
                resultSize={activeResult?.blob.size ?? null}
                onCompress={handleCompress}
                processing={isProcessing}
                hasResult={hasResult}
                batch={mode === 'batch'}
              />
            )}
            {activeTool === 'convert' && (
              <ConvertPanel
                file={currentImage!.file}
                resultSize={activeResult?.blob.size ?? null}
                onConvert={handleConvert}
                processing={isProcessing}
                hasResult={hasResult}
                batch={mode === 'batch'}
              />
            )}
            {activeTool === 'remove-bg' && (
              <BgRemovePanel
                resultUrl={activeResult?.url ?? null}
                onRemoveBg={handleRemoveBg}
                processing={isProcessing}
                progress={bgProgress}
              />
            )}

            {/* Batch: Process All button (remove-bg only since resize/compress/convert auto-process all) */}
            {mode === 'batch' && activeTool === 'remove-bg' && imageCount > 1 && !allProcessed && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={processAllRemoveBg}
                  className="px-6 py-2 glass backdrop-blur-xl border border-[var(--accent)]/20 text-sm text-[var(--accent)] rounded-[var(--radius-md)] hover:border-[var(--accent)]/40 transition-all"
                >
                  {t.processAll as string} ({imageCount} {t.images as string})
                </button>
              </div>
            )}

            {hasResult && (
              <div className="flex justify-center mt-6 animate-in sm:relative">
                {/* Mobile: fixed bottom bar */}
                <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:hidden"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(8,8,16,0.95) 30%, rgba(8,8,16,1) 100%)',
                  }}
                >
                  <button
                    onClick={download}
                    className="w-full px-8 py-3.5 btn-gradient text-sm font-semibold rounded-[var(--radius-md)] active:scale-[0.98]"
                  >
                    ↓ {mode === 'batch' && imageCount > 1 ? t.downloadZip : t.download}
                  </button>
                </div>
                {/* Desktop: inline */}
                <button
                  onClick={download}
                  className="hidden sm:block px-8 py-3 btn-gradient text-sm font-semibold rounded-[var(--radius-md)]"
                >
                  ↓ {mode === 'batch' && imageCount > 1 ? t.downloadZip : t.download}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] py-4 mt-auto">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-dim)]">
          <span>{t.footerPrivacy}</span>
          <span className="hidden sm:inline">·</span>
          <span>{t.footerNoServer}</span>
        </div>
      </footer>

      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-in {
          animation: panelIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}
