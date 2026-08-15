// Verify the Studio onboarding batch:
//  1. The pick page (no image) already shows the per-tool tutorial at the bottom.
//  2. The first time a tool is picked, a teaching bubble appears pointing at the
//     Apply button ("tap Apply for changes to take effect"), and it dismisses on
//     Apply / re-picking a seen tool.
//  3. Manual cutout now only shows the dashed loop while drawing; the region
//     closes on pointer-up; Keep/Remove modes add/subtract selection (PS-style).
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

const btn = (re, last = false) => page.evaluate(([s, last]) => {
  const els = Array.from(document.querySelectorAll('button')).filter((b) => new RegExp(s).test(b.textContent || ''))
  const el = last ? els[els.length - 1] : els[0]
  if (el) { el.click(); return el.textContent.trim() } return null
}, [re, last])
const open = async () => {
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
  // fresh session → every tool is "first visit" again
  await page.evaluate(() => sessionStorage.clear())
  await page.reload({ waitUntil: 'networkidle2' })
  await (await page.$('input[type="file"]')).uploadFile(PNG)
  await waitFor(() => page.evaluate(() => {
    const c = document.querySelectorAll('canvas')[1]
    if (!c || c.width <= 100) return false
    const d = c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data
    return d[3] > 0
  }))
}
const rect = (i) => page.evaluate((idx) => { const c = document.querySelectorAll('canvas')[idx]; const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, cw: c.width, ch: c.height } }, i)
const clickImg = async (ix, iy) => {
  const r = await rect(2)
  await page.mouse.click(r.left + (ix / r.cw) * r.width, r.top + (iy / r.ch) * r.height)
}
const appliedShown = () => page.evaluate(() => /Applied|已应用/.test(document.body.textContent || ''))
const overlayCount = () => page.evaluate(() => {
  const ov = document.querySelectorAll('canvas')[2]
  const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data
  let n = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++
  return n
})
const alphaAt = (x, y) => page.evaluate(([x, y]) => {
  const c = document.querySelectorAll('canvas')[1]
  return c.getContext('2d').getImageData(x, y, 1, 1).data[3]
}, [x, y])
// the teaching bubble = the element containing the apply-reminder line
const tipRect = () => page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div, p')).filter((d) => /Tap "Apply"|每次操作后/.test(d.textContent || ''))
  if (!els.length) return null
  const el = els.reduce((a, b) => (a.textContent.length <= b.textContent.length ? a : b)) // innermost
  return el.getBoundingClientRect().toJSON()
})

// ── 1. pick page shows the tutorial ──
console.log('\n── 1. pick page tutorial (no image) ──')
await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
await page.evaluate(() => sessionStorage.clear())
await page.reload({ waitUntil: 'networkidle2' })
const pick = await page.evaluate(() => ({
  hasHeader: /每个工具怎么用|How to use each tool/.test(document.body.textContent || ''),
  cards: Array.from(document.querySelectorAll('details')).length,
}))
check('tutorial header on pick page', pick.hasHeader, pick.cards + ' cards')
check('9 expandable tool cards', pick.cards === 9, `${pick.cards}`)
// expand the first card and confirm steps render
const stepsOk = await page.evaluate(() => {
  const d = document.querySelector('details')
  if (!d) return false
  d.open = true
  return d.querySelectorAll('li').length >= 3
})
check('expanded card shows steps', stepsOk)

// ── 2. first-visit teaching bubble → Apply ──
console.log('\n── 2. first-visit bubble ──')
await open()
await btn('^Rotate$|^旋转$')
await sleep(400)
const t1 = await tipRect()
check('bubble appears on first tool pick', !!t1, t1 ? `at (${Math.round(t1.x)},${Math.round(t1.y)})` : 'missing')
const applyBtn = () => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^Apply$|^应用$/.test(x.textContent.trim()))
  return b ? b.getBoundingClientRect().toJSON() : null
})
const ab = await applyBtn()
check('bubble points at Apply (bubble right ≤ button left)', !!t1 && !!ab && t1.right <= ab.left + 20, ab ? `bubble.right=${Math.round(t1?.right)} btn.left=${Math.round(ab.left)}` : 'no button')
// dismiss via Apply — applying is the lesson
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(300)
check('bubble dismissed after Apply', !(await tipRect()))
// re-picking a seen tool must NOT re-teach
await btn('^Rotate$|^旋转$')
await sleep(300)
check('bubble does not reappear for seen tool', !(await tipRect()))
// a second, different tool is still first-visit
await btn('^Crop$|^裁剪$')
await sleep(300)
check('second tool shows its own bubble', !!(await tipRect()))

// ── 3. manual cutout: close-on-release + keep/remove ──
console.log('\n── 3. cutout keep/remove ──')
await open()
// dismiss any teaching bubble so it can't cover the canvas
await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label="dismiss"]')).forEach((b) => b.click()))
await btn('^Cut out$|^抠图$')
await sleep(300)
const r2 = await rect(2)
// draw 3 sides of a rectangle, keep the pointer DOWN → still only a dashed line
await page.mouse.move(r2.left + 60, r2.top + 40); await page.mouse.down()
await page.mouse.move(r2.left + 140, r2.top + 40, { steps: 4 })
await page.mouse.move(r2.left + 140, r2.top + 110, { steps: 4 })
await sleep(200)
const midCount = await overlayCount()
check('while drawing: no closed fill (path only)', midCount < 1500, `${midCount} overlay px`)
// complete the loop and release → region closes and shows
await page.mouse.move(r2.left + 60, r2.top + 110, { steps: 4 })
await page.mouse.move(r2.left + 60, r2.top + 40, { steps: 4 })
await page.mouse.up()
await sleep(300)
const closedCount = await overlayCount()
check('region closes on pointer-up', closedCount > 15000, `${closedCount} overlay px`)
// apply in default Keep mode → outside the loop transparent, inside kept
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(800)
check('keep: outside loop transparent', (await alphaAt(5, 5)) === 0, `alpha=${await alphaAt(5, 5)}`)
check('keep: inside loop kept', (await alphaAt(100, 75)) > 0, `alpha=${await alphaAt(100, 75)}`)

// Remove mode subtracts from the kept region
await open()
await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label="dismiss"]')).forEach((b) => b.click()))
await btn('^Cut out$|^抠图$')
await sleep(300)
const r3 = await rect(2)
// keep rectangle (60,40)-(140,110)
await page.mouse.move(r3.left + 60, r3.top + 40); await page.mouse.down()
await page.mouse.move(r3.left + 140, r3.top + 40, { steps: 4 })
await page.mouse.move(r3.left + 140, r3.top + 110, { steps: 4 })
await page.mouse.move(r3.left + 60, r3.top + 110, { steps: 4 })
await page.mouse.move(r3.left + 60, r3.top + 40, { steps: 4 })
await page.mouse.up()
await sleep(200)
// switch to Remove and carve out the top-left corner of the kept rect
await btn('^Remove$|^去除$')
await sleep(200)
await page.mouse.move(r3.left + 60, r3.top + 40); await page.mouse.down()
await page.mouse.move(r3.left + 90, r3.top + 40, { steps: 3 })
await page.mouse.move(r3.left + 90, r3.top + 70, { steps: 3 })
await page.mouse.move(r3.left + 60, r3.top + 70, { steps: 3 })
await page.mouse.move(r3.left + 60, r3.top + 40, { steps: 3 })
await page.mouse.up()
await sleep(200)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(800)
check('remove: carved-out spot transparent', (await alphaAt(70, 50)) === 0, `alpha=${await alphaAt(70, 50)}`)
check('remove: kept area outside carve stays', (await alphaAt(100, 90)) > 0, `alpha=${await alphaAt(100, 90)}`)
check('remove: outside loop still transparent', (await alphaAt(5, 5)) === 0, `alpha=${await alphaAt(5, 5)}`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
