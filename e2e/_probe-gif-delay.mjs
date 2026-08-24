// Verify the GIF encoder writes each frame's own delay correctly. GIF delays
// live in Graphic Control Extension blocks as centiseconds (1/100s). Two frames
// with delays [500, 2000] must produce GCE delays [50, 200].
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:5173'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })

const out = await page.evaluate(async () => {
  const { framesToGifBlob } = await import('/src/lib/gif-utils.ts')
  const w = 16, h = 16
  const mk = (c) => {
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let p = 0; p < w * h; p++) { rgba[p * 4] = c; rgba[p * 4 + 1] = 0; rgba[p * 4 + 2] = 0; rgba[p * 4 + 3] = 255 }
    return { rgba, width: w, height: h }
  }
  const blob = framesToGifBlob([mk(255), mk(128)], { fps: 1, loop: true, delays: [500, 2000] })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const delays = []
  for (let i = 0; i < bytes.length - 8; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xF9 && bytes[i + 2] === 0x04) {
      delays.push(bytes[i + 4] + (bytes[i + 5] << 8)) // 16-bit LE, centiseconds
    }
  }
  return { delays, size: bytes.length, header: String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]) }
})

console.log('GIF GCE delays (centiseconds):', out.delays.join(', '), '· expect [50, 200]')
console.log('header:', out.header, '· size', out.size, 'B')
await browser.close()
const ok = out.header === 'GIF89a' && out.delays[0] === 50 && out.delays[1] === 200
console.log(ok ? 'GIF DELAYS CORRECT ✓' : 'GIF DELAYS WRONG ✗')
if (!ok) process.exit(1)
