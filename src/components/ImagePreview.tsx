import { useState, useCallback, useRef } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from '../i18n'
import { formatSize } from '../utils'

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
  onClear?: () => void
  onDropFiles?: (files: File[]) => void
  onDropReplace?: (files: File[], index: number) => void
  maxItems?: number
}

export default function ImagePreview({
  items,
  currentIndex,
  onPrev: _onPrev,
  onNext: _onNext,
  onGoTo,
  onDelete,
  onClear,
  onDropFiles,
  onDropReplace,
  maxItems = 15,
}: Props) {
  const { t } = useTranslation()
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

  // Lightbox item
  const lbItem = items[lightboxIndex]
  const lbUrl = lbItem?.resultUrl || lbItem?.originalUrl
  const lbLabel = lbItem?.resultUrl ? t.result : t.preview

  const imageOfText = (idx: number) => (t.imageOf as string)
    .replace('{current}', String(idx + 1))
    .replace('{total}', String(totalCount))

  // ─── Drop handlers ───
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setDragOverArea(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    // Only fire when leaving the container, not when entering a child
    if (e.currentTarget === e.target || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as HTMLElement)) {
      setDragOverArea(false)
      setDragOverIdx(null)
      setDragOverAdd(false)
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverArea(false)
    setDragOverIdx(null)
    setDragOverAdd(false)
    if (e.dataTransfer.files?.length && onDropFiles) {
      onDropFiles(Array.from(e.dataTransfer.files))
    }
  }, [onDropFiles])

  // Per-cell drop (replace)
  const handleCellDragOver = useCallback((e: DragEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setDragOverIdx(idx)
    setDragOverAdd(false)
  }, [])

  const handleCellDragLeave = useCallback(() => {
    setDragOverIdx(null)
  }, [])

  const handleCellDrop = useCallback((e: DragEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIdx(null)
    setDragOverArea(false)
    if (e.dataTransfer.files?.length && onDropReplace) {
      onDropReplace(Array.from(e.dataTransfer.files), idx)
    }
  }, [onDropReplace])

  // Add-slot drop
  const handleAddSlotDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setDragOverAdd(true)
    setDragOverIdx(null)
  }, [])

  const handleAddSlotDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverAdd(false)
    setDragOverArea(false)
    if (e.dataTransfer.files?.length && onDropFiles) {
      onDropFiles(Array.from(e.dataTransfer.files))
    }
  }, [onDropFiles])

  // ─── Wheel zoom ───
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
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

  // ─── Mouse drag ───
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1 || e.button !== 0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { x: pan.x, y: pan.y }
    e.preventDefault()
  }, [zoom, pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    })
  }, [isDragging])

  const onMouseUp = useCallback(() => setIsDragging(false), [])

  // ─── Touch ───
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
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
              background: 'rgba(14,14,28,0.92)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 0 0 2px rgba(139,92,246,0.08)',
            }}
          >
            <div className="rounded-[var(--radius-xl)] overflow-hidden p-2 sm:p-3">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {items.map((item, i) => {
                const url = item.resultUrl || item.originalUrl
                const isDragTarget = dragOverIdx === i
                return (
                  <div
                    key={i}
                    onDragOver={(e) => handleCellDragOver(e, i)}
                    onDragLeave={handleCellDragLeave}
                    onDrop={(e) => handleCellDrop(e, i)}
                    className="relative"
                  >
                    <button
                      onClick={() => { onGoTo(i); openLightbox(i) }}
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

                      {/* Delete button — always visible, top-right */}
                      {onDelete && (
                        <div
                          className="absolute top-0 right-0 z-10 bg-black/70 rounded-bl-lg pt-0.5 pb-1 pl-1.5 pr-0.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(i)
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-black/90 hover:bg-red-500/90 text-white/90 hover:text-white transition-all text-[11px] leading-none shadow-sm">
                            ✕
                          </div>
                        </div>
                      )}

                      {/* Hover overlay (lightbox hint) */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium bg-black/40 px-2 py-0.5 rounded-full">
                          🔍
                        </span>
                      </div>

                      {/* Bottom info bar: index + size */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 pt-1 pb-1 px-1.5 flex items-center justify-between gap-1">
                        <span className="text-[10px] text-white/60 font-medium tabular-nums shrink-0 min-w-[14px] text-left">
                          {i + 1}
                        </span>
                        <span className="truncate">
                          {renderSize(item.originalSize, item.resultSize)}
                        </span>
                      </div>
                    </button>

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
                    input.accept = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp,image/svg+xml,image/x-icon,image/tiff'
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
              background: 'rgba(14,14,28,0.92)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 0 0 2px rgba(139,92,246,0.08)',
            }}
          >
            <div
              className="relative flex items-center justify-center p-3 min-h-[100px] sm:min-h-[140px] group cursor-pointer"
              onClick={() => openLightbox(0)}
            >
              <img
                src={displayUrl}
                alt={displayLabel as string}
                className="max-w-full max-h-[140px] sm:max-h-[200px] object-contain rounded-[var(--radius-sm)]"
              />
              {/* Label */}
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/80 backdrop-blur-sm rounded-[var(--radius-sm)] text-xs text-white font-medium">
                {displayLabel as string}
              </div>
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

        {/* Size info (single mode only — batch shows per-image sizes in grid) */}
        {!showGrid && (
          <div className="flex items-center justify-center gap-4 text-sm text-[var(--text-dim)]">
            <span className="font-mono tabular-nums">{formatSize(current.originalSize)}</span>
            {current.resultSize != null && (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <span className={`font-mono tabular-nums ${current.resultSize < current.originalSize ? 'text-emerald-400' : ''}`}>
                  {formatSize(current.resultSize)}
                </span>
                {current.resultSize < current.originalSize && (
                  <span className="text-emerald-400 text-xs font-medium">
                    -{Math.round((1 - current.resultSize / current.originalSize) * 100)}%
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Bottom row: dot indicators + clear button (batch only) */}
        {showGrid && (
          <div className="flex items-center justify-center gap-3">
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onGoTo(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentIndex
                      ? 'bg-[var(--accent)] w-4'
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Clear All button */}
            {onClear && (
              <button
                onClick={onClear}
                className="text-[11px] text-red-400/50 hover:text-red-400 transition-colors font-medium"
              >
                {t.clearAll as string}
              </button>
            )}
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
              className="flex-1 flex items-center justify-center p-6 min-h-[200px] overflow-hidden"
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onDoubleClick={onDoubleClick}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <img
                src={lbUrl}
                alt={lbLabel as string}
                draggable={false}
                className="max-w-full max-h-[65vh] object-contain select-none transition-transform duration-[50ms] ease-linear"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
              />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(139,92,246,0.08)]">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50 font-medium">{lbLabel as string}</span>
                <span className="text-[11px] text-white/30 hidden sm:inline">
                  🖱️ {t.zoomHint as string}
                </span>
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
