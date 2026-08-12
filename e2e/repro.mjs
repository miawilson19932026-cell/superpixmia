// Real-browser reproduction of the remove-watermark flow.
// Uploads a 200x150 white image with a black 30x40 block, paints over it,
// clicks Apply, and reads the result pixel at the block's center.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PAGE_URL = process.env.PAGE_URL || 'https://www.superpixmia.com/remove-watermark'
const PNG = fileURLToPath(new URL('./test-watermark.png', import.meta.url))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

page.on('pageerror', (e) => console.log('!! PAGE ERROR:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('!! CONSOLE ERROR:', m.text().slice(0, 200)) })

console.log('1. opening', PAGE_URL)
await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 })

// Upload the test image via the file input
console.log('2. uploading test image')
const input = await page.$('input[type="file"]')
if (!input) { console.log('FAIL: no file input found'); await browser.close(); process.exit(1) }
await input.uploadFile(PNG)
await sleep(1500)

// Find the stage canvas (cursor-crosshair) and its rect
const stageInfo = await page.evaluate(() => {
  const stage = document.querySelector('canvas.cursor-crosshair')
  if (!stage) return null
  const r = stage.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height, bw: stage.width, bh: stage.height }
})
if (!stageInfo) { console.log('FAIL: stage canvas not found'); await browser.close(); process.exit(1) }
console.log('   stage canvas rect:', JSON.stringify(stageInfo))

// Paint over the watermark: block occupies buffer (85,55)-(115,95).
// Map buffer coords to screen coords.
const sx = (bx) => stageInfo.left + (bx / stageInfo.bw) * stageInfo.width
const sy = (by) => stageInfo.top + (by / stageInfo.bh) * stageInfo.height

console.log('3. painting mask over watermark area')
// Record actual pointer/mouse coordinates the page receives
await page.evaluate(() => {
  window.__evts = []
  const rec = (e) => { if (window.__evts.length < 6) window.__evts.push({ type: e.type, x: e.clientX, y: e.clientY }) }
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseup']) window.addEventListener(t, rec)
})
// Three horizontal strokes with the default brush (r≈30 in buffer px)
for (const y of [70, 80, 90]) {
  await page.mouse.move(sx(85), sy(y))
  await page.mouse.down()
  await page.mouse.move(sx(115), sy(y), { steps: 10 })
  await page.mouse.up()
}
await sleep(500)

// Read the mask canvas alpha to confirm the paint landed
const maskInfo = await page.evaluate(() => {
  const mask = document.querySelector('canvas.absolute')
  if (!mask) return { found: false }
  const ctx = mask.getContext('2d')
  const d = ctx.getImageData(0, 0, mask.width, mask.height).data
  let painted = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > 128) painted++
  return { found: true, paintedPx: painted, totalPx: mask.width * mask.height }
})
console.log('   mask check:', JSON.stringify(maskInfo))

// Diagnostic: mask alpha at the watermark center + bbox of painted pixels
const maskDiag = await page.evaluate(() => {
  const mask = document.querySelector('canvas.absolute')
  const ctx = mask.getContext('2d')
  const d = ctx.getImageData(0, 0, mask.width, mask.height).data
  const W = mask.width, H = mask.height
  const a = (x, y) => d[(y * W + x) * 4 + 3]
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, cnt = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (a(x, y) > 128) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; cnt++ }
  const stage = document.querySelector('canvas.cursor-crosshair')
  const sr = stage.getBoundingClientRect()
  const mr = mask.getBoundingClientRect()
  return {
    maskSize: [W, H],
    paintedBBox: { minX, minY, maxX, maxY, cnt },
    wmBlock: { x: [85, 115], y: [55, 95] },   // expected watermark block
    centerAlpha: a(100, 75),
    stageRect: { l: sr.left, t: sr.top, w: sr.width, h: sr.height },
    maskRect: { l: mr.left, t: mr.top, w: mr.width, h: mr.height },
  }
})
console.log('   mask diag:', JSON.stringify(maskDiag))
const evts = await page.evaluate(() => window.__evts)
console.log('   events received by page:', JSON.stringify(evts))
console.log('   expected stroke coords (sx/sy):', JSON.stringify([[sx(85), sy(70)], [sx(115), sy(70)]]))

// Collect blob images before applying
const blobsBefore = await page.evaluate(() => Array.from(document.querySelectorAll('img[src^="blob:"]')).map((i) => i.src))

// Click Apply
console.log('4. clicking apply')
const clicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const b = btns.find((x) => /Remove Watermark|开始去水印/.test(x.textContent || ''))
  if (b) { b.click(); return true }
  return false
})
if (!clicked) { console.log('FAIL: apply button not found'); await browser.close(); process.exit(1) }

// Wait for a new blob image (the result) to appear
console.log('5. waiting for result…')
let resultUrl = null
for (let i = 0; i < 40; i++) {
  await sleep(500)
  const now = await page.evaluate(() => Array.from(document.querySelectorAll('img[src^="blob:"]')).map((i) => i.src))
  const fresh = now.filter((s) => !blobsBefore.includes(s))
  if (fresh.length) { resultUrl = fresh[fresh.length - 1]; break }
}
if (!resultUrl) { console.log('RESULT: no result image appeared after 20s — likely broken'); await browser.close(); process.exit(1) }
console.log('   result image found:', resultUrl.slice(0, 40))

// Read the center pixel of the result (buffer center = watermark center)
const resultPixels = await page.evaluate((src) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const W = img.width, H = img.height
      const px = (x, y) => {
        const d = ctx.getImageData(x, y, 1, 1).data
        return [d[0], d[1], d[2]]
      }
      resolve({
        w: W, h: H,
        center: px(W / 2 | 0, H / 2 | 0),          // watermark center (100,75)
        wmCorner1: px(90, 60), wmCorner2: px(110, 90),
        bg1: px(30, 30), bg2: px(170, 120),
      })
    }
    img.onerror = () => resolve({ error: 'could not load result img' })
    img.src = src
  })
}, resultUrl)
console.log('RESULT pixels:', JSON.stringify(resultPixels))
const v = resultPixels.center[0]
console.log(v >= 250
  ? 'VERDICT: PASS — watermark block filled with surrounding white (center ≈255)'
  : `VERDICT: FAIL — center is still dark (${v}), watermark NOT removed`)

await browser.close()