// Client-side watermark removal via brush-heal inpainting.
//
// The user paints a mask over the watermark; this function fills every masked
// pixel with the color of the nearest unmasked neighbor (a BFS over the mask's
// bounding box), then smooths the filled area with a light box blur. That gives
// clean results on the common case — watermarks, stamps and stray text over
// flat / light backgrounds — and acceptable results on lightly textured ones.
// All work happens in the browser; nothing is ever uploaded.
import { canvasToBlob, getOutputFormat } from './resize'

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export async function removeWatermark(
  file: Blob,
  mask: Uint8Array,
  maskWidth: number,
  maskHeight: number,
): Promise<Blob> {
  const img = await loadImage(file)
  const W = img.width
  const H = img.height

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, W, H)
  const data = imageData.data

  // The brush mask is drawn at the panel's working resolution, which may not
  // match the full-res image — scale it proportionally to image pixels.
  let m: Uint8Array
  if (maskWidth === W && maskHeight === H) {
    m = mask
  } else {
    m = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      const my = Math.min(maskHeight - 1, Math.floor((y / H) * maskHeight))
      for (let x = 0; x < W; x++) {
        const mx = Math.min(maskWidth - 1, Math.floor((x / W) * maskWidth))
        if (mask[my * maskWidth + mx]) m[y * W + x] = 1
      }
    }
  }

  // Nothing masked → return the original image re-encoded.
  let any = false
  for (let i = 0; i < m.length; i++) {
    if (m[i]) { any = true; break }
  }
  if (!any) return canvasToBlob(canvas, getOutputFormat(file))

  inpaint(data, W, H, m)

  ctx.putImageData(imageData, 0, 0)
  return canvasToBlob(canvas, getOutputFormat(file))
}

// Fill the masked pixels in `data` (RGBA, W×H) with their surroundings.
function inpaint(data: Uint8ClampedArray, W: number, H: number, m: Uint8Array): void {
  // Bounding box of the mask — processing is limited to it plus a border, so a
  // small watermark costs almost nothing even on a large photo.
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) {
    const row = y * W
    for (let x = 0; x < W; x++) {
      if (m[row + x]) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return

  const pad = 24
  const rx0 = Math.max(0, x0 - pad)
  const ry0 = Math.max(0, y0 - pad)
  const rx1 = Math.min(W - 1, x1 + pad)
  const ry1 = Math.min(H - 1, y1 + pad)
  const rw = rx1 - rx0 + 1
  const rh = ry1 - ry0 + 1

  const visited = new Uint8Array(rw * rh)
  const queue = new Int32Array(rw * rh)
  let head = 0
  let tail = 0

  const ridxAt = (x: number, y: number) => (y - ry0) * rw + (x - rx0)
  const isMasked = (x: number, y: number) => m[y * W + x] === 1

  // Seed the queue with every unmasked pixel in the region — each is a color
  // source for the hole around it.
  for (let y = ry0; y <= ry1; y++) {
    for (let x = rx0; x <= rx1; x++) {
      if (!isMasked(x, y)) {
        const r = ridxAt(x, y)
        visited[r] = 1
        queue[tail++] = r
      }
    }
  }

  // BFS: each masked pixel inherits the color of the nearest unmasked source,
  // so the hole is filled from its own surrounding pixels. FIFO order keeps it
  // level-by-level, which is exactly "nearest first".
  const fillNeighbor = (r: number, nx: number, ny: number, cr: number, cg: number, cb: number, ca: number) => {
    if (visited[r] || !isMasked(nx, ny)) return
    visited[r] = 1
    const p = (ny * W + nx) * 4
    data[p] = cr
    data[p + 1] = cg
    data[p + 2] = cb
    data[p + 3] = ca
    queue[tail++] = r
  }

  while (head < tail) {
    const r = queue[head++]
    const lx = r % rw
    const ly = (r / rw) | 0
    const x = lx + rx0
    const y = ly + ry0
    const px = (y * W + x) * 4
    const cr = data[px]
    const cg = data[px + 1]
    const cb = data[px + 2]
    const ca = data[px + 3]

    if (lx > 0) fillNeighbor(r - 1, x - 1, y, cr, cg, cb, ca)
    if (lx < rw - 1) fillNeighbor(r + 1, x + 1, y, cr, cg, cb, ca)
    if (ly > 0) fillNeighbor(r - rw, x, y - 1, cr, cg, cb, ca)
    if (ly < rh - 1) fillNeighbor(r + rw, x, y + 1, cr, cg, cb, ca)
  }

  // Smooth the fill: two 3×3 box-blur passes over masked pixels only, each pass
  // reading a frozen snapshot of the region so the blur stays isotropic. At the
  // mask edge this blends the fill into the original pixels, hiding the seam.
  for (let pass = 0; pass < 2; pass++) {
    const region = new Uint8ClampedArray(rw * rh * 4)
    for (let y = ry0; y <= ry1; y++) {
      for (let x = rx0; x <= rx1; x++) {
        const r = ridxAt(x, y)
        const p = (y * W + x) * 4
        region[r * 4] = data[p]
        region[r * 4 + 1] = data[p + 1]
        region[r * 4 + 2] = data[p + 2]
        region[r * 4 + 3] = data[p + 3]
      }
    }
    for (let y = ry0; y <= ry1; y++) {
      for (let x = rx0; x <= rx1; x++) {
        if (!isMasked(x, y)) continue
        let sumR = 0, sumG = 0, sumB = 0, n = 0
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy
          if (ny < ry0 || ny > ry1) continue
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            if (nx < rx0 || nx > rx1) continue
            const r = ridxAt(nx, ny)
            sumR += region[r * 4]
            sumG += region[r * 4 + 1]
            sumB += region[r * 4 + 2]
            n++
          }
        }
        const p = (y * W + x) * 4
        data[p] = sumR / n
        data[p + 1] = sumG / n
        data[p + 2] = sumB / n
      }
    }
  }
}
