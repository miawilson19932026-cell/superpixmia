import imageCompression from 'browser-image-compression'
import type { Dimensions, OutputFormat } from '../types'

export async function resizeImage(
  file: File,
  dims: Dimensions
): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = dims.width
  canvas.height = dims.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, dims.width, dims.height)
  return canvasToBlob(canvas, file.type as OutputFormat)
}

// ---- Compression ----

export async function compressImage(
  file: File,
  quality: number,
  format: OutputFormat
): Promise<Blob> {
  // PNG: use browser-image-compression with PNG output type
  if (format === 'png') {
    return await imageCompression(file, {
      maxSizeMB: Math.max(0.01, (file.size / 1024 / 1024) * quality),
      maxWidthOrHeight: 8192,
      useWebWorker: true,
      initialQuality: quality,
      fileType: 'image/png',
    })
  }
  // JPEG: client-side compression via browser-image-compression
  if (format === 'jpeg') {
    return await imageCompression(file, {
      maxSizeMB: Math.max(0.01, (file.size / 1024 / 1024) * quality),
      maxWidthOrHeight: 8192,
      useWebWorker: true,
      initialQuality: quality,
    })
  }
  // BMP / ICO: no compression library support; re-encode via canvas
  if (format === 'bmp' || format === 'ico') {
    const img = await loadImage(file)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    return canvasToBlob(canvas, format, quality)
  }
  // AVIF: compress via browser-image-compression first, then re-encode to AVIF
  if (format === 'avif') {
    const jpeg = await imageCompression(file, {
      maxSizeMB: Math.max(0.01, (file.size / 1024 / 1024) * quality),
      maxWidthOrHeight: 8192,
      useWebWorker: true,
      initialQuality: quality,
    })
    return jpegBlobToFormat(jpeg, 'avif', quality)
  }
  // WebP: compress as JPEG first, then convert
  const jpeg = await imageCompression(file, {
    maxSizeMB: Math.max(0.01, (file.size / 1024 / 1024) * quality),
    maxWidthOrHeight: 8192,
    useWebWorker: true,
    initialQuality: quality,
  })
  return jpegBlobToFormat(jpeg, 'webp', quality)
}

async function jpegBlobToFormat(jpegBlob: Blob, format: OutputFormat, quality: number): Promise<Blob> {
  const img = await loadImage(new File([jpegBlob], 'temp.jpg', { type: 'image/jpeg' }))
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return canvasToBlob(canvas, format, quality)
}

// ---- Format Conversion ----

export async function convertImage(
  file: File,
  format: OutputFormat,
  quality?: number
): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return canvasToBlob(canvas, format, quality ?? 0.92)
}

// ---- Helpers ----

function loadImage(file: File): Promise<HTMLImageElement> {
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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality = 0.92
): Promise<Blob> {
  // BMP / ICO: custom encoders (browser canvas cannot natively encode these)
  if (format === 'bmp') return encodeBMP(canvas)
  if (format === 'ico') return encodeICO(canvas)

  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      mimeMap[format],
      format === 'png' ? undefined : quality
    )
  })
}

// ── BMP encoder (simple BMP v3, 32-bit BGRA) ──
function encodeBMP(canvas: HTMLCanvasElement): Promise<Blob> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  const rowBytes = width * 4
  const paddedRowBytes = Math.ceil(rowBytes / 4) * 4
  const pixelDataSize = paddedRowBytes * height

  // BITMAPFILEHEADER (14 bytes) + BITMAPINFOHEADER (40 bytes) + pixel data
  const fileSize = 14 + 40 + pixelDataSize
  const buffer = new ArrayBuffer(fileSize)
  const dv = new DataView(buffer)
  let off = 0

  // BITMAPFILEHEADER
  dv.setUint16(off, 0x4D42, true); off += 2  // 'BM'
  dv.setUint32(off, fileSize, true); off += 4
  dv.setUint32(off, 0, true); off += 4       // reserved
  dv.setUint32(off, 54, true); off += 4       // data offset

  // BITMAPINFOHEADER
  dv.setUint32(off, 40, true); off += 4       // header size
  dv.setInt32(off, width, true); off += 4
  dv.setInt32(off, -height, true); off += 4   // negative = top-down
  dv.setUint16(off, 1, true); off += 2        // planes
  dv.setUint16(off, 32, true); off += 2       // bpp
  dv.setUint32(off, 0, true); off += 4        // BI_RGB
  dv.setUint32(off, pixelDataSize, true); off += 4
  dv.setInt32(off, 2835, true); off += 4      // 72 DPI horizontal
  dv.setInt32(off, 2835, true); off += 4      // 72 DPI vertical
  dv.setUint32(off, 0, true); off += 4        // colors used
  dv.setUint32(off, 0, true); off += 4        // important colors

  // Pixel data: BGRA → packed rows (top-down since height is negative)
  const u8 = new Uint8Array(buffer, off)
  const pad = paddedRowBytes - rowBytes
  let srcIdx = 0
  for (let y = 0; y < height; y++) {
    const rowOff = y * paddedRowBytes
    for (let x = 0; x < width; x++) {
      const px = srcIdx * 4
      u8[rowOff + x * 4]     = pixels[px + 2] // B
      u8[rowOff + x * 4 + 1] = pixels[px + 1] // G
      u8[rowOff + x * 4 + 2] = pixels[px]     // R
      u8[rowOff + x * 4 + 3] = pixels[px + 3] // A
      srcIdx++
    }
    // Padding
    for (let p = 0; p < pad; p++) u8[rowOff + rowBytes + p] = 0
  }

  return Promise.resolve(new Blob([buffer], { type: 'image/bmp' }))
}

// ── ICO encoder (PNG data inside ICO container) ──
async function encodeICO(canvas: HTMLCanvasElement): Promise<Blob> {
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('PNG encode failed')),
      'image/png'
    )
  })
  const pngData = new Uint8Array(await pngBlob.arrayBuffer())
  const pngSize = pngData.byteLength
  const imgOffset = 6 + 16 // ICO header (6) + 1 directory entry (16)
  const fileSize = imgOffset + pngSize
  const size = Math.min(canvas.width, 256)

  const buffer = new ArrayBuffer(fileSize)
  const dv = new DataView(buffer)

  // ICO header
  dv.setUint16(0, 0, true)     // reserved
  dv.setUint16(2, 1, true)     // type: icon
  dv.setUint16(4, 1, true)     // count: 1

  // Directory entry (starts at byte 6)
  dv.setUint8(6, size >= 256 ? 0 : size)    // width
  dv.setUint8(7, size >= 256 ? 0 : size)    // height
  dv.setUint8(8, 0)                         // palette
  dv.setUint8(9, 0)                         // reserved
  dv.setUint16(10, 1, true)                  // color planes
  dv.setUint16(12, 32, true)                 // bpp
  dv.setUint32(14, pngSize, true)            // image size
  dv.setUint32(18, imgOffset, true)          // image offset

  // Copy PNG data
  const out = new Uint8Array(buffer)
  out.set(pngData, imgOffset)

  return new Blob([buffer], { type: 'image/x-icon' })
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function getOutputFormat(file: File): OutputFormat {
  const type = file.type
  if (type === 'image/png') return 'png'
  if (type === 'image/jpeg') return 'jpeg'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/avif') return 'avif'
  if (type === 'image/bmp') return 'bmp'
  if (type === 'image/x-icon' || type === 'image/vnd.microsoft.icon') return 'ico'
  return 'png'
}

// Result blob MIME → download file extension. canvas.toBlob can yield any of
// these; ICO/BMP come from our custom encoders, the rest from native toBlob.
export function getResultExtension(blob: Blob): string {
  switch (blob.type) {
    case 'image/png': return 'png'
    case 'image/jpeg': return 'jpg'
    case 'image/webp': return 'webp'
    case 'image/avif': return 'avif'
    case 'image/bmp': return 'bmp'
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon': return 'ico'
    default: return 'png'
  }
}
