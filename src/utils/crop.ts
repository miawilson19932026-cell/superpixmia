import { canvasToBlob, getOutputFormat } from './resize'

// Crop rectangle in source-image pixel coordinates.
export interface CropRect {
  x: number      // left edge, px
  y: number      // top edge, px
  width: number  // px
  height: number // px
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(blob)
  })
}

// Cut out `rect` from the source image. The rect is clamped to the image bounds
// and rounded to whole pixels, so a slightly-out-of-range selection still works.
export async function cropImage(blob: Blob, rect: CropRect): Promise<Blob> {
  const img = await loadImage(blob)
  const W = img.width
  const H = img.height

  let x = Math.round(Math.min(Math.max(rect.x, 0), W))
  let y = Math.round(Math.min(Math.max(rect.y, 0), H))
  let w = Math.round(Math.min(Math.max(rect.width, 1), W - x))
  let h = Math.round(Math.min(Math.max(rect.height, 1), H - y))

  // Guard against floating-point drift pushing the box past the edge
  if (x + w > W) w = W - x
  if (y + h > H) h = H - y
  if (w <= 0 || h <= 0) throw new Error('Invalid crop rect')

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
  return canvasToBlob(canvas, getOutputFormat(blob))
}
