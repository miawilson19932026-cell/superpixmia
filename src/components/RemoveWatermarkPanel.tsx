import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useTranslation } from '../i18n'

// Max working-canvas edge. Painting runs on a downscaled buffer (the output is
// always processed at the original image resolution), so large photos stay fast.
const WORK_MAX = 1024
const UNDO_LIMIT = 10

interface Props {
  file: File
  resultUrl?: string | null
  onRemoveWatermark: (mask: Uint8Array, maskWidth: number, maskHeight: number) => void
  processing: boolean
  hasResult: boolean
}

export default function RemoveWatermarkPanel({ file, resultUrl, onRemoveWatermark, processing, hasResult }: Props) {
  const { t } = useTranslation()
  const stageRef = useRef<HTMLCanvasElement>(null)   // base layer: the image
  const maskRef = useRef<HTMLCanvasElement>(null)    // overlay: red brush strokes
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)
  const undoStackRef = useRef<ImageData[]>([])
  const hasMaskRef = useRef(false)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [brush, setBrush] = useState(30)
  const [mode, setMode] = useState<'paint' | 'erase'>('paint')
  const [canUndo, setCanUndo] = useState(false)
  const [hasMask, setHasMask] = useState(false)
  // After Apply, swap the canvas to the de-watermarked result so the user sees
  // the outcome right where they painted (otherwise the untouched original
  // stays on screen and reads as "didn't work").
  const [showResult, setShowResult] = useState(false)

  const refreshMaskState = () => setHasMask(hasMaskRef.current)

  // Load the image into the working canvas whenever the file changes.
  useEffect(() => {
    let cancelled = false
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const scale = Math.min(WORK_MAX / img.width, WORK_MAX / img.height, 1)
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const stage = stageRef.current!
      stage.width = w
      stage.height = h
      stage.getContext('2d')!.drawImage(img, 0, 0, w, h)
      const mask = maskRef.current!
      mask.width = w
      mask.height = h
      mask.getContext('2d')!.clearRect(0, 0, w, h)
      undoStackRef.current = []
      hasMaskRef.current = false
      setCanUndo(false)
      setHasMask(false)
      setDims({ w, h })
    }
    img.src = url
    return () => { cancelled = true; URL.revokeObjectURL(url) }
  }, [file])

  // When a processed result exists, paint it onto the canvas. Any previous
  // brush strokes are already cleared by apply() — the result replaces them.
  useEffect(() => {
    if (!resultUrl) { setShowResult(false); return }
    setShowResult(true)
    const stage = stageRef.current
    if (!stage) return
    const img = new Image()
    let cancelled = false
    img.onload = () => {
      if (cancelled || !stageRef.current) return
      stageRef.current.getContext('2d')!.drawImage(img, 0, 0, stageRef.current.width, stageRef.current.height)
    }
    img.src = resultUrl
    return () => { cancelled = true }
  }, [resultUrl])

  // Pointer → canvas coordinates, accounting for CSS scaling of the canvas.
  const toCanvas = (e: PointerEvent): { x: number; y: number } | null => {
    const mask = maskRef.current
    if (!mask) return null
    const rect = mask.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: ((e.clientX - rect.left) / rect.width) * mask.width,
      y: ((e.clientY - rect.top) / rect.height) * mask.height,
    }
  }

  // Brush radius in canvas pixels (scales with the displayed size).
  const brushRadius = () => {
    const mask = maskRef.current
    if (!mask) return brush
    const rect = mask.getBoundingClientRect()
    if (!rect.width) return brush
    return (brush * mask.width) / rect.width
  }

  // Paint (or erase) a stroke segment. Erase uses destination-out so the red
  // tint can be scrubbed off when the user overshoots the watermark.
  const stroke = (pt: { x: number; y: number }) => {
    const mask = maskRef.current
    if (!mask) return
    const mctx = mask.getContext('2d')!
    const r = brushRadius()
    mctx.lineWidth = r * 2
    mctx.lineCap = 'round'
    mctx.lineJoin = 'round'
    mctx.strokeStyle = '#ff3b3b'
    mctx.fillStyle = '#ff3b3b'
    mctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over'
    if (lastPtRef.current) {
      mctx.beginPath()
      mctx.moveTo(lastPtRef.current.x, lastPtRef.current.y)
      mctx.lineTo(pt.x, pt.y)
      mctx.stroke()
    } else {
      mctx.beginPath()
      mctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
      mctx.fill()
    }
    mctx.globalCompositeOperation = 'source-over'
    lastPtRef.current = pt
    if (!hasMaskRef.current) {
      hasMaskRef.current = true
      refreshMaskState()
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (processing || !dims) return
    const pt = toCanvas(e)
    if (!pt) return
    const mask = maskRef.current!
    undoStackRef.current.push(mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height))
    if (undoStackRef.current.length > UNDO_LIMIT) undoStackRef.current.shift()
    setCanUndo(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPtRef.current = null
    stroke(pt)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!drawingRef.current) return
    const pt = toCanvas(e)
    if (pt) stroke(pt)
  }

  const onPointerUp = () => {
    drawingRef.current = false
    lastPtRef.current = null
  }

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop()
    if (!prev) return
    maskRef.current!.getContext('2d')!.putImageData(prev, 0, 0)
    setCanUndo(undoStackRef.current.length > 0)
    hasMaskRef.current = undoStackRef.current.length > 0
    refreshMaskState()
  }, [])

  const clearMask = useCallback(() => {
    const mask = maskRef.current
    if (!mask) return
    mask.getContext('2d')!.clearRect(0, 0, mask.width, mask.height)
    undoStackRef.current = []
    hasMaskRef.current = false
    setCanUndo(false)
    refreshMaskState()
  }, [])

  const apply = useCallback(() => {
    const mask = maskRef.current
    if (!mask) return
    const w = mask.width
    const h = mask.height
    const imgData = mask.getContext('2d')!.getImageData(0, 0, w, h)
    const out = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) out[i] = imgData.data[i * 4 + 3] > 128 ? 1 : 0
    onRemoveWatermark(out, w, h)
    // Clear the brush overlay once the mask is submitted — otherwise the pink
    // strokes stay on the canvas next to the (now clean) result preview and
    // users think the watermark wasn't actually removed.
    clearMask()
  }, [onRemoveWatermark, clearMask])

  // Swap the canvas back to the original and reset the mask, so the user can
  // start over if the result isn't quite right.
  const redo = useCallback(() => {
    setShowResult(false)
    const stage = stageRef.current
    if (!stage) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (!stageRef.current) return
      stageRef.current.getContext('2d')!.drawImage(img, 0, 0, stageRef.current.width, stageRef.current.height)
      const mask = maskRef.current
      if (!mask) return
      mask.getContext('2d')!.clearRect(0, 0, mask.width, mask.height)
      undoStackRef.current = []
      hasMaskRef.current = false
      setCanUndo(false)
      setHasMask(false)
    }
    img.src = url
  }, [file])

  // Lucide-style icon wrapper (stroke-based, matches the rest of the app)
  const icon = (paths: React.ReactNode) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      {paths}
    </svg>
  )

  const modeBtn = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-2 rounded-[var(--radius-md)] border transition-all ${
      active
        ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
        : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
    }`

  const plainBtn = (enabled: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-2 rounded-[var(--radius-md)] border transition-all ${
      enabled
        ? 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
        : 'border-[var(--border)]/40 text-[var(--text-dim)]/40 pointer-events-none'
    }`

  const sliderClass =
    'w-full h-2 bg-[var(--bg-input)] rounded-full appearance-none cursor-pointer ' +
    'accent-[var(--accent)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 ' +
    '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] ' +
    '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer'

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.removeWmTitle}</h3>

      {/* Brush editor: image canvas + red mask overlay, sized identically */}
      <div
        className="relative w-fit select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          ref={stageRef}
          className="block max-w-full max-h-[55vh] w-auto h-auto rounded-lg cursor-crosshair"
        />
        {/* Unconditional render: the ref must be non-null by the time img.onload
            sets mask.width/height (it runs before setDims commits the mask to the
            DOM). A conditional render here made maskRef.current null → the mask
            layer never appeared and painting had no effect. */}
        <canvas
          ref={maskRef}
          className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
          style={{ opacity: 0.65 }}
        />
      </div>

      <p className="text-center text-[11px] text-[var(--text-dim)] leading-relaxed">{t.removeWmHint}</p>

      {showResult ? (
        /* Result state: the canvas now shows the de-watermarked image, so the
           original (watermark still visible) never lingers and confuses users. */
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] border border-emerald-500/25 bg-emerald-500/10 text-emerald-400/90 text-sm font-medium">
            ✓ {t.removeWmDone}
          </div>
          <button
            onClick={redo}
            className="w-full py-3 glass backdrop-blur-xl border border-[var(--accent)]/25 text-sm font-semibold rounded-[var(--radius-md)] active:scale-[0.98] transition-all"
          >
            {t.removeWmRedo}
          </button>
        </div>
      ) : (
        <>
          {/* Brush size */}
          <div className="flex items-center gap-3">
            <label className="block text-[11px] text-[var(--text-dim)] uppercase tracking-wide shrink-0">{t.removeWmBrush}</label>
            <input
              type="range" min={6} max={120} value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
              className={sliderClass}
            />
            <span className="text-sm font-mono tabular-nums text-[var(--text-dim)] shrink-0">{brush}</span>
          </div>

          {/* Paint / Erase / Undo / Clear — icon + label */}
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => setMode('paint')} className={modeBtn(mode === 'paint')}>
              {icon(
                <><path d="m9.06 11.9 8.07-8.06a2.85 2.83 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" /></>
              )}
              <span className="text-[11px] leading-none">{t.removeWmPaint}</span>
            </button>
            <button onClick={() => setMode('erase')} className={modeBtn(mode === 'erase')}>
              {icon(
                <><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></>
              )}
              <span className="text-[11px] leading-none">{t.removeWmErase}</span>
            </button>
            <button onClick={undo} disabled={!canUndo} className={plainBtn(canUndo)}>
              {icon(
                <><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></>
              )}
              <span className="text-[11px] leading-none">{t.removeWmUndo}</span>
            </button>
            <button onClick={clearMask} disabled={!hasMask} className={plainBtn(hasMask)}>
              {icon(
                <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></>
              )}
              <span className="text-[11px] leading-none">{t.removeWmClear}</span>
            </button>
          </div>

          <button
            onClick={apply}
            disabled={processing || !hasMask}
            className="w-full py-3 btn-gradient text-sm font-semibold rounded-[var(--radius-md)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {processing ? t.processing : t.removeWmApply}
          </button>

          {!processing && hasResult && (
            <p className="text-xs text-center text-[var(--text-dim)]">{t.removeWmResultHint}</p>
          )}
        </>
      )}
    </div>
  )
}
