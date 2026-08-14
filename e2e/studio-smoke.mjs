// End-to-end smoke test for the /studio combined editor.
//  1. pick an image → workbench appears
//  2. rotate 90° + Apply → dimensions swap (200×150 → 150×200)
//  3. text tool: type, place on canvas, Apply → "applied" banner
//  4. pencil tool: draw a stroke, Apply
//  5. heal tool: brush over the pink watermark, Apply (removal accumulates)
//  6. Undo → history pops back
//  7. Download fires an <a download> (non-WeChat)
// Runs on live or local URL (PAGE_URL env). Test image from gen-pink-png.mjs.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PAGE_URL = process.env.PAGE_URL || 'http://localhost:5173/studio'
const PNG = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, timeout = 8000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const v = await fn()
    if (v) return v
    await sleep(250)
  }
  return null
}

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })

await page.setViewport({ width: 1400, height: 900 })
await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 })

// 1. Upload — poll for the workbench (image load + render can exceed 2s on a
//    cold dev-server compile; a fixed sleep flakes — dev-lesson #13).
const input = await page.$('input[type="file"]')
if (!input) throw new Error('file input not found')
await input.uploadFile(PNG)

const hasBaseCanvas = await waitFor(() => page.evaluate(() => document.querySelectorAll('canvas').length >= 2), 12000)
console.log('workbench canvas appeared          :', hasBaseCanvas ? 'YES ✓' : 'NO ✗')
if (!hasBaseCanvas) {
  const dbg = await page.evaluate(() => ({
    url: location.href,
    canvases: document.querySelectorAll('canvas').length,
    h1: document.querySelector('h1')?.textContent,
    fileInputs: document.querySelectorAll('input[type=file]').length,
    bodyStart: (document.body.textContent || '').slice(0, 80),
  }))
  console.log('  [dbg]', JSON.stringify(dbg))
  console.log('  [dbg errors]', errors.length ? errors : 'none')
}

const buttonByText = (re) => page.evaluate((s) => {
  const btns = Array.from(document.querySelectorAll('button'))
  const el = btns.find((b) => new RegExp(s).test(b.textContent || ''))
  if (el) { el.click(); return true }
  return false
}, re)

const dimsText = () => page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('span')).find((s) => /\d+\s*×\s*\d+px/.test(s.textContent || ''))
  return el ? el.textContent.trim() : null
})

const appliedShown = () => page.evaluate(() => /Applied|已应用/.test(document.body.textContent || ''))

const stage = () => page.evaluate(() => {
  // overlay canvas is the 2nd <canvas> in the workbench (base is 1st)
  const c = document.querySelectorAll('canvas')[1]
  const r = c.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})

// 2. Rotate 90° + Apply
await buttonByText('^Rotate$|^旋转$')
await sleep(300)
await buttonByText('↻ 90|↻ 90°')
await sleep(200)
await buttonByText('^Apply$|^应用$')
const rotated = await waitFor(async () => (await dimsText()) === '150 × 200px')
console.log('rotate 90° swaps dims (200×150→150×200):', rotated ? `YES ✓` : `NO ✗ (${await dimsText()})`)
console.log('applied banner after rotate          :', await appliedShown() ? 'YES ✓' : 'NO ✗')

// 3. Text: type + place on canvas + Apply
await buttonByText('^Text$|^写字$')
await sleep(300)
await page.type('input[placeholder*="Type"] , input[placeholder*="输入"]', 'HELLO')
await sleep(300)
// DIAG: did the typed text reach React state?
console.log('  [diag] text input value             :', await page.evaluate(() => {
  const el = document.querySelector('input[placeholder*="Type"], input[placeholder*="输入"]')
  return el ? `"${el.value}"` : 'input-not-found'
}))
console.log('  [diag] Apply disabled?              :', await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('button')).find((b) => /^Apply$|^应用$/.test(b.textContent || ''))
  return el ? el.disabled : 'apply-not-found'
}))
// place text at canvas center
const t = await stage()
await page.mouse.click(t.left + t.width * 0.5, t.top + t.height * 0.5)
await sleep(200)
await buttonByText('^Apply$|^应用$')
const textApplied = await waitFor(appliedShown, 10000)
console.log('text tool apply                       :', textApplied ? 'YES ✓' : 'NO ✗')

// 4. Pencil: draw a stroke + Apply
await buttonByText('^Pencil$|^铅笔$')
await sleep(300)
const s2 = await stage()
await page.mouse.move(s2.left + s2.width * 0.3, s2.top + s2.height * 0.4)
await page.mouse.down()
await page.mouse.move(s2.left + s2.width * 0.6, s2.top + s2.height * 0.4, { steps: 8 })
await page.mouse.up()
await sleep(300)
await buttonByText('^Apply$|^应用$')
const pencilApplied = await waitFor(appliedShown, 10000)
console.log('pencil tool apply                     :', pencilApplied ? 'YES ✓' : 'NO ✗')

// 5. Heal: brush strokes + Apply (iterative accumulate)
await buttonByText('^Erase$|^去水印$')
await sleep(300)
const s3 = await stage()
for (let i = 0; i < 3; i++) {
  const y = s3.top + s3.height * (0.35 + i * 0.12)
  await page.mouse.move(s3.left + s3.width * 0.35, y); await page.mouse.down()
  await page.mouse.move(s3.left + s3.width * 0.65, y, { steps: 8 }); await page.mouse.up()
}
await sleep(300)
await buttonByText('^Apply$|^应用$')
await sleep(1800)
console.log('heal (brush) apply                    :', await appliedShown() ? 'YES ✓' : 'NO ✗')

// 6. Crop: default rect (80%) + Apply → dims shrink 150×200 → 120×160
await buttonByText('^Crop$|^裁剪$')
await sleep(300)
await buttonByText('^Apply$|^应用$')
const cropped = await waitFor(async () => (await dimsText()) === '120 × 160px')
console.log('crop apply shrinks dims (150×200→120×160):', cropped ? 'YES ✓' : `NO ✗ (${await dimsText()})`)

// 7. Logo/stamp: upload an image as the logo, place it, Apply
await buttonByText('^Stamp$|^刻章$')
await sleep(300)
const logoInput = await page.$('input[type="file"]')
if (logoInput) await logoInput.uploadFile(PNG)
await sleep(1500) // logo decodes async
const t4 = await stage()
await page.mouse.click(t4.left + t4.width * 0.5, t4.top + t4.height * 0.5)
await sleep(200)
await buttonByText('^Apply$|^应用$')
const logoApplied = await waitFor(appliedShown, 10000)
console.log('logo (stamp) apply                    :', logoApplied ? 'YES ✓' : 'NO ✗')

// 8. Cutout: draw a closed-ish ring path + Apply
await buttonByText('^Cut out$|^抠图$')
await sleep(300)
const t5 = await stage()
const cx = t5.left + t5.width * 0.5, cy = t5.top + t5.height * 0.5
await page.mouse.move(cx - t5.width * 0.2, cy)
await page.mouse.down()
await page.mouse.move(cx + t5.width * 0.2, cy - t5.height * 0.2, { steps: 10 })
await page.mouse.move(cx + t5.width * 0.2, cy + t5.height * 0.2, { steps: 10 })
await page.mouse.move(cx - t5.width * 0.2, cy + t5.height * 0.2, { steps: 10 })
await page.mouse.move(cx - t5.width * 0.2, cy, { steps: 10 })
await page.mouse.up()
await sleep(300)
await buttonByText('^Apply$|^应用$')
const cutApplied = await waitFor(appliedShown, 10000)
console.log('cutout (free-draw) apply              :', cutApplied ? 'YES ✓' : 'NO ✗')

// 9. Remove: click a spot to flood-fill + Apply
await buttonByText('^Remove$|^一键抠图$')
await sleep(300)
const t6 = await stage()
await page.mouse.click(t6.left + t6.width * 0.2, t6.top + t6.height * 0.2)
await sleep(300)
await buttonByText('^Apply$|^应用$')
const removeApplied = await waitFor(appliedShown, 10000)
console.log('remove (flood-fill) apply             :', removeApplied ? 'YES ✓' : 'NO ✗')

// 10. Resize: set width to 60 (ratio locked) + Apply → dims 60 × 80
await buttonByText('^Size$|^尺寸$')
await sleep(300)
await page.click('input[type="number"]')   // first number input = width
await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control')
await page.keyboard.type('60')
await sleep(200)
await buttonByText('^Apply$|^应用$')
const resized = await waitFor(async () => (await dimsText()) === '60 × 80px')
console.log('resize to 60×80 (ratio locked)       :', resized ? 'YES ✓' : `NO ✗ (${await dimsText()})`)

// 11. Undo pops history
await buttonByText('^Undo$|^撤销$')
await sleep(800)
console.log('undo button enabled after pop         :', await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('button')).find((b) => /Undo|撤销/.test(b.textContent || ''))
  return el ? !el.disabled : 'not-found'
}))

// 7. Download — capture anchor clicks (headless download events are flaky;
//    monkey-patch <a download> clicks to verify the filename was set)
await page.evaluate(() => {
  ;(window).__dl = []
  const orig = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) window.__dl.push(this.download)
    return orig.call(this)
  }
})
await buttonByText('Download$|下载$')   // button label is "↓ Download"
await sleep(800)
const dl = await page.evaluate(() => window.__dl || [])
console.log('download anchor fired                  :', dl.length > 0 ? `YES ✓ (${dl.join(', ')})` : 'NO ✗')

console.log('--- runtime errors:', errors.length === 0 ? 'none ✓' : '')
if (errors.length) console.log(errors.join('\n'))
await browser.close()
