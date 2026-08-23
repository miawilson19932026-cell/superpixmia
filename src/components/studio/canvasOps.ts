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

// ── Clone stamp (临摹): copy a brush-sized disc from the ORIGINAL base image
// ── at (pt − offset) onto each brush point. The source is always the untouched
// base, never the partially-painted canvas, so overlapping strokes copy fresh
// pixels instead of stacking (PS's aligned clone behavior).
export async function cloneStamp(
  blob: Blob,
  strokes: { src: { x: number; y: number }; pts: StrokePt[] }[],
  W: number,
  H: number,
  size: number,
): Promise<Blob> {
  if (!strokes.length) return blob
  const img = await loadBlobImage(blob)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const r = Math.max(1, size / 2)
  for (const s of strokes) {
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
      ctx.drawImage(img, sx - r, sy - r, r * 2, r * 2, p.x - r, p.y - r, r * 2, r * 2)
      ctx.restore()
    }
  }
  return canvasToBlob(c, getOutputFormat(blob))
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
): Uint8Array {
  const { width: W, height: H } = imgData
  const px = imgData.data
  // Read RGBA as packed u32 (little-endian: R<<0 | G<<8 | B<<16 | A<<24) so each
  // pixel is one typed read instead of four clamped-byte reads — the wand runs
  // over ~6M pixels on a phone photo and this measurably cuts the freeze.
  const u32 = new Uint32Array(px.buffer, px.byteOffset, px.byteLength >> 2)
  const sx0 = Math.round(Math.min(Math.max(sx, 0), W - 1))
  const sy0 = Math.round(Math.min(Math.max(sy, 0), H - 1))
  const seed = sy0 * W + sx0
  const seedPx = u32[seed]
  const sr = seedPx & 0xff
  const sg = (seedPx >> 8) & 0xff
  const sb = (seedPx >> 16) & 0xff
  const sa = (seedPx >> 24) & 0xff

  // Restore-on-transparent: select any connected non-opaque region.
  const matchAlpha = opts?.matchTransparent === true && sa < 255
  // Fully transparent seeds select the whole transparent area; treat as no-op
  // so users don't nuke a transparent PNG by clicking empty space.
  if (!matchAlpha && sa === 0) return new Uint8Array(W * H)

  const tol2 = tolerance * tolerance * 3 // squared RGB distance
  const selected = new Uint8Array(W * H)
  const matchColor = (i: number) => {
    const p = u32[i]
    const dr = (p & 0xff) - sr
    const dg = ((p >> 8) & 0xff) - sg
    const db = ((p >> 16) & 0xff) - sb
    return dr * dr + dg * dg + db * db <= tol2
  }
  const matchA = (i: number) => ((u32[i] >> 24) & 0xff) < 255 // any non-opaque
  const ok = matchAlpha ? matchA : matchColor

  // Scanline fill: expands whole horizontal runs and only revisits boundary
  // rows, so it touches each selected pixel ~once instead of pushing it on a
  // per-pixel stack 4 times. Several times faster than 4-neighbor BFS on a
  // big region (a full-background click on a 3000px photo), which is exactly
  // the wand's worst case.
  const stack: number[] = []
  stack.push(sy0, sx0, sx0) // [y, x1, x2]
  while (stack.length) {
    stack.pop() // x2 — the run's right edge; expansion recomputes it
    const x1 = stack.pop()!
    const y = stack.pop()!
    let sx1 = x1, sx2 = x1
    while (sx1 > 0 && !selected[y * W + sx1 - 1] && ok(y * W + sx1 - 1)) sx1--
    while (sx2 < W - 1 && !selected[y * W + sx2 + 1] && ok(y * W + sx2 + 1)) sx2++
    for (let x = sx1; x <= sx2; x++) selected[y * W + x] = 1
    if (y > 0) pushRun(y - 1, sx1, sx2)
    if (y < H - 1) pushRun(y + 1, sx1, sx2)
  }
  function pushRun(ny: number, from: number, to: number) {
    const base = ny * W
    let x = from
    while (x <= to) {
      if (selected[base + x] || !ok(base + x)) { x++; continue }
      const s = x
      while (x <= to && !selected[base + x] && ok(base + x)) x++
      stack.push(ny, s, x - 1)
    }
  }
  return selected
}

// Grow a binary mask outward by `radius` px (morphological dilation, separable
// two-pass sliding window). Used on magic-wand selections so the thin
// anti-aliased fringe between the subject and a flat background (the "白边"
// leftover) is swallowed before the area is made transparent.
export function dilateMask(mask: Uint8Array, W: number, H: number, radius = 2): Uint8Array {
  const r = Math.max(1, Math.round(radius))
  const win = 2 * r + 1
  const tmp = new Uint8Array(mask.length)
  // horizontal pass
  for (let y = 0; y < H; y++) {
    const row = y * W
    let sum = 0
    for (let i = 0; i < W + r; i++) {
      if (i < W) sum += mask[row + i]
      const drop = i - win
      if (drop >= 0 && drop < W) sum -= mask[row + drop]
      const out = i - r
      if (out >= 0 && out < W && sum > 0) tmp[row + out] = 1
    }
  }
  // vertical pass
  const out = new Uint8Array(mask.length)
  for (let x = 0; x < W; x++) {
    let sum = 0
    for (let i = 0; i < H + r; i++) {
      if (i < H) sum += tmp[i * W + x]
      const drop = i - win
      if (drop >= 0 && drop < H) sum -= tmp[drop * W + x]
      const outY = i - r
      if (outY >= 0 && outY < H && sum > 0) out[outY * W + x] = 1
    }
  }
  return out
}

// Marching-squares outline of a binary mask. Returns one compact Path2D of
// boundary segments — a cheap O(W*H) scan where the path size ≈ the perimeter —
// instead of one `rect` per edge pixel. The old per-pixel approach built a path
// with hundreds of thousands of tiny subpaths on a large selection, which made
// the magic-wand click visibly freeze (and worse on big phone photos).
export function maskOutlinePath(mask: ArrayLike<number> | ArrayLike<boolean>, W: number, H: number, invert = false): Path2D {
  const path = new Path2D()
  // Case code → cell-edge midpoints the contour crosses. Corners: bit0=TL,
  // bit1=TR, bit2=BR, bit3=BL. Edge midpoints: L=(x, y+0.5) T=(x+0.5, y)
  // R=(x+1, y+0.5) B=(x+0.5, y+1). Pairs are [from, to]. Inverting the mask
  // flips every corner bit (k ^ 15), and the table is complementary so the same
  // contour segments come out — no need to touch the mask itself.
  const L = 1, T = 2, R = 4, B = 8
  const CASES: number[][] = [
    [],             // 0
    [L, T],         // 1  TL
    [T, R],         // 2  TR
    [L, R],         // 3  TL|TR
    [R, B],         // 4  BR
    [L, T, R, B],   // 5  TL|BR (saddle)
    [T, B],         // 6  TR|BR
    [L, B],         // 7  TL|TR|BR
    [B, L],         // 8  BL
    [T, B],         // 9  TL|BL
    [T, R, B, L],   // 10 TR|BL (saddle)
    [R, B],         // 11 TL|TR|BL
    [L, R],         // 12 BR|BL
    [T, R],         // 13 TL|BR|BL
    [L, T],         // 14 TR|BR|BL
    [],             // 15
  ]
  const inv = invert ? 15 : 0
  for (let y = 0; y < H; y++) {
    const row = y * W
    const yIn = y + 1 < H
    const rowN = row + W
    for (let x = 0; x < W; x++) {
      const xIn = x + 1 < W
      const a = mask[row + x] ? 1 : 0
      const b = (xIn && mask[row + x + 1]) ? 1 : 0
      const c = (yIn && xIn && mask[rowN + x + 1]) ? 1 : 0
      const d = (yIn && mask[rowN + x]) ? 1 : 0
      const k = (a | (b << 1) | (c << 2) | (d << 3)) ^ inv
      const segs = CASES[k]
      if (!segs.length) continue
      // Edge midpoints: L=(x, y+0.5) T=(x+0.5, y) R=(x+1, y+0.5) B=(x+0.5, y+1).
      // Only boundary cells reach here, so the loop count ≈ the perimeter.
      const cx = x + 0.5, cy = y + 0.5
      for (let s = 0; s < segs.length; s += 2) {
        const f = segs[s], t = segs[s + 1]
        const x1 = f === L ? x : f === R ? x + 1 : cx
        const y1 = f === T ? y : f === B ? y + 1 : cy
        const x2 = t === L ? x : t === R ? x + 1 : cx
        const y2 = t === T ? y : t === B ? y + 1 : cy
        path.moveTo(x1, y1)
        path.lineTo(x2, y2)
      }
    }
  }
  return path
}
