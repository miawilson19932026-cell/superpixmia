import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n'
import { canvasToBlob } from '../utils/resize'
import { floodFill } from './studio/canvasOps'

// Magic-wand + brush refinement for the AI background-removal result.
// Opens as a full-screen overlay so the user can clean up leftover background
// (wand / erase) or bring back parts the AI cut away (restore from the original).
// All operations share one working canvas — tools combine freely.

type Action = 'erase' | 'restore'
type Tool = 'wand' | 'brush'

interface Props {
  resultUrl: string
  originalUrl: string
  onRefine: (blob: Blob) => void
  onClose: () => void
}

const MAX_HISTORY = 15

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

export default function BgRefinePanel({ resultUrl, originalUrl, onRefine, onClose }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const origRef = useRef<HTMLCanvasElement | null>(null)
  const histRef = useRef<ImageData[]>([])
  const redoRef = useRef<ImageData[]>([])
  const draggingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)

  const [tool, setTool] = useState<Tool>('wand')
  const [action, setAction] = useState<Action>('erase')
  const [tolerance, setTolerance] = useState(40)
  const [brushSize, setBrushSize] = useState(24)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [ready, setReady] = useState(false)

  // Load the AI result onto the working canvas + keep the original for restore.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const c = canvasRef.current
      if (!c) return
      const result = await loadImage(resultUrl)
      const orig = await loadImage(originalUrl)
      if (cancelled) return

      c.width = result.width
      c.height = result.height
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(result, 0, 0)

      const oc = document.createElement('canvas')
      oc.width = orig.width
      oc.height = orig.height
      const octx = oc.getContext('2d')!
      octx.drawImage(orig, 0, 0)
      origRef.current = oc

      histRef.current = []
      redoRef.current = []
      setCanUndo(false)
      setCanRedo(false)
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [resultUrl, originalUrl])

  const snapshot = useCallback(() => {
    const c = canvasRef.current
    if (!c) return null
    return c.getContext('2d')!.getImageData(0, 0, c.width, c.height)
  }, [])

  const pushHistory = useCallback(() => {
    const snap = snapshot()
    if (!snap) return
    histRef.current.push(snap)
    if (histRef.current.length > MAX_HISTORY) histRef.current.shift()
    redoRef.current = []
    setCanUndo(histRef.current.length > 0)
    setCanRedo(false)
  }, [snapshot])

  const restore = useCallback((img: ImageData) => {
    const c = canvasRef.current
    if (!c) return
    c.getContext('2d')!.putImageData(img, 0, 0)
  }, [])

  const undo = useCallback(() => {
    const cur = snapshot()
    const prev = histRef.current.pop()
    if (!prev || !cur) return
    redoRef.current.push(cur)
    restore(prev)
    setCanUndo(histRef.current.length > 0)
    setCanRedo(redoRef.current.length > 0)
  }, [snapshot, restore])

  const redo = useCallback(() => {
    const cur = snapshot()
    const next = redoRef.current.pop()
    if (!next || !cur) return
    histRef.current.push(cur)
    restore(next)
    setCanUndo(histRef.current.length > 0)
    setCanRedo(redoRef.current.length > 0)
  }, [snapshot, restore])

  const reset = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    ;(async () => {
      const result = await loadImage(resultUrl)
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
      c.getContext('2d')!.drawImage(result, 0, 0)
      histRef.current = []
      redoRef.current = []
      setCanUndo(false)
      setCanRedo(false)
    })()
  }, [resultUrl])

  const toCanvasPt = (e: React.PointerEvent) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    }
  }

  // ── Magic wand: one click selects the similar connected region ──
  const handleWand = useCallback((e: React.PointerEvent) => {
    const c = canvasRef.current
    const oc = origRef.current
    if (!c) return
    const { x, y } = toCanvasPt(e)
    const ctx = c.getContext('2d')!
    const data = ctx.getImageData(0, 0, c.width, c.height)
    // Restore-wand clicks land on transparent holes; floodFill must select the
    // non-opaque region there instead of treating the seed as a no-op.
    const sel = floodFill(data, Math.round(x), Math.round(y), tolerance, { matchTransparent: action === 'restore' })
    const origData = oc ? oc.getContext('2d')!.getImageData(0, 0, oc.width, oc.height).data : null
    let changed = false
    for (let i = 0; i < sel.length; i++) {
      if (!sel[i]) continue
      const p = i * 4
      if (action === 'erase') {
        if (data.data[p + 3] !== 0) { data.data[p + 3] = 0; changed = true }
      } else if (origData) {
        data.data[p] = origData[p]
        data.data[p + 1] = origData[p + 1]
        data.data[p + 2] = origData[p + 2]
        data.data[p + 3] = 255
        changed = true
      }
    }
    // Snapshot before drawing so undo reverts to the pre-wand state.
    if (changed) { pushHistory(); ctx.putImageData(data, 0, 0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tolerance, action, pushHistory])

  // ── Brush: erase to transparent / restore original texture ──
  const paintAt = useCallback((pt: { x: number; y: number }) => {
    const c = canvasRef.current
    const oc = origRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const R = brushSize / 2
    ctx.save()
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, Math.max(1, R), 0, Math.PI * 2)
    ctx.clip()
    if (action === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, c.width, c.height)
    } else if (oc) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(oc, 0, 0)
    }
    ctx.restore()
  }, [action, brushSize])

  const brushTo = useCallback((pt: { x: number; y: number }) => {
    const last = lastPtRef.current
    const step = Math.max(2, brushSize / 4)
    if (last) {
      const dx = pt.x - last.x
      const dy = pt.y - last.y
      const dist = Math.hypot(dx, dy)
      const n = Math.max(1, Math.ceil(dist / step))
      for (let k = 1; k <= n; k++) {
        paintAt({ x: last.x + (dx * k) / n, y: last.y + (dy * k) / n })
      }
    } else {
      paintAt(pt)
    }
    lastPtRef.current = pt
  }, [brushSize, paintAt])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!ready) return
    e.preventDefault()
    if (tool === 'wand') {
      // handleWand snapshots itself only when something actually changed
      handleWand(e)
      return
    }
    pushHistory()
    draggingRef.current = true
    lastPtRef.current = null
    brushTo(toCanvasPt(e))
  }, [ready, tool, handleWand, pushHistory, brushTo])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    e.preventDefault()
    brushTo(toCanvasPt(e))
  }, [brushTo])

  const onPointerUp = useCallback(() => {
    draggingRef.current = false
    lastPtRef.current = null
  }, [])

  const apply = useCallback(async () => {
    const c = canvasRef.current
    if (!c) return
    const blob = await canvasToBlob(c, 'png')
    onRefine(blob)
  }, [onRefine])

  const segBtn = (active: boolean) => `flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] border transition-all ${
    active
      ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
  }`

  const iconBtn = (active: boolean) => `shrink-0 px-3 py-2 text-sm font-medium rounded-[var(--radius-sm)] border transition-all ${
    active
      ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
  }`

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'rgba(5,5,12,0.94)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10">
        <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">🎨 {t.bgRefineTitle}</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/10 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tool pick */}
          <div className="flex flex-1 min-w-[220px] rounded-[var(--radius-sm)] border border-[var(--border)] p-0.5 gap-0.5">
            <button className={segBtn(tool === 'wand')} onClick={() => setTool('wand')}>✨ {t.bgRefineWand}</button>
            <button className={segBtn(tool === 'brush')} onClick={() => setTool('brush')}>🖌 {t.bgRefineBrush}</button>
          </div>
          {/* Action */}
          <div className="flex flex-1 min-w-[220px] rounded-[var(--radius-sm)] border border-[var(--border)] p-0.5 gap-0.5">
            <button className={segBtn(action === 'erase')} onClick={() => setAction('erase')}>🗑 {t.bgRefineErase}</button>
            <button className={segBtn(action === 'restore')} onClick={() => setAction('restore')}>↩ {t.bgRefineRestore}</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {tool === 'wand' ? (
            <label className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <span className="whitespace-nowrap">{t.bgRefineTolerance}</span>
              <input
                type="range" min={1} max={150} value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-36 accent-[var(--accent)]"
              />
              <span className="font-mono tabular-nums text-[var(--accent)] w-8">{tolerance}</span>
            </label>
          ) : (
            <label className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <span className="whitespace-nowrap">{t.bgRefineBrushSize}</span>
              <input
                type="range" min={4} max={120} value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-36 accent-[var(--accent)]"
              />
              <span className="font-mono tabular-nums text-[var(--accent)] w-8">{brushSize}</span>
            </label>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <button className={iconBtn(false)} disabled={!canUndo} onClick={undo}
              style={{ opacity: canUndo ? 1 : 0.35 }}>↶ {t.bgRefineUndo}</button>
            <button className={iconBtn(false)} disabled={!canRedo} onClick={redo}
              style={{ opacity: canRedo ? 1 : 0.35 }}>↷ {t.bgRefineRedo}</button>
            <button className={iconBtn(false)} onClick={reset}>♻ {t.bgRefineReset}</button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="checkerboard rounded-[var(--radius-xl)] border border-[var(--border)] overflow-hidden max-w-full">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[55vh] block cursor-crosshair touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>

      {/* Hint + actions */}
      <div className="px-4 sm:px-6 py-3 border-t border-white/10 space-y-3">
        <p className="text-[11px] text-[var(--text-dim)] text-center leading-relaxed">{t.bgRefineHint}</p>
        <div className="flex gap-2 max-w-md mx-auto">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
          >
            {t.bgRefineCancel}
          </button>
          <button
            onClick={apply}
            disabled={!ready}
            className="flex-1 py-2.5 btn-gradient text-sm font-semibold rounded-[var(--radius-md)] disabled:opacity-40 disabled:pointer-events-none"
          >
            ✓ {t.bgRefineApply}
          </button>
        </div>
      </div>
    </div>
  )
}
