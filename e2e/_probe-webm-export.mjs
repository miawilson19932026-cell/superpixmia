// Probe the transparent-WebM export path in a REAL browser: loads the dev
// server, dynamically imports src/lib/webm-utils.ts, encodes a 3-frame RGBA
// animation (transparent background + moving opaque dot), and asserts the
// result is a non-empty WebM (EBML magic) with an alpha track that <video> plays.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:5173'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))

await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })

const out = await page.evaluate(async () => {
  try {
    const { framesToWebmBlob, canExportWebm } = await import('/src/lib/webm-utils.ts')
    const w = 64, h = 64
    const frames = []
    for (let i = 0; i < 3; i++) {
      const rgba = new Uint8ClampedArray(w * h * 4)
      for (let p = 0; p < w * h; p++) {
        const x = p % w, y = (p / w) | 0
        const dx = x - 32, dy = y - 32
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r < 14 && x < 32 - i * 5) { rgba[p * 4] = 230; rgba[p * 4 + 1] = 40; rgba[p * 4 + 2] = 40; rgba[p * 4 + 3] = 255 }
        else rgba[p * 4 + 3] = 0
      }
      frames.push({ rgba, width: w, height: h })
    }
    const supported = canExportWebm()
    const blob = await framesToWebmBlob(frames, { fps: 5 })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const magic = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
    // AlphaMode element present with value 1 => the track carries transparency
    let alphaMode = false, i = 0
    while (i < bytes.length - 1) {
      if (bytes[i] === 0x53 && bytes[i + 1] === 0xC0) {
        alphaMode = bytes[i + 2] === 0x81 && bytes[i + 3] === 0x01
        break
      }
      i++
    }
    let playable = false, vw = 0, vh = 0
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.muted = true
    await new Promise((res) => { video.onloadedmetadata = res; video.src = url; setTimeout(res, 5000) })
    if (video.videoWidth > 0) { vw = video.videoWidth; vh = video.videoHeight; playable = true }
    URL.revokeObjectURL(url)
    return { supported, size: bytes.length, type: blob.type, magic, alphaMode, playable, vw, vh }
  } catch (e) {
    return { error: String(e && e.message || e) }
  }
})

console.log('WebM export supported:', out.supported)
console.log('blob:', out.type, out.size + ' bytes')
console.log('EBML magic:', out.magic, '· alpha track:', out.alphaMode)
console.log('video plays it:', out.playable, out.playable ? `(${out.vw}×${out.vh})` : '')
if (out.error) console.log('ERROR:', out.error)
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no page errors')

const ok = !out.error && out.supported && out.size > 100 && out.magic && out.alphaMode && out.playable
await browser.close()
console.log(ok ? 'WEBM PROBE PASSED' : 'WEBM PROBE FAILED')
if (!ok) process.exit(1)
