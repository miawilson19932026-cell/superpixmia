import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'

export const config = {
  api: {
    bodyParser: false, // Handle raw body for binary upload
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const format = (req.query.format as string) || 'png'
    const quality = parseInt(req.query.quality as string) || 80

    // Collect raw body chunks
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'No image data' })
    }

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large (max 20MB)' })
    }

    let result: Buffer

    switch (format) {
      case 'png': {
        // Real PNG compression with pngquant-quality palette
        result = await sharp(buffer)
          .png({ quality: Math.round(quality * 0.9 + 10), compressionLevel: 9, palette: true })
          .toBuffer()
        break
      }
      case 'jpeg': {
        result = await sharp(buffer)
          .jpeg({ quality, mozjpeg: true })
          .toBuffer()
        break
      }
      case 'webp': {
        result = await sharp(buffer)
          .webp({ quality })
          .toBuffer()
        break
      }
      default:
        return res.status(400).json({ error: `Unsupported format: ${format}` })
    }

    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    }

    res.setHeader('Content-Type', mimeMap[format])
    res.setHeader('Content-Length', result.length)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(result)
  } catch (err) {
    console.error('Compress error:', err)
    return res.status(500).json({ error: 'Compression failed' })
  }
}
