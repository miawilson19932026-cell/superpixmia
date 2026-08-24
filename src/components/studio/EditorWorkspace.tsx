// Studio — the combined single-image editor workbench.
// One image, many tools. Every tool is applied against the LATEST committed
// blob (not the original), so operations accumulate like a lightweight PS.
// Layout: tool rail | canvas workbench | per-tool panel (+ Apply / Undo / Download).
import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react'
import { useTranslation } from '../../i18n'
import type { CropRect } from '../../utils/crop'
import { cropImage, rotateImage, resizeImage, watermarkImage, removeWatermark, convertImage, formatSize, getOutputFormat } from '../../utils'
import { downloadBlob } from '../../utils/download'
import { useAuth, tryConsumeFreeDownload } from '../../lib/auth'
import { useBackdropDismiss } from '../../lib/useBackdropDismiss'
import type { OutputFormat } from '../../types'
import { STUDIO_TOOLS, type StudioToolId } from './tools'
import {
  compositeStrokes,
  buildMaskFromStrokes,
  removeMasked,
  cloneStamp,
  floodFill,
  dilateMask,
  maskOutlinePath,
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

// Turn a closed path of points into a W×H boolean mask (true = inside). Strokes
// the loop too (2px, round joins) so even a degenerate sliver selects something
// instead of nothing.
function pathToMask(W: number, H: number, pts: StrokePt[]): boolean[] {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  ctx.fill()
  ctx.stroke()
  const d = ctx.getImageData(0, 0, W, H).data
  const m = new Array<boolean>(W * H).fill(false)
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] > 0
  return m
}

const FONT = `system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`

// First-visit teaching bubble: one short "how to use" line per tool, shown the
// first time the tool is picked, pointing at the Apply button. Persisted per
// browser session (sessionStorage) so re-uploading an image doesn't re-teach.
const TIP_SEEN_KEY = 'spm-studio-tip-seen'
// One-time crop tutorial (localStorage — unlike the per-session tool tips, this
// is remembered across visits: each customer is shown it at most once).
const CROP_TIP_KEY = 'spm-crop-tip-seen'
const TOOL_TIPS: Record<StudioToolId, { en: string; zh: string }> = {
  select: { en: 'Drag to pan, scroll to zoom — just inspecting the result.', zh: '拖动平移，滚轮缩放——此处只查看效果。' },
  rotate: { en: 'Drag on the canvas, or use the buttons / slider to rotate.', zh: '在画布上拖动，或用按钮 / 滑块旋转。' },
  crop: { en: 'Drag inside the box to move it, drag corners to resize.', zh: '拖动选框移动，拖四角可缩放。' },
  text: { en: 'Type your text, then click the canvas to place it.', zh: '输入文字，然后点击画布放置。' },
  logo: { en: 'Upload a logo, then click the canvas to place it.', zh: '上传图章，然后点击画布放置。' },
  pencil: { en: 'Pick a color and draw directly on the canvas.', zh: '选好颜色，直接在画布上绘制。' },
  heal: { en: 'Paint over the watermark you want to remove.', zh: '涂抹要清除的水印区域。' },
  cutout: { en: 'Trace a loop over the area, then pick Keep or Remove.', zh: '沿区域画一圈，选「保留」或「去除」。' },
  remove: { en: 'Click similar areas (like the background) to select them.', zh: '点击相似区域（如背景）选中它们。' },
  stamp: { en: 'Click to set a source point, then paint to copy it (Alt+click re-picks).', zh: '先点击设置源点，再涂抹复制该处内容（Alt+点击可重新取源）。' },
  resize: { en: 'Enter a new width or height.', zh: '输入新的宽或高。' },
}

// Font choices for the text tool — rendered via canvas, so they're system fonts
// (fall back gracefully if a device doesn't have a given family installed).
const TEXT_FONTS: { label: string; stack: string }[] = [
  { label: '黑体', stack: '"Microsoft YaHei", "PingFang SC", "Heiti SC", sans-serif' },
  { label: '宋体', stack: '"SimSun", "Songti SC", "Noto Serif CJK SC", serif' },
  { label: '楷体', stack: '"KaiTi", "Kaiti SC", "STKaiti", serif' },
  { label: '仿宋', stack: '"FangSong", "FangSong SC", "STFangsong", serif' },
  { label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { label: 'Courier', stack: '"Courier New", Courier, monospace' },
  { label: 'Comic Sans', stack: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Impact', stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
]

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
  source, onReset, onReplace,
}: {
  source: SourceImage
  onReset: () => void
  onReplace: () => void
}) {
  const { t, lang } = useTranslation()
  const { user, openLogin } = useAuth()

  // ── Committed result stack (undo/redo). histIdx points into history;
  //     -1 means "no edits yet" → current falls back to the source file. ──
  const [history, setHistory] = useState<Blob[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const current: Blob = histIdx >= 0 && history[histIdx] ? history[histIdx] : source.file

  // Select is the resting tool — the studio opens on it, and applying any edit
  // returns to it so the result is seen clean (no lingering crop box / overlay).
  const [activeTool, setActiveTool] = useState<StudioToolId | null>('select')
  const [processing, setProcessing] = useState(false)
  const [applied, setApplied] = useState(false)

  // Loaded current image + its dims (canvas pixel space = image pixels).
  const [curImg, setCurImg] = useState<HTMLImageElement | null>(null)
  const [curW, setCurW] = useState(source.width)
  const [curH, setCurH] = useState(source.height)

  const baseRef = useRef<HTMLCanvasElement>(null)
  const overRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ mode: string; startX: number; startY: number; orig: CropRect } | null>(null)
  // Set by undo/redo/clear while a tool stays active: after the committed image
  // reloads, re-run initToolDefaults so the selected tool (crop box, resize dims…)
  // comes back immediately without re-clicking it.
  const pendingReinitRef = useRef<StudioToolId | null>(null)
  // Canvas box is sized to EXACTLY fit the image (no letterbox), so the fixed
  // h-[45vh] box never leaves empty bands around small/portrait images.
  const canvasCardRef = useRef<HTMLDivElement>(null)
  const [disp, setDisp] = useState({ w: 0, h: 0 })
  // View-only zoom/pan — a CSS transform on the image box. Image dimensions are
  // NEVER touched; dispGeom()/toImg() already read getBoundingClientRect() which
  // includes the transform, so tool coordinates stay accurate while zoomed.
  const [viewZoom, setViewZoom] = useState(1)
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const imageBoxRef = useRef<HTMLDivElement>(null)
  // Hold Space (outside inputs) to drag-pan over any tool.
  const spaceDownRef = useRef(false)

  // ── Per-tool state ──
  const [rotate, setRotate] = useState({ angle: 0, flipX: false, flipY: false })
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  // Aspect-ratio lock for crop (null = free drag). Kept in a ref too so the
  // async crop-box re-seed after undo/redo can respect the chosen ratio.
  const [cropRatio, setCropRatio] = useState<{ w: number; h: number } | null>(null)
  const cropRatioRef = useRef<{ w: number; h: number } | null>(null)
  useEffect(() => { cropRatioRef.current = cropRatio }, [cropRatio])
  // Draft W:H values for the custom-ratio inputs (applied on "确认").
  const [cropCustom, setCropCustom] = useState({ w: 4, h: 3 })
  const [textState, setTextState] = useState({
    text: '', color: '#ffffff', fontSize: 0.06, opacity: 1, x: 0, y: 0, hasPos: false, font: FONT,
  })
  const [logoState, setLogoState] = useState({
    imageUrl: null as string | null, imageScale: 0.2, opacity: 1, x: 0, y: 0, hasPos: false,
  })
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)
  const [pencilState, setPencilState] = useState({ color: '#ffffff', size: 10 })
  const [healState, setHealState] = useState({ size: 30, erase: false })
  // Clone stamp (临摹): Alt+click sets a source point, then painting copies the
  // pixels around the source to the brush. Each stroke locks the source point and
  // keeps a fixed offset from the brush (PS-style aligned clone).
  const [stampState, setStampState] = useState({ size: 30, src: null as { x: number; y: number } | null })
  const [removeTol, setRemoveTol] = useState(32)
  const [removeClicks, setRemoveClicks] = useState(0)
  const [removeMode, setRemoveMode] = useState<'add' | 'erase'>('add')
  const [cutoutMode, setCutoutMode] = useState<'keep' | 'remove'>('keep')
  const [cutoutClicks, setCutoutClicks] = useState(0)
  const [resizeState, setResizeState] = useState({ width: source.width, height: source.height, lock: true })
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null)
  const [dlOpen, setDlOpen] = useState(false)
  const [dlFormat, setDlFormat] = useState<'same' | OutputFormat>('same')
  const { onBackdropPointerDown, onBackdropClick } = useBackdropDismiss()

  // First-visit teaching bubble — shown once per tool per browser session,
  // pointing at the Apply button so users learn every change needs Apply.
  const applyBtnRef = useRef<HTMLButtonElement>(null)
  const seenRef = useRef<Set<StudioToolId>>(new Set())
  const [tipTool, setTipTool] = useState<StudioToolId | null>(null)
  const [tipPos, setTipPos] = useState<{ x: number; y: number; place: 'left' | 'bottom' } | null>(null)
  // One-time crop how-to banner (once per customer, persisted in localStorage).
  const [cropTip, setCropTip] = useState(false)

  // Auto-dismiss the crop banner after a few seconds (manual close also works).
  useEffect(() => {
    if (!cropTip) return
    const t = setTimeout(() => setCropTip(false), 8000)
    return () => clearTimeout(t)
  }, [cropTip])

  // Paint-state lives in refs (mutable during drag); compose() is called by
  // the pointer handlers directly.
  const pencilRef = useRef<Stroke[]>([])
  const healRef = useRef<Stroke[]>([])
  const cutoutRef = useRef<StrokePt[]>([])
  const cutoutMaskRef = useRef<boolean[] | null>(null) // true = keep the pixel
  const removeRef = useRef<Uint8Array | null>(null)
  const stampStrokesRef = useRef<{ src: { x: number; y: number }; pts: StrokePt[] }[]>([])
  // Rapid-wand-click handling: the flood-fill runs off the pointer handler (so
  // the click never freezes the cursor) and a click arriving while one is still
  // computing is QUEUED (latest wins) and replayed right after — never silently
  // dropped, which used to read as "点多了没反应".
  const removeBusyRef = useRef(false)
  const pendingRemoveRef = useRef<{ x: number; y: number } | null>(null)
  // Bumped after every mask change; keys the cached tint+outline overlay layer.
  const removeVersionRef = useRef(0)
  // Offscreen layer with the current remove tint + contour baked in, so the
  // overlay can redraw on hover (wand follow) without rebuilding 6M pixels.
  const removeLayerRef = useRef<{ canvas: HTMLCanvasElement; key: number; W: number; H: number } | null>(null)
  // Cached RGBA of the CURRENT base image — the wand only reads pixels, so we
  // skip getImageData (24MB copy on a 3000px photo) on every click. Invalidated
  // when the base image object changes (apply/undo/redo swap in a new Image).
  const pxDataRef = useRef<{ img: HTMLImageElement; data: ImageData } | null>(null)
  const [removeProcessing, setRemoveProcessing] = useState(false)

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
      // Undo/redo/clear left the tool active → re-init its defaults with the
      // freshly reloaded image dims so it works immediately (crop box, resize…).
      const reinit = pendingReinitRef.current
      if (reinit) {
        pendingReinitRef.current = null
        initToolDefaults(reinit, img.width, img.height)
      }
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

  // Fit the canvas box to the image (object-contain vs the available area) so
  // there is ZERO dead space: small images upscale to fill one axis, tall/wide
  // images fill that axis exactly. Box aspect always equals image aspect.
  useEffect(() => {
    const card = canvasCardRef.current
    if (!card || !curImg) return
    const fit = () => {
      // p-3 = 24px, sm:p-4 = 32px of horizontal padding inside the card.
      const pad = window.innerWidth < 640 ? 24 : 32
      const availW = card.clientWidth - pad
      const availH = (window.innerWidth < 640 ? 0.45 : 0.58) * window.innerHeight
      const s = Math.min(availW / curW, availH / curH)
      setDisp({ w: Math.max(1, Math.round(curW * s)), h: Math.max(1, Math.round(curH * s)) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(card)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [curImg, curW, curH])

  // Mouse-wheel view zoom (any tool, view-only). React's onWheel is passive, so
  // a native non-passive listener is needed to preventDefault (stop page scroll).
  // The box's getBoundingClientRect() already includes the CSS transform, so the
  // cursor-relative pan math keeps the image point under the cursor stationary.
  useEffect(() => {
    const card = canvasCardRef.current
    if (!card) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = imageBoxRef.current
      if (!box) return
      const rect = box.getBoundingClientRect()
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top - rect.height / 2
      setViewZoom((prev) => {
        const factor = e.deltaY < 0 ? 1.12 : 0.88
        const next = Math.max(1, Math.min(5, prev * factor))
        const scale = next / prev
        setViewPan((p) => (next <= 1 ? { x: 0, y: 0 } : { x: cx - scale * (cx - p.x), y: cy - scale * (cy - p.y) }))
        return next
      })
    }
    card.addEventListener('wheel', onWheel, { passive: false })
    return () => card.removeEventListener('wheel', onWheel)
  }, [])

  // Space = pan modifier (except while typing in a panel input).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (e.code === 'Space' && !typing) spaceDownRef.current = true
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDownRef.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // Load the "seen" set once (sessionStorage — read in an effect so the SSR
  // prerender pass never touches window.sessionStorage).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TIP_SEEN_KEY)
      if (raw) seenRef.current = new Set<StudioToolId>(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // Position the teaching bubble next to the Apply button and auto-dismiss it.
  // Desktop: bubble to the LEFT of the button with the arrow pointing right at
  // it; mobile: bubble BELOW the button with the arrow pointing up.
  useEffect(() => {
    if (!tipTool) { setTipPos(null); return }
    const btn = applyBtnRef.current
    if (!btn) return
    const bw = 280
    const measure = () => {
      const r = btn.getBoundingClientRect()
      const vw = window.innerWidth
      if (vw >= 1024) {
        const x = Math.max(12, Math.min(r.left - bw - 14, vw - bw - 12))
        setTipPos({ x, y: r.top + r.height / 2, place: 'left' })
      } else {
        const x = Math.max(12, Math.min(r.left + r.width / 2 - bw / 2, vw - bw - 12))
        setTipPos({ x, y: r.bottom + 12, place: 'bottom' })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    const timer = setTimeout(() => setTipTool(null), 12000)
    return () => { window.removeEventListener('resize', measure); clearTimeout(timer) }
  }, [tipTool])

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
      case 'stamp': drawStamp(ctx); break
      case 'resize': drawResize(ctx, curImg); break
    }
  }

  // Re-compose on any preview-affecting state change.
  useEffect(() => {
    compose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, curImg, curW, curH, rotate, cropRect, textState, logoState, logoImg, stampState, resizeState, hoverPt])

  // ── Preview drawers ──
  const drawRotate = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    // No-op preview: nothing to show until the user actually rotates/flips.
    if (!rotate.angle && !rotate.flipX && !rotate.flipY) return
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
    // Carve the fitted box back out so a rotated transparent PNG shows the
    // checkerboard through its transparent pixels instead of a white box (the
    // "有背景" the user saw).
    ctx.clearRect(ox, oy, dw, dh)
    // The rotated image keeps the SOURCE aspect ratio. Draw it at curW·s ×
    // curH·s so that after rotation it exactly fills the fitted box — stretching
    // it into dw×dh instead squashed non-square photos (the "变形" bug).
    const sw = curW * s, sh = curH * s
    ctx.save()
    ctx.translate(ox + dw / 2, oy + dh / 2)
    ctx.rotate(rad)
    ctx.scale(rotate.flipX ? -1 : 1, rotate.flipY ? -1 : 1)
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh)
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
    // Only render once placed on the canvas — never linger over a committed base.
    if (!textState.hasPos || !textState.text.trim()) return
    const px = Math.max(10, curW * textState.fontSize)
    const text = textState.text.trim()
    ctx.save()
    ctx.font = `600 ${px}px ${textState.font}`
    ctx.fillStyle = textState.color
    ctx.globalAlpha = textState.opacity
    ctx.textBaseline = 'middle'
    // Same shadow as watermark.ts so the preview matches the committed result.
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = px * 0.15
    ctx.shadowOffsetY = px * 0.06
    ctx.fillText(text, textState.x, textState.y + px / 2)
    ctx.restore()
    // Dashed bounding box (drag handle hint) — restore re-set the font, so
    // measure with the same font family for a box that hugs the text.
    ctx.font = `600 ${px}px ${textState.font}`
    const tw = ctx.measureText(text).width
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.strokeRect(textState.x - 2, textState.y - 2, tw + 4, px + 4)
  }

  const drawLogo = (ctx: CanvasRenderingContext2D) => {
    // Only render once placed on the canvas — never linger over a committed base.
    if (!logoState.hasPos || !logoState.imageUrl || !logoImg) return
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
    const W = curW, H = curH
    const m = cutoutMaskRef.current
    if (m) {
      // Kept pixels stay visible; removed pixels get a dark tint. Green dashed
      // outline marks the keep region, cyan the remove region — PS-style.
      const id = ctx.createImageData(W, H)
      const data = id.data
      for (let i = 0; i < W * H; i++) if (!m[i]) data[i * 4 + 3] = 92
      ctx.putImageData(id, 0, 0)

      // Marching-squares contours (keep + inverted → remove) — compact paths,
      // fast even on huge photos, unlike the old per-edge-pixel rect build.
      const keepPath = maskOutlinePath(m, W, H)
      const remPath = maskOutlinePath(m, W, H, true)
      ctx.strokeStyle = 'rgba(16,185,129,0.95)'
      ctx.lineWidth = 1.2
      ctx.stroke(keepPath)
      ctx.strokeStyle = 'rgba(56,189,248,0.95)'
      ctx.stroke(remPath)
    }
    // In-progress loop: just the dashed line while drawing — the region only
    // closes (and shows its fill) after the pointer is released.
    const pts = cutoutRef.current
    if (pts.length >= 2) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
    }
  }

  const drawRemove = (ctx: CanvasRenderingContext2D) => {
    const m = removeRef.current
    const W = curW, H = curH
    // The tint + outline only change when the mask changes (a click). The
    // overlay is re-composed on EVERY pointer move (the wand follows the mouse),
    // so rendering the tint to a cached offscreen layer turns a 6M-pixel
    // createImageData+loop+putImageData per mousemove into one cheap drawImage.
    // Keyed by mask version + dimensions; -1 = no mask (empty layer).
    const key = m ? removeVersionRef.current : -1
    const cached = removeLayerRef.current
    if (!cached || cached.key !== key || cached.W !== W || cached.H !== H) {
      const cv = document.createElement('canvas')
      cv.width = W
      cv.height = H
      const cctx = cv.getContext('2d')!
      if (m) {
        // Translucent tint over the selected area, plus a marching-ants boundary
        // so the user always sees exactly what's selected.
        const id = cctx.createImageData(W, H)
        const data = id.data
        for (let i = 0; i < m.length && i < W * H; i++) if (m[i]) data[i * 4 + 3] = 92
        cctx.putImageData(id, 0, 0)
        const path = maskOutlinePath(m, W, H)
        cctx.strokeStyle = 'rgba(56,189,248,0.95)'
        cctx.lineWidth = 1.2
        cctx.stroke(path)
      }
      removeLayerRef.current = { canvas: cv, key, W, H }
      ctx.drawImage(cv, 0, 0)
    } else {
      ctx.drawImage(cached.canvas, 0, 0)
    }
    // Magic wand cursor follows the pointer (the real cursor is hidden).
    if (hoverPt) {
      // The overlay canvas is CSS-scaled from image pixels down to its on-screen
      // size, so a wand drawn at fixed image-pixel size shrinks along with big
      // phone photos — on a 3000px photo it becomes a ~6px dot and the user
      // "can't find the mouse". Scale the glyph by 1/scale so it always renders
      // at a constant, human-sized size on screen (~24px).
      const scale = overRef.current ? dispGeom().scale : 1
      drawWand(ctx, hoverPt.x, hoverPt.y, 1 / scale)
    }
  }

  // Small magic wand glyph drawn at the pointer for the one-click cutout tool.
  // k = on-screen size compensation (1/displayScale); k=1 when the image is
  // displayed at its natural resolution.
  const drawWand = (ctx: CanvasRenderingContext2D, x: number, y: number, k = 1) => {
    ctx.save()
    ctx.lineCap = 'round'
    // handle
    ctx.strokeStyle = 'rgba(226,232,240,0.95)'
    ctx.lineWidth = 3 * k
    ctx.beginPath()
    ctx.moveTo(x - 8 * k, y + 8 * k)
    ctx.lineTo(x + 3 * k, y - 3 * k)
    ctx.stroke()
    // grip
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3 * k
    ctx.beginPath()
    ctx.moveTo(x - 8 * k, y + 8 * k)
    ctx.lineTo(x - 11 * k, y + 11 * k)
    ctx.stroke()
    // sparkles near the tip
    ctx.fillStyle = '#fde047'
    for (const [dx, dy, r] of [[4, -7, 2.2], [8, -3, 1.5], [1, -11, 1.3], [9, -8, 1.1]]) {
      ctx.beginPath()
      ctx.arc(x + dx * k, y + dy * k, r * k, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // Clone stamp preview: the strokes already painted (sampled from the ORIGINAL
  // base image, never the painted result — so overlapping strokes copy fresh
  // pixels, exactly like PS), plus the source marker and a dashed brush cursor.
  const drawStamp = (ctx: CanvasRenderingContext2D) => {
    if (!curImg) return
    const r = Math.max(1, stampState.size / 2)
    for (const s of stampStrokesRef.current) {
      if (!s.pts.length) continue
      const dx0 = s.pts[0].x - s.src.x
      const dy0 = s.pts[0].y - s.src.y
      for (const p of s.pts) {
        const sx = p.x - dx0
        const sy = p.y - dy0
        ctx.save()
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(curImg, sx - r, sy - r, r * 2, r * 2, p.x - r, p.y - r, r * 2, r * 2)
        ctx.restore()
      }
    }
    // Source point marker — an emerald ring + crosshair so the user sees where
    // the clone is being sampled from.
    if (stampState.src) {
      const { x, y } = stampState.src
      ctx.save()
      ctx.strokeStyle = 'rgba(16,185,129,0.95)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x - 14, y); ctx.lineTo(x - 6, y)
      ctx.moveTo(x + 6, y); ctx.lineTo(x + 14, y)
      ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 6)
      ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 14)
      ctx.stroke()
      ctx.fillStyle = 'rgba(16,185,129,0.9)'
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    // Brush cursor on hover / drag.
    if (hoverPt) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.arc(hoverPt.x, hoverPt.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  const drawResize = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    // No-op preview: target size already equals the current image.
    if (resizeState.width === curW && resizeState.height === curH) return
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
  // The canvas is CSS-stretched with object-contain, so the image may be
  // letterboxed inside its box. Map screen→image using the fitted content
  // geometry (offset + scale) so tool coordinates stay accurate.
  const dispGeom = () => {
    const ov = overRef.current!
    const r = ov.getBoundingClientRect()
    const scale = Math.min(r.width / curW, r.height / curH)
    return {
      scale,
      offX: (r.width - curW * scale) / 2,
      offY: (r.height - curH * scale) / 2,
    }
  }
  const toImg = (e: React.PointerEvent) => {
    const ov = overRef.current!
    const r = ov.getBoundingClientRect()
    const g = dispGeom()
    return {
      x: Math.min(curW, Math.max(0, (e.clientX - r.left - g.offX) / g.scale)),
      y: Math.min(curH, Math.max(0, (e.clientY - r.top - g.offY) / g.scale)),
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!overRef.current) return
    // Drag to pan the view: the Select tool (zoomed in), or Space held over any
    // tool. Never a tool operation — pan bypasses the tool switch below.
    if ((activeTool === 'select' && viewZoom > 1) || spaceDownRef.current) {
      if (e.button !== 0) return
      e.preventDefault()
      overRef.current.setPointerCapture(e.pointerId)
      dragRef.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, orig: { x: viewPan.x, y: viewPan.y, width: 0, height: 0 } }
      setPanning(true)
      return
    }
    if (!activeTool) return
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
      case 'stamp':
        // Alt+click re-picks the source; with no source yet, the FIRST click sets
        // it (so touch users never need Alt). Either way no painting happens.
        if (e.altKey || !stampState.src) { setStampState((s) => ({ ...s, src: p })); setHoverPt(p); return }
        beginStamp(p)
        break
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (d?.mode === 'pan') {
      setViewPan({ x: d.orig.x + (e.clientX - d.startX), y: d.orig.y + (e.clientY - d.startY) })
      return
    }
    if (!activeTool) return
    const p = toImg(e)
    // The crop crosshair and the remove tool's wand follow the pointer on BOTH
    // hover and drag — while dragging out a crop box the dot+line crosshair
    // stays glued to the cursor instead of freezing at the press point.
    if (activeTool === 'crop' || activeTool === 'remove' || activeTool === 'stamp') setHoverPt(p)
    if (!dragRef.current) return
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
      case 'stamp': extendStamp(p); break
    }
  }

  const onPointerUp = () => {
    const d = dragRef.current
    dragRef.current = null
    setPanning(false)
    // Release = close the loop → the traced region becomes a selection.
    if (d?.mode === 'path') commitCutout()
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

  // Refit a crop box to a target aspect ratio, centered on the old box and
  // clamped inside the image bounds (with a 24px floor). Used when a ratio
  // preset is chosen or the crop box is re-seeded while a ratio is locked.
  const MIN_RECT = 24
  const fitToRatio = (r: CropRect, ratio: { w: number; h: number }, W: number, H: number): CropRect => {
    const ar = ratio.w / ratio.h
    const cx = clamp(r.x + r.width / 2, 0, W)
    const cy = clamp(r.y + r.height / 2, 0, H)
    const maxW = Math.max(MIN_RECT, Math.min(W, 2 * cx, 2 * (W - cx)))
    const maxH = Math.max(MIN_RECT, Math.min(H, 2 * cy, 2 * (H - cy)))
    let w = r.width
    let h = w / ar
    if (w > maxW) { w = maxW; h = w / ar }
    if (h > maxH) { h = maxH; w = h * ar }
    if (w > maxW) { w = maxW; h = w / ar }
    if (w < MIN_RECT) w = MIN_RECT
    if (h < MIN_RECT) h = MIN_RECT
    if (w > maxW) w = maxW
    if (h > maxH) h = maxH
    if (w / h > ar) w = h * ar; else h = w / ar
    const x = clamp(cx - w / 2, 0, Math.max(0, W - w))
    const y = clamp(cy - h / 2, 0, Math.max(0, H - h))
    return { x: Math.round(x), y: Math.round(y), width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }
  }

  // Aspect-locked corner/edge drag: keep the opposite corner/edge as anchor,
  // drive the dominant axis from the pointer, derive the other axis from the
  // ratio, then clamp to bounds + MIN. 'move' passes through untouched.
  const aspectResize = (orig: CropRect, dx: number, dy: number, mode: string, ar: number, W: number, H: number): CropRect => {
    const r = orig
    let w = r.width, h = r.height, x = r.x, y = r.y
    const domX = Math.abs(dx) >= Math.abs(dy)
    const arW = (ah: number) => ah * ar
    const arH = (aw: number) => aw / ar
    switch (mode) {
      case 'se': {
        const aw = W - r.x, ah = H - r.y
        if (domX) { w = clamp(r.width + dx, MIN_RECT, aw); h = arH(w); if (h > ah) { h = ah; w = arW(h) } }
        else { h = clamp(r.height + dy, MIN_RECT, ah); w = arW(h); if (w > aw) { w = aw; h = arH(w) } }
        break
      }
      case 'nw': {
        const aw = r.x + r.width, ah = r.y + r.height
        if (domX) { w = clamp(r.width - dx, MIN_RECT, aw); h = arH(w); if (h > ah) { h = ah; w = arW(h) } }
        else { h = clamp(r.height - dy, MIN_RECT, ah); w = arW(h); if (w > aw) { w = aw; h = arH(w) } }
        x = r.x + r.width - w; y = r.y + r.height - h
        break
      }
      case 'ne': {
        const aw = W - r.x, ah = r.y + r.height
        if (domX) { w = clamp(r.width + dx, MIN_RECT, aw); h = arH(w); if (h > ah) { h = ah; w = arW(h) } }
        else { h = clamp(r.height - dy, MIN_RECT, ah); w = arW(h); if (w > aw) { w = aw; h = arH(w) } }
        y = r.y + r.height - h
        break
      }
      case 'sw': {
        const aw = r.x + r.width, ah = H - r.y
        if (domX) { w = clamp(r.width - dx, MIN_RECT, aw); h = arH(w); if (h > ah) { h = ah; w = arW(h) } }
        else { h = clamp(r.height + dy, MIN_RECT, ah); w = arW(h); if (w > aw) { w = aw; h = arH(w) } }
        x = r.x + r.width - w
        break
      }
      case 'e': {
        w = clamp(r.width + dx, MIN_RECT, W - r.x); h = arH(w)
        y = clamp(r.y + (r.height - h) / 2, 0, Math.max(0, H - h))
        break
      }
      case 'w': {
        w = clamp(r.width - dx, MIN_RECT, r.x + r.width); h = arH(w)
        x = r.x + r.width - w; y = clamp(r.y + (r.height - h) / 2, 0, Math.max(0, H - h))
        break
      }
      case 's': {
        h = clamp(r.height + dy, MIN_RECT, H - r.y); w = arW(h)
        x = clamp(r.x + (r.width - w) / 2, 0, Math.max(0, W - w))
        break
      }
      case 'n': {
        h = clamp(r.height - dy, MIN_RECT, r.y + r.height); w = arW(h)
        x = clamp(r.x + (r.width - w) / 2, 0, Math.max(0, W - w)); y = r.y + r.height - h
        break
      }
    }
    if (w < MIN_RECT) { w = MIN_RECT; h = arH(w) }
    if (h < MIN_RECT) { h = MIN_RECT; w = arW(h) }
    w = Math.min(w, W); h = Math.min(h, H)
    if (w / h > ar) w = arW(h); else h = arH(w)
    x = clamp(x, 0, Math.max(0, W - w)); y = clamp(y, 0, Math.max(0, H - h))
    return { x: Math.round(x), y: Math.round(y), width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }
  }

  // Crop drag: detect handle, then move/resize.
  const startCrop = (p: { x: number; y: number }) => {
    const r = cropRect
    if (!r) return
    const hit = 14 / dispGeom().scale
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
    // When an aspect ratio is locked, handles resize to the ratio; only the
    // free 'move' keeps the box's current size.
    if (cropRatioRef.current && d!.mode !== 'move') {
      const ar = cropRatioRef.current.w / cropRatioRef.current.h
      setCropRect(aspectResize(r, dx, dy, d!.mode, ar, curW, curH))
      return
    }
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

  // Choose an aspect ratio (null = free). Refits the live crop box to match.
  const setRatio = (r: { w: number; h: number } | null) => {
    setCropRatio(r)
    if (r && cropRect) setCropRect(fitToRatio(cropRect, r, curW, curH))
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
    m.font = `600 ${px}px ${textState.font}`
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

  // Clone stamp: a stroke locks the source point at press time; each brush spot
  // samples the pixel `(point − offset)` — the offset stays fixed for the whole
  // stroke, so the clone follows the cursor just like PS.
  const beginStamp = (p: { x: number; y: number }) => {
    stampStrokesRef.current = [...stampStrokesRef.current, { src: { ...stampState.src! }, pts: [p] }]
    dragRef.current = { mode: 'stroke', startX: p.x, startY: p.y, orig: { x: 0, y: 0, width: 0, height: 0 } }
    compose()
  }

  const extendStamp = (p: { x: number; y: number }) => {
    const arr = stampStrokesRef.current
    const last = arr[arr.length - 1]
    if (!last) return
    last.pts = [...last.pts, p]
    compose()
  }

  // Cutout loop closed → merge the traced region into the running mask. In
  // "keep" mode the region is added (union); in "remove" mode it is subtracted.
  // The first loop defines the base: keep starts from "everything removed",
  // remove starts from "everything kept" — so a single loop keeps the old
  // behavior (trace the subject, the rest goes transparent).
  const commitCutout = () => {
    const pts = cutoutRef.current
    if (pts.length < 3) { cutoutRef.current = []; return }
    const sel = pathToMask(curW, curH, pts)
    const existing = cutoutMaskRef.current
    if (existing) {
      for (let i = 0; i < sel.length; i++) if (sel[i]) existing[i] = cutoutMode === 'keep'
    } else {
      const base = new Array<boolean>(curW * curH).fill(cutoutMode !== 'keep')
      for (let i = 0; i < sel.length; i++) if (sel[i]) base[i] = cutoutMode === 'keep'
      cutoutMaskRef.current = base
    }
    cutoutRef.current = []
    setCutoutClicks((n) => n + 1)
    compose()
  }

  // Click-to-remove: flood-fill the CURRENT image from the click point. In
  // "select" mode the region is unioned into the running mask; in "erase" mode
  // it is subtracted, so the user can custom-build exactly the selection.
  const doRemoveClick = (p: { x: number; y: number }) => {
    if (!curImg) return
    // A click while the previous flood-fill is still running is QUEUED (the
    // latest wins) and replayed right after it finishes — never silently
    // dropped, which used to make rapid clicks look unresponsive.
    if (removeBusyRef.current) { pendingRemoveRef.current = p; return }
    runRemoveFill(p)
  }

  const runRemoveFill = (p: { x: number; y: number }) => {
    if (!curImg) return
    removeBusyRef.current = true
    setRemoveProcessing(true)
    const img = curImg
    const W = curW, H = curH, tol = removeTol, mode = removeMode
    const px = p.x, py = p.y
    // Deferred so the pointer handler never blocks — even with the scanline
    // fill, a 6M-pixel region takes a few hundred ms; better to let the overlay
    // keep animating (and keep the cursor responsive) than freeze the tab.
    window.setTimeout(() => {
      try {
        // Reuse the cached RGBA of the current base — the wand only reads
        // pixels, so this skips getImageData (a 24MB copy) on every click.
        const cachedPx = pxDataRef.current
        let data: ImageData
        if (cachedPx && cachedPx.img === img) {
          data = cachedPx.data
        } else {
          const c = document.createElement('canvas')
          c.width = W
          c.height = H
          const ctx = c.getContext('2d', { willReadFrequently: true })!
          ctx.drawImage(img, 0, 0)
          data = ctx.getImageData(0, 0, W, H)
          pxDataRef.current = { img, data }
        }
        const sel = floodFill(data, Math.round(px), Math.round(py), tol)
        // Dilation swallows the anti-aliased fringe between the subject and a
        // flat background (the "白边" that survives max-tolerance fills), so the
        // edge comes out clean. Only the SELECT (add) path — erase is manual
        // precision, keep it raw.
        const add = mode === 'erase' ? sel : dilateMask(sel, W, H, 2)
        const existing = removeRef.current
        if (mode === 'erase') {
          if (!existing) return
          for (let i = 0; i < sel.length; i++) if (sel[i]) existing[i] = 0
        } else {
          if (!existing) {
            removeRef.current = add
          } else {
            for (let i = 0; i < add.length; i++) if (add[i]) existing[i] = 1
          }
        }
        removeVersionRef.current++
        setRemoveClicks((n) => n + 1)
        compose()
      } finally {
        setRemoveProcessing(false)
        removeBusyRef.current = false
        // Replay the latest click queued while this one was running.
        if (pendingRemoveRef.current) {
          const q = pendingRemoveRef.current
          pendingRemoveRef.current = null
          runRemoveFill(q)
        }
      }
    }, 0)
  }

  // ── Apply (commit) / Undo / Clear / Download ──
  const clearPaint = () => {
    pencilRef.current = []
    healRef.current = []
    cutoutRef.current = []
    cutoutMaskRef.current = null
    removeRef.current = null
    stampStrokesRef.current = []
  }

  // Wipe every in-progress preview so the overlay shows nothing on top of the
  // committed base. Otherwise text/logo/rotate/resize previews linger over the
  // freshly-applied (or undone) image and make Undo look broken.
  const resetPreview = () => {
    clearPaint()
    setRemoveClicks(0)
    setCutoutClicks(0)
    setRotate({ angle: 0, flipX: false, flipY: false })
    setCropRect(null)
    setTextState((s) => ({ ...s, text: '', x: 0, y: 0, hasPos: false }))
    if (logoState.imageUrl) URL.revokeObjectURL(logoState.imageUrl)
    setLogoImg(null)
    setLogoState((s) => ({ ...s, imageUrl: null, x: 0, y: 0, hasPos: false }))
    setStampState((s) => ({ ...s, src: null }))
    setApplied(false)
    // Return to fit view on any committed change (apply/undo/redo/clear).
    setViewZoom(1)
    setViewPan({ x: 0, y: 0 })
    setPanning(false)
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
              fontSize: textState.fontSize, opacity: textState.opacity, font: textState.font,
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
        case 'cutout': {
          // Kept mask → everything not kept becomes transparent.
          const m = cutoutMaskRef.current
          if (m) {
            const inverted = new Array<boolean>(m.length)
            for (let i = 0; i < m.length; i++) inverted[i] = !m[i]
            blob = await removeMasked(current, inverted)
          }
          break
        }
        case 'remove':
          blob = await removeMasked(current, removeRef.current)
          break
        case 'stamp':
          blob = await cloneStamp(current, stampStrokesRef.current, curW, curH, stampState.size)
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
        resetPreview()
        // After applying, return to the Select tool so the result is seen clean
        // (no crop box / mask lingering). The "已应用" banner stays up.
        setActiveTool('select')
        setHoverPt(null)
        setApplied(true)
        setTipTool(null) // applying is the lesson — stop teaching
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
    if (activeTool) pendingReinitRef.current = activeTool
    setHistIdx((i) => i - 1)
    resetPreview()
    dragRef.current = null
    setHoverPt(null)
    compose()
  }

  const redo = () => {
    if (histIdx >= history.length - 1) return
    if (activeTool) pendingReinitRef.current = activeTool
    setHistIdx((i) => i + 1)
    resetPreview()
    dragRef.current = null
    setHoverPt(null)
    compose()
  }

  const clearTool = () => {
    if (activeTool) pendingReinitRef.current = activeTool
    resetPreview()
    dragRef.current = null
    setHoverPt(null)
    compose()
  }

  // Download confirmation dialog → actually save.
  const doDownload = async () => {
    // Site-wide free-download quota: 1st download free for logged-out visitors,
    // 2nd+ asks them to sign in. The dialog stays open so after logging in they
    // can hit the confirm button again (signed-in = unlimited).
    if (!tryConsumeFreeDownload(user, openLogin)) return
    let blob = current
    if (dlFormat !== 'same') {
      const file = new File([current], `out.${getOutputFormat(current)}`, { type: current.type })
      blob = await convertImage(file, dlFormat)
    }
    setDlOpen(false)
    const base = source.file.name.replace(/\.[^.]+$/, '')
    downloadBlob(blob, `${base}-studio`)
  }

  // Re-initialize a tool's defaults. Called on selection and, with fresh dims,
  // after undo/redo/clear so an active tool works again without re-clicking it.
  const initToolDefaults = (tool: StudioToolId, w = curW, h = curH) => {
    if (tool === 'crop' && !cropRect) {
      const base = { x: Math.round(w * 0.1), y: Math.round(h * 0.1), width: Math.round(w * 0.8), height: Math.round(h * 0.8) }
      setCropRect(cropRatioRef.current ? fitToRatio(base, cropRatioRef.current, w, h) : base)
    }
    if (tool === 'resize') setResizeState({ width: w, height: h, lock: true })
    if (tool === 'text' && !textState.hasPos) setTextState((s) => ({ ...s, x: w * 0.3, y: h * 0.3 }))
    if (tool === 'logo' && !logoState.hasPos) setLogoState((s) => ({ ...s, x: w * 0.4, y: h * 0.4 }))
  }

  const dismissCropTip = () => {
    setCropTip(false)
    try { localStorage.setItem(CROP_TIP_KEY, '1') } catch { /* ignore */ }
  }

  const selectTool = (tool: StudioToolId) => {
    pendingReinitRef.current = null
    setActiveTool(tool)
    setApplied(false)
    setHoverPt(null)
    // Crop: show the one-time how-to banner the first time (per customer).
    if (tool === 'crop') {
      try {
        if (!localStorage.getItem(CROP_TIP_KEY)) setCropTip(true)
      } catch { /* ignore */ }
    }
    // First visit to an EDITING tool → teach with a bubble pointing at Apply.
    // Select has nothing to apply, so no bubble (its panel shows a hint instead).
    if (tool !== 'select' && !seenRef.current.has(tool)) {
      const next = new Set(seenRef.current)
      next.add(tool)
      seenRef.current = next
      try { sessionStorage.setItem(TIP_SEEN_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      setTipTool(tool)
    } else {
      setTipTool(null)
    }
    initToolDefaults(tool)
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
    <div className="shrink-0 flex flex-wrap lg:flex-nowrap lg:flex-col gap-1.5 lg:gap-2">
      {STUDIO_TOOLS.map((tool) => {
        const active = activeTool === tool.id
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => selectTool(tool.id)}
            title={t[tool.labelKey] as string}
            className={`
              shrink-0 flex items-center lg:flex-col gap-2 lg:gap-1 px-2.5 lg:px-0 lg:w-full lg:py-2.5
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
      case 'select':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)] leading-relaxed">
              {lang === 'zh'
                ? '「选择」是默认状态：拖动空白处平移、滚轮缩放，方便查看编辑效果。切换到其他工具即可继续编辑。'
                : 'Select is the resting state: drag to pan, scroll to zoom — handy for inspecting the result. Pick a tool below to keep editing.'}
            </p>
            <div className="flex gap-2">
              <ToolButton onClick={() => { setViewZoom(1); setViewPan({ x: 0, y: 0 }) }}>{t.resetZoom}</ToolButton>
            </div>
          </div>
        )
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
            <Field label={t.cropRatio}>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { r: null as { w: number; h: number } | null, label: t.cropFree },
                  { r: { w: 1, h: 1 }, label: '1:1' },
                  { r: { w: 4, h: 3 }, label: '4:3' },
                  { r: { w: 3, h: 4 }, label: '3:4' },
                  { r: { w: 16, h: 9 }, label: '16:9' },
                  { r: { w: 9, h: 16 }, label: '9:16' },
                ].map((p) => {
                  const active = !!p.r && !!cropRatio && cropRatio.w === p.r.w && cropRatio.h === p.r.h
                  return (
                    <ToolButton key={p.label} active={active} onClick={() => setRatio(p.r)}>
                      {p.label}
                    </ToolButton>
                  )
                })}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <NumInput value={cropCustom.w} onChange={(v) => setCropCustom((s) => ({ ...s, w: v }))} />
                <span className="text-[var(--text-dim)]">:</span>
                <NumInput value={cropCustom.h} onChange={(v) => setCropCustom((s) => ({ ...s, h: v }))} />
                <button
                  type="button"
                  onClick={() => {
                    const w = Math.round(cropCustom.w)
                    const h = Math.round(cropCustom.h)
                    if (w >= 1 && h >= 1) setRatio({ w, h })
                  }}
                  className="px-2.5 py-2 rounded-[var(--radius-sm)] glass text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                >
                  {t.cropCustom}
                </button>
              </div>
            </Field>
            {/* Live dimensions — crop-box size while cropping, otherwise the
                current image size (never 0, even right after applying a crop). */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="glass rounded-[var(--radius-sm)] px-2.5 py-2 flex items-center justify-between gap-2">
                <span className="text-[var(--text-dim)]">{t.studioWidth}</span>
                <span className="font-mono text-[var(--text-primary)]">{cropRect ? Math.round(cropRect.width) : curW}px</span>
              </div>
              <div className="glass rounded-[var(--radius-sm)] px-2.5 py-2 flex items-center justify-between gap-2">
                <span className="text-[var(--text-dim)]">{t.studioHeight}</span>
                <span className="font-mono text-[var(--text-primary)]">{cropRect ? Math.round(cropRect.height) : curH}px</span>
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
            <Field label={t.studioFont}>
              <select
                value={textState.font}
                onChange={(e) => setTextState((s) => ({ ...s, font: e.target.value }))}
                style={{ fontFamily: textState.font }}
                className="w-full glass rounded-[var(--radius-sm)] px-2.5 py-2 text-sm outline-none focus:border-[var(--accent)] [&>option]:text-black"
              >
                <option value={FONT}>{t.studioFontDefault}</option>
                {TEXT_FONTS.map((f) => (
                  <option key={f.label} value={f.stack} style={{ fontFamily: f.stack }}>{f.label}</option>
                ))}
              </select>
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
            <p className="text-xs text-[var(--text-dim)]">
              {lang === 'zh'
                ? '画圈选中区域（松开鼠标即闭合）。「保留」= 圈内留下，「去除」= 圈内去掉；可反复画圈叠加 / 减去选区，像 PS 一样微调。'
                : 'Trace a loop over an area (it closes when you release). Keep = keep the loop content, Remove = drop it. Draw more loops to add or subtract from the selection — PS-style.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ToolButton active={cutoutMode === 'keep'} onClick={() => setCutoutMode('keep')}>{lang === 'zh' ? '保留' : 'Keep'}</ToolButton>
              <ToolButton active={cutoutMode === 'remove'} onClick={() => setCutoutMode('remove')}>{lang === 'zh' ? '去除' : 'Remove'}</ToolButton>
            </div>
            {cutoutClicks > 0 && (
              <div className="flex gap-2">
                <ToolButton onClick={clearTool}>{t.studioClear}</ToolButton>
              </div>
            )}
          </div>
        )
      case 'remove':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">
              {lang === 'zh'
                ? '魔术棒点击选中相似区域（如背景），选中处会显示选区；「擦除」可减去多余选区，可反复组合。'
                : 'Click with the magic wand to select similar pixels (e.g. background) — a selection outline shows what is picked. Use Erase to trim it.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ToolButton active={removeMode === 'add'} onClick={() => setRemoveMode('add')}>{lang === 'zh' ? '选中' : 'Select'}</ToolButton>
              <ToolButton active={removeMode === 'erase'} onClick={() => setRemoveMode('erase')}>{lang === 'zh' ? '擦除' : 'Erase'}</ToolButton>
            </div>
            <Field label={t.studioTolerance}>
              <Slider value={removeTol} min={1} max={100} onChange={setRemoveTol} />
            </Field>
            {removeProcessing && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                <span className="h-3 w-3 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
                {lang === 'zh' ? '正在计算选区…' : 'Selecting…'}
              </div>
            )}
            {removeClicks > 0 && (
              <div className="flex gap-2">
                <ToolButton onClick={clearTool}>{t.studioClear}</ToolButton>
              </div>
            )}
          </div>
        )
      case 'stamp':
        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">
              {lang === 'zh'
                ? '先点击画布设置「源点」（或按住 Alt 点击重新取源），然后像画笔一样涂抹，源点周围的内容会被复制到涂抹处——和 PS 的仿制图章一样。'
                : 'Click the canvas to set a source point (Alt+click re-picks it), then paint — pixels around the source are copied to where you brush, just like the Clone Stamp in PS.'}
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`h-2 w-2 rounded-full ${stampState.src ? 'bg-emerald-400' : 'bg-white/25'}`} />
              <span className="text-[var(--text-dim)]">
                {stampState.src
                  ? (lang === 'zh'
                    ? `源点 (${Math.round(stampState.src.x)}, ${Math.round(stampState.src.y)})`
                    : `Source (${Math.round(stampState.src.x)}, ${Math.round(stampState.src.y)})`)
                  : (lang === 'zh' ? '未设置源点' : 'No source yet')}
              </span>
            </div>
            <Field label={t.studioBrushSize}>
              <Slider value={stampState.size} min={5} max={120} onChange={(v) => setStampState((s) => ({ ...s, size: v }))} />
            </Field>
            <div className="flex gap-2">
              <ToolButton onClick={clearTool}>{t.studioClear}</ToolButton>
            </div>
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
            <div className="flex gap-2">
              <ToolButton
                onClick={() => setResizeState({ width: curW, height: curH, lock: true })}
              >
                {t.studioReset}
              </ToolButton>
            </div>
          </div>
        )
    }
  }

  const canApply = () => {
    if (!activeTool) return false
    if (activeTool === 'select') return false // nothing to commit — just inspecting
    if (activeTool === 'text') return !!textState.text.trim()
    if (activeTool === 'logo') return !!logoState.imageUrl
    if (activeTool === 'stamp') return stampStrokesRef.current.length > 0
    return true
  }

  return (
    // w-full: this container is a flex item of the page column flex. `mx-auto`
    // (auto cross margins) disables flex stretch, so without an explicit width
    // the tool rail's content (11 buttons) blows the layout out past the viewport
    // on mobile. w-full caps it at the viewport; max-w-6xl + mx-auto keep desktop
    // centered at 1152px.
    <div className="mx-auto max-w-6xl w-full min-w-0 px-3 sm:px-6 py-4 sm:py-6">
      {/* Page heading — the promo tagline lives here, OUTSIDE the workbench
          (not under the tool rail, not in the canvas area). Mirrors the empty
          state (h1 + tagline) so the two states look consistent. */}
      <div className="mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight">
          <span className="text-gradient">{lang === 'zh' ? '全能编辑 Studio' : 'Studio Editor'}</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-dim)] leading-relaxed">{t.studioTagline}</p>
      </div>

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onReplace}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] glass text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            {t.studioUploadNew}
          </button>
          <button
            type="button"
            onClick={onReset}
            title={t.studioDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] glass text-xs text-red-300/80 hover:text-red-300 transition-all shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            {t.studioDelete}
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
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Tool module — mobile: tools wrap into a top grid (no horizontal
            scroll); desktop: vertical left rail. */}
        <div className="flex flex-col gap-2 lg:w-20">
          {rail}
        </div>

        {/* Canvas + panel — mobile: canvas full-width on top, panel BELOW it
            (tools already occupy the top row); desktop: [canvas | panel]. */}
        <div className="flex flex-1 min-w-0 flex-col lg:flex-row gap-3">
          {/* Canvas — base in-flow, overlay absolute inset-0 (same pattern as
              RemoveWatermarkPanel) so both canvases always align at any scale. */}
          <div ref={canvasCardRef} className="relative flex-1 min-w-0 glass rounded-[var(--radius-lg)] p-3 sm:p-4 overflow-hidden">
            <div className="flex items-center justify-center">
              <div
                ref={imageBoxRef}
                className="relative select-none checkerboard rounded-[var(--radius-md)]"
                style={{
                  width: disp.w ? disp.w : '100%',
                  height: disp.h ? disp.h : '0.1px',
                  touchAction: 'none',
                  transform: viewZoom > 1 ? `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewZoom})` : undefined,
                  cursor: activeTool && PAINT_CURSOR[activeTool] ? PAINT_CURSOR[activeTool]
                    : viewZoom > 1 ? (panning ? 'grabbing' : 'grab') : 'default',
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                <canvas
                  ref={baseRef}
                  className="absolute inset-0 w-full h-full object-contain rounded-[var(--radius-md)]"
                />
                <canvas
                  ref={overRef}
                  className="absolute inset-0 w-full h-full object-contain rounded-[var(--radius-md)] pointer-events-none"
                  style={{ opacity: processing ? 0.6 : 1 }}
                />
                {/* Crop rulers — ticks along the top + left EDGES of the image
                    (hugging the box, OUTSIDE the image) instead of inside the crop
                    box. Anchored off the box itself (relative), so no rect
                    measurement timing issues; tick scale = disp/curW exactly. Font
                    is fixed screen px. Only at fit view — zooming is detail work. */}
                {activeTool === 'crop' && viewZoom === 1 && disp.w > 0 && (() => {
                  const sc = disp.w / curW
                  const step = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find((s) => s >= 40 / sc) ?? 2000
                  const stripW = 18
                  const stripH = 16
                  const xs: number[] = []
                  const ys: number[] = []
                  for (let v = 0; v <= curW; v += step) xs.push(v)
                  for (let v = 0; v <= curH; v += step) ys.push(v)
                  return (
                    <>
                      {/* Top strip — X pixel positions */}
                      <div data-ruler="top" className="absolute z-20 pointer-events-none overflow-hidden border-b border-white/15" style={{ top: -stripH, left: 0, width: '100%', height: stripH, background: 'rgba(10,10,24,0.72)' }}>
                        {xs.map((v) => (
                          <span key={`x${v}`} className="absolute bottom-0" style={{ left: v * sc }}>
                            <span className="block w-px bg-white/50" style={{ height: v % (step * 2) === 0 ? 8 : 5 }} />
                          </span>
                        ))}
                        {xs.filter((v) => v % (step * 2) === 0).map((v) => (
                          <span key={`xl${v}`} className="absolute bottom-0.5 leading-none" style={{ left: v * sc + 2, fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>
                            {v}
                          </span>
                        ))}
                      </div>
                      {/* Left strip — Y pixel positions */}
                      <div data-ruler="left" className="absolute z-20 pointer-events-none overflow-hidden border-r border-white/15" style={{ top: 0, left: -stripW, width: stripW, height: '100%', background: 'rgba(10,10,24,0.72)' }}>
                        {ys.map((v) => (
                          <span key={`y${v}`} className="absolute right-0" style={{ top: v * sc }}>
                            <span className="block h-px bg-white/50" style={{ width: v % (step * 2) === 0 ? 8 : 5 }} />
                          </span>
                        ))}
                        {ys.filter((v) => v % (step * 2) === 0).map((v) => (
                          <span key={`yl${v}`} className="absolute right-0.5 leading-none" style={{ top: v * sc + 2, fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
            {/* One-time crop how-to banner (localStorage — shown once per customer) */}
            {cropTip && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-[calc(100%-24px)] px-3 py-2 rounded-xl glass border border-[var(--accent)]/35 text-xs text-[var(--text-primary)] shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
                <span className="shrink-0">✂️</span>
                <span className="leading-snug">{t.cropTip}</span>
                <button type="button" onClick={dismissCropTip} aria-label="dismiss" className="shrink-0 text-[var(--text-dim)] hover:text-[var(--text-primary)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            {/* Processing + applied overlays live OUTSIDE the zoomed box so they
                keep a constant on-screen size at any zoom level. */}
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-10 rounded-[var(--radius-lg)]">
                <span className="text-sm text-[var(--text-primary)] animate-pulse">{t.studioDownloading}</span>
              </div>
            )}
            {applied && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 backdrop-blur-md whitespace-nowrap">
                {t.studioApplied}
              </div>
            )}
            {viewZoom > 1 ? (
              <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 glass rounded-full px-2 py-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => { setViewZoom(1); setViewPan({ x: 0, y: 0 }) }}
                  className="px-2 py-0.5 rounded-full text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                >
                  {t.resetZoom}
                </button>
                <button
                  type="button"
                  onClick={() => setViewZoom((z) => Math.max(1, z - 0.5))}
                  className="h-6 w-6 rounded-full text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                >
                  −
                </button>
                <span className="font-mono tabular-nums w-10 text-center text-[var(--text-primary)]">{Math.round(viewZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setViewZoom((z) => Math.min(5, z + 0.5))}
                  className="h-6 w-6 rounded-full text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                >
                  +
                </button>
              </div>
            ) : (
              <span className="absolute bottom-2 right-2 z-20 pointer-events-none text-[10px] text-[var(--text-dim)]/60 whitespace-nowrap">
                {t.zoomHint}
              </span>
            )}
          </div>

          {/* Panel — full-width under the canvas on mobile, right panel on desktop */}
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
            ref={applyBtnRef}
            type="button"
            onClick={apply}
            disabled={!canApply() || processing}
            className="w-full py-2.5 rounded-[var(--radius-md)] btn-gradient text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {processing ? t.studioDownloading : t.studioApply}
          </button>
        </div>
        </div>
      </div>

      {/* First-visit teaching bubble, aimed at the Apply button */}
      {tipTool && tipPos && (
        <div
          className="fixed z-[90] w-[280px] max-w-[calc(100vw-24px)]"
          style={tipPos.place === 'left'
            ? { left: tipPos.x, top: tipPos.y, transform: 'translateY(-50%)' }
            : { left: tipPos.x, top: tipPos.y, transform: 'none' }}
        >
          <div className="relative rounded-xl bg-[#121228]/[0.97] border border-[var(--accent)]/35 px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
            {tipPos.place === 'left' ? (
              <span className="absolute right-[-6px] top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-[#121228] border-r border-t border-[var(--accent)]/35" />
            ) : (
              <span className="absolute top-[-6px] left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-[#121228] border-t border-l border-[var(--accent)]/35" />
            )}
            <button
              type="button"
              onClick={() => setTipTool(null)}
              aria-label="dismiss"
              className="absolute top-1.5 right-2 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <div className="flex items-start gap-2.5 pr-6">
              <span className="text-base leading-none mt-0.5">💡</span>
              <div className="space-y-1.5">
                <p className="text-xs text-[var(--text-primary)] font-medium leading-snug">
                  {lang === 'zh' ? TOOL_TIPS[tipTool].zh : TOOL_TIPS[tipTool].en}
                </p>
                <p className="text-[11px] leading-snug text-[var(--accent)]">
                  {lang === 'zh' ? '每次操作后，点右侧「应用」按钮，改动才会生效' : 'Tap "Apply" on the right after every change — it takes effect only then'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-tool tutorial */}
      <StudioTutorial lang={lang} />

      {/* Download confirmation dialog */}
      {dlOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onPointerDownCapture={onBackdropPointerDown}
          onClick={(e) => onBackdropClick(e, () => setDlOpen(false))}
        >
          <div
            className="w-full max-w-sm rounded-2xl glass modal-card border border-white/10 p-5 space-y-4"
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
  remove: 'none', // the drawn magic wand is the cursor
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
      'Trace a loop over the area you want to affect — it only closes when you release the mouse.',
      'Choose Keep to keep the area inside the loop, or Remove to drop it.',
      'Draw more loops to add (Keep) or subtract (Remove) from the selection — refine like in PS.',
      'Tap Apply: everything not kept becomes transparent (PNG).',
    ],
    stepsZh: [
      '沿目标区域画一圈，鼠标松开才闭合，圈出要处理的选区。',
      '选「保留」留下圈内内容，或选「去除」去掉圈内内容。',
      '继续画圈可叠加（保留）或减去（去除）选区，像 PS 一样微调。',
      '点「应用」：未保留的区域变为透明（PNG）。',
    ],
  },
  {
    id: 'remove',
    labelEn: 'Magic wand remove',
    labelZh: '魔术棒去除',
    stepsEn: [
      'Click the area you want to remove (e.g. the background) — similar colors are selected and shown with an outline.',
      'Adjust Tolerance to pick more or fewer similar pixels.',
      'Switch to Erase to subtract excess selection, then click several times to build exactly the area you want.',
      'Tap Apply to make the selected area transparent (PNG).',
    ],
    stepsZh: [
      '用魔术棒点击要去掉的区域（比如背景），相似颜色会被选中并显示选区。',
      '调整「容差」控制选中范围的大小。',
      '切到「擦除」可减去多余的选区，多次点击就能精确组合出想要的区域。',
      '点「应用」把这些区域变为透明（PNG）。',
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

// Per-tool accent tints — each card gets its own soft color so the grid reads
// as a friendly rainbow instead of a row of identical boxes. All class names are
// literal so Tailwind v4 picks them up.
const TUTORIAL_TINTS: Record<StudioToolId, { tile: string; dot: string; line: string; open: string }> = {
  // Select is the resting state — tint exists to satisfy the Record, but the
  // tutorial grid only renders entries present in TUTORIALS, so no card shows.
  select: { tile: 'bg-slate-400/10 text-slate-300 ring-1 ring-inset ring-slate-400/25 group-open:bg-slate-400/20 group-open:ring-slate-400/50', dot: 'bg-slate-400/15 text-slate-300', line: 'from-slate-400/50', open: 'group-open:border-slate-400/30' },
  rotate: { tile: 'bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/25 group-open:bg-cyan-400/20 group-open:ring-cyan-400/50', dot: 'bg-cyan-400/15 text-cyan-300', line: 'from-cyan-400/50', open: 'group-open:border-cyan-400/30' },
  crop: { tile: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/25 group-open:bg-emerald-400/20 group-open:ring-emerald-400/50', dot: 'bg-emerald-400/15 text-emerald-300', line: 'from-emerald-400/50', open: 'group-open:border-emerald-400/30' },
  text: { tile: 'bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/25 group-open:bg-amber-400/20 group-open:ring-amber-400/50', dot: 'bg-amber-400/15 text-amber-300', line: 'from-amber-400/50', open: 'group-open:border-amber-400/30' },
  logo: { tile: 'bg-fuchsia-400/10 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-400/25 group-open:bg-fuchsia-400/20 group-open:ring-fuchsia-400/50', dot: 'bg-fuchsia-400/15 text-fuchsia-300', line: 'from-fuchsia-400/50', open: 'group-open:border-fuchsia-400/30' },
  pencil: { tile: 'bg-yellow-400/10 text-yellow-300 ring-1 ring-inset ring-yellow-400/25 group-open:bg-yellow-400/20 group-open:ring-yellow-400/50', dot: 'bg-yellow-400/15 text-yellow-300', line: 'from-yellow-400/50', open: 'group-open:border-yellow-400/30' },
  heal: { tile: 'bg-rose-400/10 text-rose-300 ring-1 ring-inset ring-rose-400/25 group-open:bg-rose-400/20 group-open:ring-rose-400/50', dot: 'bg-rose-400/15 text-rose-300', line: 'from-rose-400/50', open: 'group-open:border-rose-400/30' },
  cutout: { tile: 'bg-indigo-400/10 text-indigo-300 ring-1 ring-inset ring-indigo-400/25 group-open:bg-indigo-400/20 group-open:ring-indigo-400/50', dot: 'bg-indigo-400/15 text-indigo-300', line: 'from-indigo-400/50', open: 'group-open:border-indigo-400/30' },
  remove: { tile: 'bg-violet-400/10 text-violet-300 ring-1 ring-inset ring-violet-400/25 group-open:bg-violet-400/20 group-open:ring-violet-400/50', dot: 'bg-violet-400/15 text-violet-300', line: 'from-violet-400/50', open: 'group-open:border-violet-400/30' },
  stamp: { tile: 'bg-teal-400/10 text-teal-300 ring-1 ring-inset ring-teal-400/25 group-open:bg-teal-400/20 group-open:ring-teal-400/50', dot: 'bg-teal-400/15 text-teal-300', line: 'from-teal-400/50', open: 'group-open:border-teal-400/30' },
  resize: { tile: 'bg-sky-400/10 text-sky-300 ring-1 ring-inset ring-sky-400/25 group-open:bg-sky-400/20 group-open:ring-sky-400/50', dot: 'bg-sky-400/15 text-sky-300', line: 'from-sky-400/50', open: 'group-open:border-sky-400/30' },
}

const tutIcon = (id: StudioToolId) => {
  const def = STUDIO_TOOLS.find((t) => t.id === id)
  return def ? cloneElement(def.icon as ReactElement<any>, { className: 'h-4 w-4' }) : null
}

export function StudioTutorial({ lang }: { lang: 'en' | 'zh' }) {
  const zh = lang === 'zh'
  // Accordion: only ONE guide open at a time. With native <details> every card
  // could stay open, and several tall expanded cards in a row left big ragged
  // gaps next to collapsed ones — the "这一行都展开，其他内容是空白" the user saw.
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <section className="mt-10">
      <div className="mb-6 flex items-start gap-3.5 sm:items-center">
        <span className="glass-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[var(--accent)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
            <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
            <span className="text-gradient">{zh ? '每个工具怎么用' : 'How to use each tool'}</span>
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-dim)]">
            {zh
              ? '点击任意工具展开分步教程。所有操作都在浏览器内完成，图片不会上传。'
              : 'Expand any tool for a step-by-step guide. Everything runs in your browser — images are never uploaded.'}
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 items-start">
        {TUTORIALS.map((tut) => {
          const t = TUTORIAL_TINTS[tut.id]
          const steps = zh ? tut.stepsZh : tut.stepsEn
          const isOpen = openId === tut.id
          return (
            <details
              key={tut.id}
              open={isOpen}
              onToggle={(e) => {
                // Opening a card closes any other open one. When the user
                // clicks the summary of the currently-open card, the browser
                // toggles it shut natively — only write state for the open
                // direction so React re-render matches what the user did.
                if (e.currentTarget.open) setOpenId(tut.id)
                else setOpenId((cur) => (cur === tut.id ? null : cur))
              }}
              className={`group glass rounded-xl border border-white/[0.06] overflow-hidden transition-all duration-200 card-hover hover:-translate-y-0.5 ${t.open}`}
            >
              <summary className="flex cursor-pointer items-center gap-3 px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] list-none [&::-webkit-details-marker]:hidden">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${t.tile}`}>
                  {tutIcon(tut.id)}
                </span>
                <span className="flex-1 leading-tight">{zh ? tut.labelZh : tut.labelEn}</span>
                <span className="hidden sm:inline whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-[var(--text-dim)]/70">
                  {zh ? `${steps.length} 步` : `${steps.length} steps`}
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[var(--text-dim)] transition-transform duration-200 group-open:rotate-180">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="accordion-body">
                <div>
                  <ol className="space-y-0 border-t border-white/[0.06] px-4 py-3.5">
                    {steps.map((s, i) => (
                      <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
                        {i < steps.length - 1 && (
                          <span className={`absolute left-[8px] top-6 bottom-0 w-px bg-gradient-to-b ${t.line} to-transparent`} />
                        )}
                        <span className={`relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${t.dot}`}>
                          {i + 1}
                        </span>
                        <span className="pt-px text-xs leading-relaxed text-[var(--text-dim)]">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </details>
          )
        })}
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
