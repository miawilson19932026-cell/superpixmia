// Verify the remove-bg manual refine panel: magic wand (erase/restore), brush,
// undo/redo, apply → result update. Runs the real AI removal first (model from CDN).
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const PNG = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const v = await fn(); if (v) return v; await sleep(400) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
page.on('pageerror', (e) => console.log('pageerror:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()) })

// Click a button inside the refine overlay (the fixed layer that contains a crosshair canvas).
// `pat` is a regex SOURCE STRING — a RegExp object doesn't survive evaluate serialization.
// textContent is normalized (emojis + variation selectors stripped) so label matching is reliable.
const ovBtn = (pat) => page.evaluate((s) => {
  const layers = Array.from(document.querySelectorAll('.fixed')).filter((el) => el.querySelector('canvas.cursor-crosshair'))
  const layer = layers[layers.length - 1]
  const norm = (t) => (t || '').replace(/[^一-龥A-Za-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const el = layer ? Array.from(layer.querySelectorAll('button')).find((b) => new RegExp(s).test(norm(b.textContent))) : null
  if (el) { el.click(); return norm(el.textContent) } return null
}, pat)

const refPix = (x, y) => page.evaluate(([tx, ty]) => {
  const c = document.querySelector('.checkerboard canvas')
  const d = c.getContext('2d').getImageData(tx, ty, 1, 1).data
  return [d[0], d[1], d[2], d[3]]
}, [x, y])
const refRect = () => page.evaluate(() => {
  const c = document.querySelector('.checkerboard canvas')
  const r = c.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height, cw: c.width, ch: c.height }
})
const canvasPt = (r, px, py) => ({ x: r.left + (px / r.cw) * r.width, y: r.top + (py / r.ch) * r.height })
// AI output size varies run-to-run; use fractional coords of the original image.
const FR = { cx: 0.5, cy: 0.5 } // pink block center (100,75 of 200×150)
const CR = { cx: 0.125, cy: 0.1667 } // top-left corner (25,25 of 200×150)
const fracPix = async (fx, fy) => { const r = await refRect(); return refPix(Math.round(r.cw * fx), Math.round(r.ch * fy)) }
const clickFrac = async (fx, fy) => { const r = await refRect(); const p = canvasPt(r, Math.round(r.cw * fx), Math.round(r.ch * fy)); await page.mouse.click(p.x, p.y) }

// ── Open the app, run AI removal ──
console.log('── setup: run AI background removal ──')
await page.goto(BASE + '/remove-bg', { waitUntil: 'networkidle2', timeout: 60000 })
await (await page.$('input[type="file"]')).uploadFile(PNG)
await waitFor(() => page.evaluate(() => document.querySelectorAll('img').length >= 2))
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /移除背景|Remove Background/.test(b.textContent || ''))?.click())
const t0 = Date.now()
const gotResult = await waitFor(() => page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).some((b) => /手动精修|Fine-tune/.test(b.textContent || '')) ? true : null
))
check('AI removal produced a result', !!gotResult, `${(Date.now() - t0) / 1000}s`)

const resultSrcBefore = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img')).filter((i) => /blob:/.test(i.src || ''))
  return imgs.length ? imgs[imgs.length - 1].src : null
})

// ── Open refine panel ──
console.log('\n── 1. refine panel opens ──')
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => /手动精修|Fine-tune/.test(b.textContent || ''))?.click())
const open = await waitFor(() => page.evaluate(() => {
  const c = document.querySelector('.checkerboard canvas')
  return c && c.width > 100 ? { w: c.width, h: c.height } : null
}))
check('refine overlay canvas rendered', !!open, open ? `${open.w}×${open.h}` : '')
const cornerBefore = (await fracPix(CR.cx, CR.cy))[3]
check('result corner is transparent before restore', cornerBefore === 0, `alpha=${cornerBefore}`)
const centerBefore = await fracPix(FR.cx, FR.cy)
check('subject center is opaque pink (targeting the subject)', centerBefore[3] > 200 && centerBefore[0] > 200 && centerBefore[1] < 180, `rgb(${centerBefore[0]},${centerBefore[1]},${centerBefore[2]}) a=${centerBefore[3]}`)

// ── 2. Magic wand — restore ──
console.log('\n── 2. wand restore ──')
check('restore button found', (await ovBtn('^恢复$|^Restore$')) !== null, (await ovBtn('^恢复$|^Restore$')) || 'null')
await sleep(150)
await clickFrac(CR.cx, CR.cy)
await sleep(300)
const cornerRestored = await fracPix(CR.cx, CR.cy)
check('wand-restore fills corner from original', cornerRestored[3] > 200, `rgb(${cornerRestored[0]},${cornerRestored[1]},${cornerRestored[2]}) a=${cornerRestored[3]}`)

// ── 3. undo / redo ──
console.log('\n── 3. undo / redo ──')
await ovBtn('^撤销$|^Undo$')
await sleep(250)
check('undo reverts restore', (await fracPix(CR.cx, CR.cy))[3] === 0, `alpha=${(await fracPix(CR.cx, CR.cy))[3]}`)
await ovBtn('^重做$|^Redo$')
await sleep(250)
check('redo re-applies restore', (await fracPix(CR.cx, CR.cy))[3] > 200, `alpha=${(await fracPix(CR.cx, CR.cy))[3]}`)

// ── 4. Magic wand — erase ──
console.log('\n── 4. wand erase ──')
await ovBtn('^擦除$|^Erase$')
await sleep(150)
await clickFrac(FR.cx, FR.cy) // pink block center
await sleep(300)
const centerErased = await fracPix(FR.cx, FR.cy)
check('wand-erase clears subject to transparent', centerErased[3] === 0, `alpha=${centerErased[3]}`)

// ── 5. Brush erase ──
console.log('\n── 5. brush erase ──')
await ovBtn('^画笔$|^Brush$')
await sleep(150)
let r = await refRect()
let p = canvasPt(r, Math.round(r.cw * CR.cx), Math.round(r.ch * CR.cy)) // corner currently restored/opaque
await page.mouse.move(p.x, p.y)
await page.mouse.down()
await page.mouse.move(p.x + r.width * 0.03, p.y + r.height * 0.03, { steps: 4 })
await page.mouse.up()
await sleep(300)
const brushed = await fracPix(CR.cx, CR.cy)
check('brush-erase clears painted area', brushed[3] === 0, `alpha=${brushed[3]}`)

// ── 6. Apply → close + result update ──
console.log('\n── 6. apply ──')
check('apply button found', (await ovBtn('^应用修改$|^Apply changes$')) !== null)
await ovBtn('^应用修改$|^Apply changes$')
const closed = await waitFor(() => page.evaluate(() => !document.querySelector('.checkerboard canvas') ? true : null), 15000)
check('apply closes the overlay', !!closed)
const resultSrcAfter = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img')).filter((i) => /blob:/.test(i.src || ''))
  return imgs.length ? imgs[imgs.length - 1].src : null
})
check('result preview updated after refine', !!resultSrcAfter && resultSrcAfter !== resultSrcBefore)
// and the applied result really reflects the edits: pink subject center was erased
// (alpha 0) though the AI kept it opaque — that proves the refine reached the download.
const appliedCenter = await page.evaluate(() => new Promise((resolve) => {
  const imgs = Array.from(document.querySelectorAll('img')).filter((i) => /blob:/.test(i.src || ''))
  const src = imgs[imgs.length - 1].src
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    c.getContext('2d').drawImage(img, 0, 0)
    const fx = Math.round(c.width * 0.5), fy = Math.round(c.height * 0.5)
    resolve({ center: c.getContext('2d').getImageData(fx, fy, 1, 1).data[3] })
  }
  img.src = src
}))
check('refined result erased the subject center', appliedCenter.center === 0, `center alpha=${appliedCenter.center}`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
