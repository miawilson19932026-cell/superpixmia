// Transparent-WebM encoding for the /gif-maker tool (an "animation maker"
// since it can also emit transparent WebM video) — runs entirely in the browser.
//
// Why MediaRecorder and not WebCodecs? WebCodecs `alpha:'keep'` throws
// "Alpha encoding is not currently supported" on Chrome/Edge, whereas the
// MediaRecorder → canvas.captureStream() → VP8 path DOES carry a real alpha
// track (verified: Matroska AlphaMode=1 in the output). GIF has 1-bit alpha;
// WebM carries full 8-bit alpha, so anti-aliased edges stay clean.
//
// Encoding is real-time: frames are painted onto a canvas at the chosen fps
// and captured as a video. That's why a 30-frame 10fps animation takes ~3s.

import type { GifFrameRgba } from './gif-utils'

export interface WebmEncodeOptions {
  /** frames per second — fallback paint cadence when `delays` is missing */
  fps: number
  /** per-frame hold time in ms (index i ↔ frame i); falls back to 1000/fps */
  delays?: number[]
}

function pickMimeType(): string {
  const candidates = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm']
  for (const mt of candidates) {
    if (MediaRecorder.isTypeSupported(mt)) return mt
  }
  throw new Error('webcodecs-unavailable')
}

/** Encode RGBA frames into a transparent-background WebM video Blob. */
export async function framesToWebmBlob(frames: GifFrameRgba[], opts: WebmEncodeOptions): Promise<Blob> {
  if (frames.length === 0) throw new Error('no frames')
  if (typeof MediaRecorder === 'undefined') throw new Error('webcodecs-unavailable')
  const { fps, delays } = opts
  const { width, height } = frames[0]

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  // Drive capture manually (captureStream(0)) so WE own the timeline. Chrome's
  // captureStream only emits a frame when the canvas content CHANGES — a frame
  // just sitting for its hold time emits nothing, and MediaRecorder collapses
  // the whole video into ~1 frame. So the sampling tick re-putImageData()s the
  // CURRENT frame every ~1/24s (which dirties the canvas even when pixels are
  // identical) then requestFrame()s — MediaRecorder's timestamps then track
  // real wall-clock time, and per-frame hold times show up in the video. VP8
  // collapses static frames, so the file stays small.
  const stream = canvas.captureStream(0)
  const holdMs = (i: number) => Math.max(16, delays?.[i] ?? Math.round(1000 / Math.max(1, fps)))
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack

  const mimeType = pickMimeType()
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const stopped = new Promise<void>((res) => { rec.onstop = () => res() })

  // One ImageData per frame, reused on every tick.
  const images = frames.map((f) => new ImageData(new Uint8ClampedArray(f.rgba), width, height))
  const put = (i: number) => ctx.putImageData(images[i], 0, 0)
  let current = 0
  put(0)
  rec.start(100)
  const keepAlive = setInterval(() => {
    put(current)
    track.requestFrame()
  }, Math.round(1000 / 24))
  // Each frame stays on the canvas for ITS OWN hold time before the next one
  // replaces it — the "per-frame duration" of a keyframe editor.
  for (let i = 1; i < frames.length; i++) {
    await new Promise((r) => setTimeout(r, holdMs(i - 1)))
    current = i
    put(i)
  }
  // trailing time so the final frame is visible before the stream ends
  await new Promise((r) => setTimeout(r, holdMs(frames.length - 1)))
  clearInterval(keepAlive)
  rec.stop()
  await stopped
  track.stop()

  const blob = new Blob(chunks, { type: 'video/webm' })
  if (blob.size === 0) throw new Error('webm-empty')
  return blob
}

/** true when transparent-WebM export is even possible in this browser. */
export function canExportWebm(): boolean {
  if (typeof MediaRecorder === 'undefined') return false
  try { pickMimeType(); return true } catch { return false }
}
