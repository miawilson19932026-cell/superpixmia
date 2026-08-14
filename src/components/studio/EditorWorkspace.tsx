// Studio — the combined single-image editor workbench.
// One image, many tools. Every tool is applied against the LATEST committed
// blob (not the original), so operations accumulate like a lightweight PS.
// Layout: tool rail | canvas workbench | per-tool panel (+ Apply / Undo / Download).
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'
import type { CropRect } from '../../utils/crop'
import { cropImage, rotateImage, resizeImage, watermarkImage, removeWatermark, convertImage, formatSize, getOutputFormat } from '../../utils'
import { downloadBlob } from '../../utils/download'
import type { OutputFormat } from '../../types'
import { STUDIO_TOOLS, type StudioToolId } from './tools'
import {
  compositeStrokes,
  buildMaskFromStrokes,
  cutoutRegion,
  removeMasked,
  floodFill,
  type Stroke,
  type StrokePt,
} from './canvasOps'

export interface SourceImage {
  file: File
  url: string
  width: number
  height: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const MAX_HISTORY = 10

const FONT = `system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`

// ── Small presentational helpers (module-level = no remount state loss) ──
function Slider({
  value, min, max, step = 1, onChange, className = '',
}: {
  value: number; min: number; max: number; step?: number
  onChange: (v: number) => void; className?: string
}) {
  return (
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-1.5 appearance-none rounded-full bg-white/10 accent-[var(--accent)] cursor-pointer ${className}`}
    />
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-[var(--text-dim)]">{label}</p>
      {children}
    </div>
  )
}

export default function EditorWorkspace({
  source, onReset,
}: {
  source: SourceImage
  onReset: () => void
}) {
  const { t, lang } = useTranslation()

  // ── Committed result stack (undo/redo). histIdx points into history;
  //     -1 means "no edits yet" → current falls back to the source file. ──
  const [history, setHistory] = useState<Blob[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const current: Blob = histIdx >= 0 && history[histIdx] ? history[histIdx] : source.file

  const [activeTool, setActiveTool] = useState<StudioToolId | null>(null)
  const [processing, setProcessing] = useState(false)
  const [applied, setApplied] = useState(false)

  // Loaded current image + its dims (canvas pixel space = image pixels).
  const [curImg, setCurImg] = useState<HTMLImageElement | null>(null)
  const [curW, setCurW] = useState(source.width)
  const [curH, setCurH] = useState(source.height)

  const baseRef = useRef<HTMLCanvasElement>(null)
  const overRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ mode: string; startX: number; startY: number; orig: CropRect } | null>(null)

  // ── Per-tool state ──
  const [rotate, setRotate] = useState({ angle: 0, flipX: false, flipY: false })
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [textState, setTextState] = useState({
    text: '', color: '#ffffff', fontSize: 0.06, opacity: 1, x: 0, y: 0, hasPos: false,
  })
  const [logoState, setLogoState] = useState({
    imageUrl: null as string | null, imageScale: 0.2, opacity: 1, x: 0, y: 0, hasPos: false,
  })
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)
  const [pencilState, setPencilState] = useState({ color: '#ffffff', size: 10 })
  const [healState, setHealState] = useState({ size: 30, erase: false })
  const [removeTol, setRemoveTol] = useState(32)
  const [removeClicks, setRemoveClicks] = useState(0)
  const [resizeState, setResizeState] = useState({ width: source.width, height: source.height, lock: true })
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null)
  const [dlOpen, setDlOpen] = useState(false)
  const [dlFormat, setDlFormat] = useState<'same' | OutputFormat>('same')

  // Paint-state lives in refs (mutable during drag); compose() is called by
  // the pointer handlers directly.
  const pencilRef = useRef<Stroke[]>([])
  const healRef = useRef<Stroke[]>([])
  const cutoutRef = useRef<StrokePt[]>([])
  const removeRef = useRef<boolean[] | null>(null)

  // Load `current` into a drawable Image whenever it changes.
  useEffect(() => {
    let alive = true
    const url = URL.createObjectURL(current)
    const img = new Image()
    img.onload = () => {
      if (!alive) return
      setCurImg(img)
      setCurW(img.width)
      setCurH(img.height)
    }
    img.src = url
    return () => { alive = false; URL.revokeObjectURL(url) }
  }, [current])

  // Base canvas = the committed image, always pristine.
  useEffect(() => {
    const c = baseRef.current
    if (!c || !curImg) return
    c.width = curW
    c.height = curH
    c.getContext('2d')!.drawImage(curImg, 0, 0)
  }, [curImg, curW, curH])

  // ── Preview composition (drawn over the base on the overlay canvas) ──
  const compose = () => {
    const ov = overRef.current
    if (!ov || !curImg) return
    ov.width = curW
    ov.height = curH
    const ctx = ov.getContext('2d')!
    ctx.clearRect(0, 0, curW, curH)
    if (!activeTool) return
    switch (activeTool) {
      case 'rotate': drawRotate(ctx, curImg); break
      case 'crop': drawCrop(ctx); break
      case 'text': drawText(ctx); break
      case 'logo': drawLogo(ctx); break
      case 'pencil': drawPencil(ctx); break
      case 'heal': drawHeal(ctx); break
      case 'cutout': drawCutout(ctx); break
      case 'remove': drawRemove(ctx); break
      case 'resize': drawResize(ctx, curImg); break
    }
  }

  // Re-compose on any preview-affecting state change.
  useEffect(() => {
    compose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, curImg, curW, curH, rotate, cropRect, textState, logoState, logoImg, resizeState])

  // ── Preview drawers ──
  const drawRotate = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, curW, curH)
    const rad = (rotate.angle * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))
    const nw = Math.max(1, Math.round(curW * cos + curH * sin))
    const nh = Math.max(1, Math.round(curW * sin + curH * cos))
    const s = Math.min(curW / nw, curH / nh, 1)
    const dw = nw * s, dh = nh * s
    const ox = (curW - dw) / 2, oy = (curH - dh) / 2
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.fillRect(ox, oy, dw, dh)
    ctx.translate(ox + dw / 2, oy + dh / 2)
    ctx.rotate(rad)
    ctx.scale(rotate.flipX ? -1 : 1, rotate.flipY ? -1 : 1)
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
    ctx.restore()
  }

  const drawCrop = (ctx: CanvasRenderingContext2D) => {
    const r = cropRect
    if (!r) return
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, curW, curH)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.clearRect(r.x, r.y, r.width, r.height)
    ctx.restore()

    // Rule-of-thirds grid inside the crop box
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    for (let i = 1; i < 3; i++) {
      const gx = r.x + (r.width * i) / 3
      const gy = r.y + (r.height * i) / 3
      ctx.beginPath(); ctx.moveTo(gx, r.y); ctx.lineTo(gx, r.y + r.height); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(r.x, gy); ctx.lineTo(r.x + r.width, gy); ctx.stroke()
    }
    ctx.restore()

    // Crop border
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1)

    // Corner handles — larger rings with white rims so they read on any bg
    const h = 11
    for (const [cx, cy] of [[r.x, r.y], [r.x + r.width, r.y], [r.x, r.y + r.height], [r.x + r.width, r.y + r.height]]) {
      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(cx, cy, h / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Crosshair + ring at the pointer (hover) — an unambiguous "you are here"
    if (hoverPt) {
      const { x, y } = hoverPt
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, curH); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(curW, y); ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = 'rgba(59,130,246,0.9)'
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  const drawText = (ctx: CanvasRenderingContext2D) => {
    if (!textState.text.trim()) return
    const px = Math.max(10, curW * textState.fontSize)
    ctx.save()
    ctx.font = `600 ${px}px ${FONT}`
    ctx.fillStyle = textState.color
    ctx.globalAlpha = textState.opacity
    ctx.textBaseline = 'middle'
    // Same shadow as watermark.ts so the preview matches the committed result.
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = px * 0.15
    ctx.shadowOffsetY = px * 0.06
    ctx.fillText(textState.text.trim(), textState.x, textState.y + px / 2)
    ctx.restore()
    // Dashed bounding box (drag handle hint)
    const tw = ctx.measureText(textState.text.trim()).width
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.strokeRect(textState.x - 2, textState.y - 2, tw + 4, px + 4)
  }

  const drawLogo = (ctx: CanvasRenderingContext2D) => {
    if (!logoState.imageUrl || !logoImg) return
    const lw = curW * logoState.imageScale
    const lh = lw * (logoImg.height / logoImg.width)
    ctx.save()
    ctx.globalAlpha = logoState.opacity
    ctx.drawImage(logoImg, logoState.x, logoState.y, lw, lh)
    ctx.restore()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.strokeRect(logoState.x - 2, logoState.y - 2, lw + 4, lh + 4)
  }

  const drawPencil = (ctx: CanvasRenderingContext2D) => {
    for (const s of pencilRef.current) {
      if (s.pts.length < 1) continue
      ctx.strokeStyle = s.color
      ctx.lineWidth = Math.max(1, s.size)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(s.pts[0].x, s.pts[0].y)
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y)
      ctx.stroke()
    }
  }

  const drawHeal = (ctx: CanvasRenderingContext2D) => {
    for (const s of healRef.current) {
      if (s.pts.length < 1) continue
      if (s.erase) {
        // Erase strokes: dashed cyan to show they REMOVE mask, not add.
        ctx.strokeStyle = 'rgba(56,189,248,0.8)'
        ctx.setLineDash([5, 4])
      } else {
        ctx.strokeStyle = 'rgba(255,60,60,0.55)'
        ctx.setLineDash([])
      }
      ctx.lineWidth = Math.max(1, s.size)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(s.pts[0].x, s.pts[0].y)
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y)
      ctx.stroke()
    }
  }

  const drawCutout = (ctx: CanvasRenderingContext2D) => {
    const pts = cutoutRef.current
    if (pts.length < 2) return
    ctx.save()
    if (pts.length >= 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, curW, curH)
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fill()
    }
    ctx.restore()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
  }

  const drawRemove = (ctx: CanvasRenderingContext2D) => {
    const m = removeRef.current
    if (!m) return
    const id = ctx.createImageData(curW, curH)
    const data = id.data
    for (let i = 0; i < m.length && i < curW * curH; i++) {
      if (m[i]) data[i * 4 + 3] = 115
    }
    ctx.putImageData(id, 0, 0)
  }

  const drawResize = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, curW, curH)
    const nw = Math.max(1, Math.round(resizeState.width))
    const nh = Math.max(1, Math.round(resizeState.height))
    const s = Math.min(curW / nw, curH / nh, 1)
    const dw = nw * s, dh = nh * s
    const ox = (curW - dw) / 2, oy = (curH - dh) / 2
    ctx.drawImage(img, ox, oy, dw, dh)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.strokeRect(ox + 0.5, oy + 0.5, dw - 1, dh - 1)
    ctx.fillStyle = '#fff'
    ctx.font = '600 12px system-ui'
    ctx.textBaseline = 'top'
    ctx.fillText(`${nw} × ${nh}`, Math.max(4, ox), Math.max(4, oy - 14))
  }

  // ── Pointer handling (image-pixel coordinates) ──
  const toImg = (e: React.PointerEvent) => {
    const ov = overRef.current!
    const r = ov.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * curW,
      y: ((e.clientY - r.top) / r.height) * curH,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!activeTool || !overRef.current) return
    e.preventDefault()
    overRef.current.setPointerCapture(e.pointerId)
    const p = toImg(e)
    switch (activeTool) {
      case 'rotate': startRotate(p); break
      case 'crop': startCrop(p); break
      case 'text': placeOrGrab(p, 'text'); break
      case 'logo': placeOrGrab(p, 'logo'); break
      case 'pencil': beginStroke(p, false); break
      case 'heal': beginStroke(p, healState.erase); break
      case 'cutout':
        cutoutRef.current = [p]
        dragRef.current = { mode: 'path', startX: p.x, startY: p.y, orig: { x: 0, y: 0, width: 0, height: 0 } }
        compose()
        break
      case 'remove': doRemoveClick(p); break
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeTool) return
    const p = toImg(e)
    if (!dragRef.current) {
      // Hover tracking (no drag): the crop crosshair follows the pointer so
      // users always see exactly where they are on the image.
      if (activeTool === 'crop') setHoverPt(p)
      return
    }
    switch (activeTool) {
      case 'rotate': moveRotate(p); break
      case 'crop': moveCrop(p); break
      case 'text': moveElement(p, 'text'); break
      case 'logo': moveElement(p, 'logo'); break
      case 'pencil': extendStroke(p, false); break
      case 'heal': extendStroke(p, healState.erase); break
      case 'cutout':
        cutoutRef.current = [...cutoutRef.current, p]
        compose()
        break
    }
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  // Rotate by dragging on the canvas: the angle is measured from the image
  // center, so dragging around in a circle spins the image freely.
  const startRotate = (p: { x: number; y: number }) => {
    const startAngle = Math.atan2(p.y - curH / 2, p.x - curW / 2)
    dragRef.current = { mode: 'rotate', startX: p.x, startY: p.y, orig: { x: startAngle, y: rotate.angle, width: 0, height: 0 } }
  }

  const moveRotate = (p: { x: number; y: number }) => {
    const d = dragRef.current!
    const a = Math.atan2(p.y - curH / 2, p.x - curW / 2)
    const delta = ((a - d.orig.x) * 180) / Math.PI
    let angle = (d.orig.y + delta) % 360
    if (angle < 0) angle += 360
    setRotate((s) => ({ ...s, angle: Math.round(angle) }))
  }

  // Crop drag: detect handle, then move/resize.
  const startCrop = (p: { x: number; y: number }) => {
    const r = cropRect
    if (!r) return
    const hit = (14 / overRef.current!.getBoundingClientRect().width) * curW
    const near = (a: number, b: number) => Math.abs(a - b) <= hit
    const atL = near(p.x, r.x), atR = near(p.x, r.x + r.width)
    const atT = near(p.y, r.y), atB = near(p.y, r.y + r.height)
    let mode: string
    if (atL && atT) mode = 'nw'
    else if (atR && atT) mode = 'ne'
    else if (atL && atB) mode = 'sw'
    else if (atR && atB) mode = 'se'
    else if (atL) mode = 'w'
    else if (atR) mode = 'e'
    else if (atT) mode = 'n'
    else if (atB) mode = 's'
    else if (p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height) mode = 'move'
    else return
    dragRef.current = { mode, startX: p.x, startY: p.y, orig: { ...r } }
  }

  const moveCrop = (p: { x: number; y: number }) => {
    const d = dragRef.current
    const r = d!.orig
    const dx = p.x - d!.startX
    const dy = p.y - d!.startY
    const MIN = 24
    let nx = r.x, ny = r.y, nw = r.width, nh = r.height
    switch (d!.mode) {
      case 'move':
        nx = clamp(r.x + dx, 0, curW - r.width)
        ny = clamp(r.y + dy, 0, curH - r.height)
        break
      case 'se': nw = clamp(r.width + dx, MIN, curW - r.x); nh = clamp(r.height + dy, MIN, curH - r.y); break
      case 'sw': nx = clamp(r.x + dx, 0, r.x + r.width - MIN); nw = r.x + r.width - nx; nh = clamp(r.height + dy, MIN, curH - r.y); break
      case 'ne': nh = clamp(r.height + dy, MIN, curH - r.y); nw = clamp(r.width + dx, MIN, curW - r.x); break
      case 'nw': nx = clamp(r.x + dx, 0, r.x + r.width - MIN); nw = r.x + r.width - nx; ny = clamp(r.y + dy, 0, r.y + r.height - MIN); nh = r.y + r.height - ny; break
      case 'n': ny = clamp(r.y + dy, 0, r.y + r.height - MIN); nh = r.y + r.height - ny; break
      case 's': nh = clamp(r.height + dy, MIN, curH - r.y); break
      case 'w': nx = clamp(r.x + dx, 0, r.x + r.width - MIN); nw = r.x + r.width - nx; break
      case 'e': nw = clamp(r.width + dx, MIN, curW - r.x); break
    }
    setCropRect({ x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) })
  }

  // Text / logo: click empty space to place, or drag the box to move.
  const boxFor = (which: 'text' | 'logo') => {
    if (which === 'logo') {
      const lw = curW * logoState.imageScale
      const lh = logoImg ? lw * (logoImg.height / logoImg.width) : lw
      return { x: logoState.x, y: logoState.y, w: lw, h: lh }
    }
    const px = Math.max(10, curW * textState.fontSize)
    const c = document.createElement('canvas')
    const m = c.getContext('2d')!
    m.font = `600 ${px}px ${FONT}`
    const tw = m.measureText(textState.text.trim()).width
    return { x: textState.x, y: textState.y, w: tw, h: px }
  }

  const placeOrGrab = (p: { x: number; y: number }, which: 'text' | 'logo') => {
    const b = boxFor(which)
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      dragRef.current = { mode: 'move', startX: p.x, startY: p.y, orig: { x: b.x, y: b.y, width: 0, height: 0 } }
    } else {
      if (which === 'text') setTextState((s) => ({ ...s, x: p.x, y: p.y, hasPos: true }))
      else setLogoState((s) => ({ ...s, x: p.x, y: p.y, hasPos: true }))
      dragRef.current = { mode: 'move', startX: p.x, startY: p.y, orig: { x: p.x, y: p.y, width: 0, height: 0 } }
    }
  }

  const moveElement = (p: { x: number; y: number }, which: 'text' | 'logo') => {
    const d = dragRef.current!
    const nx = clamp(d.orig.x + (p.x - d.startX), 0, curW)
    const ny = clamp(d.orig.y + (p.y - d.startY), 0, curH)
    if (which === 'text') setTextState((s) => ({ ...s, x: nx, y: ny }))
    else setLogoState((s) => ({ ...s, x: nx, y: ny }))
  }

  // Pencil / heal strokes (refs mutated during drag).
  const beginStroke = (p: { x: number; y: number }, erase: boolean) => {
    const stroke: Stroke = { pts: [p], color: activeTool === 'pencil' ? pencilState.color : '#ff0000', size: activeTool === 'pencil' ? pencilState.size : healState.size, erase }
    if (activeTool === 'pencil') pencilRef.current = [...pencilRef.current, stroke]
    else healRef.current = [...healRef.current, stroke]
    dragRef.current = { mode: 'stroke', startX: p.x, startY: p.y, orig: { x: 0, y: 0, width: 0, height: 0 } }
    compose()
  }

  const extendStroke = (p: { x: number; y: number }, erase: boolean) => {
    const arr = activeTool === 'pencil' ? pencilRef.current : healRef.current
    const last = arr[arr.length - 1]
    if (!last) return
    last.pts = [...last.pts, p]
    last.erase = erase
    compose()
  }

  // Click-to-remove: flood-fill the CURRENT image from the click point and
  // union it into the running removal mask.
  const doRemoveClick = (p: { x: number; y: number }) => {
    if (!curImg) return
    const c = document.createElement('canvas')
    c.width = curW
    c.height = curH
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(curImg, 0, 0)
    const data = ctx.getImageData(0, 0, curW, curH)
    const sel = floodFill(data, Math.round(p.x), Math.round(p.y), removeTol)
    const existing = removeRef.current
    if (!existing) {
      removeRef.current = sel
    } else {
      for (let i = 0; i < sel.length; i++) if (sel[i]) existing[i] = true
    }
    setRemoveClicks((n) => n + 1)
    compose()
  }

  // ── Apply (commit) / Undo / Clear / Download ──
  const clearPaint = () => {
    pencilRef.current = []
    healRef.current = []
    cutoutRef.current = []
    removeRef.current = null
  }

  const apply = async () => {
    if (!activeTool || processing) return
    setProcessing(true)
    try {
      let blob: Blob | null = null
      switch (activeTool) {
        case 'rotate':
          blob = await rotateImage(current, rotate)
          break
        case 'crop':
          if (cropRect) blob = await cropImage(current, cropRect)
          break
        case 'text':
          if (textState.text.trim()) {
            blob = await watermarkImage(current, {
              type: 'text', text: textState.text, color: textState.color,
              fontSize: textState.fontSize, opacity: textState.opacity,
              position: 'top-left', tiled: false, imageUrl: null, imageScale: 0,
              x: textState.x, y: textState.y,
            })
          }
          break
        case 'logo':
          if (logoState.imageUrl && logoImg) {
            blob = await watermarkImage(current, {
              type: 'image', text: '', color: '#ffffff', fontSize: 0.01,
              opacity: logoState.opacity, position: 'top-left', tiled: false,
              imageUrl: logoState.imageUrl, imageScale: logoState.imageScale,
              x: logoState.x, y: logoState.y,
            })
          }
          break
        case 'pencil':
          blob = await compositeStrokes(current, pencilRef.current)
          break
        case 'heal':
          blob = await removeWatermark(current, buildMaskFromStrokes(curW, curH, healRef.current), curW, curH)
          break
        case 'cutout':
          blob = await cutoutRegion(current, cutoutRef.current)
          break
        case 'remove':
          blob = await removeMasked(current, removeRef.current)
          break
        case 'resize':
          blob = await resizeImage(current, { width: Math.round(resizeState.width), height: Math.round(resizeState.height) })
          break
      }
      if (blob) {
        // Truncate the redo branch, append, and cap the stack. Reading
        // history/histIdx straight from this render is safe — apply() runs once
        // per click and React delivers the latest closure.
        const next = [...history.slice(0, histIdx + 1), blob]
        const trimmed = next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
        setHistory(trimmed)
        setHistIdx(trimmed.length - 1)
        clearPaint()
        setApplied(true)
        // Clear the preview immediately instead of waiting for the new image to
        // reload — otherwise the old mask/outline lingers over the fresh result.
        compose()
      }
    } catch (err) {
      console.error(err)
      alert(t.errorProcess)
    } finally {
      setProcessing(false)
    }
  }

  const undo = () => {
    if (histIdx < 0) return
    setHistIdx((i) => i - 1)
    clearPaint()
    dragRef.current = null
    setApplied(false)
    compose()
  }

  const redo = () => {
    if (histIdx >= history.length - 1) return
    setHistIdx((i) => i + 1)
    clearPaint()
    dragRef.current = null
    setApplied(false)
    compose()
  }

  const clearTool = () => {
    clearPaint()
    dragRef.current = null
    setRemoveClicks(0)
    setApplied(false)
    setHoverPt(null)
    compose()
  }

  // Download confirmation dialog → actually save.
  const doDownload = async () => {
    let blob = current
    if (dlFormat !== 'same') {
      const file = new File([current], `out.${getOutputFormat(current)}`, { type: current.type })
      blob = await convertImage(file, dlFormat)
    }
    setDlOpen(false)
    const base = source.file.name.replace(/\.[^.]+$/, '')
    downloadBlob(blob, `${base}-studio`)
  }

  const selectTool = (tool: StudioToolId) => {
    setActiveTool(tool)
    setApplied(false)
    setHoverPt(null)
    if (tool === 'crop' && !cropRect) {
      setCropRect({ x: Math.round(curW * 0.1), y: Math.round(curH * 0.1), width: Math.round(curW * 0.8), height: Math.round(curH * 0.8) })
    }
    if (tool === 'resize') setResizeState({ width: curW, height: curH, lock: true })
    if (tool === 'text' && !textState.hasPos) setTextState((s) => ({ ...s, x: curW * 0.3, y: curH * 0.3 }))
    if (tool === 'logo' && !logoState.hasPos) setLogoState((s) => ({ ...s, x: curW * 0.4, y: curH * 0.4 }))
  }

  const onPickLogo = (file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setLogoImg(img)
      setLogoState((s) => ({ ...s, imageUrl: url, hasPos: true }))
    }
    img.src = url
  }

  // ── Tool rail ──
  const rail = (
    <div className="shrink-0 flex lg:flex-col gap-1.5 lg:gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
      {STUDIO_TOOLS.map((tool) => {
        const active = activeTool === tool.id
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => selectTool(tool.id)}
            title={t[tool.labelKey] as string}
            className={`
              shrink-0 flex items-center lg:flex-col gap-2 lg:gap-1 px-2.5 lg:px-0 lg:w-16 lg:py-2.5
              rounded-[var(--radius-sm)] transition-all
              ${active
                ? 'glass-active text-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
              }
            `}
          >
            <span className="h-5 w-5">{tool.icon}</span>
            <span className="text-[10px] lg:text-[11px] font-medium leading-none">{t[tool.labelKey] as string}</span>
          </button>
        )
      })}
    </div>
  )

  // ── Active tool panel ──
  const panel = () => {
    if (!activeTool) {
      return (
        <p className="text-xs text-[var(--text-dim)] leading-relaxed">
          {lang === 'zh' ? '从左侧选择一个工具，开始编辑这张图片。' : 'Pick a tool on the left to start editing this image.'}
        </p>
      )
    }
    switch (activeTool) {
      case 'rotate':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">{t.studioRotateHint}</p>
            <div className="flex gap-2">
              <ToolButton onClick={() => setRotate((s) => ({ ...s, angle: (s.angle - 90 + 360) % 360 }))}>↺ 90°</ToolButton>
              <ToolButton onClick={() => setRotate((s) => ({ ...s, angle: (s.angle + 90) % 360 }))}>↻ 90°</ToolButton>
            </div>
            <Field label={t.studioAngle}>
              <Slider value={rotate.angle} min={0} max={359} onChange={(v) => setRotate((s) => ({ ...s, angle: v }))} />
              <p className="text-[11px] text-[var(--text-dim)]">{rotate.angle}°</p>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <ToolButton active={rotate.flipX} onClick={() => setRotate((s) => ({ ...s, flipX: !s.flipX }))}>{t.studioFlipH}</ToolButton>
              <ToolButton active={rotate.flipY} onClick={() => setRotate((s) => ({ ...s, flipY: !s.flipY }))}>{t.studioFlipV}</ToolButton>
            </div>
            <ToolButton onClick={() => setRotate({ angle: 0, flipX: false, flipY: false })}>{t.studioReset}</ToolButton>
          </div>
        )
      case 'crop':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">{t.studioCropHint}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="glass rounded-[var(--radius-sm)] px-2.5 py-2 flex items-center justify-between gap-2">
                <span className="text-[var(--text-dim)]">{t.studioWidth}</span>
                <span className="font-mono text-[var(--text-primary)]">{cropRect ? Math.round(cropRect.width) : 0}px</span>
              </div>
              <div className="glass rounded-[var(--radius-sm)] px-2.5 py-2 flex items-center justify-between gap-2">
                <span className="text-[var(--text-dim)]">{t.studioHeight}</span>
                <span className="font-mono text-[var(--text-primary)]">{cropRect ? Math.round(cropRect.height) : 0}px</span>
              </div>
            </div>
          </div>
        )
      case 'text':
        return (
          <div className="space-y-3">
            <Field label={lang === 'zh' ? '文字内容' : 'Text'}>
              <input
                type="text"
                value={textState.text}
                placeholder={t.studioTextPlaceholder}
                onChange={(e) => setTextState((s) => ({ ...s, text: e.target.value }))}
                className="w-full glass rounded-[var(--radius-sm)] px-2.5 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </Field>
            <Field label={t.studioColor}>
              <div className="flex items-center gap-2">
                <input type="color" value={textState.color} onChange={(e) => setTextState((s) => ({ ...s, color: e.target.value }))} className="h-8 w-10 rounded cursor-pointer bg-transparent border border-white/10" />
                <span className="font-mono text-[11px] text-[var(--text-dim)]">{textState.color}</span>
              </div>
            </Field>
            <Field label={t.studioBrushSize}>
              <Slider value={Math.round(textState.fontSize * 100)} min={2} max={15} onChange={(v) => setTextState((s) => ({ ...s, fontSize: v / 100 }))} />
            </Field>
            <Field label={t.studioOpacity}>
              <Slider value={textState.opacity} min={0.05} max={1} step={0.05} onChange={(v) => setTextState((s) => ({ ...s, opacity: v }))} />
            </Field>
            <p className="text-[11px] text-[var(--text-dim)]">{lang === 'zh' ? '点击画布放置文字，拖动可移动位置。' : 'Click the canvas to place text, drag to move it.'}</p>
          </div>
        )
      case 'logo':
        return (
          <div className="space-y-3">
            <Field label={t.studioSelectLogo}>
              <label className="flex items-center gap-2 glass rounded-[var(--radius-sm)] px-2.5 py-2 text-xs text-[var(--accent)] cursor-pointer hover:border-[var(--accent)]/40 transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
                {lang === 'zh' ? '选择 Logo 图片' : 'Choose logo image'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickLogo(f); e.target.value = '' }} />
              </label>
            </Field>
            {logoState.imageUrl && (
              <div className="flex items-center gap-3">
                <img src={logoState.imageUrl} alt="logo" className="h-10 w-10 object-contain checkerboard rounded border border-white/10" />
                <span className="text-[11px] text-[var(--text-dim)]">{t.studioLogoHint}</span>
              </div>
            )}
            <Field label={t.studioBrushSize}>
              <Slider value={Math.round(logoState.imageScale * 100)} min={5} max={60} onChange={(v) => setLogoState((s) => ({ ...s, imageScale: v / 100 }))} />
            </Field>
            <Field label={t.studioOpacity}>
              <Slider value={logoState.opacity} min={0.05} max={1} step={0.05} onChange={(v) => setLogoState((s) => ({ ...s, opacity: v }))} />
            </Field>
            <p className="text-[11px] text-[var(--text-dim)]">{lang === 'zh' ? '点击画布放置图章，拖动可移动位置。' : 'Click the canvas to stamp, drag to move it.'}</p>
          </div>
        )
      case 'pencil':
        return (
          <div className="space-y-3">
            <Field label={t.studioColor}>
              <div className="flex items-center gap-2">
                <input type="color" value={pencilState.color} onChange={(e) => setPencilState((s) => ({ ...s, color: e.target.value }))} className="h-8 w-10 rounded cursor-pointer bg-transparent border border-white/10" />
                <span className="font-mono text-[11px] text-[var(--text-dim)]">{pencilState.color}</span>
              </div>
            </Field>
            <Field label={t.studioBrushSize}>
              <Slider value={pencilState.size} min={2} max={60} onChange={(v) => setPencilState((s) => ({ ...s, size: v }))} />
            </Field>
            <div className="flex gap-2">
              <ToolButton onClick={clearTool}>{t.studioClear}</ToolButton>
            </div>
          </div>
        )
      case 'heal':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">{t.removeWmHint}</p>
            <div className="grid grid-cols-2 gap-2">
              <ToolButton active={!healState.erase} onClick={() => setHealState((s) => ({ ...s, erase: false }))}>{t.removeWmPaint}</ToolButton>
              <ToolButton active={healState.erase} onClick={() => setHealState((s) => ({ ...s, erase: true }))}>{t.studioErase}</ToolButton>
            </div>
            <Field label={t.studioBrushSize}>
              <Slider value={healState.size} min={5} max={120} onChange={(v) => setHealState((s) => ({ ...s, size: v }))} />
            </Field>
            <div className="flex gap-2">
              <ToolButton onClick={clearTool}>{t.studioClear}</ToolButton>
            </div>
          </div>
        )
      case 'cutout':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">{t.studioCutoutHint}</p>
            <div className="flex gap-2">
              <ToolButton onClick={clearTool}>{t.studioClear}</ToolButton>
            </div>
          </div>
        )
      case 'remove':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">{lang === 'zh' ? '点击要去掉的区域（背景），可多次点击。' : 'Click the area to remove (e.g. background). Click again to add more.'}</p>
            <Field label={t.studioTolerance}>
              <Slider value={removeTol} min={1} max={100} onChange={setRemoveTol} />
            </Field>
            {removeClicks > 0 && (
              <div className="flex gap-2">
                <ToolButton onClick={clearTool}>{t.studioClear}</ToolButton>
              </div>
            )}
          </div>
        )
      case 'resize':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label={t.studioWidth}>
                <NumInput value={resizeState.width} onChange={(v) => {
                  setResizeState((s) => {
                    const width = clamp(v, 1, 8192)
                    return { ...s, width, height: s.lock ? Math.max(1, Math.round((width * curH) / curW)) : s.height }
                  })
                }} />
              </Field>
              <Field label={t.studioHeight}>
                <NumInput value={resizeState.height} onChange={(v) => {
                  setResizeState((s) => {
                    const height = clamp(v, 1, 8192)
                    return { ...s, height, width: s.lock ? Math.max(1, Math.round((height * curW) / curH)) : s.width }
                  })
                }} />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setResizeState((s) => ({ ...s, lock: !s.lock }))}
              className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text-primary)]"
            >
              {resizeState.lock ? `🔒 ${t.studioLockRatio}` : `🔓 ${t.studioLockRatio}`}
            </button>
          </div>
        )
    }
  }

  const canApply = () => {
    if (!activeTool) return false
    if (activeTool === 'text') return !!textState.text.trim()
    if (activeTool === 'logo') return !!logoState.imageUrl
    return true
  }

  return (
    // w-full: this container is a flex item of the page column flex. `mx-auto`
    // (auto cross margins) disables flex stretch, so without an explicit width
    // the tool rail's content (9 buttons) blows the layout out past the viewport
    // on mobile. w-full caps it at the viewport; max-w-6xl + mx-auto keep desktop
    // centered at 1152px.
    <div className="mx-auto max-w-6xl w-full min-w-0 px-3 sm:px-6 py-4 sm:py-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] glass text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            <span className="hidden sm:inline">{t.studioUploadNew}</span>
          </button>
          <span className="text-xs text-[var(--text-dim)] truncate font-mono">{source.file.name}</span>
          <span className="text-[11px] text-[var(--text-dim)]/60 shrink-0">{curW} × {curH}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={histIdx < 0}
            title={t.studioUndo}
            className="px-2.5 py-1.5 rounded-[var(--radius-sm)] glass text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all disabled:opacity-35 disabled:cursor-not-allowed shrink-0"
          >
            ↩ {t.studioUndo}
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={histIdx >= history.length - 1}
            title={t.studioRedo}
            className="px-2.5 py-1.5 rounded-[var(--radius-sm)] glass text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all disabled:opacity-35 disabled:cursor-not-allowed shrink-0"
          >
            ↪ {t.studioRedo}
          </button>
          <button
            type="button"
            onClick={() => setDlOpen(true)}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] btn-gradient text-xs font-medium shrink-0"
          >
            {processing ? t.studioDownloading : `↓ ${t.studioDownload}`}
          </button>
        </div>
      </div>

      {/* Workbench */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Tool rail */}
        {rail}

        {/* Canvas — base in-flow, overlay absolute inset-0 (same pattern as
            RemoveWatermarkPanel) so both canvases always align at any scale. */}
        <div className="flex-1 min-w-0 glass rounded-[var(--radius-lg)] p-3 sm:p-4">
          <div className="flex justify-center">
            <div
              className="relative w-fit select-none checkerboard rounded-[var(--radius-md)]"
              style={{ touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => setHoverPt(null)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <canvas
                ref={baseRef}
                className="block max-w-full max-h-[58vh] w-auto h-auto rounded-[var(--radius-md)]"
              />
              <canvas
                ref={overRef}
                className="absolute inset-0 w-full h-full rounded-[var(--radius-md)] pointer-events-none"
                style={{
                  cursor: activeTool && PAINT_CURSOR[activeTool] ? PAINT_CURSOR[activeTool] : 'default',
                  opacity: processing ? 0.6 : 1,
                }}
              />
              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-10 rounded-[var(--radius-md)]">
                  <span className="text-sm text-[var(--text-primary)] animate-pulse">{t.studioDownloading}</span>
                </div>
              )}
              {applied && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 backdrop-blur-md whitespace-nowrap">
                  {t.studioApplied}
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--text-dim)]">{t.studioTagline}</p>
        </div>

        {/* Panel */}
        <div className="shrink-0 w-full lg:w-64 glass rounded-[var(--radius-lg)] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {activeTool ? (t[STUDIO_TOOLS.find((x) => x.id === activeTool)!.labelKey] as string) : (lang === 'zh' ? '工具' : 'Tools')}
            </h3>
            {activeTool && (
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-dim)]/60">{lang === 'zh' ? '步骤' : 'step'}</span>
            )}
          </div>
          {panel()}
          <button
            type="button"
            onClick={apply}
            disabled={!canApply() || processing}
            className="w-full py-2.5 rounded-[var(--radius-md)] btn-gradient text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {processing ? t.studioDownloading : t.studioApply}
          </button>
        </div>
      </div>

      {/* Per-tool tutorial */}
      <StudioTutorial lang={lang} />

      {/* Download confirmation dialog */}
      {dlOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setDlOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl glass border border-white/10 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{t.studioDlTitle}</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass rounded-[var(--radius-sm)] px-3 py-2">
                <p className="text-[10px] text-[var(--text-dim)]">{t.studioDlDims}</p>
                <p className="font-mono text-[var(--text-primary)] mt-0.5">{curW} × {curH}px</p>
              </div>
              <div className="glass rounded-[var(--radius-sm)] px-3 py-2">
                <p className="text-[10px] text-[var(--text-dim)]">{t.studioDlSize}</p>
                <p className="font-mono text-[var(--text-primary)] mt-0.5">{formatSize(current.size)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-dim)] mb-1.5">{t.studioDlFormat}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(['same', 'png', 'jpeg', 'webp'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDlFormat(f)}
                    className={`py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all ${
                      dlFormat === f ? 'glass-active text-[var(--accent)]' : 'glass text-[var(--text-dim)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {f === 'same' ? t.studioFormatSame : f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDlOpen(false)}
                className="flex-1 py-2 rounded-[var(--radius-md)] glass text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)]"
              >
                {t.studioDlCancel}
              </button>
              <button
                type="button"
                onClick={doDownload}
                className="flex-1 py-2 rounded-[var(--radius-md)] btn-gradient text-xs font-semibold"
              >
                {t.studioDlConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PAINT_CURSOR: Partial<Record<StudioToolId, string>> = {
  crop: 'crosshair',
  text: 'text',
  pencil: 'crosshair',
  heal: 'crosshair',
  cutout: 'crosshair',
  remove: 'pointer',
}

function ToolButton({
  children, onClick, active = false,
}: {
  children: React.ReactNode; onClick: () => void; active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-all
        ${active
          ? 'glass-active text-[var(--accent)]'
          : 'glass text-[var(--text-dim)] hover:text-[var(--text-primary)]'
        }
      `}
    >
      {children}
    </button>
  )
}

// ── Studio how-to — step-by-step per tool, shown at the bottom of the page ──
const TUTORIALS: { id: StudioToolId; labelEn: string; labelZh: string; stepsEn: string[]; stepsZh: string[] }[] = [
  {
    id: 'rotate',
    labelEn: 'Rotate & flip',
    labelZh: '旋转与翻转',
    stepsEn: [
      'Click the 90° buttons for quick turns, or drag anywhere on the canvas to rotate freely.',
      'Use the angle slider for fine adjustments — the preview updates live.',
      'Flip horizontally or vertically with the two flip buttons.',
      'Tap Apply to commit; Undo/Redo can step back and forth.',
    ],
    stepsZh: [
      '点 90° 按钮快速转向，或直接在画布上按住拖动，自由旋转到任意角度。',
      '用角度滑块微调，预览会实时更新。',
      '点「水平翻转」「垂直翻转」镜像图片。',
      '满意后点「应用」；随时可用「撤销 / 重做」来回调整。',
    ],
  },
  {
    id: 'crop',
    labelEn: 'Crop',
    labelZh: '裁剪',
    stepsEn: [
      'The crop box appears automatically. Drag inside the box to move it.',
      'Drag a corner handle to resize; the crosshair follows your pointer so you can aim precisely.',
      'Use the rule-of-thirds grid to frame your shot.',
      'Tap Apply to keep only the area inside the box.',
    ],
    stepsZh: [
      '进入后会自动出现裁剪框，在框内拖动可移动位置。',
      '拖动四角手柄缩放；十字准线会跟随鼠标，方便精确对准。',
      '框内显示三分构图线，辅助取景。',
      '点「应用」只保留框内区域。',
    ],
  },
  {
    id: 'text',
    labelEn: 'Add text',
    labelZh: '添加文字',
    stepsEn: [
      'Type your text in the panel, then click the canvas to place it.',
      'Drag the text box to move it anywhere on the image.',
      'Adjust color, size and opacity in the panel.',
      'Tap Apply to bake the text into the image.',
    ],
    stepsZh: [
      '在面板输入文字内容，然后点击画布放置文字。',
      '拖动文字框可移动位置。',
      '可在面板调整颜色、大小、透明度。',
      '点「应用」把文字合成进图片。',
    ],
  },
  {
    id: 'logo',
    labelEn: 'Add a logo',
    labelZh: '添加 Logo 印章',
    stepsEn: [
      'Upload your logo (a transparent PNG works best).',
      'Click the canvas to place it, then drag to move it.',
      'Adjust size and opacity in the panel.',
      'Tap Apply to burn the logo into the image.',
    ],
    stepsZh: [
      '上传你的 Logo（透明 PNG 效果最佳）。',
      '点击画布放置印章，拖动可移动。',
      '在面板调整大小和透明度。',
      '点「应用」把印章合成进图片。',
    ],
  },
  {
    id: 'pencil',
    labelEn: 'Freehand drawing',
    labelZh: '画笔涂鸦',
    stepsEn: [
      'Pick a color and brush size, then draw directly on the canvas.',
      'Clear removes every stroke you have not applied yet.',
      'Tap Apply to merge the drawing into the image.',
    ],
    stepsZh: [
      '选择颜色和笔刷大小，直接在画布上绘制。',
      '「清空」会移除所有尚未应用的笔迹。',
      '点「应用」把涂鸦合成进图片。',
    ],
  },
  {
    id: 'heal',
    labelEn: 'Remove watermark / spot',
    labelZh: '去水印 / 去污点',
    stepsEn: [
      'Paint over the watermark — make sure the brush covers the whole area you want gone.',
      'Use Erase to undo part of the mask if you over-painted.',
      'Tap Apply: the covered area is filled in from its surroundings.',
      'Keep painting + applying until it is clean, then download.',
    ],
    stepsZh: [
      '用笔刷涂抹水印，记得要完全覆盖要清除的区域。',
      '涂多了可用「擦除」去掉多余的遮罩。',
      '点「应用」：涂抹区域会用周围颜色自动填充。',
      '可反复涂抹、反复应用，直到干净再下载。',
    ],
  },
  {
    id: 'cutout',
    labelEn: 'Cut out (manual)',
    labelZh: '手动抠图',
    stepsEn: [
      'Trace a closed loop around the subject — everything inside is kept.',
      'Tap Apply to remove the background outside the loop (PNG with transparency).',
      'Use Clear to start over before applying.',
    ],
    stepsZh: [
      '沿主体边缘画一圈闭合的线，圈内内容会被保留。',
      '点「应用」删除圈外背景（输出透明 PNG）。',
      '应用前可用「清空」重新开始。',
    ],
  },
  {
    id: 'remove',
    labelEn: 'Magic wand remove',
    labelZh: '魔术棒去除',
    stepsEn: [
      'Click the area you want to remove (e.g. the background) — similar colors are selected.',
      'Adjust Tolerance to select more or fewer similar pixels.',
      'Click several times to add more regions, then Apply to make them transparent.',
    ],
    stepsZh: [
      '点击要去掉的区域（比如背景），相似颜色会被选中。',
      '调整「容差」控制选中范围的大小。',
      '可多次点击累加选区，点「应用」把这些区域变为透明。',
    ],
  },
  {
    id: 'resize',
    labelEn: 'Resize',
    labelZh: '调整尺寸',
    stepsEn: [
      'Enter the new width or height — the other side scales automatically while the ratio is locked.',
      'Unlock the ratio (🔓) to set both freely.',
      'Tap Apply to resize the image.',
    ],
    stepsZh: [
      '输入新的宽或高，锁定比例时另一边会自动等比缩放。',
      '点「解锁比例」可分别设置宽高。',
      '点「应用」调整图片尺寸。',
    ],
  },
]

function StudioTutorial({ lang }: { lang: 'en' | 'zh' }) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          {lang === 'zh' ? '📖 每个工具怎么用' : '📖 How to use each tool'}
        </h3>
        <p className="text-xs text-[var(--text-dim)] mt-1">
          {lang === 'zh'
            ? '点击任意工具展开分步教程。所有操作都在浏览器内完成，图片不会上传。'
            : 'Expand any tool for a step-by-step guide. Everything runs in your browser — images are never uploaded.'}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TUTORIALS.map((tut) => (
          <details
            key={tut.id}
            className="group glass rounded-xl border border-white/[0.06] overflow-hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] list-none [&::-webkit-details-marker]:hidden">
              <span>{lang === 'zh' ? tut.labelZh : tut.labelEn}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[var(--text-dim)] transition-transform duration-200 group-open:rotate-180">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <ol className="border-t border-white/[0.06] px-4 py-3 space-y-2">
              {(lang === 'zh' ? tut.stepsZh : tut.stepsEn).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-dim)]">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/12 text-[10px] text-[var(--accent)]">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </section>
  )
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      max={8192}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full glass rounded-[var(--radius-sm)] px-2.5 py-2 text-sm outline-none focus:border-[var(--accent)]"
    />
  )
}
