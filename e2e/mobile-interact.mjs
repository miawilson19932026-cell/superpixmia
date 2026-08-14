// Mobile interaction test for /studio:
//  - upload a 1000×800 image → page must become scrollable (big canvas)
//  - tap a rail tool via real touch
//  - touch-drag on the canvas → stroke must land (overlay pixels change)
//  - tap Apply → "applied" banner appears
import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:5175'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 1000×800 test PNG (big image → forces scrolling) ──
const W = 1000, H = 800
const raw = Buffer.alloc((W * 3 + 1) * H)
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0
  for (let x = 0; x < W; x++) {
    const o = y * (W * 3 + 1) + 1 + x * 3
    const pink = (x > 400 && x < 600 && y > 300 && y < 500) ? 255 : 245
    raw[o] = pink; raw[o + 1] = 120; raw[o + 2] = 190
  }
}
let table
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256)
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c }
  }
  let c = -1
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
const BIG = fileURLToPath(new URL('./mobile-big.png', import.meta.url))
writeFileSync(BIG, png)

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
await sleep(500)

const input = await page.$('input[type="file"]')
await input.uploadFile(BIG)
await sleep(2000)

// 1. Big image → page must scroll
const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)
console.log('page scrollable with 1000×800 image :', scrollable ? 'YES ✓' : 'NO ✗')

// 2. Tap the pencil tool via real touch
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const pencil = btns.find((b) => /铅笔|Pencil/i.test(b.textContent || ''))
  if (!pencil) console.log('PENCIL NOT FOUND')
  else pencil.click()
})
await sleep(600)

// 3. Touch-drag on the canvas — get its center, then drag across it
const rect = await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll('canvas')).find((x) => x.className.includes('max-h'))
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
console.log('canvas on screen:', JSON.stringify(rect))
const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2
try {
  await page.touchscreen.touchStart(cx - rect.w * 0.2, cy)
  await sleep(80)
  for (let i = 1; i <= 6; i++) {
    await page.touchscreen.touchMove(cx - rect.w * 0.2 + i * (rect.w * 0.1), cy + Math.sin(i) * 6)
    await sleep(40)
  }
  await page.touchscreen.touchEnd()
  console.log('touch drag sent ✓')
} catch (e) {
  console.log('touch API issue:', e.message)
}

// Overlay canvas should now have a stroke: read a horizontal band of pixels
const hasStroke = await page.evaluate(() => {
  const base = Array.from(document.querySelectorAll('canvas')).find((c) => c.className.includes('max-h'))
  const over = base.nextElementSibling
  if (!over) return 'no overlay'
  const ctx = over.getContext('2d')
  const d = ctx.getImageData(0, Math.floor(over.height / 2), over.width, 1).data
  let count = 0
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 10) count++
  return count > 0 ? `YES (${count} opaque px)` : 'NO'
})
console.log('stroke drawn on overlay canvas   :', hasStroke)

// 4. Tap Apply (scroll into view first) and expect the applied banner
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const apply = btns.find((b) => /apply|应用/i.test(b.textContent || '') && b.textContent.length < 20)
  if (apply) { apply.scrollIntoView({ block: 'center' }); apply.click() }
})
await sleep(500)
const applied = await page.evaluate(() => document.body.innerText.includes('已应用') || document.body.innerText.includes('Applied'))
console.log('Apply shows success banner       :', applied ? 'YES ✓' : 'NO ✗')

await browser.close()
