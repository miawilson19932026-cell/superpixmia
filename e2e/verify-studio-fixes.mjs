// Verify the 7 Studio interaction fixes:
//   #12 rulers on the canvas card's top/left EDGES (outside the image)
//   #13 the dot+line crop crosshair follows the pointer WHILE dragging
//   #16 one-time crop how-to banner (localStorage, once per customer)
//   #17 magic-wand at max tolerance leaves no white fringe (dilation)
// (The other three — #11 pill moved to right panel, #14 no 0px, #15 re-seed
// after apply — are covered in verify-studio.mjs section 9.)
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const PNG = fileURLToPath(new URL('./test-watermark.png', import.meta.url))
const EDGE_PNG = fileURLToPath(new URL('./test-white-edge.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const v = await fn(); if (v) return v; await sleep(250) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
page.on('pageerror', (e) => console.log('pageerror:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()) })

const open = async (file = PNG) => {
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
  // localStorage persists across navigations in this fresh browser — do NOT
  // clear it here, or the #16 once-per-customer check can't work. The browser is
  // launched empty, so the crop-tip flag starts absent.
  await (await page.$('input[type="file"]')).uploadFile(file)
  await waitFor(() => page.evaluate(() => document.querySelectorAll('canvas')[1]?.width > 100))
}
const btn = (re) => page.evaluate((s) => {
  const els = Array.from(document.querySelectorAll('button')).filter((b) => new RegExp(s).test(b.textContent || ''))
  const el = els[0]
  if (el) { el.click(); return el.textContent.trim() } return null
}, re)
// Displayed content-box of the overlay canvas (index 2), so mouse positions can
// be expressed in IMAGE pixels.
const content = (i = 2) => page.evaluate((idx) => {
  const c = document.querySelectorAll('canvas')[idx]
  const r = c.getBoundingClientRect()
  const s = Math.min(r.width / c.width, r.height / c.height)
  const dw = c.width * s, dh = c.height * s
  return { left: r.left + (r.width - dw) / 2, top: r.top + (r.height - dh) / 2, scale: s }
}, i)
const P = (g, x, y) => ({ x: g.left + x * g.scale, y: g.top + y * g.scale })
// Base canvas (index 1) pixel at IMAGE coordinates.
const px = (x, y) => page.evaluate(([tx, ty]) => {
  const c = document.querySelectorAll('canvas')[1]
  const d = c.getContext('2d').getImageData(tx, ty, 1, 1).data
  return [d[0], d[1], d[2], d[3]]
}, [x, y])
const setRange = (v) => page.evaluate((val) => {
  const el = document.querySelector('input[type="range"]')
  if (!el) return false
  el.value = val
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}, v)

// ── #12 Rulers on the card edges (outside the image) ──
console.log('\n── #12 rulers outside the image (top + left) ──')
await open()
await btn('^Crop$|^裁剪$')
await sleep(500)
const rulers = await page.evaluate(() => {
  const top = document.querySelector('[data-ruler="top"]')
  const left = document.querySelector('[data-ruler="left"]')
  if (!top || !left) return null
  const box = document.querySelector('.relative.select-none.checkerboard').getBoundingClientRect()
  const tr = top.getBoundingClientRect(), lr = left.getBoundingClientRect()
  return {
    present: true,
    topAbove: tr.bottom <= box.top + 1,
    leftOf: lr.right <= box.left + 1,
    ticks: top.querySelectorAll('span').length,
  }
})
check('both ruler strips render in crop mode', rulers?.present, JSON.stringify(rulers ?? 'missing'))
check('top ruler sits ABOVE the image (not inside)', rulers?.topAbove === true)
check('left ruler sits LEFT of the image (not inside)', rulers?.leftOf === true)
check('top ruler has tick marks', (rulers?.ticks ?? 0) > 2, `${rulers?.ticks} spans`)

// ── #13 crosshair follows the pointer while dragging ──
console.log('\n── #13 dot+line crosshair follows during drag ──')
await open()
await btn('^Crop$|^裁剪$')
await sleep(400)
const g = await content()
const a = P(g, 40, 40), b = P(g, 120, 90)
await page.mouse.move(a.x, a.y)
await page.mouse.down()
await page.mouse.move(b.x, b.y, { steps: 6 })
await sleep(300) // let the overlay redraw the crosshair at the dragged pointer
// Sample the overlay (index 2) at image point (120,90): the crosshair's blue
// dot must be drawn there (B >> R, near-opaque blue over white).
const dot = await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[2]
  const d = c.getContext('2d').getImageData(120, 90, 1, 1).data
  return [d[0], d[1], d[2], d[3]]
})
check('blue crosshair dot drawn at dragged pointer', dot[2] > 180 && dot[2] > dot[0] + 100, `rgb(${dot[0]},${dot[1]},${dot[2]})`)
await page.mouse.up()

// ── #16 one-time crop how-to banner (localStorage) ──
console.log('\n── #16 crop how-to banner once per customer ──')
await open()
await btn('^Crop$|^裁剪$')
await sleep(400)
const banner1 = await page.evaluate(() => {
  const b = document.body.textContent || ''
  return /拖动鼠标框选|Drag on the canvas/.test(b)
})
check('banner shown on first crop selection', banner1 === true)
// Dismiss it — the flag is persisted for this customer.
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const close = btns.find((b) => (b.getAttribute('aria-label') || '') === 'dismiss')
  if (close) close.click()
})
await sleep(200)
const flagged = await page.evaluate(() => localStorage.getItem('spm-crop-tip-seen') === '1')
check('dismiss persists the seen flag', flagged === true)
// Reload → crop again → banner must NOT reappear.
await open()
await btn('^Crop$|^裁剪$')
await sleep(400)
const banner2 = await page.evaluate(() => /拖动鼠标框选|Drag on the canvas/.test(document.body.textContent || ''))
check('banner hidden on second visit (localStorage)', banner2 === false)

// ── #17 max-tolerance wand leaves no white fringe ──
console.log('\n── #17 magic wand @ tol 100 → clean edge (no white residue) ──')
await open(EDGE_PNG)
await btn('^Remove$|^一键抠图$')
await sleep(300)
check('tolerance slider set to max', await setRange(100) === true)
await sleep(300)
// Click the white background near the corner, wait for the selection to fill.
const gw = await content()
const wp = P(gw, 5, 5)
await page.mouse.click(wp.x, wp.y)
await sleep(900)
await btn('^Apply$|^应用$')
await sleep(1200)
// The result base canvas now holds the transparent background. The old 3px
// anti-aliased fringe (x=87..89 at y=75) must be TRANSPARENT — with the old
// behavior it stayed opaque white ("残次白缺"). The black core (x=100) survives.
const fringe = await px(88, 75)
const fringe2 = await px(89, 75)
const core = await px(100, 75)
check('fringe pixel (88,75) transparent — no white halo', fringe[3] === 0, `rgba(${fringe.join(',')})`)
check('fringe pixel (89,75) transparent — no white halo', fringe2[3] === 0, `rgba(${fringe2.join(',')})`)
check('black subject core still opaque', core[3] === 255 && core[0] < 40, `rgba(${core.join(',')})`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
process.exit(fail ? 1 : 0)
