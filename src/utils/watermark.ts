import { canvasToBlob, getOutputFormat } from './resize'

export type WatermarkPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface WatermarkOptions {
  type: 'text' | 'image'
  text: string
  color: string
  fontSize: number      // fraction of image width (0.01 = 1%)
  opacity: number       // 0..1
  font?: string         // CSS font-family stack (Studio text tool); defaults to system-ui stack
  position: WatermarkPosition
  tiled: boolean
  imageUrl: string | null   // data/object URL of the logo image
  imageScale: number        // logo width as fraction of image width
  // Free positioning (Studio drag): when both x & y are provided they override
  // `position`. x/y are the top-left of the element box in source-image px.
  x?: number
  y?: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

// x/y so that an element of size ew×eh sits at the requested spot, `m` px margin.
function computePosition(
  pos: WatermarkPosition,
  W: number,
  H: number,
  ew: number,
  eh: number,
  m: number,
): [number, number] {
  const xAxis = pos.includes('left') ? 'left' : pos.includes('right') ? 'right' : 'center'
  const yAxis = pos.startsWith('top') ? 'top' : pos.startsWith('bottom') ? 'bottom' : 'center'
  const x = xAxis === 'left' ? m : xAxis === 'right' ? W - ew - m : (W - ew) / 2
  const y = yAxis === 'top' ? m : yAxis === 'bottom' ? H - eh - m : (H - eh) / 2
  return [x, y]
}

// Classic anti-theft look: repeated text rows that cover the whole image.
function drawTextTiled(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSizePx: number,
  opacity: number,
  color: string,
  W: number,
  H: number,
): void {
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  ctx.font = `600 ${fontSizePx}px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textBaseline = 'middle'
  const gapX = ctx.measureText(text).width + fontSizePx * 2
  const gapY = fontSizePx * 2.2
  ctx.translate(W / 2, H / 2)
  ctx.rotate(-Math.PI / 6) // -30° for the classic diagonal watermark
  const span = Math.hypot(W, H) // cover the canvas fully after rotation
  for (let y = -span; y < span; y += gapY) {
    for (let x = -span; x < span; x += gapX) {
      ctx.fillText(text, x, y)
    }
  }
  ctx.restore()
}

function drawImageTiled(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  logoW: number,
  logoH: number,
  opacity: number,
  W: number,
  H: number,
): void {
  ctx.save()
  ctx.globalAlpha = opacity
  const gapX = logoW * 1.2
  const gapY = logoH * 1.2
  for (let y = 0; y < H; y += gapY) {
    for (let x = 0; x < W; x += gapX) {
      ctx.drawImage(logo, x, y, logoW, logoH)
    }
  }
  ctx.restore()
}

export async function watermarkImage(blob: Blob, options: WatermarkOptions): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  const img = await loadImage(url)
  const W = img.width
  const H = img.height
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)

  const margin = Math.max(12, W * 0.03)

  const freePos = options.x !== undefined && options.y !== undefined

  if (options.type === 'text' && options.text.trim()) {
    const fontSizePx = Math.max(10, W * options.fontSize)
    if (options.tiled) {
      drawTextTiled(ctx, options.text.trim(), fontSizePx, options.opacity, options.color, W, H)
    } else {
      ctx.save()
      ctx.globalAlpha = options.opacity
      ctx.fillStyle = options.color
      ctx.font = `600 ${fontSizePx}px ${options.font ?? 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'}`
      ctx.textBaseline = 'middle'
      const text = options.text.trim()
      const tw = ctx.measureText(text).width
      const [x, y] = freePos
        ? [options.x!, options.y! + fontSizePx / 2] // free coords are the text box top-left
        : computePosition(options.position, W, H, tw, fontSizePx, margin)
      // Subtle shadow keeps the text legible on busy backgrounds.
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = fontSizePx * 0.15
      ctx.shadowOffsetY = fontSizePx * 0.06
      ctx.fillText(text, x, y)
      ctx.restore()
    }
  } else if (options.type === 'image' && options.imageUrl) {
    const logo = await loadImage(options.imageUrl)
    const logoW = W * options.imageScale
    const logoH = logoW * (logo.height / logo.width)
    if (options.tiled) {
      drawImageTiled(ctx, logo, logoW, logoH, options.opacity, W, H)
    } else {
      const [x, y] = freePos
        ? [options.x!, options.y!] // free coords are the logo box top-left
        : computePosition(options.position, W, H, logoW, logoH, margin)
      ctx.save()
      ctx.globalAlpha = options.opacity
      ctx.drawImage(logo, x, y, logoW, logoH)
      ctx.restore()
    }
  }
  // No valid watermark → returns the source image re-encoded (unchanged).

  return canvasToBlob(canvas, getOutputFormat(blob))
}
