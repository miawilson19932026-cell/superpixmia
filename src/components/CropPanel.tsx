import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useTranslation } from '../i18n'
import type { CropRect } from '../utils'

type RatioKey = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16'
type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

// Preset aspect ratios (w / h). 16:9 landscape, 9:16 portrait for stories,
// 1:1 squares, 4:3 / 3:4 classic photo ratios.
const RATIOS: Record<Exclude<RatioKey, 'free'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

const RATIO_KEYS: RatioKey[] = ['free', '1:1', '4:3', '3:4', '16:9', '9:16']

// The fixed opposite corner while dragging a resize handle.
const ANCHOR: Record<Exclude<DragMode, 'move'>, { ax: number; ay: number }> = {
  nw: { ax: 1, ay: 1 }, // dragging top-left → bottom-right is fixed
  ne: { ax: 0, ay: 1 }, // dragging top-right → bottom-left is fixed
  sw: { ax: 1, ay: 0 }, // dragging bottom-left → top-right is fixed
  se: { ax: 0, ay: 0 }, // dragging bottom-right → top-left is fixed
}

// Normalized rect (0..1 relative to the image display area).
interface NormRect {
  x: number
  y: number
  w: number
  h: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

const MIN_W = 0.05
const MIN_H = 0.05

// Resize the box from an anchor corner. When a ratio is set the width/height
// stay locked to it, otherwise the box follows the pointer freely.
function resizeFrom(ax: number, ay: number, nx: number, ny: number, r: number | null): NormRect {
  nx = clamp(nx, 0, 1)
  ny = clamp(ny, 0, 1)

  if (r === null) {
    const x = Math.min(ax, nx)
    const y = Math.min(ay, ny)
    return {
      x,
      y,
      w: Math.max(Math.abs(nx - ax), MIN_W),
      h: Math.max(Math.abs(ny - ay), MIN_H),
    }
  }

  const dirX = nx >= ax ? 1 : -1
  const dirY = ny >= ay ? 1 : -1
  const availW = dirX > 0 ? 1 - ax : ax
  const availH = dirY > 0 ? 1 - ay : ay

  // Width-first, fall back to height-first when that overflows the box.
  let w = Math.max(Math.abs(nx - ax), MIN_W)
  let h = w / r
  if (h > availH) {
    h = Math.max(availH, MIN_H)
    w = Math.min(h * r, availW)
  }
  if (w > availW) {
    w = availW
    h = Math.min(w / r, availH)
  }
  w = Math.max(w, MIN_W)
  h = Math.max(h, MIN_H)

  return {
    x: dirX > 0 ? ax : ax - w,
    y: dirY > 0 ? ay : ay - h,
    w,
    h,
  }
}

// When the user picks a preset ratio, re-shape the current box around its
// center, keeping it as large as possible inside the image.
function fitRatio(cur: NormRect, r: number): NormRect {
  let w = cur.w
  let h = cur.h
  if (w / h > r) {
    h = w / r
  } else {
    w = h * r
  }
  if (w > 1) {
    w = 1
    h = 1 / r
  }
  if (h > 1) {
    h = 1
    w = r
  }
  const cx = cur.x + cur.w / 2
  const cy = cur.y + cur.h / 2
  return {
    x: clamp(cx - w / 2, 0, 1 - w),
    y: clamp(cy - h / 2, 0, 1 - h),
    w,
    h,
  }
}

interface Props {
  file: File
  originalWidth: number
  originalHeight: number
  onCrop: (rect: CropRect) => void
  processing: boolean
  hasResult: boolean
}

export default function CropPanel({ file, originalWidth, originalHeight, onCrop, processing, hasResult }: Props) {
  const { t } = useTranslation()
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [ratio, setRatio] = useState<RatioKey>('free')
  const [rect, setRect] = useState<NormRect>({ x: 0, y: 0, w: 1, h: 1 })
  const areaRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ mode: DragMode; sx: number; sy: number; rect: NormRect } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pxW = Math.max(1, Math.round(rect.w * originalWidth))
  const pxH = Math.max(1, Math.round(rect.h * originalHeight))

  const toNorm = (e: PointerEvent): { nx: number; ny: number } | null => {
    const el = areaRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return {
      nx: (e.clientX - r.left) / r.width,
      ny: (e.clientY - r.top) / r.height,
    }
  }

  const startDrag = (mode: DragMode) => (e: PointerEvent) => {
    e.preventDefault()
    const p = toNorm(e)
    if (!p) return
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    dragRef.current = { mode, sx: p.nx, sy: p.ny, rect: { ...rect } }
  }

  const onPointerMove = (e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const p = toNorm(e)
    if (!p) return
    const { nx, ny } = p
    const r = drag.rect

    if (drag.mode === 'move') {
      const dx = nx - drag.sx
      const dy = ny - drag.sy
      setRect({
        x: clamp(r.x + dx, 0, 1 - r.w),
        y: clamp(r.y + dy, 0, 1 - r.h),
        w: r.w,
        h: r.h,
      })
    } else {
      const { ax, ay } = ANCHOR[drag.mode]
      const ratioW = ratio === 'free' ? null : RATIOS[ratio]
      setRect(resizeFrom(ax, ay, nx, ny, ratioW))
    }
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const selectRatio = (key: RatioKey) => {
    setRatio(key)
    if (key !== 'free') setRect((cur) => fitRatio(cur, RATIOS[key]))
  }

  const apply = () => {
    onCrop({
      x: Math.round(rect.x * originalWidth),
      y: Math.round(rect.y * originalHeight),
      width: pxW,
      height: pxH,
    })
  }

  const handleCursor = (m: DragMode) =>
    m === 'move' ? 'move' : m === 'nw' || m === 'se' ? 'nwse-resize' : 'nesw-resize'

  const ratioBtnClass = (active: boolean) =>
    `py-2 text-xs font-medium rounded-[var(--radius-md)] border transition-all ${
      active
        ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
        : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)]'
    }`

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.cropTitle}</h3>

      {/* Interactive crop editor */}
      <div className="relative flex justify-center">
        <div
          ref={areaRef}
          className="relative select-none"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {imgUrl && (
            <img
              src={imgUrl}
              alt="Crop preview"
              draggable={false}
              className="block max-w-full max-h-[55vh] w-auto h-auto rounded-lg"
            />
          )}
          {imgUrl && (
            <>
              {/* Dim the area outside the crop box */}
              <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: `${rect.y * 100}%` }} />
                <div className="absolute bg-black/60" style={{ bottom: 0, left: 0, right: 0, height: `${(1 - rect.y - rect.h) * 100}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${rect.y * 100}%`, height: `${rect.h * 100}%`, left: 0, width: `${rect.x * 100}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${rect.y * 100}%`, height: `${rect.h * 100}%`, right: 0, width: `${(1 - rect.x - rect.w) * 100}%` }} />
              </div>

              {/* Crop box border + rule-of-thirds grid */}
              <div
                className="absolute cursor-move"
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.w * 100}%`,
                  height: `${rect.h * 100}%`,
                  touchAction: 'none',
                }}
                onPointerDown={startDrag('move')}
              >
                <div className="absolute inset-0 border-2 border-white/90" style={{ pointerEvents: 'none' }}>
                  <div className="absolute border-l border-white/30" style={{ left: '33.333%', top: 0, bottom: 0 }} />
                  <div className="absolute border-l border-white/30" style={{ left: '66.666%', top: 0, bottom: 0 }} />
                  <div className="absolute border-t border-white/30" style={{ top: '33.333%', left: 0, right: 0 }} />
                  <div className="absolute border-t border-white/30" style={{ top: '66.666%', left: 0, right: 0 }} />
                </div>
              </div>

              {/* Corner resize handles */}
              {(['nw', 'ne', 'sw', 'se'] as const).map((m) => {
                const x = m.includes('e') ? rect.x + rect.w : rect.x
                const y = m.includes('s') ? rect.y + rect.h : rect.y
                return (
                  <div
                    key={m}
                    role="button"
                    aria-label={m}
                    onPointerDown={startDrag(m)}
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white border border-black/30 shadow-md"
                    style={{ left: `${x * 100}%`, top: `${y * 100}%`, cursor: handleCursor(m), touchAction: 'none' }}
                  />
                )
              })}
            </>
          )}
        </div>
      </div>

      <p className="text-center text-xs font-mono tabular-nums text-[var(--text-dim)]">{pxW} × {pxH} px</p>
      <p className="text-center text-[11px] text-[var(--text-dim)] leading-relaxed">{t.cropDragHint}</p>

      {/* Aspect-ratio presets */}
      <div>
        <p className="text-[11px] text-[var(--text-dim)] mb-2 uppercase tracking-wide">{t.cropRatio}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {RATIO_KEYS.map((key) => (
            <button key={key} onClick={() => selectRatio(key)} className={ratioBtnClass(ratio === key)}>
              {key === 'free' ? t.cropFree : key}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={apply}
        disabled={processing}
        className="w-full py-3 btn-gradient text-sm font-semibold rounded-[var(--radius-md)] active:scale-[0.98] disabled:opacity-50 transition-all"
      >
        {processing ? t.processing : t.cropApply}
      </button>

      {!processing && hasResult && (
        <p className="text-xs text-center text-[var(--text-dim)]">{t.cropHint}</p>
      )}
    </div>
  )
}
