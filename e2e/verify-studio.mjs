// Verify the Studio batch: heal fix, undo/redo, download dialog, drag-rotate, tutorial, clear.
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
  await page.evaluate(() => {
    window.__dl = []
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return orig.call(this) }
  })
  await (await page.$('input[type="file"]')).uploadFile(PNG)
  await waitFor(() => page.evaluate(() => document.querySelectorAll('canvas')[1]?.width > 100))
}
const btn = (re, last = false) => page.evaluate(([s, last]) => {
  const els = Array.from(document.querySelectorAll('button')).filter((b) => new RegExp(s).test(b.textContent || ''))
  const el = last ? els[els.length - 1] : els[0]
  if (el) { el.click(); return el.textContent.trim() } return null
}, [re, last])
// Displayed image content-box of the overlay canvas (index 2): the overlay is
// CSS-stretched with object-contain, so subtract the letterbox and return the
// on-screen scale so mouse positions can be expressed in IMAGE pixels.
const content = (i = 2) => page.evaluate((idx) => {
  const c = document.querySelectorAll('canvas')[idx]
  const r = c.getBoundingClientRect()
  const s = Math.min(r.width / c.width, r.height / c.height)
  const dw = c.width * s, dh = c.height * s
  return { left: r.left + (r.width - dw) / 2, top: r.top + (r.height - dh) / 2, scale: s }
}, i)
const P = (g, x, y) => ({ x: g.left + x * g.scale, y: g.top + y * g.scale })
const pix = (x, y) => page.evaluate(([tx, ty]) => {
  const c = document.querySelectorAll('canvas')[1]; const d = c.getContext('2d').getImageData(tx, ty, 1, 1).data; return [d[0], d[1], d[2]]
}, [x, y])
const appliedShown = () => page.evaluate(() => /Applied|已应用/.test(document.body.textContent || ''))

// ── 1. Heal fix ──
console.log('── 1. heal removes watermark ──')
await open()
await btn('^Erase$|^去水印$')
await sleep(300)
const g1 = await content()
for (const yy of [60, 75, 90]) {
  const a = P(g1, 65, yy), b = P(g1, 135, yy)
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up()
}
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1200)
const [hr, hg, hb] = await pix(100, 75)
check('heal fills watermark area', !(hr > 245 && hg > 120 && hg < 165 && hb > 120 && hb < 165), `centroid now rgb(${hr},${hg},${hb})`)

// ── 2. Undo / redo ──
console.log('\n── 2. undo / redo ──')
await open()
await btn('^Cut out$|^抠图$')
await sleep(300)
const g2 = await content()
const a2 = P(g2, 60, 40), b2 = P(g2, 140, 40), c2 = P(g2, 140, 110), d2 = P(g2, 60, 110)
await page.mouse.move(a2.x, a2.y); await page.mouse.down()
await page.mouse.move(b2.x, b2.y, { steps: 6 })
await page.mouse.move(c2.x, c2.y, { steps: 6 })
await page.mouse.move(d2.x, d2.y, { steps: 6 })
await page.mouse.move(a2.x, a2.y, { steps: 6 })
await page.mouse.up()
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
// after cutout apply, corner (5,5) should be transparent (outside the loop)
const cornerAfter = await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1]; return c.getContext('2d').getImageData(5, 5, 1, 1).data[3]
})
check('cutout applied (corner transparent)', cornerAfter === 0, `alpha=${cornerAfter}`)
const undoDisabled = () => page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /Undo|撤销/.test(b.textContent || ''))?.disabled)
const redoDisabled = () => page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /Redo|重做/.test(b.textContent || ''))?.disabled)
check('undo enabled after apply', (await undoDisabled()) === false)
check('redo disabled at tip', (await redoDisabled()) === true)
await btn('Undo$|撤销$')
await sleep(1000)
const cornerUndo = await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1]; return c.getContext('2d').getImageData(5, 5, 1, 1).data[3]
})
check('undo restored original (corner opaque)', cornerUndo > 0, `alpha=${cornerUndo}`)
await btn('Redo$|重做$')
await sleep(1000)
const cornerRedo = await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1]; return c.getContext('2d').getImageData(5, 5, 1, 1).data[3]
})
check('redo re-applied cutout (corner transparent)', cornerRedo === 0, `alpha=${cornerRedo}`)

// ── 3. Download dialog ──
console.log('\n── 3. download dialog ──')
await open()
await btn('Download$|下载$')
await sleep(400)
const dlDialog = await page.evaluate(() => {
  const body = document.body.textContent || ''
  const hasDims = /Dimensions|尺寸/.test(body) && /\d+ × \d+px/.test(body)
  const hasFmt = /PNG|JPEG|WebP/.test(body)
  return { hasDims, hasFmt }
})
check('dialog shows readonly dims', dlDialog.hasDims)
check('dialog shows format options', dlDialog.hasFmt)
await btn('^PNG$')
await btn('Download$|下载$', true)  // last matching = the modal's confirm button
await sleep(1500)
const dl = await page.evaluate(() => window.__dl)
check('dialog download fires', dl.length > 0, dl[0] || '')

// ── 4. drag-to-rotate ──
console.log('\n── 4. drag-to-rotate ──')
await open()
await btn('^Rotate$|^旋转$')
await sleep(300)
const g4 = await content()
const angleBefore = await page.evaluate(() => {
  const range = document.querySelector('input[type="range"]')
  return range ? range.value : null
})
const cx = g4.left + (200 * g4.scale) / 2, cy = g4.top + (150 * g4.scale) / 2
await page.mouse.move(cx + 40, cy); await page.mouse.down()
await page.mouse.move(cx, cy + 40, { steps: 10 }); await page.mouse.up()
await sleep(400)
const angleAfter = await page.evaluate(() => {
  const range = document.querySelector('input[type="range"]')
  return range ? range.value : null
})
check('rotate angle changed by drag', angleBefore !== angleAfter, `${angleBefore}° → ${angleAfter}°`)

// ── 5. tutorial section ──
console.log('\n── 5. tutorial section ──')
await open()
const tut = await page.evaluate(() => {
  const body = document.body.textContent || ''
  const details = Array.from(document.querySelectorAll('details'))
  return { hasHeader: /每个工具怎么用|How to use each tool/.test(body), count: details.length }
})
check('tutorial section renders', tut.hasHeader, `${tut.count} expandable cards`)

// ── 6. cutout clear still works ──
console.log('\n── 6. cutout clear ──')
await open()
await btn('^Cut out$|^抠图$')
await sleep(300)
const g6 = await content()
const a6 = P(g6, 60, 40), b6 = P(g6, 140, 40)
await page.mouse.move(a6.x, a6.y); await page.mouse.down()
await page.mouse.move(b6.x, b6.y, { steps: 4 }); await page.mouse.up()
await sleep(200)
const ovBefore = await page.evaluate(() => { const c = document.querySelectorAll('canvas')[2]; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let p = 3; p < d.length; p += 4) if (d[p] > 10) n++; return n })
await btn('^Clear$|^清空$')
await sleep(300)
const ovAfter = await page.evaluate(() => { const c = document.querySelectorAll('canvas')[2]; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let p = 3; p < d.length; p += 4) if (d[p] > 10) n++; return n })
check('cutout clear works', ovBefore > 0 && ovAfter === 0, `${ovBefore} → ${ovAfter}`)

// ── 7. tagline location + no leftover import button + mobile layout ──
console.log('\n── 7. tagline location & mobile layout (no horizontal slide) ──')
await open()
const layout = await page.evaluate(() => {
  const tagline = Array.from(document.querySelectorAll('p')).find((p) => /一张图，多种工具|One image, many tools/.test(p.textContent || ''))
  const importBtn = Array.from(document.querySelectorAll('button')).find((b) => /导入图片|Import image/.test(b.textContent || ''))
  if (!tagline) return { missing: true }
  const wb = tagline.closest('.flex.flex-col.lg\\:flex-row') // the workbench
  const heading = tagline.parentElement && tagline.parentElement.querySelector('h1')
  return {
    missing: false,
    taglineAboveWorkbench: !wb && !tagline.closest('.lg\\:w-44') && !tagline.closest('.flex-1'),
    taglineNearHeading: !!heading,
    noImportAfterUpload: importBtn === undefined,
  }
})
check('tagline above the workbench (not under rail / not in canvas area)',
  !layout.missing && layout.taglineAboveWorkbench && layout.taglineNearHeading)
check('no import button after upload', layout.noImportAfterUpload)

await page.setViewport({ width: 390, height: 844 })
await sleep(600)
const mob = await page.evaluate(() => {
  const wb = document.querySelector('.flex.flex-col.lg\\:flex-row')
  const rail = wb ? wb.querySelector('.lg\\:w-44') : null
  const btns = rail ? Array.from(rail.querySelectorAll('button')) : []
  const tops = new Set(btns.map((b) => Math.round(b.getBoundingClientRect().top)))
  const panel = wb ? wb.querySelector('.order-1') : null
  const canvas = wb ? wb.querySelector('.order-2') : null
  const pRect = panel ? panel.getBoundingClientRect() : null
  const cRect = canvas ? canvas.getBoundingClientRect() : null
  return {
    btnRows: tops.size, btnCount: btns.length,
    noHScroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
    panelLeftOfCanvas: !!pRect && !!cRect && pRect.left < cRect.left,
  }
})
check('mobile: tools on top (no slide strip)', mob.btnCount >= 9 && mob.btnRows >= 1, `${mob.btnCount} btns, ${mob.btnRows} rows`)
check('mobile: no horizontal page scroll', mob.noHScroll)
check('mobile: settings panel left of canvas', mob.panelLeftOfCanvas)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
