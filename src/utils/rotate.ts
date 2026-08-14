import { canvasToBlob, getOutputFormat } from './resize'

export interface RotateOptions {
  angle: number   // degrees clockwise; any value incl. 90/180/270 steps
  flipX: boolean  // mirror left-right
  flipY: boolean  // mirror top-bottom
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

// Rotate (and optionally mirror) the source image. The canvas is sized to the
// rotated bounding box so nothing is clipped; non-90° angles leave white corners
// (a solid white base keeps JPEG from turning those pixels black on encode).
export async function rotateImage(blob: Blob, options: RotateOptions): Promise<Blob> {
  const img = await loadImage(blob)
  const W = img.width
  const H = img.height
  const { angle, flipX, flipY } = options

  const rad = (angle * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  // Rotated bounding box — exact (H×W) for 90°/180°/270°.
  const newW = Math.max(1, Math.round(W * cos + H * sin))
  const newH = Math.max(1, Math.round(W * sin + H * cos))

  const canvas = document.createElement('canvas')
  canvas.width = newW
  canvas.height = newH
  const ctx = canvas.getContext('2d')!
  // White base so non-90° rotations never reveal a black corner on JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, newW, newH)

  // Transform order: mirror first, then rotate — scale applies to the source
  // before rotation, which is what users expect from "flip then rotate".
  ctx.translate(newW / 2, newH / 2)
  ctx.rotate(rad)
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1)
  ctx.drawImage(img, -W / 2, -H / 2)

  return canvasToBlob(canvas, getOutputFormat(blob))
}
