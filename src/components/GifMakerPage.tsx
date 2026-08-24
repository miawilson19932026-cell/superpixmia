// /gif-maker — turn N images into an animated GIF.
// Browser-only: frames are drawn to a canvas and encoded with gifenc. Nothing
// is uploaded. Download is gated by the free-download quota (first free, then
// sign in for unlimited).
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from '../i18n'
import { useAuth, tryConsumeFreeDownload } from '../lib/auth'
import { framesToGifBlob, type GifFrameRgba } from '../lib/gif-utils'
import { framesToWebmBlob } from '../lib/webm-utils'
import SeoContent from './SeoContent'
import CatMascot from './CatMascot'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/x-icon', 'image/tiff', 'image/vnd.microsoft.icon']
const MAX_SIZE = 50 * 1024 * 1024
const MAX_FRAMES = 30
const MAX_CANVAS_PIXELS = 4096 * 4096 // guard against huge "original size" frames

interface FrameItem {
  id: number
  url: string
  file: File
  width: number
  height: number
}

const RESIZE_OPTIONS = [0, 256, 512, 1024]
// Quick-pick frame rates, weighted toward slow values — GIFs (esp. slide-show
// style from stills) read best at 1–3 fps (each frame holds ~330–1000ms); 5fps
// is still fine, and faster than ~8fps feels frantic for screenshots. The
// slider below still allows any value 0.5–24.
const FPS_PRESETS = [0.5, 1, 1.5, 2, 3, 5, 8, 12, 16, 24]

export default function GifMakerPage() {
  const { t, lang } = useTranslation()
  const { user, openLogin } = useAuth()

  const [frames, setFrames] = useState<FrameItem[]>([])
  // Default 2fps = each frame holds 500ms — a relaxed, readable pace for
  // still-image slideshows. Users wanting faster motion pick a higher preset.
  const [fps, setFps] = useState(2)
  const [loop, setLoop] = useState(true)
  const [maxEdge, setMaxEdge] = useState(512)
  const [format, setFormat] = useState<'gif' | 'webm'>('gif')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ url: string; blob: Blob; format: 'gif' | 'webm' } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(1)
  const urlsRef = useRef<Set<string>>(new Set())
  const framesLenRef = useRef(0)

  useEffect(() => { framesLenRef.current = frames.length }, [frames])

  const trackUrl = useCallback((obj: Blob) => {
    const url = URL.createObjectURL(obj)
    urlsRef.current.add(url)
    return url
  }, [])

  // Revoke every object URL we ever created on unmount.
  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)) }, [])

  // The generated preview must match the frames currently shown — invalidate the
  // old result whenever the frame set changes (add / remove / reorder / clear).
  // Otherwise a stale GIF lingers after "Clear all" + re-upload and keeps
  // animating in the preview area, which reads as if it were the new output.
  useEffect(() => {
    setResult((prev) => {
      if (!prev) return prev
      URL.revokeObjectURL(prev.url)
      urlsRef.current.delete(prev.url)
      return null
    })
  }, [frames])

  const clearError = useCallback(() => setError(null), [])

  const addFiles = useCallback(async (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return
    clearError()
    const incoming = Array.from(list)
    const loaded: Omit<FrameItem, 'id'>[] = []
    for (const f of incoming) {
      if (!ACCEPTED.includes(f.type)) { setError(t.errorUnsupportedFormat); continue }
      if (f.size > MAX_SIZE) { setError(t.errorFileTooBig); continue }
      const dims = await readImageDims(f)
      if (dims) loaded.push({ url: trackUrl(f), file: f, width: dims.width, height: dims.height })
    }
    if (loaded.length === 0) return
    const room = Math.max(0, MAX_FRAMES - framesLenRef.current)
    if (loaded.length > room) setError(t.gifMakerMaxFrames.replace('{n}', String(MAX_FRAMES)))
    const kept = loaded.slice(0, room)
    setFrames((prev) => [...prev, ...kept.map((it) => ({ ...it, id: idRef.current++ }))])
  }, [t, trackUrl, clearError])

  const handleFiles = (files: FileList | File[] | null) => { void addFiles(files) }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const moveFrame = useCallback((idx: number, dir: -1 | 1) => {
    setFrames((prev) => {
      const to = idx + dir
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]
      next[idx] = next[to]
      next[to] = tmp
      return next
    })
  }, [])

  const removeFrame = useCallback((idx: number) => {
    setFrames((prev) => {
      const target = prev[idx]
      if (target) URL.revokeObjectURL(target.url)
      urlsRef.current.delete(target.url)
      return prev.filter((_, i) => i !== idx)
    })
  }, [])

  const clearAll = useCallback(() => {
    setFrames((prev) => {
      prev.forEach((it) => { URL.revokeObjectURL(it.url); urlsRef.current.delete(it.url) })
      return []
    })
  }, [])

  const generate = useCallback(async () => {
    if (frames.length < 2) { setError(t.gifMakerNeedFrames); return }
    setGenerating(true)
    setError(null)
    try {
      // Load every frame to a canvas (optionally downscaled) and find the union box.
      const scaled: { canvas: HTMLCanvasElement; rgba: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }[] = []
      let maxW = 0
      let maxH = 0
      for (const frame of frames) {
        const data = await drawToCanvas(frame.url, maxEdge)
        scaled.push(data)
        maxW = Math.max(maxW, data.width)
        maxH = Math.max(maxH, data.height)
      }
      if (maxW * maxH > MAX_CANVAS_PIXELS) {
        setError(t.gifMakerSizeHint)
        return
      }
      // Center every frame on a transparent canvas of the union size.
      const canvas = document.createElement('canvas')
      canvas.width = maxW
      canvas.height = maxH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')
      const rgbaFrames: GifFrameRgba[] = []
      for (const s of scaled) {
        ctx.clearRect(0, 0, maxW, maxH)
        const ox = Math.round((maxW - s.width) / 2)
        const oy = Math.round((maxH - s.height) / 2)
        ctx.putImageData(new ImageData(s.rgba, s.width, s.height), ox, oy)
        const imgData = ctx.getImageData(0, 0, maxW, maxH)
        rgbaFrames.push({ rgba: imgData.data, width: maxW, height: maxH })
      }
      // GIF or transparent WebM — same frames, different encoders.
      const blob = format === 'webm'
        ? await framesToWebmBlob(rgbaFrames, { fps })
        : framesToGifBlob(rgbaFrames, { fps, loop })
      const url = trackUrl(blob)
      setResult((prev) => {
        if (prev) { URL.revokeObjectURL(prev.url); urlsRef.current.delete(prev.url) }
        return { url, blob, format }
      })
    } catch (e) {
      console.error('animation generate failed:', e)
      setError((e as Error)?.message === 'webcodecs-unavailable' ? t.animWebmUnsupported : t.errorProcess)
    } finally {
      setGenerating(false)
    }
  }, [frames, fps, loop, maxEdge, format, t, trackUrl])

  const download = useCallback(() => {
    if (!result) return
    if (!tryConsumeFreeDownload(user, openLogin)) return
    const a = document.createElement('a')
    a.href = result.url
    a.download = result.format === 'webm' ? 'animation.webm' : 'animation.gif'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [result, user, openLogin])

  const frameGrid = (
    <div className="flex flex-wrap gap-2.5">
      {frames.map((frame, i) => (
        <div key={frame.id} className="relative w-[92px] sm:w-[104px]">
          <div className="relative aspect-square rounded-xl overflow-hidden glass border border-white/[0.08]">
            <img src={frame.url} alt={`frame ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
            <span className="absolute top-1 left-1 z-10 rounded-md bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeFrame(i)}
              title={t.gifMakerRemove}
              className="absolute top-1 right-1 z-10 w-5 h-5 rounded-md bg-black/60 hover:bg-red-500/80 text-white text-[11px] leading-none flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-center gap-1 mt-1.5">
            <button type="button" onClick={() => moveFrame(i, -1)} disabled={i === 0}
              className="flex-1 h-6 rounded-md glass text-[var(--text-dim)] hover:text-[var(--text-primary)] disabled:opacity-30 text-xs" title={t.gifMakerUp}>↑</button>
            <button type="button" onClick={() => moveFrame(i, 1)} disabled={i === frames.length - 1}
              className="flex-1 h-6 rounded-md glass text-[var(--text-dim)] hover:text-[var(--text-primary)] disabled:opacity-30 text-xs" title={t.gifMakerDown}>↓</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => inputRef.current?.click()}
        className="w-[92px] sm:w-[104px] aspect-square rounded-xl border border-dashed border-white/15 text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 flex flex-col items-center justify-center gap-1 transition-all">
        <span className="text-xl leading-none">＋</span>
        <span className="text-[10px]">{t.gifMakerAddMore}</span>
      </button>
    </div>
  )

  const fpsValue = fps

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }} />

      <div className="mx-auto max-w-6xl w-full px-3 sm:px-6 pt-14 sm:pt-16 pb-10">
        <h1 className="text-center text-2xl sm:text-3xl font-black">
          <span className="text-gradient">{lang === 'zh' ? 'GIF 合成器' : 'GIF Maker'}</span>
        </h1>
        <p className="text-center text-xs sm:text-sm text-[var(--text-dim)] mt-2 mb-8 max-w-xl mx-auto leading-relaxed">
          {t.gifMakerTagline}
        </p>

        {frames.length === 0 ? (
          <div className="relative">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => inputRef.current?.click()}
              tabIndex={0}
              className={`
                relative p-8 sm:p-10 rounded-[var(--radius-xl)] glass neon-top-line cursor-pointer
                flex flex-col items-center justify-center gap-3 transition-all duration-300 outline-none
                ${isDragOver ? 'scale-[1.01]' : ''}
              `}
              style={{
                border: isDragOver ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(59,130,246,0.12)',
                boxShadow: isDragOver ? '0 0 24px var(--accent-glow)' : undefined,
              }}
            >
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragOver ? 'bg-[var(--accent)]/12 scale-110' : 'bg-white/[0.04]'}`}>
                <svg className={`w-20 h-20 sm:w-24 sm:h-24 transition-all duration-300 ${isDragOver ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]/55'}`}
                  viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="12" width="34" height="20" rx="5" opacity="0.3" />
                  <rect x="6" y="13" width="34" height="20" rx="5" opacity="0.55" />
                  <path d="M16 17l9 5.5-9 5.5V17z" fill="currentColor" opacity="0.7" />
                  <circle cx="37" cy="21" r="1" fill="currentColor" />
                  <circle cx="37" cy="24" r="1" fill="currentColor" opacity="0.6" />
                  <circle cx="37" cy="27" r="1" fill="currentColor" opacity="0.35" />
                </svg>
              </div>
              <p className="text-lg sm:text-xl">
                {lang === 'zh' ? (
                  <><span className="text-gradient font-bold">选择帧图片</span><span className="text-white/70 font-medium">（至少 2 张）</span></>
                ) : (
                  <><span className="text-gradient font-bold">Pick frame images</span><span className="text-white/70 font-medium"> (2+ images)</span></>
                )}
              </p>
              <button type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }} className="px-5 py-2.5 btn-gradient text-sm font-medium rounded-[var(--radius-md)]">
                {t.gifMakerOpen}
              </button>
              <div className="flex flex-col items-center gap-1 text-[10px] sm:text-[11px] text-[var(--text-dim)] text-center leading-relaxed">
                <span>{t.dropFormats}</span>
                <span>{t.gifMakerMaxFrames.replace('{n}', String(MAX_FRAMES))}</span>
                <span>{t.gifMakerTransparentHint}</span>
              </div>
            </div>
            <CatMascot />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Frame strip */}
            <div className="glass rounded-[var(--radius-lg)] p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  {t.gifMakerOrder}
                  <span className="ml-2 text-[11px] font-normal text-[var(--text-dim)]">{frames.length} {t.gifMakerFrames}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => inputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] glass text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all">
                    ＋ {t.gifMakerAddMore}
                  </button>
                  <button type="button" onClick={clearAll}
                    className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] glass text-[var(--text-dim)] hover:text-red-400 transition-all">
                    {t.gifMakerClearAll}
                  </button>
                </div>
              </div>
              {frameGrid}
              <p className="text-[11px] text-[var(--text-dim)]">{t.gifMakerMixedSizeHint}</p>
            </div>

            <div className="grid md:grid-cols-5 gap-4">
              {/* Settings */}
              <div className="md:col-span-2 glass rounded-[var(--radius-lg)] p-4 sm:p-5 space-y-5">
                {/* Output format — GIF or transparent WebM video */}
                <div>
                  <label className="text-xs font-medium text-[var(--text-primary)] block mb-1.5">{t.animFormat}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['gif', 'webm'] as const).map((f) => (
                      <button key={f} type="button" onClick={() => { setFormat(f); setResult(null) }}
                        className={`px-3 py-2.5 rounded-md text-xs font-semibold transition-all ${
                          format === f
                            ? 'glass-active text-[var(--accent)]'
                            : 'glass text-[var(--text-dim)] hover:text-[var(--text-primary)]'
                        }`}>
                        {f === 'webm' ? t.animFormatWebm : t.animFormatGif}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1.5">
                    {format === 'webm'
                      ? t.gifMakerTransparentHint
                      : t.gifMakerSizeHint}
                  </p>
                </div>

                {/* FPS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">{t.gifMakerFps}</label>
                    <span className="text-xs font-bold text-[var(--accent)]">{fpsValue} fps · {Math.round(1000 / fpsValue)} ms/frame</span>
                  </div>
                  <input type="range" min={0.5} max={24} step={0.5} value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]" />
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    {FPS_PRESETS.map((px) => (
                      <button key={px} type="button" onClick={() => setFps(px)}
                        className={`px-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                          fps === px
                            ? 'glass-active text-[var(--accent)]'
                            : 'glass text-[var(--text-dim)] hover:text-[var(--text-primary)]'
                        }`}>
                        {px}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] mt-2">{t.gifMakerFpsHint}</p>
                </div>

                {/* Loop */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--text-primary)]">{t.gifMakerLoop}</label>
                  <button type="button" onClick={() => setLoop((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${loop ? 'bg-[var(--accent)]' : 'bg-white/10'}`}
                    aria-pressed={loop}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${loop ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] -mt-2">{loop ? t.gifMakerLoopOn : t.gifMakerLoopOff}</p>
                {format === 'webm' && <p className="text-[11px] text-[var(--text-dim)]">{t.animWebmLoopHint}</p>}

                {/* Max edge */}
                <div>
                  <label className="text-xs font-medium text-[var(--text-primary)] block mb-1.5">{t.gifMakerResize}</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {RESIZE_OPTIONS.map((px) => (
                      <button key={px} type="button" onClick={() => setMaxEdge(px)}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                          maxEdge === px
                            ? 'glass-active text-[var(--accent)]'
                            : 'glass text-[var(--text-dim)] hover:text-[var(--text-primary)]'
                        }`}>
                        {px === 0 ? t.gifMakerResizeOriginal : `${px}px`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1.5">{t.gifMakerSizeHint}</p>
                </div>

                <button type="button" onClick={() => void generate()} disabled={generating}
                  className="w-full px-5 py-3 btn-gradient text-sm font-semibold rounded-[var(--radius-md)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {generating ? t.gifMakerGenerating : `🎞️ ${format === 'webm' ? t.gifMakerGenerateWebm : t.gifMakerGenerate}`}
                </button>
              </div>

              {/* Preview + download */}
              <div className="md:col-span-3 glass rounded-[var(--radius-lg)] p-4 sm:p-5 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.gifMakerPreview}</h2>
                  {result && (
                    <span className="text-[11px] text-[var(--text-dim)]">
                      {result.format.toUpperCase()} · {Math.max(1, result.blob.size / 1024).toFixed(0)} KB · {maxEdge === 0 ? `${frames[0]?.width ?? 0}×${frames[0]?.height ?? 0}` : `${maxEdge}px`}
                    </span>
                  )}
                </div>

                {result ? (
                  <div className="flex-1 flex flex-col items-center gap-4">
                    <div className="w-full flex-1 flex items-center justify-center rounded-xl bg-black/30 border border-white/[0.06] overflow-hidden min-h-[220px] p-3">
                      {result.format === 'webm' ? (
                        <video src={result.url} muted loop autoPlay playsInline className="max-w-full max-h-[320px] object-contain" />
                      ) : (
                        <img src={result.url} alt="GIF preview" className="max-w-full max-h-[320px] object-contain" />
                      )}
                    </div>
                    <button type="button" onClick={download}
                      className="w-full sm:w-auto px-6 py-3 btn-gradient text-sm font-semibold rounded-[var(--radius-md)]">
                      ↓ {result.format === 'webm' ? t.gifMakerDownloadWebm : t.gifMakerDownload}
                    </button>
                    <p className="text-[11px] text-[var(--text-dim)] -mt-1">{t.gifMakerGenerated}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/20 border border-white/[0.04] min-h-[220px] text-center p-6">
                    <span className="text-3xl opacity-40">🎞️</span>
                    <p className="text-xs text-[var(--text-dim)]">{t.gifMakerGenerate}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}
      </div>

      <SeoContent variant="gif-maker" />
    </>
  )
}

/** Read a file's natural pixel dimensions (object URL created & revoked here). */
function readImageDims(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const dims = { width: img.width, height: img.height }
      URL.revokeObjectURL(url)
      resolve(dims)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

/**
 * Draw an image to an offscreen canvas, optionally downscaling so the longest
 * edge is at most `maxEdge` (0 = original size). Returns the canvas plus its raw
 * RGBA pixels. Transparent areas are preserved.
 */
function drawToCanvas(url: string, maxEdge: number): Promise<{ canvas: HTMLCanvasElement; rgba: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(img.width, img.height)) : 1
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no 2d context')); return }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ canvas, rgba: ctx.getImageData(0, 0, w, h).data, width: w, height: h })
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}
