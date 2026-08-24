// Drag-to-close guard probe. Regression test for the reported bug: dragging the
// mouse across a modal (e.g. while selecting text) and lifting on the dark
// backdrop fired a click on the backdrop and dismissed the modal. Guards the
// shared useBackdropDismiss() hook used by LoginModal + lightbox + dialogs.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:4173'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 })

// Open the login modal from the header "Sign in" button (logged out).
const opened = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^Sign in$/.test((x.textContent || '').trim()))
  if (b) { b.click(); return true } return false
})
check('login modal opens (header Sign in)', opened)
await page.waitForFunction(() => !!document.querySelector('input[type=email]'), { timeout: 10000 })
const cardBox = await page.evaluate(() => {
  const card = document.querySelector('div.max-w-sm.glass, div.relative.max-w-sm')
  if (!card) return null
  const r = card.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
check('login card found', !!cardBox, cardBox ? `${cardBox.w}x${cardBox.h}@${cardBox.x},${cardBox.y}` : 'no card')

const modalOpen = () => page.evaluate(() => !!document.querySelector('input[type=email]'))
const startX = cardBox.x + cardBox.w / 2
const startY = cardBox.y + cardBox.h / 2

// 1. Drag from inside the card → release on the backdrop. Should NOT dismiss.
await page.mouse.move(startX, startY)
await page.mouse.down()
await page.mouse.move(8, 8, { steps: 6 })
await page.mouse.up()
await new Promise((r) => setTimeout(r, 150))
check('drag card→backdrop does NOT dismiss modal', await modalOpen())

// 2. Drag on the backdrop itself (>6px). Should NOT dismiss.
const backX = cardBox.x + cardBox.w + 40
const backY = cardBox.y - 60
await page.mouse.move(backX, backY)
await page.mouse.down()
await page.mouse.move(30, 30, { steps: 6 })
await page.mouse.up()
await new Promise((r) => setTimeout(r, 150))
check('drag on backdrop (>6px) does NOT dismiss modal', await modalOpen())

// 3. Clean backdrop click (no movement). Should dismiss.
await page.mouse.move(backX, backY)
await page.mouse.down()
await page.mouse.up()
await new Promise((r) => setTimeout(r, 150))
check('clean backdrop click dismisses modal', !(await modalOpen()))

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
if (fail || errors.length) process.exit(1)
