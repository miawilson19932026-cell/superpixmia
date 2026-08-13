// Regression for the watermark-remover UX chain (continuous brushing):
//  1. brush strokes appear on the overlay while painting
//  2. after Apply, the overlay is cleared AND the canvas swaps to the result
//     image (so the original watermark never lingers and reads as "didn't work")
//  3. a "Watermark removed" banner appears, the brush tools STAY visible and
//     there is no blocking "Repaint" block
//  4. a second brush + Apply works — removal accumulates until the user is done
// Runs on live or local URL (PAGE_URL env). Pink-stamp image from gen-pink-png.mjs.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PAGE_URL = process.env.PAGE_URL || 'https://www.superpixmia.com/remove-watermark'
const PNG = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
const input = await page.$('input[type="file"]')
await input.uploadFile(PNG)
await sleep(1500)

// Watermark block: buffer x[70,130], y[50,100] (see gen-pink-png.mjs).
const probePixel = () => page.evaluate(() => {
  const s = document.querySelector('canvas.cursor-crosshair')
  if (!s) return null
  // canvas buffer coords; watermark center is at (100, 75)
  const d = s.getContext('2d').getImageData(100, 75, 1, 1).data
  return { r: d[0], g: d[1], b: d[2] }
})

// Full-cover paint of the watermark (strokes on screen, not buffer).
const stage = await page.evaluate(() => {
  const s = document.querySelector('canvas.cursor-crosshair')
  const r = s.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height, bw: s.width, bh: s.height }
})
const mapToScreen = (s, bx, by) => ({
  x: s.left + (bx / s.bw) * s.width,
  y: s.top + (by / s.bh) * s.height,
})
for (const [x1, y1, x2, y2] of [[72, 55, 128, 55], [72, 75, 128, 75], [72, 95, 128, 95]]) {
  const a = mapToScreen(stage, x1, y1)
  const b = mapToScreen(stage, x2, y2)
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up()
}
await sleep(400)

// Overlay = mask canvas, sibling of the stage canvas inside the editor wrapper.
const overlayHasStrokes = () => page.evaluate(() => {
  const stageEl = document.querySelector('canvas.cursor-crosshair')
  if (!stageEl) return -1
  const host = stageEl.parentElement
  const c = host && host.querySelector('canvas:not(.cursor-crosshair)')
  if (!c) return -2
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  for (let i = 3; i < d.length; i += 4) if (d[i] > 128) return 1
  return 0
})

const hasBrushTools = () => page.evaluate(() =>
  !!Array.from(document.querySelectorAll('input[type="range"]')).some((el) => el.offsetParent !== null) &&
  Array.from(document.querySelectorAll('button')).some((b) => /开始去水印|Remove Watermark$/.test(b.textContent || '')))

const buttonByText = (text) => page.evaluate((reStr) => {
  const re = new RegExp(reStr)
  const btns = Array.from(document.querySelectorAll('button'))
  const el = btns.find((b) => re.test(b.textContent || ''))
  if (el) { el.click(); return true }
  return false
}, text)

const before = await overlayHasStrokes()
const bufBefore = await probePixel()

// Apply
const clicked = await buttonByText('开始去水印|Remove Watermark$')
if (!clicked) throw new Error('apply button not found')

// Wait until the canvas swaps to the result (watermark center turns white).
let white = false
for (let i = 0; i < 40; i++) {
  await sleep(400)
  const p = await probePixel()
  if (p && p.r > 200 && p.g > 200 && p.b > 200) { white = true; break }
}
await sleep(400)
const after = await overlayHasStrokes()
const doneShown = await page.evaluate(() => /水印已去除|Watermark removed/.test(document.body.textContent || ''))
const redoShown = await page.evaluate(() => /重新涂抹|Repaint/.test(document.body.textContent || ''))
const toolsVisible = await hasBrushTools()

// ── Round 2: continuous brushing — brush another area and Apply again ──
const stage2 = await page.evaluate(() => {
  const s = document.querySelector('canvas.cursor-crosshair')
  const r = s.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height, bw: s.width, bh: s.height }
})
const a2 = mapToScreen(stage2, 100, 150)
const b2 = mapToScreen(stage2, 130, 150)
await page.mouse.move(a2.x, a2.y); await page.mouse.down()
await page.mouse.move(b2.x, b2.y, { steps: 6 }); await page.mouse.up()
await sleep(300)
const clicked2 = await buttonByText('开始去水印|Remove Watermark$')
if (!clicked2) throw new Error('apply button not found on round 2')
let whiteAfter2 = false
for (let i = 0; i < 40; i++) {
  await sleep(400)
  const p = await probePixel()
  if (p && p.r > 200 && p.g > 200 && p.b > 200) { whiteAfter2 = true; break }
}

console.log('overlay has strokes while painting  :', before === 1 ? 'YES' : before === 0 ? 'NO ✗' : 'not-found')
console.log('canvas shows original before apply  :', bufBefore && bufBefore.b < 200 ? 'YES (pink)' : 'unexpected')
console.log('canvas shows result after apply     :', white ? 'YES ✓ (watermark gone on canvas)' : 'NO ✗')
console.log('overlay cleared after apply         :', after === 0 ? 'YES ✓' : after === 1 ? 'NO ✗' : 'not-found')
console.log('"removed" message shown             :', doneShown ? 'YES ✓' : 'NO ✗')
console.log('no blocking "repaint" block         :', !redoShown ? 'YES ✓' : 'NO ✗')
console.log('brush tools still visible after apply:', toolsVisible ? 'YES ✓' : 'NO ✗')
console.log('round-2 apply keeps result          :', whiteAfter2 ? 'YES ✓' : 'NO ✗')
await browser.close()
