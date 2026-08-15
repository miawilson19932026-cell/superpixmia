// Repro the three reported Studio bugs on the production build.
// canvas order: [0]=ParticleBg bg, [1]=base (committed image), [2]=overlay (preview).
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const PNG = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, timeout = 10000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) { const v = await fn(); if (v) return v; await sleep(250) }
  return null
}

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })

const openStudio = async () => {
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => {
    // Lesson 13: verify downloads by patching the anchor, not the flaky download event.
    window.__dl = []
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return orig.call(this) }
  })
  const input = await page.$('input[type="file"]')
  await input.uploadFile(PNG)
  const ok = await waitFor(() => page.evaluate(() => {
    const c = document.querySelectorAll('canvas')[1]
    return c && c.width > 100
  }), 12000)
  return ok
}
const btn = (re) => page.evaluate((s) => {
  const el = Array.from(document.querySelectorAll('button')).find((b) => new RegExp(s).test(b.textContent || ''))
  if (el) { el.click(); return { found: true, text: el.textContent.trim() } }
  return { found: false }
}, re)
const appliedShown = () => page.evaluate(() => /Applied|已应用/.test(document.body.textContent || ''))
const rect = (idx) => page.evaluate((i) => {
  const r = document.querySelectorAll('canvas')[i].getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}, idx)
const canvasStat = (idx) => page.evaluate((i) => {
  const c = document.querySelectorAll('canvas')[i]
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let opq = 0; for (let p = 3; p < d.length; p += 4) if (d[p] > 10) opq++
  return { w: c.width, h: c.height, opq }
}, idx)
const drawBox = async (idx, fx, fy, fw, fh) => {
  const r = await rect(idx)
  const px = (x) => r.left + x * r.width, py = (y) => r.top + y * r.height
  await page.mouse.move(px(fx), py(fy)); await page.mouse.down()
  await page.mouse.move(px(fx + fw), py(fy), { steps: 6 })
  await page.mouse.move(px(fx + fw), py(fy + fh), { steps: 6 })
  await page.mouse.move(px(fx), py(fy + fh), { steps: 6 })
  await page.mouse.move(px(fx), py(fy), { steps: 6 })
  await page.mouse.up()
}

// ── TEST 1: download ──
console.log('── TEST 1: download ──')
await openStudio()
await btn('Download$|下载$')
await sleep(1500)
const dl = await page.evaluate(() => window.__dl)
console.log('anchor downloads:', dl.length ? dl.join(', ') : 'NONE ✗')

// ── TEST 2: cutout preview renders + Clear clears the OVERLAY ──
console.log('\n── TEST 2: cutout clear (correct canvas) ──')
await openStudio()
await btn('^Cut out$|^抠图$')
await sleep(300)
await drawBox(2, 0.25, 0.25, 0.5, 0.5)   // draw on the overlay (its rect == base rect)
await sleep(200)
console.log('overlay px (path drawn):', (await canvasStat(2)).opq)
await btn('^Clear$|^清空$')
await sleep(300)
const afterClear = await canvasStat(2)
console.log('overlay px (after Clear) :', afterClear.opq, afterClear.opq === 0 ? '✓ CLEARED' : '✗ STILL SHOWING')

// ── TEST 3: heal removes watermark (scan the BASE canvas) ──
console.log('\n── TEST 3: heal removes watermark ──')
await openStudio()
await btn('^Erase$|^去水印$')
await sleep(300)
const base = await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1]
  const ctx = c.getContext('2d')
  const { width: W, height: H } = c
  const d = ctx.getImageData(0, 0, W, H).data
  let sx = 0, sy = 0, n = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    if (d[i] > 245 && d[i + 1] > 120 && d[i + 1] < 165 && d[i + 2] > 120 && d[i + 2] < 165) { sx += x; sy += y; n++ }
  }
  return { W, H, cx: n ? sx / n : -1, cy: n ? sy / n : -1, n }
})
console.log('base canvas:', base.W + '×' + base.H, 'pink px:', base.n, 'centroid:', base.cx, base.cy)
if (base.cx > 0) {
  // brush over the pink block in image-space (overlay rect == base rect)
  const r = await rect(2)
  const px = r.left + (base.cx / base.W) * r.width, py = r.top + (base.cy / base.H) * r.height
  await page.mouse.move(px - 30, py); await page.mouse.down()
  await page.mouse.move(px + 30, py, { steps: 10 }); await page.mouse.up()
  await sleep(200)
  await btn('^Apply$|^应用$')
  await waitFor(appliedShown, 15000)
  const after = await page.evaluate(([tx, ty]) => {
    const c = document.querySelectorAll('canvas')[1]
    const ctx = c.getContext('2d')
    const d = ctx.getImageData(Math.max(0, tx - 5), Math.max(0, ty - 5), 10, 10).data
    let rr = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { rr += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
    return { r: Math.round(rr / n), g: Math.round(g / n), b: Math.round(b / n) }
  }, [base.cx, base.cy])
  const stillPink = after.r > 245 && after.g > 120 && after.g < 165 && after.b > 120 && after.b < 165
  console.log('centroid color:', `rgb(${after.r},${after.g},${after.b})`)
  console.log('removed?      :', stillPink ? 'NO ✗ (still pink)' : 'YES ✓')
}

console.log('\n--- runtime errors:', errors.length ? errors : 'none')
await browser.close()
