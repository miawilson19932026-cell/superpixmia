// Reproduces the reported bug: generate a GIF → Clear all → re-upload frames →
// the old GIF's preview must NOT linger. Asserts the preview area returns to the
// placeholder state after frames change, and no console errors occur.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const IMG1 = fileURLToPath(new URL('./demo-scenery.png', import.meta.url))
const IMG2 = fileURLToPath(new URL('./test-watermark.png', import.meta.url))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, timeout = 20000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const v = await fn()
    if (v) return v
    await sleep(200)
  }
  return null
}

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))

const upload = async (img1, img2) => {
  const input = await page.$('input[type=file]')
  await input.uploadFile(img1, img2)
}

await page.goto(`${BASE}/gif-maker`, { waitUntil: 'networkidle2' })

// 1. Upload 2 frames
await upload(IMG1, IMG2)
await waitFor(() => page.evaluate(() => document.querySelectorAll('img[alt^="frame"]').length >= 2))
console.log('step 1: 2 frames uploaded')

// 2. Generate the GIF
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Generate GIF'))
  if (btn) btn.click()
})
await waitFor(() => page.evaluate(() => !!document.querySelector('img[alt="GIF preview"]')))
console.log('step 2: GIF generated, preview visible')

// 3. Clear all
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Clear all')
  if (btn) btn.click()
})
await waitFor(() => page.evaluate(() => !document.querySelector('img[alt^="frame"]') && document.querySelector('input[type=file]')))
console.log('step 3: cleared, back to dropzone')

// 4. Re-upload 2 frames — preview must NOT show the old GIF
await upload(IMG1, IMG2)
await waitFor(() => page.evaluate(() => document.querySelectorAll('img[alt^="frame"]').length >= 2))
const previewVisible = await page.evaluate(() => !!document.querySelector('img[alt="GIF preview"]'))
console.log('step 4: re-uploaded; stale GIF preview still visible =', previewVisible, '(expected false)')

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
if (previewVisible || errors.length) process.exit(1)
