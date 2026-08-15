// Verify the Studio text tool font picker: select exists, picking Impact changes the
// drawn text width (wider than system-ui), and Apply commits the text onto the image.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const PNG = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const v = await fn(); if (v) return v; await sleep(250) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

// SimSun (宋体) renders its "W" far narrower than system-ui (Segoe UI's W is
// ~1.08em and nearly fills the canvas), so switching to it must visibly shrink
// the drawn text — a rock-solid signal the font picker drives the canvas.
const NARROW = '"SimSun", "Songti SC", "Noto Serif CJK SC", serif'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
page.on('pageerror', (e) => console.log('pageerror:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()) })

// Find the font <select> (its first option is the "System default" label)
const fontSelVal = () => page.evaluate(() => {
  const s = Array.from(document.querySelectorAll('select')).find((x) => /系统默认|System default/.test(x.options[0]?.textContent || ''))
  return s ? s.value : null
})
// Puppeteer's native select dispatches the real input+change events React listens to.
const pickFont = async (stack) => {
  const sel = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll('select')).find((x) => /系统默认|System default/.test(x.options[0]?.textContent || ''))
    return s ? Array.from(s.options).map((o) => o.value) : null
  })
  if (!sel || !sel.includes(stack)) return null
  await page.select('select', stack)
  return stack
}
const typeText = (txt) => page.evaluate((v) => {
  const inp = document.querySelector('input[type="text"]')
  if (!inp) return false
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, v)
  inp.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}, txt)
const maxTextSize = () => page.evaluate(() => {
  const r = document.querySelector('input[type="range"]')
  if (!r) return false
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(r, '15')
  r.dispatchEvent(new Event('input', { bubbles: true }))
  r.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}, '')
// The overlay canvas is transparent except for the text tool's drawing (text + dashed box),
// so non-transparent pixels = the on-canvas text. Returns its bounding box.
const textBox = () => page.evaluate(() => {
  const ov = document.querySelectorAll('canvas')[2]
  const W = ov.width, H = ov.height
  const d = ov.getContext('2d').getImageData(0, 0, W, H).data
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 60) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return maxX >= 0 ? { w: maxX - minX + 1, h: maxY - minY + 1, minX, minY } : null
}, '')
// Checksum of a base-canvas band — proves Apply committed pixels onto the image.
const bandHash = () => page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1]
  const d = c.getContext('2d').getImageData(50, 80, 110, 40).data
  let h = 0
  for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) >>> 0
  return h
}, '')
const appliedShown = () => page.evaluate(() => /Applied|已应用/.test(document.body.textContent || ''))

// ── 1. Setup: open studio, switch to text tool ──
console.log('── 1. text tool + font select ──')
await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
await (await page.$('input[type="file"]')).uploadFile(PNG)
await waitFor(() => page.evaluate(() => document.querySelectorAll('canvas')[1]?.width > 100))
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /写字|Text/.test(b.textContent || ''))?.click())
await sleep(400)

const fontInfo = await page.evaluate(() => {
  const s = Array.from(document.querySelectorAll('select')).find((x) => /系统默认|System default/.test(x.options[0]?.textContent || ''))
  return s ? { count: s.options.length, first: s.options[0].textContent.trim() } : null
})
check('font select rendered', !!fontInfo && fontInfo.count === 10, fontInfo ? `${fontInfo.count} options, first="${fontInfo.first}"` : 'missing')

// ── 2. Type text, place it, measure system width ──
console.log('\n── 2. measure default (system-ui) width ──')
check('typed text', await typeText('WWWWWW'))
await maxTextSize()
await sleep(200)
const r = await page.evaluate(() => { const rc = document.querySelectorAll('canvas')[2].getBoundingClientRect(); return { left: rc.left, top: rc.top, width: rc.width, height: rc.height, cw: document.querySelectorAll('canvas')[2].width, ch: document.querySelectorAll('canvas')[2].height } })
const p = { x: r.left + (5 / r.cw) * r.width, y: r.top + (100 / r.ch) * r.height }
await page.mouse.click(p.x, p.y) // place the text near the left edge so wide fonts aren't clipped
await page.mouse.move(0, 0) // leave canvas → clear hover crosshair
await sleep(300)
const bSystem = await textBox()
check('text drawn & placed near left edge', !!bSystem && bSystem.minX < 30 && bSystem.w > 0, bSystem ? `box ${bSystem.w}px at x=${bSystem.minX}` : 'none')

// ── 3. Switch to SimSun (宋体) → width should shrink a lot ──
console.log('\n── 3. switch font to SimSun ──')
// sanity: SimSun's W is far narrower than system-ui at the same px
const mw = await page.evaluate((stack) => {
  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font = '600 16px system-ui'
  const sys = ctx.measureText('WWWWWWWW').width
  ctx.font = '600 16px ' + stack
  const narrow = ctx.measureText('WWWWWWWW').width
  return { sys, narrow }
}, NARROW)
check('SimSun is narrower than system-ui on this machine', mw.narrow < mw.sys * 0.8, `sys ${mw.sys.toFixed(1)} → simsun ${mw.narrow.toFixed(1)}`)
check('picked SimSun', (await pickFont(NARROW))?.includes('SimSun') === true, await fontSelVal())
await page.mouse.move(0, 0)
await sleep(400)
const bNarrow = await textBox()
check('text width changed (SimSun narrower)', !!bSystem && !!bNarrow && bNarrow.w < bSystem.w * 0.75, `system ${bSystem?.w}px → simsun ${bNarrow?.w}px`)
check('select reflects SimSun', (await fontSelVal())?.includes('SimSun') === true, await fontSelVal())

// ── 4. Apply commits the text ──
console.log('\n── 4. apply commits ──')
const hashBefore = await bandHash()
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /^应用$|^Apply$/.test(b.textContent.trim()))?.click())
await waitFor(appliedShown)
const hashAfter = await bandHash()
check('apply banner shown', await appliedShown())
check('committed image changed (text burned in)', hashBefore !== hashAfter)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
