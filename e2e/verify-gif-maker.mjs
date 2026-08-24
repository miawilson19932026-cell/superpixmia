// Verify the GIF Maker (/gif-maker): homepage card → page, multi-frame upload
// (mixed sizes → union canvas), generate → valid GIF bytes with transparent
// frames, regenerate after settings change, and the free-download quota
// (1st free, 2nd → sign-in modal, signed-in unlimited).
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const MOBILE_BIG = fileURLToPath(new URL('./mobile-big.png', import.meta.url)) // 1000×800
const PINK = fileURLToPath(new URL('./test-pink-watermark.png', import.meta.url)) // 200×150
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const v = await fn(); if (v) return v; await sleep(250) } return null }
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

// ── 1. Homepage card → navigates to /gif-maker ──
console.log('── 1. homepage card ──')
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })
const cardFound = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /动效合成器|Animation Maker|GIF 合成器|GIF Maker/.test(x.textContent || ''))
  if (!b) return false
  b.click()
  return true
})
check('homepage grid shows a GIF Maker card', cardFound)
await waitFor(() => page.url().includes('/gif-maker'), 10000)
check('clicking the card navigates to /gif-maker', page.url().includes('/gif-maker'))
check('/gif-maker renders the title', await page.evaluate(() => /动效合成器|Animation Maker/.test(document.body.textContent || '')))

const open = async (authed = false) => {
  await page.goto(BASE + '/gif-maker', { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate((a) => {
    if (a) {
      localStorage.setItem('spm-auth-token', JSON.stringify({
        access_token: 'e2e-fake-token', refresh_token: 'e2e-fake-refresh', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
        user: { id: 'e2e-user', email: 'e2e@test.com', aud: 'authenticated', role: 'authenticated', created_at: '2020-01-01T00:00:00.000Z' },
      }))
    } else {
      localStorage.removeItem('spm-auth-token')
      localStorage.removeItem('spm-free-dl') // fresh free-download quota per section
    }
  }, authed)
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => {
    window.__dl = []
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return orig.call(this) }
  })
}

const gifPreviewInfo = () => page.evaluate(async () => {
  const img = document.querySelector('img[alt="GIF preview"]')
  if (!img) return null
  const res = await fetch(img.src)
  const buf = new Uint8Array(await res.arrayBuffer())
  const header = String.fromCharCode(buf[0], buf[1], buf[2], buf[3], buf[4], buf[5])
  const w = buf[6] | (buf[7] << 8)
  const h = buf[8] | (buf[9] << 8)
  const netscape = String.fromCharCode(...buf.subarray(0, Math.min(buf.length, 400))) // raw scan for loop ext
  return { header, w, h, size: buf.length, loopExt: netscape.includes('NETSCAPE2.0') }
})

// Buttons carry an emoji/arrow prefix (e.g. "🎞️ Generate GIF"), so match the
// label without ^ anchors.
const uploadAndGenerate = async () => {
  await (await page.$('input[type="file"]')).uploadFile(MOBILE_BIG, PINK)
  const framesOk = await waitFor(() => page.evaluate(() => document.querySelectorAll('img[alt^="frame"]').length === 2))
  if (!framesOk) throw new Error('frames did not appear after upload')
  await btn('Generate GIF|生成 GIF')
  const previewOk = await waitFor(() => page.evaluate(() => !!document.querySelector('img[alt="GIF preview"]')), 20000)
  if (!previewOk) throw new Error('no preview after generate')
}

// ── 2. Generate a valid GIF from two mixed-size frames ──
console.log('\n── 2. generate ──')
await open()
await uploadAndGenerate()
const info = await gifPreviewInfo()
check('generate produced a GIF (GIF89a)', info && info.header === 'GIF89a', info ? `${info.header} · ${info.size}B` : 'no preview')
// mobile-big 1000×800 → capped to 512 max edge → 512×410; pink 200×150 kept →
// union canvas = 512×410, both centered.
check('mixed sizes centered on a 512×410 union canvas', info && info.w === 512 && info.h === 410, info ? `${info.w}×${info.h}` : '')
check('loop extension written (NETSCAPE2.0)', info && info.loopExt)

// Regenerate after changing the frame rate — preview updates to a valid GIF.
await page.evaluate(() => {
  const r = document.querySelector('input[type="range"]')
  if (r) {
    // React 19 guards controlled inputs against programmatic .value writes, so
    // write through the native setter to actually fire onChange.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(r, '15')
    r.dispatchEvent(new Event('input', { bubbles: true }))
  }
})
await btn('Generate GIF|生成 GIF')
await waitFor(() => page.evaluate(() => !!document.querySelector('img[alt="GIF preview"]')), 20000)
const info2 = await gifPreviewInfo()
check('regenerate after fps change stays valid', info2 && info2.header === 'GIF89a', info2 ? `${info2.header} · ${info2.size}B` : '')

// ── 2.5 Keyframe editing: select a frame → panel → tweak → deselect → regen ──
console.log('\n── 2.5 keyframe editing ──')
await open()
await uploadAndGenerate()

// Click frame #2's thumbnail to open its keyframe editor.
const clickFrame2 = () => page.evaluate(() => {
  const img = document.querySelector('img[alt="frame 2"]')
  const el = img && img.closest('[role="button"]')
  if (el) { el.click(); return true } return false
})
check('clicking frame #2 selects it', await clickFrame2())

const panelTitle = await waitFor(() => page.evaluate(() => {
  const p = document.querySelector('[data-testid="frame-config"]')
  return p ? (p.textContent || '').trim() : null
}))
check('keyframe panel appears for frame #2', !!panelTitle, panelTitle ? `"${panelTitle.replace(/\s+/g, ' ').slice(0, 24)}…"` : '')

const sliderCount = await page.evaluate(() => document.querySelectorAll('[data-testid="frame-config"] input[type="range"]').length)
check('panel has 5 sliders (duration/scale/rotate/h/v)', sliderCount === 5, `${sliderCount} sliders`)

// Set duration 2.0s, scale 150%, rotate 90° (panel sliders are in that order).
const setPanelSlider = (i, v) => page.evaluate(([i, v]) => {
  const inputs = Array.from(document.querySelectorAll('[data-testid="frame-config"] input[type="range"]'))
  const el = inputs[i]
  if (!el) return null
  // React 19 guards controlled inputs — use the native setter to bypass its
  // value tracker so onChange actually fires.
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, String(v))
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}, [i, v])
const tweaked = (await setPanelSlider(0, 2000)) && (await setPanelSlider(1, 1.5)) && (await setPanelSlider(2, 90))
check('tweaking sliders works', !!tweaked)
await sleep(300)

const panelLabels = await page.evaluate(() => {
  const p = document.querySelector('[data-testid="frame-config"]')
  return p ? p.textContent : ''
})
check('panel displays 2.0s / 150% / 90°', /2\.0(秒|s)/.test(panelLabels) && /150%/.test(panelLabels) && /90°/.test(panelLabels), panelLabels.replace(/\s+/g, ' ').slice(0, 100))

const badgeTitle = await page.evaluate(() => {
  const img = document.querySelector('img[alt="frame 2"]')
  const el = img && img.closest('[role="button"]')
  return el ? (el.getAttribute('title') || '') : ''
})
check('frame #2 thumbnail marks it as customized', /已单独设置|Customized/.test(badgeTitle), `title="${badgeTitle}"`)

// Changing the global FPS applies to every frame — frame #2's custom 2.0s hold
// time resets to the new uniform 0.5s. (FPS slider is the page's first range.)
await page.evaluate(() => {
  const el = document.querySelector('input[type="range"]')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, '2')
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
await sleep(300)
const labelsAfterFps = await page.evaluate(() => {
  const p = document.querySelector('[data-testid="frame-config"]')
  return p ? p.textContent : ''
})
check('global fps change resets frame hold time (2.0s → 0.5s)', /0\.5(秒|s)/.test(labelsAfterFps), labelsAfterFps.replace(/\s+/g, ' ').slice(0, 80))
// Scale + rotate survived — badge still present.
const badgeAfterFps = await page.evaluate(() => {
  const img = document.querySelector('img[alt="frame 2"]')
  const el = img && img.closest('[role="button"]')
  return el ? (el.getAttribute('title') || '') : ''
})
check('scale/rotate survive the global fps change', /已单独设置|Customized/.test(badgeAfterFps))

// Regenerate after keyframe edits — union canvas 512×410 still fits the rotated
// frame (pink 200×150 → rotate 90° + scale 1.5 → 225×300), GIF stays valid.
await btn('Generate GIF|生成 GIF')
const previewOk2 = await waitFor(() => page.evaluate(() => !!document.querySelector('img[alt="GIF preview"]')), 20000)
check('regenerate after keyframe edits stays valid', previewOk2)
const info3 = await gifPreviewInfo()
check('union canvas unchanged 512×410 with rotated frame', info3 && info3.w === 512 && info3.h === 410, info3 ? `${info3.w}×${info3.h}` : '')
check('GIF header still GIF89a', info3 && info3.header === 'GIF89a', info3 ? info3.header : '')

// Deselect by clicking frame #2 again → panel closes.
await clickFrame2()
await sleep(200)
const panelGone = await page.evaluate(() => !document.querySelector('[data-testid="frame-config"]'))
check('clicking frame #2 again deselects (panel closes)', panelGone)

// ── 3. Free-download quota: 1st free, 2nd → sign-in, signed-in unlimited ──
console.log('\n── 3. download quota ──')
const dlCount = () => page.evaluate(() => window.__dl.length)
const loginShown = () => page.evaluate(() => !!document.querySelector('input[type="email"]'))
const bodySaysUnlimited = () => page.evaluate(() => /不限次|unlimited/.test(document.body.textContent || ''))

// 3a. Logged out, fresh quota → 1st download fires.
await open()
await uploadAndGenerate()
await btn('Download GIF|下载 GIF')
await sleep(800)
const dl1 = await dlCount()
check('1st download fires (free, no login)', dl1 === 1, `${dl1} downloads`)

// 3b. Same session, 2nd download → quota exhausted → login modal, no new download.
await btn('Download GIF|下载 GIF')
await sleep(800)
const dl2 = await dlCount()
const login2 = await loginShown()
check('2nd download blocked: login modal opens, no new download', login2 && dl2 === dl1, `login=${login2}, dl=${dl1}→${dl2}`)
const unlimited2 = await bodySaysUnlimited()
check('login modal says downloads are unlimited after sign-in', unlimited2)

// 3c. Signed-in (injected session) → download fires (unlimited).
await open(true)
await uploadAndGenerate()
await btn('Download GIF|下载 GIF')
await sleep(800)
const dl3 = await dlCount()
check('signed-in download fires', dl3 === 1, `${dl3} downloads`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
