// /gif-maker — turn N images into an animated GIF.
// Browser-only: frames are drawn to a canvas and encoded with gifenc. Nothing
// is uploaded. Download is gated by the free-download quota (first free, then
// sign in for unlimited).
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from '../i18n'
import type { Translations } from '../i18n/types'
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
  /** how long this frame holds before the next one (ms) — per-frame keyframe */
  delayMs: number
  /** scale as a fraction (1 = 100%) */
  scale: number
  /** rotation in degrees, -180..180 */
  rotate: number
  /** horizontal offset, % of canvas width (-100..100) */
  dx: number
  /** vertical offset, % of canvas height (-100..100) */
  dy: number
}

const RESIZE_OPTIONS = [0, 256, 512, 1024]

/** Format a frame rate as its per-frame hold time, e.g. 0.5fps → "2.0s". */
function fmtHoldSec(fps: number, suffix: string): string {
  const ms = Math.round(1000 / Math.max(0.25, fps))
  return ms < 100 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}${suffix}`
}

export default function GifMakerPage() {
  const { t, lang } = useTranslation()
  const { user, openLogin } = useAuth()

  const [frames, setFrames] = useState<FrameItem[]>([])
  // Default 1fps = each frame holds 1000ms — a slow, readable pace for
  // still-image slideshows (users complained anything faster felt rushed).
  const [fps, setFps] = useState(1)
  const [loop, setLoop] = useState(true)
  const [maxEdge, setMaxEdge] = useState(512)
  const [format, setFormat] = useState<'gif' | 'webm'>('gif')
  const [generating, setGenerating] = useState(false)
  // Which frame is being keyframe-edited (time / scale / rotate / position).
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
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
      if (dims) {
        loaded.push({
          url: trackUrl(f), file: f, width: dims.width, height: dims.height,
          delayMs: Math.round(1000 / Math.max(0.5, fps)), scale: 1, rotate: 0, dx: 0, dy: 0,
        })
      }
    }
    if (loaded.length === 0) return
    const room = Math.max(0, MAX_FRAMES - framesLenRef.current)
    if (loaded.length > room) setError(t.gifMakerMaxFrames.replace('{n}', String(MAX_FRAMES)))
    const kept = loaded.slice(0, room)
    setFrames((prev) => [...prev, ...kept.map((it) => ({ ...it, id: idRef.current++ }))])
  }, [t, trackUrl, clearError, fps])

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

  // Keyframe editor — patch one frame's time/scale/rotate/position.
  const updateFrame = useCallback((
    idx: number,
    patch: Partial<Pick<FrameItem, 'delayMs' | 'scale' | 'rotate' | 'dx' | 'dy'>>,
  ) => {
    setFrames((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }, [])

  // Changing the global FPS applies to every frame immediately (uniform pace by
  // default). Frames can still be fine-tuned individually afterwards.
  const changeFps = useCallback((v: number) => {
    setFps(v)
    const ms = Math.round(1000 / Math.max(0.25, v))
    setFrames((prev) => prev.map((f) => ({ ...f, delayMs: ms })))
  }, [])

  /** true when a frame's settings differ from the current global default */
  const isFrameCustom = (f: FrameItem) =>
    f.scale !== 1 || f.rotate !== 0 || f.dx !== 0 || f.dy !== 0 ||
    f.delayMs !== Math.round(1000 / Math.max(0.5, fps))

  const generate = useCallback(async () => {
    if (frames.length < 2) { setError(t.gifMakerNeedFrames); return }
    setGenerating(true)
    setError(null)
    try {
      // Load every frame and compute its transformed bounding box (rotation +
      // scale) so the union canvas is big enough that nothing gets cropped.
      const loaded = await Promise.all(frames.map(async (frame) => {
        const img = await loadImage(frame.url)
        const fit = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight)) : 1
        const baseW = img.naturalWidth * fit
        const baseH = img.naturalHeight * fit
        const rad = (frame.rotate * Math.PI) / 180
        const cos = Math.abs(Math.cos(rad))
        const sin = Math.abs(Math.sin(rad))
        const w0 = baseW * frame.scale
        const h0 = baseH * frame.scale
        return { img, baseW, baseH, rotW: w0 * cos + h0 * sin, rotH: w0 * sin + h0 * cos, frame }
      }))
      let maxW = 0
      let maxH = 0
      for (const l of loaded) {
        maxW = Math.max(maxW, Math.ceil(l.rotW))
        maxH = Math.max(maxH, Math.ceil(l.rotH))
      }
      if (maxW * maxH > MAX_CANVAS_PIXELS) {
        setError(t.gifMakerSizeHint)
        return
      }
      // Draw each frame centered on the union canvas with its own transform.
      const canvas = document.createElement('canvas')
      canvas.width = maxW
      canvas.height = maxH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const rgbaFrames: GifFrameRgba[] = []
      for (const l of loaded) {
        ctx.clearRect(0, 0, maxW, maxH)
        ctx.save()
        ctx.translate(maxW / 2 + (l.frame.dx / 100) * maxW, maxH / 2 + (l.frame.dy / 100) * maxH)
        ctx.rotate((l.frame.rotate * Math.PI) / 180)
        const dw = l.baseW * l.frame.scale
        const dh = l.baseH * l.frame.scale
        ctx.drawImage(l.img, -dw / 2, -dh / 2, dw, dh)
        ctx.restore()
        rgbaFrames.push({ rgba: ctx.getImageData(0, 0, maxW, maxH).data, width: maxW, height: maxH })
      }
      // GIF or transparent WebM — same frames, different encoders. Each frame
      // carries its own hold time (delays) for the keyframe pacing.
      const delays = frames.map((f) => f.delayMs)
      const blob = format === 'webm'
        ? await framesToWebmBlob(rgbaFrames, { fps, delays })
        : framesToGifBlob(rgbaFrames, { fps, loop, delays })
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
      {frames.map((frame, i) => {
        const selected = selectedIdx === i
        const custom = isFrameCustom(frame)
        return (
        <div key={frame.id} className="relative w-[92px] sm:w-[104px]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedIdx(selected ? null : i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedIdx(selected ? null : i) } }}
            title={custom ? t.animFrameCustomized : undefined}
            aria-pressed={selected}
            className={`relative block w-full aspect-square rounded-xl overflow-hidden glass cursor-pointer transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              selected ? 'ring-2 ring-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]' : 'border border-white/[0.08] hover:border-white/25'
            }`}
          >
            <img src={frame.url} alt={`frame ${i + 1}`} className="w-full h-full object-contain pointer-events-none" draggable={false} />
            <span className="absolute top-1 left-1 z-10 rounded-md bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {i + 1}
            </span>
            {/* badge — this frame has custom time / scale / rotate / position */}
            {custom && (
              <span className="absolute bottom-1 right-1 z-10 w-2.5 h-2.5 rounded-full bg-[var(--accent)] ring-2 ring-black/50"
                title={t.animFrameCustomized} />
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFrame(i) }}
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
        )
      })}
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
              <p className="text-[11px] text-[var(--text-dim)]">
                💡 {selectedIdx !== null ? t.animFrameConfig.replace('{n}', String(selectedIdx + 1)) : t.animClickHint}
              </p>
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
                  {format === 'webm' && (
                    <p className="text-[11px] text-[var(--text-dim)] mt-1">{t.animWebmFpsNote}</p>
                  )}
                </div>

                {/* FPS — shown as the per-frame hold time, which is how users
                    actually feel the speed. fps stays as the backing unit. */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">{t.gifMakerFps}</label>
                    <span className="text-xs font-bold text-[var(--accent)]">
                      {t.animFrameHold} {fmtHoldSec(fps, t.animFrameSeconds)} · {fpsValue} fps
                    </span>
                  </div>
                  <input type="range" min={0.25} max={30} step={0.25} value={fps}
                    onChange={(e) => changeFps(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]" />
                  <p className="text-[11px] text-[var(--text-dim)] mt-2">{t.gifMakerFpsHint}</p>
                </div>

                {/* Selected-frame keyframe editor */}
                {selectedIdx !== null && frames[selectedIdx] && (
                  <FrameConfigPanel
                    frame={frames[selectedIdx]}
                    index={selectedIdx}
                    maxEdge={maxEdge}
                    t={t}
                    onChange={(patch) => updateFrame(selectedIdx, patch)}
                    onClose={() => setSelectedIdx(null)}
                  />
                )}

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

/** Load an image element from an object URL (used by the keyframe compositor). */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

interface SliderRowProps {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  /** optional quick-pick buttons rendered under the slider */
  quick?: { value: number; label: string }[]
}

function SliderRow({ label, value, display, min, max, step, onChange, quick }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-dim)]">{label}</span>
        <span className="text-xs font-bold text-[var(--accent)]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      {quick && (
        <div className="flex gap-1.5 mt-1.5">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => onChange(q.value)}
              className={`flex-1 px-1 py-1 rounded-md text-[11px] font-medium transition-all ${
                Math.abs(value - q.value) < 0.01
                  ? 'glass-active text-[var(--accent)]'
                  : 'glass text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Live canvas preview of one frame with its scale/rotate/offset applied. */
function FramePreview({ frame, maxEdge }: { frame: FrameItem; maxEdge: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let cancelled = false
    loadImage(frame.url)
      .then((img) => {
        if (cancelled) return
        const fit = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight)) : 1
        const baseW = img.naturalWidth * fit
        const baseH = img.naturalHeight * fit
        const rad = (frame.rotate * Math.PI) / 180
        const cos = Math.abs(Math.cos(rad))
        const sin = Math.abs(Math.sin(rad))
        const w0 = baseW * frame.scale
        const h0 = baseH * frame.scale
        const rotW = Math.max(1, Math.ceil(w0 * cos + h0 * sin))
        const rotH = Math.max(1, Math.ceil(w0 * sin + h0 * cos))
        const dp = window.devicePixelRatio || 1
        canvas.width = Math.round(rotW * dp)
        canvas.height = Math.round(rotH * dp)
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.scale(dp, dp)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.clearRect(0, 0, rotW, rotH)
        ctx.save()
        ctx.translate(rotW / 2 + (frame.dx / 100) * rotW, rotH / 2 + (frame.dy / 100) * rotH)
        ctx.rotate(rad)
        ctx.drawImage(img, -w0 / 2, -h0 / 2, w0, h0)
        ctx.restore()
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [frame.url, frame.rotate, frame.scale, frame.dx, frame.dy, maxEdge])
  return (
    <div className="flex items-center justify-center min-h-[80px] rounded-lg bg-black/30 border border-white/[0.06] p-2">
      <canvas ref={ref} className="max-w-full" style={{ maxHeight: 130, width: 'auto', height: 'auto' }} />
    </div>
  )
}

type FrameUpdate = Partial<Pick<FrameItem, 'delayMs' | 'scale' | 'rotate' | 'dx' | 'dy'>>

interface FrameConfigPanelProps {
  frame: FrameItem
  index: number
  maxEdge: number
  t: Translations
  onChange: (patch: FrameUpdate) => void
  onClose: () => void
}

/** Keyframe editor for one selected frame: hold time, scale, rotate, position. */
function FrameConfigPanel({ frame, index, maxEdge, t, onChange, onClose }: FrameConfigPanelProps) {
  return (
    <div data-testid="frame-config" className="rounded-[var(--radius-lg)] border border-[var(--accent)]/25 bg-[var(--accent)]/[0.04] p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-[var(--accent)]">
          {t.animFrameConfig.replace('{n}', String(index + 1))}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] px-2 py-1 rounded-md glass text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
        >
          {t.animCancelSelect}
        </button>
      </div>
      <FramePreview frame={frame} maxEdge={maxEdge} />
      <SliderRow
        label={t.animFrameDuration}
        value={frame.delayMs}
        display={`${(frame.delayMs / 1000).toFixed(1)}${t.animFrameSeconds}`}
        min={100}
        max={3000}
        step={50}
        onChange={(v) => onChange({ delayMs: Math.round(v) })}
        quick={[500, 1000, 2000].map((v) => ({ value: v, label: `${(v / 1000).toFixed(1)}${t.animFrameSeconds}` }))}
      />
      <SliderRow
        label={t.animFrameScale}
        value={frame.scale}
        display={`${Math.round(frame.scale * 100)}${t.animFramePercent}`}
        min={0.5}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ scale: v })}
        quick={[0.5, 1, 1.5, 2].map((v) => ({ value: v, label: `${Math.round(v * 100)}${t.animFramePercent}` }))}
      />
      <SliderRow
        label={t.animFrameRotate}
        value={frame.rotate}
        display={`${Math.round(frame.rotate)}${t.animFrameDeg}`}
        min={-180}
        max={180}
        step={5}
        onChange={(v) => onChange({ rotate: v })}
        quick={[0, 90, 180, -90].map((v) => ({ value: v, label: `${v}${t.animFrameDeg}` }))}
      />
      <SliderRow
        label={t.animFrameHorizontal}
        value={frame.dx}
        display={`${Math.round(frame.dx)}${t.animFramePercent}`}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => onChange({ dx: v })}
      />
      <SliderRow
        label={t.animFrameVertical}
        value={frame.dy}
        display={`${Math.round(frame.dy)}${t.animFramePercent}`}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => onChange({ dy: v })}
      />
    </div>
  )
}
