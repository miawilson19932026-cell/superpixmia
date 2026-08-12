// Regression test for semi-transparent PINK watermarks (stamp-like), the case
// a user described as "watermark still there, pink stroke left behind".
// Runs on live or local URL (PAGE_URL env). Tests BOTH full-cover and
// partial-cover painting so we can tell a product bug from user technique.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PAGE_URL = process.env.PAGE_URL || 'https://www.superpixmia.com/remove-watermark'
const PNG = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Watermark block: buffer x[70,130], y[50,100].
function mapToScreen(stage, bx, by) {
  return {
    x: stage.left + (bx / stage.bw) * stage.width,
    y: stage.top + (by / stage.bh) * stage.height,
  }
}

async function paintAndApply(page, stage, strokes) {
  for (const [x1, y1, x2, y2] of strokes) {
    const a = mapToScreen(stage, x1, y1)
    const b = mapToScreen(stage, x2, y2)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y, { steps: 8 })
    await page.mouse.up()
  }
  await sleep(400)
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const el = btns.find((x) => /Remove Watermark|开始去水印/.test(x.textContent || ''))
    if (el) { el.click(); return true }
    return false
  })
  if (!clicked) throw new Error('apply button not found')
}

async function runCase(browser, label, strokes) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
  const input = await page.$('input[type="file"]')
  await input.uploadFile(PNG)
  await sleep(1500)
  const stage = await page.evaluate(() => {
    const s = document.querySelector('canvas.cursor-crosshair')
    const r = s.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height, bw: s.width, bh: s.height }
  })
  const blobsBefore = await page.evaluate(() => Array.from(document.querySelectorAll('img[src^="blob:"]')).map((i) => i.src))

  await paintAndApply(page, stage, strokes)

  let resultUrl = null
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    const now = await page.evaluate(() => Array.from(document.querySelectorAll('img[src^="blob:"]')).map((i) => i.src))
    const fresh = now.filter((s) => !blobsBefore.includes(s))
    if (fresh.length) { resultUrl = fresh[fresh.length - 1]; break }
  }
  if (!resultUrl) { console.log(`${label}: NO RESULT IMAGE`); await page.close(); return }
  const pixels = await page.evaluate((src) => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
      const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
      resolve({
        w: img.width, h: img.height,
        center: px(100, 75),           // watermark center
        corner: px(80, 55),            // inside block
        midLeft: px(90, 75),           // inside block
        bg: px(20, 20),                // far background
      })
    }
    img.onerror = () => resolve({ error: 'load failed' })
    img.src = src
  }), resultUrl)
  // Pink-ish residual = pixel where r high, g/b low (255,140,140); clean = ~(255,255,255)
  const isPink = (p) => p && p[0] > 200 && p[2] < 200
  const pinky = [pixels.center, pixels.corner, pixels.midLeft].filter(isPink).length
  console.log(`${label}:`, JSON.stringify(pixels), '→ pink residue points:', pinky, pinky === 0 ? 'CLEAN ✓' : 'PINK LEFT ✗')
  await page.close()
}

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
// Case 1: FULL cover of the watermark (70,50)-(130,100) with 3 strokes
console.log('CASE full-cover (recommended usage)')
await runCase(browser, '  full-cover', [
  [72, 55, 128, 55], [72, 75, 128, 75], [72, 95, 128, 95],
])
// Case 2: PARTIAL cover — only the center (85,65)-(115,85), like a hasty stroke
console.log('CASE partial-cover (only center painted)')
await runCase(browser, '  partial-cover', [
  [85, 65, 115, 65], [85, 85, 115, 85],
])
await browser.close()