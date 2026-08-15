// Verify the Studio bugfix batch:
//  1. logo/text apply → Undo restores the original (no lingering preview)
//  2. crop re-entry after stacking transforms gives a fresh crop rect (not stale)
//  3. one-click cutout (remove): magic-wand cursor, marching-ants selection,
//     add/erase selection modes, apply → transparent, Undo → restored
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const PNG = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const v = await fn(); if (v) return v; await sleep(250) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
page.on('pageerror', (e) => console.log('pageerror:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()) })

const open = async () => {
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
  await (await page.$('input[type="file"]')).uploadFile(PNG)
  // wait until the base canvas is actually drawn (width alone can be set before the image paints)
  await waitFor(() => page.evaluate(() => {
    const c = document.querySelectorAll('canvas')[1]
    if (!c || c.width <= 100) return false
    const d = c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data
    return d[3] > 0
  }))
}
const btn = (re, last = false) => page.evaluate(([s, last]) => {
  const els = Array.from(document.querySelectorAll('button')).filter((b) => new RegExp(s).test(b.textContent || ''))
  const el = last ? els[els.length - 1] : els[0]
  if (el) { el.click(); return el.textContent.trim() } return null
}, [re, last])
const rect = (i) => page.evaluate((idx) => { const r = document.querySelectorAll('canvas')[idx].getBoundingClientRect(); const c = document.querySelectorAll('canvas')[idx]; return { left: r.left, top: r.top, width: r.width, height: r.height, cw: c.width, ch: c.height } }, i)
const appliedShown = () => page.evaluate(() => /Applied|已应用/.test(document.body.textContent || ''))
const hash = () => page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1]
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) >>> 0
  return h
})
const alphaAt = (x, y) => page.evaluate(([x, y]) => {
  const c = document.querySelectorAll('canvas')[1]
  return c.getContext('2d').getImageData(x, y, 1, 1).data[3]
}, [x, y])
// overlay mask pixels = dark tint (rgb≈0, alpha 92), excluding the wand's yellow
// sparkles and the cyan marching-ants stroke
const maskCount = () => page.evaluate(() => {
  const ov = document.querySelectorAll('canvas')[2]
  const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]
    if (a >= 60 && a <= 150 && d[i] < 50 && d[i + 1] < 50 && d[i + 2] < 50) n++
  }
  return n
})
// marching-ants boundary = cyan pixels rgb(56,189,248)
const antsCount = () => page.evaluate(() => {
  const ov = document.querySelectorAll('canvas')[2]
  const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < 120 && d[i + 1] > 150 && d[i + 2] > 200 && d[i + 3] > 150) n++
  }
  return n
})
const wandCount = (cx, cy) => page.evaluate(([cx, cy]) => {
  const ov = document.querySelectorAll('canvas')[2]
  const W = ov.width, H = ov.height
  const d = ov.getContext('2d').getImageData(0, 0, W, H).data
  let n = 0
  for (let y = Math.max(0, cy - 15); y < Math.min(H, cy + 15); y++) {
    for (let x = Math.max(0, cx - 15); x < Math.min(W, cx + 15); x++) {
      if (d[(y * W + x) * 4 + 3] > 60) n++
    }
  }
  return n
}, [cx, cy])
const clickImg = async (ix, iy) => {
  const r = await rect(2)
  await page.mouse.click(r.left + (ix / r.cw) * r.width, r.top + (iy / r.ch) * r.height)
}
const hoverImg = async (ix, iy) => {
  const r = await rect(2)
  await page.mouse.move(r.left + (ix / r.cw) * r.width, r.top + (iy / r.ch) * r.height)
}

// ── 1. logo apply → undo restores (bug 1) ──
console.log('\n── 1. logo apply → undo ──')
await open()
const H0 = await hash()
await btn('^Stamp$|^刻章$')
await sleep(300)
const logoInput = (await page.$$('input[type="file"]')).pop()
await logoInput.uploadFile(PNG)
await waitFor(() => page.evaluate(() => Array.from(document.querySelectorAll('img')).some((i) => i.alt === 'logo')))
await sleep(300)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
const H1 = await hash()
check('logo committed (base changed)', H1 !== H0)
const ovClean1 = await page.evaluate(() => {
  const ov = document.querySelectorAll('canvas')[2]
  const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data
  for (let i = 3; i < d.length; i += 4) if (d[i] > 10) return false
  return true
})
check('overlay clean after logo apply (no lingering preview)', ovClean1)
await btn('Undo$|撤销$')
await sleep(1000)
const H2 = await hash()
check('undo restores original after logo apply', H2 === H0)

// ── 2. text apply → undo restores (bug 1) ──
console.log('\n── 2. text apply → undo ──')
await open()
const T0 = await hash()
await btn('^Text$|^写字$')
await sleep(300)
await page.evaluate(() => {
  const inp = document.querySelector('input[type="text"]')
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, 'HELLO')
  inp.dispatchEvent(new Event('input', { bubbles: true }))
})
await sleep(200)
await clickImg(20, 100)
await sleep(300)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
const T1 = await hash()
check('text committed (base changed)', T1 !== T0)
const ovClean2 = await page.evaluate(() => {
  const ov = document.querySelectorAll('canvas')[2]
  const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data
  for (let i = 3; i < d.length; i += 4) if (d[i] > 10) return false
  return true
})
check('overlay clean after text apply', ovClean2)
await btn('Undo$|撤销$')
await sleep(1000)
const T2 = await hash()
check('undo restores original after text apply', T2 === T0)

// ── 3. crop re-entry after stacking → fresh crop rect (bug 2) ──
console.log('\n── 3. crop re-entry after stacking ──')
await open()
await btn('^Crop$|^裁剪$')
await sleep(300)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000) // 160×120
await btn('^Rotate$|^旋转$')
await sleep(300)
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /↻/.test(b.textContent || ''))?.click())
await sleep(200)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000) // 120×160
await btn('^Size$|^尺寸$')
await sleep(300)
await page.evaluate(() => {
  const inp = document.querySelector('input[type="number"]')
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '60')
  inp.dispatchEvent(new Event('input', { bubbles: true }))
})
await sleep(200)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000) // 60×80
const dimsAfter = await page.evaluate(() => { const c = document.querySelectorAll('canvas')[1]; return { w: c.width, h: c.height } })
check('stacked to 60×80', dimsAfter.w === 60 && dimsAfter.h === 80, `${dimsAfter.w}×${dimsAfter.h}`)
await btn('^Crop$|^裁剪$')
await sleep(400)
const cropShown = await page.evaluate(() => Array.from(document.querySelectorAll('span.font-mono')).map((s) => s.textContent.trim()).filter((t) => /px$/.test(t)))
check('crop rect is fresh (80% of 60×80 = 48×64)', cropShown[0] === '48px' && cropShown[1] === '64px', cropShown.join(' / '))
// apply the fresh (default) crop rect → the image shrinks to ~80% → proves the
// rect was computed against the CURRENT (post-stack) dimensions, not a stale one
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
const dimsCropped = await page.evaluate(() => { const c = document.querySelectorAll('canvas')[1]; return { w: c.width, h: c.height } })
check('crop applies (image shrank from 60×80)', dimsCropped.w < 60 && dimsCropped.h < 80, `${dimsCropped.w}×${dimsCropped.h}`)

// ── 4. one-click cutout: wand cursor + selection + erase + apply/undo (bug 3) ──
console.log('\n── 4. one-click cutout (remove) UX + undo ──')
await open()
const R0 = await hash()
await btn('^Rotate$|^旋转$')
await sleep(300)
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /↻/.test(b.textContent || ''))?.click())
await sleep(200)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
const R1 = await hash()
check('rotate applied before remove', R1 !== R0)

await btn('^一键抠图$|^Remove$')
await sleep(400)
// magic-wand cursor follows the pointer
const wcx = 75, wcy = 100
await hoverImg(wcx, wcy)
await sleep(300)
check('magic wand cursor drawn at pointer', (await wandCount(wcx, wcy)) > 0, `pixels near pointer: ${await wandCount(wcx, wcy)}`)
// click a corner → selection tint + marching-ants
await clickImg(5, 5)
await sleep(300)
const tintAfterSelect = await maskCount()
const antsAfterSelect = await antsCount()
check('selection tint shown', tintAfterSelect > 0, `${tintAfterSelect} mask px`)
check('marching-ants outline shown', antsAfterSelect > 0, `${antsAfterSelect} cyan px`)
// erase mode removes the same region
await btn('^擦除$|^Erase$')
await sleep(200)
await clickImg(5, 5)
await sleep(300)
check('erase mode clears selection', (await maskCount()) === 0, `${await maskCount()} mask px left`)
// re-select, then apply → transparent, then undo → restored
await btn('^选中$|^Select$')
await sleep(200)
await clickImg(5, 5)
await sleep(300)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
check('remove applied (corner transparent)', (await alphaAt(5, 5)) === 0, `alpha=${await alphaAt(5, 5)}`)
const R2 = await hash()
check('remove changed base', R2 !== R1)
await btn('Undo$|撤销$')
await sleep(1000)
check('undo restores pre-remove image', (await alphaAt(5, 5)) > 0, `alpha=${await alphaAt(5, 5)}`)
const R3 = await hash()
check('undo hash matches pre-remove', R3 === R1)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
