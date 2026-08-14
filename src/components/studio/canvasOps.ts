// Canvas compositing helpers for the Studio editor. These produce the final
// blob for each paint-style tool (pencil strokes, heal mask, cutout, click-to-
// remove). All coordinates are in source-image pixels.

import { canvasToBlob, getOutputFormat } from '../../utils/resize'

export interface StrokePt { x: number; y: number }
export interface Stroke {
  pts: StrokePt[]
  color: string
  size: number      // line width / brush diameter, in image px
  erase?: boolean   // heal: this stroke clears the mask instead of painting it
}

function loadBlobImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img) }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(blob)
  })
}

// ── Pencil: burn strokes into the image, keep the original format ──
export async function compositeStrokes(blob: Blob, strokes: Stroke[]): Promise<Blob> {
  const img = await loadBlobImage(blob)
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  for (const s of strokes) {
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
  return canvasToBlob(c, getOutputFormat(blob))
}

// ── Heal: strokes → mask (Uint8Array W×H, 0/255). Erase strokes remove mask. ──
export function buildMaskFromStrokes(W: number, H: number, strokes: Stroke[]): Uint8Array {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  for (const s of strokes) {
    if (s.pts.length < 1) continue
    ctx.beginPath()
    ctx.moveTo(s.pts[0].x, s.pts[0].y)
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y)
    ctx.lineWidth = Math.max(1, s.size)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over'
    ctx.strokeStyle = '#fff'
    ctx.stroke()
  }
  const data = ctx.getImageData(0, 0, W, H).data
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) mask[i] = data[i * 4 + 3]
  return mask
}

// ── Cutout: keep only the region inside the closed path → PNG (transparency) ──
export async function cutoutRegion(blob: Blob, pts: StrokePt[]): Promise<Blob> {
  if (pts.length < 3) return blob
  const img = await loadBlobImage(blob)
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.fillStyle = '#fff'
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fill()
  return canvasToBlob(c, 'png')
}

// ── Click-to-remove: set alpha to 0 wherever the mask is set → PNG ──
export async function removeMasked(blob: Blob, mask: (Uint8Array | boolean[]) | null): Promise<Blob> {
  if (!mask) return blob
  const img = await loadBlobImage(blob)
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, c.width, c.height)
  const px = imageData.data
  let changed = false
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && px[i * 4 + 3] !== 0) { px[i * 4 + 3] = 0; changed = true }
  }
  if (!changed) return blob
  ctx.putImageData(imageData, 0, 0)
  return canvasToBlob(c, 'png')
}

// ── Magic wand: connected region around (x,y) within RGB tolerance ──
// Returns a boolean[] (W×H, true = selected). Color is compared against the
// pixel at the seed point, so clicking a sky region selects sky-like pixels.
//
// opts.matchTransparent — used by the refine panel's "restore" wand. A fully
// transparent seed normally selects nothing (so users don't nuke a transparent
// PNG by clicking empty space), but restoring means clicking a transparent hole
// to bring the original back, so here the connected region of any non-opaque
// pixel (alpha < 255) is selected instead — exactly the area the erase touched.
export function floodFill(
  imgData: ImageData,
  sx: number,
  sy: number,
  tolerance: number,
  opts?: { matchTransparent?: boolean },
): boolean[] {
  const { width: W, height: H } = imgData
  const px = imgData.data
  const sx0 = Math.round(Math.min(Math.max(sx, 0), W - 1))
  const sy0 = Math.round(Math.min(Math.max(sy, 0), H - 1))
  const seed = sy0 * W + sx0
  const sr = px[seed * 4]
  const sg = px[seed * 4 + 1]
  const sb = px[seed * 4 + 2]
  const sa = px[seed * 4 + 3]

  // Restore-on-transparent: select any connected non-opaque region.
  const matchAlpha = opts?.matchTransparent === true && sa < 255
  // Fully transparent seeds select the whole transparent area; treat as no-op
  // so users don't nuke a transparent PNG by clicking empty space.
  if (!matchAlpha && sa === 0) return new Array(W * H).fill(false)

  const tol2 = tolerance * tolerance * 3 // squared RGB distance
  const selected = new Uint8Array(W * H)
  const stack: number[] = [seed]
  selected[seed] = 1
  while (stack.length) {
    const idx = stack.pop()!
    const x = idx % W
    const y = (idx / W) | 0
    // 4-connected neighbors
    if (x > 0) tryFill(idx - 1)
    if (x < W - 1) tryFill(idx + 1)
    if (y > 0) tryFill(idx - W)
    if (y < H - 1) tryFill(idx + W)
  }
  function tryFill(i: number) {
    if (selected[i]) return
    if (matchAlpha) {
      // Any non-opaque pixel counts — the erase touched it, restore it.
      if (px[i * 4 + 3] < 255) {
        selected[i] = 1
        stack.push(i)
      }
      return
    }
    const r = px[i * 4]
    const g = px[i * 4 + 1]
    const b = px[i * 4 + 2]
    const dr = r - sr, dg = g - sg, db = b - sb
    if (dr * dr + dg * dg + db * db <= tol2) {
      selected[i] = 1
      stack.push(i)
    }
  }
  return Array.from(selected, (v) => v === 1)
}
