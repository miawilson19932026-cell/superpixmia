// Capture a short Studio editing session frame-by-frame and compose it into an
// animated GIF for the Product Hunt launch (the "moving demo" PH loves).
//
// Sequence shown:  pick Rotate → drag to spin the image → Add Text → place it →
//  Pencil stroke → Crop box → Apply. Each step holds for a couple frames so the
//  GIF reads clearly. Frames are captured in-page (same en-US forcing as
//  capture.mjs) then downscaled + composited with sharp's animated GIF output.
//
// Usage:  node studio-demo-gif.mjs
// Output: e2e/studio-demo.gif  (copy to screenshots/ when happy)
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import gifencPkg from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifencPkg
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PAGE_URL = process.env.PAGE_URL || 'https://www.superpixmia.com/studio'
const DEMO = fileURLToPath(new URL('./demo-scenery.png', import.meta.url))
const OUT = fileURLToPath(new URL('./studio-demo.gif', import.meta.url))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, timeout = 12000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const v = await fn()
    if (v) return v
    await sleep(250)
  }
  return null
}

// ── helpers that find buttons by ENGLISH label (en-US forced) ──
const btn = (label) => page.evaluate((s) => {
  const el = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === s)
  if (el) { el.click(); return true }
  return false
}, label)

const stage = () => page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1] // overlay canvas
  const r = c.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  args: ['--no-sandbox', '--lang=en-US'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })
await page.emulate({ viewport: { width: 1280, height: 800 }, userAgent: await browser.userAgent() })

const frames = []
const cap = async (label) => {
  await sleep(150) // let the last action paint
  frames.push({ label, buf: await page.screenshot() })
  console.log(`  frame ${String(frames.length).padStart(2)} · ${label}`)
}

await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
console.log('page loaded:', await page.title())

// 1. Upload demo image → workbench
const input = await page.$('input[type="file"]')
if (!input) throw new Error('file input not found on /studio')
await input.uploadFile(DEMO)
await waitFor(() => page.evaluate(() => document.querySelectorAll('canvas').length >= 2), 15000)
await sleep(800)
await cap('workbench-ready')

// 2. Rotate tool → drag to spin ~90°
await btn('Rotate')
await sleep(500)
await cap('rotate-selected')
{
  const s = await stage()
  const cx = s.left + s.width * 0.5, cy = s.top + s.height * 0.5
  const R = Math.min(s.width, s.height) * 0.32
  // drag from the right edge, arcing up to the top (spins 90°)
  await page.mouse.move(cx + R, cy)
  await page.mouse.down()
  for (const [dx, dy] of [[R, 0], [R * 0.92, -R * 0.38], [R * 0.71, -R * 0.71], [R * 0.38, -R * 0.92], [0, -R]]) {
    await page.mouse.move(cx + dx, cy + dy, { steps: 4 })
    await cap('rotate-' + Math.round(dy))
  }
  await page.mouse.up()
  await cap('rotate-done')
}

// 3. Text tool → type → place on canvas
await btn('Text')
await sleep(400)
await page.type('input[placeholder*="Type"]', 'SUPERPIXMIA')
await sleep(400)
await cap('text-typed')
{
  const s = await stage()
  await page.mouse.click(s.left + s.width * 0.5, s.top + s.height * 0.42)
  await sleep(300)
  await cap('text-placed')
}

// 4. Pencil tool → a red stroke
await btn('Pencil')
await sleep(400)
{
  const s = await stage()
  await page.mouse.move(s.left + s.width * 0.2, s.top + s.height * 0.7)
  await page.mouse.down()
  await page.mouse.move(s.left + s.width * 0.8, s.top + s.height * 0.68, { steps: 10 })
  await page.mouse.up()
  await sleep(200)
  await cap('pencil-stroke')
}

// 5. Crop → the crop box appears
await btn('Crop')
await sleep(600)
await cap('crop-box')

// 6. Apply → green "Applied" banner
await btn('Apply')
await sleep(900)
await cap('applied')

await browser.close()
console.log(`\n${frames.length} frames captured`)

// ── compose GIF: downscale to width 720, per-frame 256-color palette,
//    450ms/frame, loop forever. sharp can't build multi-frame GIFs from scratch,
//    so each frame → RGBA via sharp, then gifenc quantizes + encodes. ──
const WIDTH = 720
const DELAY_MS = 450
const gif = GIFEncoder()
let w = 0, h = 0
for (const f of frames) {
  const { data, info } = await sharp(f.buf).resize({ width: WIDTH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  w = info.width; h = info.height
  const palette = quantize(data, 256)
  const index = applyPalette(data, palette)
  gif.writeFrame(index, w, h, { palette, delay: DELAY_MS, first: f === frames[0] })
}
gif.finish()
const bytes = gif.bytes()
await writeFile(OUT, new Uint8Array(bytes))
console.log(`GIF written: ${OUT} (${(bytes.byteLength / 1024).toFixed(0)} KB, ${frames.length} frames, ${w}×${h}, ${DELAY_MS}ms/frame)`)
