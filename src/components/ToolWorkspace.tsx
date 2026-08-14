import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../i18n'
import type { ToolType, OutputFormat, Dimensions } from '../types'
import { resizeImage, compressImage, convertImage, getResultExtension, removeWatermark } from '../utils'
import { removeImageBackground } from '../utils/removeBg'
import JSZip from 'jszip'
import DropZone from './DropZone'
import ImagePreview from './ImagePreview'
import ResizePanel from './ResizePanel'
import CompressPanel from './CompressPanel'
import BgRemovePanel from './BgRemovePanel'
import BgRefinePanel from './BgRefinePanel'
import ConvertPanel from './ConvertPanel'
import RemoveWatermarkPanel from './RemoveWatermarkPanel'
import { toolPaths } from '../lib/routes'
import { TOOL_KEYS, toolIcons, toolLabelKey } from '../lib/tools'

type Mode = 'single' | 'batch'
type ToolResult = { blob: Blob; url: string } | null

interface ImageItem {
  file: File
  url: string
  width: number
  height: number
}

const MAX_BATCH = 15
// SSR-safe: prerender runs in Node where navigator is undefined.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const isIOS = /iPad|iPhone|iPod/.test(ua) ||
  (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isWeChat = /MicroMessenger/i.test(ua)

interface ToolWorkspaceProps {
  activeTool: ToolType
}

export default function ToolWorkspace({ activeTool }: ToolWorkspaceProps) {
  const navigate = useNavigate()
  const { t, lang } = useTranslation()

  const [mode, setMode] = useState<Mode>('single')
  const [images, setImages] = useState<ImageItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [toolResults, setToolResults] = useState<Record<ToolType, ToolResult[]>>({
    resize: [],
    compress: [],
    'remove-bg': [],
    convert: [],
    'remove-watermark': [],
  })
  const [processingTools, setProcessingTools] = useState<Set<ToolType>>(new Set())
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null)
  const [lightboxTrigger, setLightboxTrigger] = useState(0)
  const [bgProgress, setBgProgress] = useState(0)
  const [refineOpen, setRefineOpen] = useState(false)

  // Reset workspace when the focused tool changes (route change)
  useEffect(() => {
    setMode('single')
    setCurrentIndex(0)
  }, [activeTool])

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
      return { resize: [], compress: [], 'remove-bg': [], convert: [], watermark: [], 'remove-watermark': [], crop: [], rotate: [] }
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
      for (const tool of TOOL_KEYS) {
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
      for (const tool of TOOL_KEYS) {
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

    setProcessingProgress({ current: 0, total: targets.length })
    for (const { img, idx } of targets) {
      try {
        const blob = await resizeImage(img.file, dims)
        saveToolResult('resize', blob, idx)
      } catch (e) { console.error('Resize failed:', e) }
      setProcessingProgress(p => p && { current: p.current + 1, total: p.total })
    }
    setProcessingProgress(null)
    markDone('resize')
  }, [mode, images, currentImage, currentIndex, saveToolResult, markProcessing, markDone])

  const handleCompress = useCallback(async (quality: number, format: OutputFormat) => {
    markProcessing('compress')
    const targets = mode === 'batch'
      ? images.map((img, i) => ({ img, idx: i }))
      : currentImage ? [{ img: currentImage, idx: currentIndex }] : []

    setProcessingProgress({ current: 0, total: targets.length })
    for (const { img, idx } of targets) {
      try {
        const blob = await compressImage(img.file, quality / 100, format)
        saveToolResult('compress', blob, idx)
      } catch (e) { console.error('Compress failed:', e) }
      setProcessingProgress(p => p && { current: p.current + 1, total: p.total })
    }
    setProcessingProgress(null)
    markDone('compress')
  }, [mode, images, currentImage, currentIndex, saveToolResult, markProcessing, markDone])

  const handleConvert = useCallback(async (format: OutputFormat, quality?: number) => {
    markProcessing('convert')
    const targets = mode === 'batch'
      ? images.map((img, i) => ({ img, idx: i }))
      : currentImage ? [{ img: currentImage, idx: currentIndex }] : []

    setProcessingProgress({ current: 0, total: targets.length })
    for (const { img, idx } of targets) {
      try {
        const blob = await convertImage(img.file, format, quality)
        saveToolResult('convert', blob, idx)
      } catch (e) { console.error('Convert failed:', e) }
      setProcessingProgress(p => p && { current: p.current + 1, total: p.total })
    }
    setProcessingProgress(null)
    markDone('convert')
  }, [mode, images, currentImage, currentIndex, saveToolResult, markProcessing, markDone])

  const handleRemoveWatermark = useCallback(async (mask: Uint8Array, maskWidth: number, maskHeight: number) => {
    markProcessing('remove-watermark')
    const targets = mode === 'batch'
      ? images.map((img, i) => ({ img, idx: i }))
      : currentImage ? [{ img: currentImage, idx: currentIndex }] : []

    setProcessingProgress({ current: 0, total: targets.length })
    for (const { img, idx } of targets) {
      try {
        // Iterative removal: continue from the last de-watermarked result so the
        // user can brush → remove → brush → remove repeatedly. First apply uses
        // the original image; every later apply only fills the newly painted mask.
        const base = toolResults['remove-watermark'][idx]?.blob ?? img.file
        const blob = await removeWatermark(base, mask, maskWidth, maskHeight)
        saveToolResult('remove-watermark', blob, idx)
      } catch (e) { console.error('Remove watermark failed:', e) }
      setProcessingProgress(p => p && { current: p.current + 1, total: p.total })
    }
    setProcessingProgress(null)
    markDone('remove-watermark')
  }, [mode, images, currentImage, currentIndex, saveToolResult, markProcessing, markDone, toolResults])

  const handleRemoveBg = useCallback(async (index?: number) => {
    const idx = index ?? currentIndex
    const img = images[idx]
    if (!img) return
    markProcessing('remove-bg')
    setBgProgress(0)
    setProcessingProgress({ current: 0, total: 1 })
    try {
      const blob = await removeImageBackground(img.file, (p) => setBgProgress(p))
      saveToolResult('remove-bg', blob, idx)
    } catch (e) { console.error('Remove BG failed:', e) }
    setProcessingProgress(p => p && { current: 1, total: 1 })
    setTimeout(() => setProcessingProgress(null), 400)
    markDone('remove-bg')
  }, [images, currentIndex, saveToolResult, markProcessing, markDone])

  // ── Batch: process all remaining images for remove-bg only ──
  const processAllRemoveBg = useCallback(async () => {
    markProcessing('remove-bg')
    const pending = images.filter((_, i) => !toolResults['remove-bg'][i])
    if (pending.length > 1) setProcessingProgress({ current: 0, total: pending.length })
    let done = 0
    for (let idx = 0; idx < imageCount; idx++) {
      if (toolResults['remove-bg'][idx]) continue
      const img = images[idx]
      try {
        const blob = await removeImageBackground(img.file, (p) => setBgProgress(p))
        saveToolResult('remove-bg', blob, idx)
      } catch (e) { console.error('Remove BG failed:', e) }
      done++
      if (pending.length > 1) setProcessingProgress({ current: done, total: pending.length })
    }
    setProcessingProgress(null)
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
      const ext = getResultExtension(blob)
      const base = (images[0]?.file.name ?? 'image').replace(/\.[^.]+$/, '')
      const url = URL.createObjectURL(blob)

      if (isWeChat) {
        // WeChat: open lightbox so user can zoom & long-press to save
        setLightboxTrigger(n => n + 1)
        return
      } else if (isIOS) {
        // iOS Safari doesn't support blob download via a.click()
        window.open(url, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = `${base}-pixmia.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } else {
      const zip = new JSZip()
      results.forEach((result, idx) => {
        if (!result) return
        const blob = result.blob
        const ext = getResultExtension(blob)
        const base = (images[idx]?.file.name ?? `image-${idx + 1}`).replace(/\.[^.]+$/, '')
        zip.file(`${base}-pixmia.${ext}`, blob)
      })
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      if (isWeChat) {
        alert(lang === 'zh'
          ? '微信内不支持下载ZIP文件，请点击右上角 ··· → 在浏览器中打开'
          : 'ZIP downloads not supported in WeChat — tap ··· → Open in Browser')
        return
      } else if (isIOS) {
        window.open(url, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = 'pixmia-batch.zip'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }
  }, [toolResults, activeTool, mode, images])

  // ── Derived values ──
  const activeResult = toolResults[activeTool][currentIndex] ?? null
  const isProcessing = processingTools.has(activeTool)
  const hasResult = !!activeResult && !isProcessing
  const allProcessed = imageCount > 0 && toolResults[activeTool].filter(Boolean).length === imageCount

  // ── Sync progress bar total with image count (grow/shrink) ──
  useEffect(() => {
    setProcessingProgress((p) => {
      if (!p) return p
      if (p.total === imageCount && p.current <= imageCount) return p
      return { current: Math.min(p.current, imageCount), total: imageCount }
    })
  }, [imageCount])

  // ── Process only unprocessed images (incremental), never redo all ──
  const processNewGate = useRef(false)
  useEffect(() => {
    if (mode !== 'batch' || imageCount === 0 || isProcessing) return
    if (activeTool === 'remove-bg' || activeTool === 'convert' || activeTool === 'remove-watermark') return
    const resultsLen = toolResults[activeTool].length
    const hasPending = resultsLen < imageCount || toolResults[activeTool].slice(0, imageCount).some(r => !r)
    if (!hasPending) return
    if (processNewGate.current) return
    processNewGate.current = true

    const t = setTimeout(async () => {
      // Re-compute AFTER the delay so indices are fresh
      const pending: number[] = []
      for (let i = 0; i < images.length; i++) {
        if (!toolResults[activeTool][i]) pending.push(i)
      }
      if (pending.length === 0) { processNewGate.current = false; return }

      markProcessing(activeTool)
      setProcessingProgress({ current: images.length - pending.length, total: images.length })
      for (const idx of pending) {
        const img = images[idx]
        if (!img) continue
        try {
          let blob: Blob
          switch (activeTool) {
            case 'resize': {
              const dims = { width: img.width, height: img.height }
              blob = await resizeImage(img.file, dims)
              break
            }
            case 'compress':
              blob = await compressImage(img.file, 0.8, 'jpeg')
              break
            default:
              continue
          }
          saveToolResult(activeTool, blob, idx)
        } catch (e) { console.error(`${activeTool} failed:`, e) }
        setProcessingProgress(p => p && { current: p.current + 1, total: p.total })
      }
      setProcessingProgress(null)
      markDone(activeTool)
      processNewGate.current = false
    }, 300)
    return () => { clearTimeout(t); processNewGate.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCount, isProcessing, mode, activeTool, toolResults])

  const previewItems = useMemo(() => images.map((img, i) => ({
    originalUrl: img.url,
    resultUrl: toolResults[activeTool][i]?.url ?? null,
    resultMime: toolResults[activeTool][i]?.blob.type ?? null,
    originalSize: img.file.size,
    resultSize: toolResults[activeTool][i]?.blob.size ?? null,
    fileName: img.file.name,
  })), [images, toolResults, activeTool])

  return (
    <main className="flex-1 px-3 sm:px-6 py-5 sm:py-6 pb-24 sm:pb-6 space-y-5">
      {/* Tool Nav */}
      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TOOL_KEYS.map((key) => {
            const active = activeTool === key
            const icons = toolIcons[key]
            return (
              <button
                key={key}
                onClick={() => navigate(toolPaths[key])}
                className={`
                  relative flex flex-col items-center justify-center gap-1.5 sm:gap-2
                  px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200
                  glass backdrop-blur-xl border-white/[0.06] card-hover
                  ${active
                    ? 'glass-active text-[var(--accent)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center">
                  {active ? icons.filled : icons.outline}
                </div>
                <span className="whitespace-nowrap leading-tight text-center">
                  {t[toolLabelKey[key] as keyof typeof t] as string}
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
        processing={isProcessing}
      />

      {hasImage && (
        <ImagePreview
          items={previewItems}
          currentIndex={currentIndex}
          onPrev={goToPrev}
          onNext={goToNext}
          onGoTo={setCurrentIndex}
          onDelete={handleDeleteImage}
          onDropFiles={handleImages}
          onDropReplace={mode === 'batch' ? handleReplaceAt : undefined}
          maxItems={MAX_BATCH}
          lightboxTrigger={lightboxTrigger}
          processing={isProcessing}
        />
      )}

      {/* Game-style progress bar — between DropZone & ImagePreview */}
      {hasImage && isProcessing && processingProgress && (
        <div className="mx-auto max-w-2xl">
          <div className="space-y-1">
            {/* Segments */}
            <div className="flex gap-1">
              {Array.from({ length: processingProgress.total }, (_, i) => {
                const filled = i < processingProgress.current
                const current = i === processingProgress.current
                return (
                  <div
                    key={i}
                    className="flex-1 h-1.5 relative"
                    style={{
                      background: filled
                        ? `rgba(124,58,237,${0.3 + (i / processingProgress.total) * 0.7})`
                        : 'rgba(255,255,255,0.06)',
                      boxShadow: filled
                        ? `0 0 6px rgba(124,58,237,0.6), inset 0 0 4px rgba(168,133,248,0.3)`
                        : 'inset 0 1px 2px rgba(0,0,0,0.3)',
                      border: filled
                        ? '1px solid rgba(168,133,248,0.4)'
                        : '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Current segment pulse */}
                    {current && (
                      <div className="absolute inset-0 bg-[var(--accent)] animate-pulse"
                        style={{ boxShadow: '0 0 10px rgba(124,58,237,0.8)' }}
                      />
                    )}
                    {/* Filled segment shimmer */}
                    {filled && !current && (
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-y-0 w-4 bg-white/15 skew-x-[-30deg]"
                          style={{
                            animation: `shineSweep 1.5s ease-in-out ${i * 0.1}s infinite`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Label */}
            <div className="flex justify-between">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-mono">
                {lang === 'zh' ? '处理中' : 'PROCESSING'}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-[var(--accent)]">
                {processingProgress.current}<span className="text-[var(--text-dim)]"> / {processingProgress.total}</span>
              </span>
            </div>
          </div>
        </div>
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
          {activeTool === 'remove-watermark' && (
            <RemoveWatermarkPanel
              file={currentImage!.file}
              resultUrl={activeResult?.url ?? null}
              onRemoveWatermark={handleRemoveWatermark}
              processing={isProcessing}
              hasResult={hasResult}
            />
          )}
          {activeTool === 'remove-bg' && (
            <BgRemovePanel
              resultUrl={activeResult?.url ?? null}
              onRemoveBg={handleRemoveBg}
              onOpenRefine={() => setRefineOpen(true)}
              processing={isProcessing}
              progress={bgProgress}
              imageCount={imageCount}
              currentIndex={currentIndex}
              onPrev={goToPrev}
              onNext={goToNext}
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
                {isWeChat && mode === 'batch' && imageCount > 1 && (
                  <div className="text-center mb-2 px-3 py-2 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/20 text-amber-400/90 text-[11px] leading-relaxed">
                    {lang === 'zh'
                      ? '💡 批量ZIP请在浏览器中下载。点击上方单张图片预览，长按即可保存到相册'
                      : '💡 Open in browser for ZIP. Tap any image above to preview & long-press to save.'}
                  </div>
                )}
                {isWeChat && (mode === 'single' || imageCount <= 1) && (
                  <div className="text-center mb-2 px-3 py-2 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/20 text-amber-400/90 text-[11px] leading-relaxed">
                    {lang === 'zh'
                      ? '💡 点击按钮预览图片 → 长按图片 → 保存到相册'
                      : '💡 Tap below to preview → long-press the image → save to photos'}
                  </div>
                )}
                {isProcessing && processingProgress && (
                  <div className="text-center mb-2 text-[11px] text-[var(--accent)] font-medium">
                    {lang === 'zh'
                      ? `处理中 ${processingProgress.current}/${processingProgress.total}`
                      : `Processing ${processingProgress.current}/${processingProgress.total}`}
                  </div>
                )}
                <button
                  onClick={download}
                  className="w-full px-8 py-3.5 btn-gradient text-sm font-semibold rounded-[var(--radius-md)] active:scale-[0.98]"
                >
                  ↓ {isWeChat
                    ? (mode === 'batch' && imageCount > 1 ? t.downloadZip : (lang === 'zh' ? '预览并长按保存' : 'Preview & Long-press'))
                    : (mode === 'batch' && imageCount > 1 ? t.downloadZip : t.download)
                  }
                </button>
              </div>
              {/* Desktop: inline */}
              {isProcessing && processingProgress && (
                <div className="hidden sm:block text-center mb-2 text-[11px] text-[var(--accent)] font-medium">
                  {lang === 'zh'
                    ? `处理中 ${processingProgress.current}/${processingProgress.total}`
                    : `Processing ${processingProgress.current}/${processingProgress.total}`}
                </div>
              )}
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

      {/* Manual refine overlay for remove-bg results */}
      {refineOpen && activeResult && currentImage && (
        <BgRefinePanel
          resultUrl={activeResult.url}
          originalUrl={currentImage.url}
          onRefine={(blob) => {
            saveToolResult('remove-bg', blob, currentIndex)
            setRefineOpen(false)
          }}
          onClose={() => setRefineOpen(false)}
        />
      )}

      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-in {
          animation: panelIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes shineSweep {
          0% { left: -1rem; }
          100% { left: calc(100% + 1rem); }
        }
      `}</style>
    </main>
  )
}
