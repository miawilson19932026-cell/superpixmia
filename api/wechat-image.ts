import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, list, del } from '@vercel/blob'

export const config = {
  api: {
    bodyParser: false, // Handle raw body for binary upload
  },
}

// Android WeChat can't long-press save blob:/data: images — it re-requests a
// real URL when saving. This endpoint stores the image temporarily in Vercel
// Blob so WeChat has an authentic HTTP(S) address to save from.
// Files are auto-deleted ~30 min after upload (best-effort cleanup on each call).
const EXPIRY_MS = 30 * 60 * 1000
const MAX_BYTES = 8 * 1024 * 1024

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const extRaw = (req.query.ext as string) || 'png'
    const safeExt = extRaw === 'png' ? 'png' : extRaw === 'jpg' || extRaw === 'jpeg' ? 'jpg' : 'webp'
    const mime = safeExt === 'png' ? 'image/png' : safeExt === 'jpg' ? 'image/jpeg' : 'image/webp'

    // Collect raw body chunks
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'No image data' })
    }
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Image too large (max 8MB)' })
    }

    const filename = `wechat/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`

    const { url } = await put(filename, buffer, {
      access: 'public', // WeChat re-requests without referrer/cookies — must be open
      contentType: mime,
      cacheControl: 'public, max-age=1800',
    })

    // Opportunistic cleanup of expired temp images (best-effort)
    try {
      const { blobs } = await list({ prefix: 'wechat/' })
      const now = Date.now()
      for (const b of blobs) {
        const m = b.pathname.match(/wechat\/(\d+)-/)
        if (m && now - parseInt(m[1], 10) > EXPIRY_MS) {
          await del(b.url)
        }
      }
    } catch {
      // cleanup failure is fine — old files expire from CDN cache
    }

    return res.status(200).json({ url })
  } catch (err) {
    console.error('WeChat image upload error:', err)
    return res.status(500).json({ error: 'Upload failed' })
  }
}
