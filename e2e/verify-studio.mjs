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

const open = async (authed = false) => {
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
  // Deterministic auth state per section: signed-in sections inject a fake
  // Supabase session (fixed storageKey 'spm-auth-token'); the rest clear it.
  // Reloading afterwards keeps every section starting from a known state.
  // NOTE: created_at is 2020 (NOT "now") — AuthProvider treats accounts < 2 min
  // old as needing a password-setup prompt, and that modal would block the canvas.
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

// ── 3. Site-wide free-download quota: 1st download free, 2nd asks to sign in ──
console.log('\n── 3. free-download quota (1st free, 2nd → login, signed-in unlimited) ──')
const dlDialogState = () => page.evaluate(() => {
  const body = document.body.textContent || ''
  // Keyed off the "Dimensions" label — the image-info badge ALWAYS shows the
  // "N × Mpx" text next to the filename, so dims alone can't detect the dialog.
  const hasDims = /Dimensions|尺寸/.test(body) && /\d+ × \d+px/.test(body)
  const hasFmt = /PNG|JPEG|WebP/.test(body)
  const hasLogin = !!document.querySelector('input[type="email"]')
  const reason = /不限次|unlimited/.test(body)
  return { hasDims, hasFmt, hasLogin, reason }
})

// 3a. Logged out with fresh quota → the confirm dialog works, download fires.
await open()
await btn('Download$|下载$')
await sleep(400)
const firstDlg = await dlDialogState()
check('logged-out 1st download: dialog shows dims', firstDlg.hasDims)
check('logged-out 1st download: dialog shows formats', firstDlg.hasFmt)
await btn('^PNG$')
await btn('Download$|下载$', true) // last matching = the dialog's confirm button
await sleep(1500)
const dl1 = await page.evaluate(() => window.__dl.length)
check('logged-out 1st download fires (free, no login)', dl1 === 1, `${dl1} downloads`)

// 3b. Same logged-out session, 2nd download → quota exhausted → login modal.
await btn('Download$|下载$')
await sleep(400)
await btn('^PNG$')
await btn('Download$|下载$', true)
await sleep(800)
const gate2 = await dlDialogState()
const dl2 = await page.evaluate(() => window.__dl.length)
check('2nd download blocked: login modal opens, no new download', gate2.hasLogin && dl2 === dl1, `login=${gate2.hasLogin}, dl=${dl1}→${dl2}`)
check('login modal says downloads are unlimited after sign-in', gate2.reason)

// 3c. Signed-in (injected session) → dialog works, download fires (unlimited).
await open(true)
await btn('Download$|下载$')
await sleep(400)
const signedDlg = await dlDialogState()
check('signed-in: dialog shows dims', signedDlg.hasDims)
check('signed-in: dialog shows formats', signedDlg.hasFmt)
await btn('^PNG$')
await btn('Download$|下载$', true)
await sleep(1500)
const dl3 = await page.evaluate(() => window.__dl.length)
check('signed-in download fires', dl3 === 1, `${dl3} downloads`)

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
    taglineAboveWorkbench: !wb && !tagline.closest('.lg\\:w-20') && !tagline.closest('.flex-1'),
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
  const rail = wb ? wb.querySelector('.lg\\:w-20') : null
  const btns = rail ? Array.from(rail.querySelectorAll('button')) : []
  const tops = new Set(btns.map((b) => Math.round(b.getBoundingClientRect().top)))
  // Canvas card = the .glass that CONTAINS a canvas; settings panel = .lg\\:w-64.
  const canvasCard = document.querySelectorAll('canvas')[1]?.closest('.glass') || null
  const panel = wb ? wb.querySelector('.lg\\:w-64') : null
  const cRect = canvasCard ? canvasCard.getBoundingClientRect() : null
  const pRect = panel ? panel.getBoundingClientRect() : null
  return {
    btnRows: tops.size, btnCount: btns.length,
    noHScroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
    canvasFullWidth: !!cRect && !!rail && cRect.width >= rail.getBoundingClientRect().width - 1,
    panelBelowCanvas: !!pRect && !!cRect && pRect.top >= cRect.bottom - 1,
  }
})
check('mobile: tools on top (no slide strip)', mob.btnCount >= 9 && mob.btnRows >= 1, `${mob.btnCount} btns, ${mob.btnRows} rows`)
check('mobile: no horizontal page scroll', mob.noHScroll)
check('mobile: canvas full-width above the settings panel', mob.canvasFullWidth && mob.panelBelowCanvas,
  `canvasW=${mob.canvasFullWidth} panelBelow=${mob.panelBelowCanvas}`)

// ── 8. canvas box hugs image — every image type × breakpoint (no letterbox) ──
console.log('\n── 8. no letterbox across image types & breakpoints ──')
const openImg = async (img) => {
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle2', timeout: 60000 })
  await (await page.$('input[type="file"]')).uploadFile(fileURLToPath(new URL(img, import.meta.url)))
  await waitFor(() => page.evaluate(() => document.querySelectorAll('canvas')[1]?.width > 100))
}
const LB_IMAGES = [
  ['portrait 1200×1600', './_photo.png'],
  ['landscape 1000×800', './mobile-big.png'],
  ['small 200×150', './test-pink-watermark.png'],
]
const LB_VIEWPORTS = [
  ['mobile 390×844', 390, 844],
  ['desktop 1400×900', 1400, 900],
]
for (const [bp, w, h] of LB_VIEWPORTS) {
  for (const [label, img] of LB_IMAGES) {
    await page.setViewport({ width: w, height: h })
    await openImg(img)
    await sleep(500)
    const lb = await page.evaluate(() => {
      const c = document.querySelectorAll('canvas')[1]
      const r = c.getBoundingClientRect()
      return { imgAspect: c.width / c.height, boxAspect: r.width / r.height }
    })
    check(`no letterbox — ${label} @ ${bp}`,
      Math.abs(lb.imgAspect - lb.boxAspect) < 0.01,
      `img=${lb.imgAspect.toFixed(3)} box=${lb.boxAspect.toFixed(3)}`)
  }
}

// ── 9. New fixes: workspace reset, crop re-seed after undo, ratio lock, zoom, dim pill ──
console.log('\n── 9. new interaction fixes ──')
await page.setViewport({ width: 1400, height: 900 })

// 9a. Uploading a new image fully resets the workspace (stale edits gone).
await open()
await btn('^Rotate$|^旋转$')
await sleep(200)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
await (await page.$('input[type="file"]')).uploadFile(fileURLToPath(new URL('./_photo.png', import.meta.url)))
await waitFor(() => page.evaluate(() => document.querySelectorAll('canvas')[1]?.width > 1000))
const newCanvasW = await page.evaluate(() => document.querySelectorAll('canvas')[1].width)
check('new image replaces canvas (1200px wide)', newCanvasW === 1200, `canvasW=${newCanvasW}`)
check('new image resets undo stack', (await undoDisabled()) === true)

// 9b. Crop → apply switches to Select (clean result, no lingering crop box).
// Undo reverts the image but stays in Select — nothing to re-click.
await open()
await btn('^Crop$|^裁剪$')
await sleep(400)
const ovCount = () => page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[2]
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let p = 3; p < d.length; p += 4) if (d[p] > 10) n++
  return n
})
const applyBtnDisabled = () => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^Apply$|^应用$/.test(x.textContent || ''))
  return b ? b.disabled : null
})
check('crop box drawn on overlay', (await ovCount()) > 0)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
// Apply switches to the Select tool → overlay cleared so the result is seen
// clean, and Apply is disabled (nothing to commit in Select mode).
check('apply switches to Select (overlay cleared)', (await ovCount()) === 0)
check('Select has nothing to apply (button disabled)', (await applyBtnDisabled()) === true)
// Undo reverts the image but Select stays — the overlay stays clean.
await btn('Undo$|撤销$')
await sleep(1200)
check('undo stays in Select (overlay still clean)', (await ovCount()) === 0)

// 9c. Aspect-ratio lock: pick 1:1 → the crop box becomes square.
await open()
await btn('^Crop$|^裁剪$')
await sleep(300)
await btn('^1:1$')
await sleep(300)
const ratio = await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[2]
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  const W = c.width, H = c.height
  let minX = W, maxX = -1, minY = H, maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] < 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { w: maxX - minX + 1, h: maxY - minY + 1 }
})
check('crop 1:1 ratio locked', Math.abs(ratio.w - ratio.h) / Math.max(1, ratio.h) < 0.05, `${ratio.w}×${ratio.h}`)

// 9d. Mouse-wheel view zoom (transform on the box) + reset back to fit.
const boxTransform = () => page.evaluate(() => {
  const b = document.querySelector('.relative.select-none.checkerboard')
  return b ? getComputedStyle(b).transform : 'none'
})
await open()
await sleep(400)
check('default view zoom has no transform', (await boxTransform()) === 'none')
await page.evaluate(() => {
  const c = document.querySelectorAll('canvas')[1]
  const r = c.getBoundingClientRect()
  const card = c.closest('.overflow-hidden')
  card.dispatchEvent(new WheelEvent('wheel', {
    deltaY: -120, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
    bubbles: true, cancelable: true,
  }))
})
await sleep(300)
const ztr = await boxTransform()
check('wheel zoom applies a CSS transform', ztr !== 'none', ztr)
await btn('^Reset$|^复位$')
await sleep(300)
check('reset button returns to fit', (await boxTransform()) === 'none')

// 9e. Live dimensions shown in the RIGHT crop panel (moved off the canvas per
// feedback) — always nonzero: current image size, or live crop-box size.
await btn('^Crop$|^裁剪$')
await sleep(400)
const dims = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.font-mono'))
    .map((s) => s.textContent || '').filter((t) => /^\d+px$/.test(t))
})
check('live dimensions in right crop panel (no 0px)', dims.length >= 2 && !dims.some((d) => d === '0px'), dims.join(', ') || 'none')

// ── 10. Clone stamp (临摹) ──
console.log('\n── 10. clone stamp ──')
await open()
await btn('^Clone$|^临摹$')
await sleep(300)
const g10 = await content()
// First click with no source sets the source point → emerald marker on overlay.
const s10 = P(g10, 40, 40)
await page.mouse.click(s10.x, s10.y)
await sleep(300)
const srcMarker = await page.evaluate(() => {
  const d = document.querySelectorAll('canvas')[2].getContext('2d').getImageData(40, 40, 1, 1).data
  return d[1] > 100 && d[1] > d[0] + 50 // emerald dot
})
check('first click sets source marker', srcMarker, `g=${srcMarker}`)
// Drag from (100,100)→(160,160) clones source-region pixels onto the overlay.
const a10 = P(g10, 100, 100), b10 = P(g10, 160, 160)
await page.mouse.move(a10.x, a10.y); await page.mouse.down()
await page.mouse.move(b10.x, b10.y, { steps: 10 }); await page.mouse.up()
await sleep(300)
const cloneOn = await page.evaluate(() => {
  const d = document.querySelectorAll('canvas')[2].getContext('2d').getImageData(120, 120, 1, 1).data
  return d[3] > 0 // brush spot painted with cloned pixels
})
check('brush stroke paints cloned pixels', cloneOn, `alpha=${cloneOn}`)
await btn('^Apply$|^应用$')
await waitFor(appliedShown)
await sleep(1000)
const stampAfter = await page.evaluate(() => {
  const d = document.querySelectorAll('canvas')[2].getContext('2d').getImageData(120, 120, 1, 1).data
  return d[3]
})
check('apply switches to select (overlay cleared)', stampAfter === 0, `alpha=${stampAfter}`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
