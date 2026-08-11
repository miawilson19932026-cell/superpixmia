import { useState, useCallback, useRef, useEffect } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from '../i18n'
import { formatSize } from '../utils'
import { uploadForWechat } from '../utils/wechat'

// SSR-safe: prerender runs in Node where navigator is undefined.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const isWeChat = /MicroMessenger/i.test(ua)
const isAndroidWeChat = isWeChat && /Android/i.test(ua)

// WeChat's built-in webview (X5/XWeb) can't reliably save blob: URLs to the
// photo album — long-press save fails with "保存失败". We hand WeChat a saveable
// src: Android gets a real HTTP(S) URL via a temporary Vercel Blob upload (most
// reliable), with a base64 data URL as fallback (usually still saves on modern
// Android WeChat); iOS gets a base64 data URL directly.
const WECHAT_SAVE_MAX_BYTES = 8 * 1024 * 1024
const WECHAT_MAX_EDGE = 2560

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}

// Huge base64 strings can blow up mobile memory or fail to save. Downsample
// oversized results (keeping alpha for PNG/WebP, JPEG for the rest).
async function downsampleForWeChat(blob: Blob): Promise<string> {
  const objUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image decode failed'))
      el.src = objUrl
    })
    const scale = Math.min(1, WECHAT_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(img, 0, 0, w, h)
    const mime = blob.type === 'image/png' || blob.type === 'image/webp' ? 'image/png' : 'image/jpeg'
    return canvas.toDataURL(mime, 0.92)
  } finally {
    URL.revokeObjectURL(objUrl)
  }
}

export interface PreviewItem {
  originalUrl: string
  resultUrl: string | null
  originalSize: number
  resultSize: number | null
  fileName: string
}

interface Props {
  items: PreviewItem[]
  currentIndex: number
  onPrev: () => void
  onNext: () => void
  onGoTo: (index: number) => void
  onDelete?: (index: number) => void
  onDropFiles?: (files: File[]) => void
  onDropReplace?: (files: File[], index: number) => void
  maxItems?: number
  lightboxTrigger?: number
  processing?: boolean
}

export default function ImagePreview({
  items,
  currentIndex,
  onPrev: _onPrev,
  onNext: _onNext,
  onGoTo,
  onDelete,
  onDropFiles,
  onDropReplace,
  maxItems = 15,
  lightboxTrigger,
  processing = false,
}: Props) {
  const { t, lang } = useTranslation()
  void _onPrev; void _onNext

  const [lightbox, setLightbox] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // Drop state
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)    // which cell is being hovered
  const [dragOverAdd, setDragOverAdd] = useState(false)                   // hovering the add-slot
  const [dragOverArea, setDragOverArea] = useState(false)                 // hovering somewhere in the preview

  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const pinchStart = useRef({ dist: 0, zoom: 1, pan: { x: 0, y: 0 } })
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex

  if (items.length === 0) return null

  const totalCount = items.length
  const showGrid = totalCount > 1
  const current = items[currentIndex]
  const displayUrl = current.resultUrl || current.originalUrl
  const displayLabel = current.resultUrl ? t.result : t.preview
  const remaining = maxItems - totalCount

  // Open lightbox at a specific index
  const openLightbox = (idx: number) => {
    setLightboxIndex(idx)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setLightbox(true)
  }

  const closeLightbox = () => setLightbox(false)

  // External trigger (e.g. WeChat download button)
  useEffect(() => {
    if (lightboxTrigger !== undefined && lightboxTrigger > 0) {
      openLightbox(currentIndexRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxTrigger])

  // Lightbox item
  const lbItem = items[lightboxIndex]
  const lbUrl = lbItem?.resultUrl || lbItem?.originalUrl
  const lbLabel = lbItem?.resultUrl ? t.result : t.preview

  // WeChat: swap every shown blob URL → a saveable URL so long-press save works.
  // iOS WeChat: base64 data URL. Android WeChat: blob/data both unsupported —
  // needs a real HTTP(S) URL → upload to Vercel Blob (temporary).
  const wechatDataCache = useRef<Map<string, string>>(new Map())
  const wechatInFlight = useRef<Map<string, Promise<{ url: string; failed: boolean }>>>(new Map())
  const [saveUrls, setSaveUrls] = useState<ReadonlyMap<number, string>>(new Map())
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(new Set())

  const toDataUrlForSave = useCallback(async (blob: Blob): Promise<string> => {
    if (blob.size > WECHAT_SAVE_MAX_BYTES) return downsampleForWeChat(blob)
    return blobToDataUrl(blob)
  }, [])

  const convertForWeChat = useCallback(async (url: string): Promise<{ url: string; failed: boolean }> => {
    const cached = wechatDataCache.current.get(url)
    if (cached) return { url: cached, failed: false }
    const inflight = wechatInFlight.current.get(url)
    if (inflight) return inflight
    const p = (async (): Promise<{ url: string; failed: boolean }> => {
      const res = await fetch(url)
      const blob = await res.blob()
      let saveUrl: string
      let failed = false
      if (isAndroidWeChat) {
        try {
          saveUrl = await uploadForWechat(blob)
        } catch (e) {
          console.error('WeChat upload failed, falling back to data URL:', e)
          // Data URL usually saves fine on modern Android WeChat; upload is just
          // a fallback that makes it more reliable for very large images. Keep a
          // gentle hint (not an alarm) in case a specific device still fails.
          saveUrl = await toDataUrlForSave(blob)
          failed = true
        }
      } else {
        saveUrl = await toDataUrlForSave(blob)
      }
      wechatDataCache.current.set(url, saveUrl)
      return { url: saveUrl, failed }
    })()
    wechatInFlight.current.set(url, p)
    return p
  }, [toDataUrlForSave])

  // Batch-convert shown URLs in WeChat so grid thumbs / single preview /
  // lightbox all get a saveable src.
  useEffect(() => {
    if (!isWeChat || items.length === 0) { setSaveUrls(new Map()); setFailedUrls(new Set()); return }
    let cancelled = false
    const seeded = new Map<number, string>()
    items.forEach((item, i) => {
      const u = item.resultUrl || item.originalUrl
      if (u && wechatDataCache.current.has(u)) seeded.set(i, wechatDataCache.current.get(u)!)
    })
    setSaveUrls(seeded)
    items.forEach((item, i) => {
      const u = item.resultUrl || item.originalUrl
      if (!u || wechatDataCache.current.has(u)) return
      convertForWeChat(u).then(({ url, failed }) => {
        if (cancelled) return
        setSaveUrls((prev) => { const n = new Map(prev); n.set(i, url); return n })
        if (failed) {
          setFailedUrls((prev) => { const n = new Set(prev); n.add(u); return n })
        } else {
          // A successful conversion clears any earlier failure for this URL, so
          // the hint disappears once a reliable save URL is available.
          setFailedUrls((prev) => {
            if (!prev.has(u)) return prev
            const n = new Set(prev)
            n.delete(u)
            return n
          })
        }
      }).catch((e) => {
        console.error('WeChat save URL failed:', e)
        if (cancelled) return
        setFailedUrls((prev) => { const n = new Set(prev); n.add(u); return n })
      })
    })
    return () => { cancelled = true }
  }, [isWeChat, items, convertForWeChat])

  const imageOfText = (idx: number) => (t.imageOf as string)
    .replace('{current}', String(idx + 1))
    .replace('{total}', String(totalCount))

  // ─── Drop handlers ───
  const handleDragOver = useCallback((e: DragEvent) => {
    if (processing) return
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setDragOverArea(true)
  }, [processing])

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (processing) return
    // Only fire when leaving the container, not when entering a child
    if (e.currentTarget === e.target || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as HTMLElement)) {
      setDragOverArea(false)
      setDragOverIdx(null)
      setDragOverAdd(false)
    }
  }, [processing])

  const handleDrop = useCallback((e: DragEvent) => {
    if (processing) return
    e.preventDefault()
    e.stopPropagation()
    setDragOverArea(false)
    setDragOverIdx(null)
    setDragOverAdd(false)
    if (e.dataTransfer.files?.length && onDropFiles) {
      onDropFiles(Array.from(e.dataTransfer.files))
    }
  }, [processing, onDropFiles])

  // Per-cell drop (replace)
  const handleCellDragOver = useCallback((e: DragEvent, idx: number) => {
    if (processing) return
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setDragOverIdx(idx)
    setDragOverAdd(false)
  }, [processing])

  const handleCellDragLeave = useCallback(() => {
    setDragOverIdx(null)
  }, [])

  const handleCellDrop = useCallback((e: DragEvent, idx: number) => {
    if (processing) return
    e.preventDefault()
    e.stopPropagation()
    setDragOverIdx(null)
    setDragOverArea(false)
    if (e.dataTransfer.files?.length && onDropReplace) {
      onDropReplace(Array.from(e.dataTransfer.files), idx)
    }
  }, [processing, onDropReplace])

  // Add-slot drop
  const handleAddSlotDragOver = useCallback((e: DragEvent) => {
    if (processing) return
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setDragOverAdd(true)
    setDragOverIdx(null)
  }, [processing])

  const handleAddSlotDrop = useCallback((e: DragEvent) => {
    if (processing) return
    e.preventDefault()
    e.stopPropagation()
    setDragOverAdd(false)
    setDragOverArea(false)
    if (e.dataTransfer.files?.length && onDropFiles) {
      onDropFiles(Array.from(e.dataTransfer.files))
    }
  }, [processing, onDropFiles])

  // ─── Wheel zoom (on image only, not modal) ───
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    setZoom((prev) => {
      const factor = e.deltaY < 0 ? 1.12 : 0.88
      const next = Math.max(0.5, Math.min(5, prev * factor))
      const scale = next / prev
      setPan((p) => {
        if (next <= 1) return { x: 0, y: 0 }
        return { x: cx - scale * (cx - p.x), y: cy - scale * (cy - p.y) }
      })
      return next
    })
  }, [])

  // ─── Double-click toggle 1× ↔ 2× ───
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    if (zoom > 1.1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    } else {
      setZoom(2)
      setPan({ x: -cx, y: -cy })
    }
  }, [zoom])

  // ─── Mouse drag to pan ───
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1 || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { x: pan.x, y: pan.y }
  }, [zoom, pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    })
  }, [isDragging])

  const onMouseUp = useCallback(() => setIsDragging(false), [])

  // ─── Touch pinch zoom + drag ───
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.stopPropagation()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStart.current = { dist: Math.hypot(dx, dy), zoom, pan: { ...pan } }
    } else if (e.touches.length === 1 && zoom > 1) {
      setIsDragging(true)
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      panStart.current = { ...pan }
    }
  }, [zoom, pan])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      e.stopPropagation()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scale = dist / pinchStart.current.dist
      const nextZoom = Math.max(0.5, Math.min(5, pinchStart.current.zoom * scale))
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const cx = midX - rect.left - rect.width / 2
      const cy = midY - rect.top - rect.height / 2
      const s = nextZoom / pinchStart.current.zoom
      setZoom(nextZoom)
      setPan(nextZoom <= 1 ? { x: 0, y: 0 } : {
        x: cx - s * (cx - pinchStart.current.pan.x),
        y: cy - s * (cy - pinchStart.current.pan.y),
      })
    } else if (e.touches.length === 1 && isDragging) {
      setPan({
        x: panStart.current.x + (e.touches[0].clientX - dragStart.current.x),
        y: panStart.current.y + (e.touches[0].clientY - dragStart.current.y),
      })
    }
  }, [isDragging])

  const onTouchEnd = useCallback(() => setIsDragging(false), [])

  // ─── Lightbox navigation ───
  const lbPrev = () => setLightboxIndex((i) => (i > 0 ? i - 1 : totalCount - 1))
  const lbNext = () => setLightboxIndex((i) => (i < totalCount - 1 ? i + 1 : 0))

  // ─── Size info renderer ───
  const renderSize = (orig: number, result: number | null) => {
    if (result != null) {
      const pct = result < orig ? ` -${Math.round((1 - result / orig) * 100)}%` : ''
      return (
        <span className="text-[10px] leading-tight">
          <span className="text-[var(--text-dim)]/60">{formatSize(orig)}</span>
          <span className="text-[var(--text-dim)]/30 mx-0.5">→</span>
          <span className={result < orig ? 'text-emerald-400/80' : 'text-[var(--text-dim)]/60'}>
            {formatSize(result)}{pct}
          </span>
        </span>
      )
    }
    return <span className="text-[10px] text-[var(--text-dim)]/50">{formatSize(orig)}</span>
  }

  // Always show one add-slot while there's room
  const showAddSlot = remaining > 0

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-3">
        {showGrid ? (
          /* ── Grid view (batch) ── */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-[var(--radius-xl)] transition-all ${
              dragOverArea && dragOverIdx == null && !dragOverAdd
                ? 'ring-2 ring-[var(--accent)]/40 shadow-[0_0_24px_var(--accent-glow)]'
                : ''
            }`}
            style={{
              background: 'rgba(14,14,28,0.72)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 0 0 2px rgba(139,92,246,0.08)',
            }}
          >
            <div className="rounded-[var(--radius-xl)] overflow-hidden p-2 sm:p-3">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {items.map((item, i) => {
                const url = saveUrls.get(i) ?? (item.resultUrl || item.originalUrl)
                const isDragTarget = dragOverIdx === i
                return (
                  <div
                    key={i}
                    onDragOver={(e) => handleCellDragOver(e, i)}
                    onDragLeave={handleCellDragLeave}
                    onDrop={(e) => handleCellDrop(e, i)}
                    className="relative"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => { onGoTo(i); openLightbox(i) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { onGoTo(i); openLightbox(i) } }}
                      onDragOver={(e) => e.preventDefault()}
                      className="
                        relative aspect-square w-full rounded-[var(--radius-md)] overflow-hidden
                        border-2 border-transparent hover:border-[rgba(139,92,246,0.2)] transition-all cursor-pointer group
                      "
                    >
                      <img
                        src={url}
                        alt={item.fileName}
                        className="w-full h-full object-cover"
                      />

                      {/* Delete button — top-right inside the rounded corner */}
                      {onDelete && (
                        <button
                          className="absolute top-0 right-0 z-10 w-7 h-7 flex items-center justify-center
                            text-white/90 hover:text-white hover:bg-red-500/90
                            transition-all text-[11px] leading-none shadow-md
                            rounded-bl-lg"
                          style={{ background: 'rgba(0,0,0,0.85)' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(i)
                          }}
                          aria-label={lang === 'zh' ? '删除' : 'Delete'}
                        >
                          ✕
                        </button>
                      )}

                      {/* Hover overlay (lightbox hint) */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium bg-black/40 px-2 py-0.5 rounded-full">
                          🔍
                        </span>
                      </div>

                      {/* Bottom info bar: index + size */}
                      <div
                        className="absolute bottom-0 inset-x-0 pt-1 pb-1 px-1.5 flex items-center justify-between gap-1"
                        style={{ background: 'rgba(0,0,0,0.85)' }}
                      >
                        <span className="text-[10px] text-white/60 font-medium tabular-nums shrink-0 min-w-[14px] text-left">
                          {i + 1}
                        </span>
                        <span className="truncate">
                          {renderSize(item.originalSize, item.resultSize)}
                        </span>
                      </div>
                    </div>

                    {/* Drag-replace overlay */}
                    {isDragTarget && onDropReplace && (
                      <div className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--accent)]/20 ring-2 ring-[var(--accent)]/60 z-20 flex items-center justify-center pointer-events-none">
                        <span className="text-[11px] font-medium text-[var(--accent)] bg-black/60 px-2 py-1 rounded-full">
                          {t.dropNewImage as string}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Empty "add more" slot — always one at the end while there's room */}
              {onDropFiles && showAddSlot && (
                <div
                  onDragOver={handleAddSlotDragOver}
                  onDrop={handleAddSlotDrop}
                  className={`
                    aspect-square rounded-[var(--radius-md)] border-2 border-dashed
                    flex items-center justify-center transition-all cursor-pointer
                    ${dragOverAdd
                      ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10'
                      : 'border-[rgba(139,92,246,0.1)] hover:border-[rgba(139,92,246,0.2)] bg-white/[0.02]'
                    }
                  `}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.multiple = true
                    input.onchange = () => {
                      if (input.files?.length && onDropFiles) {
                        onDropFiles(Array.from(input.files))
                      }
                    }
                    input.click()
                  }}
                >
                  <div className="flex flex-col items-center gap-1 text-[var(--text-dim)]/40 hover:text-[var(--text-dim)]/60">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-[10px]">
                      {remaining} left
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
          </div>
        ) : (
          /* ── Single thumbnail ── */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-[var(--radius-xl)] overflow-hidden transition-all ${
              dragOverArea
                ? 'ring-2 ring-[var(--accent)]/40 shadow-[0_0_24px_var(--accent-glow)]'
                : ''
            }`}
            style={{
              background: 'rgba(14,14,28,0.72)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 0 0 2px rgba(139,92,246,0.08)',
            }}
          >
            <div
              className="relative flex items-center justify-center p-3 min-h-[100px] sm:min-h-[140px] group cursor-pointer"
              onClick={() => openLightbox(0)}
            >
              <img
                src={saveUrls.get(0) ?? displayUrl}
                alt={displayLabel as string}
                className="max-w-full max-h-[140px] sm:max-h-[200px] object-contain rounded-[var(--radius-sm)]"
              />
              {/* Label */}
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/80 backdrop-blur-sm rounded-[var(--radius-sm)] text-xs text-white font-medium">
                {displayLabel as string}
              </div>
              {/* WeChat: real save URL failed → gentle hint (data URL usually still saves) */}
              {isWeChat && displayUrl && failedUrls.has(displayUrl) && (
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <span className="inline-block px-2 py-1 bg-black/80 rounded-[var(--radius-sm)] text-[10px] text-amber-400/90">
                    {lang === 'zh' ? '💡 长按可保存；如失败点右上角 ··· 在浏览器中打开' : '💡 Long-press to save; else ⋯ → Open in browser'}
                  </span>
                </div>
              )}
              {/* Drop hint overlay */}
              {dragOverArea && onDropFiles && (
                <div className="absolute inset-0 bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]/50 rounded-[var(--radius-xl)] flex items-center justify-center z-10 pointer-events-none">
                  <span className="px-3 py-1.5 bg-black/80 rounded-full text-xs text-[var(--accent)] font-medium">
                    {t.dropNewImage as string}
                  </span>
                </div>
              )}
              {/* Preview button */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-[var(--radius-md)] text-xs text-white font-medium transition-colors">
                  🔍 {t.preview as string}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Lightbox Modal ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[var(--radius-xl)] glass backdrop-blur-2xl overflow-hidden shadow-2xl"
            style={{ border: '1px solid rgba(139,92,246,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {totalCount > 1 && (
                  <span className="text-xs text-white/50 font-medium bg-black/40 backdrop-blur px-2 py-1 rounded-md">
                    {imageOfText(lightboxIndex)}
                  </span>
                )}
              </div>
              <button
                onClick={closeLightbox}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 backdrop-blur text-white transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Lightbox prev/next (if multiple) */}
            {totalCount > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); lbPrev() }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); lbNext() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image area */}
            <div
              className="flex-1 flex items-center justify-center p-6 min-h-[200px] overflow-hidden relative"
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <img
                src={saveUrls.get(lightboxIndex) ?? lbUrl}
                alt={lbLabel as string}
                draggable={false}
                className="max-w-full max-h-[65vh] object-contain select-none transition-transform duration-[50ms] ease-linear"
                style={{
                  transform: zoom > 1 ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
                onWheel={onWheel}
                onDoubleClick={onDoubleClick}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              />
              {/* WeChat: save URL not ready yet */}
              {isWeChat && lbUrl && !saveUrls.has(lightboxIndex) && !failedUrls.has(lbUrl) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="px-3 py-1.5 bg-black/70 rounded-full text-xs text-white/80">
                    {lang === 'zh' ? '正在生成可保存图片…' : 'Preparing saveable image…'}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(139,92,246,0.08)]">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50 font-medium">{lbLabel as string}</span>
                {isWeChat && lbUrl && failedUrls.has(lbUrl) ? (
                  <span className="text-[11px] text-amber-400/80">
                    {lang === 'zh'
                      ? '💡 长按可保存；如失败点 ⋯ → 在浏览器中打开'
                      : '💡 Long-press to save; else ⋯ → Open in browser'}
                  </span>
                ) : isWeChat ? (
                  <span className="text-[11px] text-amber-400/70">
                    👆 {lang === 'zh' ? '长按图片即可保存到相册' : 'Long-press to save'}
                  </span>
                ) : (
                  <>
                    <span className="text-[11px] text-white/30 hidden sm:inline">
                      🖱️ {t.zoomHint as string}
                    </span>
                    <span className="text-[11px] text-white/30 sm:hidden">
                      🔍 {lang === 'zh' ? '双指缩放 · 下方 +/− 按钮' : 'Pinch zoom · +/− buttons'}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setZoom((z) => {
                      const next = Math.max(z - 0.5, 0.5)
                      if (next <= 1) setPan({ x: 0, y: 0 })
                      return next
                    })
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg transition-colors"
                >
                  −
                </button>
                <span className="text-xs text-white/50 font-mono tabular-nums w-11 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(z + 0.5, 5))}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg transition-colors"
                >
                  +
                </button>
                {zoom !== 1 && (
                  <button
                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
                    className="ml-2 px-3 py-1.5 text-xs text-white/50 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {t.resetZoom as string}
                  </button>
                )}
              </div>
            </div>

            {/* Lightbox dots */}
            {totalCount > 1 && (
              <div className="flex items-center justify-center gap-1.5 pb-3">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); setZoom(1); setPan({ x: 0, y: 0 }) }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === lightboxIndex
                        ? 'bg-white w-5'
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
