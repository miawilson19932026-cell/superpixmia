// Seek-based duration probe: 2 frames delays [800,1200] must yield a ~2s video.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:5173'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })

const out = await page.evaluate(async () => {
  const { framesToWebmBlob } = await import('/src/lib/webm-utils.ts')
  const w = 64, h = 64
  const frames = []
  for (let i = 0; i < 2; i++) {
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let p = 0; p < w * h; p++) rgba[p * 4 + 3] = 255
    for (let p = 0; p < w * h; p++) rgba[p * 4 + i] = 200
    frames.push({ rgba, width: w, height: h })
  }
  const blob = await framesToWebmBlob(frames, { fps: 1, delays: [800, 1200] })
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.src = url
  await new Promise((res) => { video.onloadedmetadata = res; setTimeout(res, 8000) })
  const seek = async (t) => { video.currentTime = t; await new Promise((r) => setTimeout(r, 400)); return video.currentTime }
  const s1_5 = await seek(1.5)
  const s1_9 = await seek(1.9)
  // Frame 0 is red, frame 1 is green — sample the pixel at 0.4s (expect red) and 1.5s (expect green).
  video.currentTime = 0.4; await new Promise((r) => setTimeout(r, 400))
  const c0 = document.createElement('canvas'); c0.width = 1; c0.height = 1
  const c0x = c0.getContext('2d'); c0x.drawImage(video, 0, 0, 64, 64, 0, 0, 1, 1)
  const pxAt0_4 = Array.from(c0x.getImageData(0, 0, 1, 1).data)
  video.currentTime = 1.5; await new Promise((r) => setTimeout(r, 400))
  const c1 = document.createElement('canvas'); c1.width = 1; c1.height = 1
  const c1x = c1.getContext('2d'); c1x.drawImage(video, 0, 0, 64, 64, 0, 0, 1, 1)
  const pxAt1_5 = Array.from(c1x.getImageData(0, 0, 1, 1).data)
  URL.revokeObjectURL(url)
  return { s1_5, s1_9, pxAt0_4, pxAt1_5, size: blob.size }
})

console.log('seek to 1.5s →', out.s1_5.toFixed(2), '· seek to 1.9s →', out.s1_9.toFixed(2))
console.log('pixel at 0.4s (expect red-ish):', out.pxAt0_4.join(','), '· pixel at 1.5s (expect green-ish):', out.pxAt1_5.join(','))
console.log('size:', out.size, 'B')
await browser.close()
const ok = out.s1_9 > 1.6 && out.s1_9 < 2.1 && out.pxAt1_5[1] > out.pxAt1_5[0] && out.pxAt1_5[1] > 100
console.log(ok ? 'VIDEO ~2s WITH CORRECT PER-FRAME CONTENT ✓' : 'VIDEO STILL WRONG ✗')
if (!ok) process.exit(1)
