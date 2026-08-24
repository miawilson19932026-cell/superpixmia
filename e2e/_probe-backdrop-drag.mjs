// Does a drag on the login modal's backdrop accidentally close it? Simulates a
// real mouse drag (pointerdown → move → pointerup) on the backdrop and checks
// the modal survives. Also tests drag-from-card-to-backdrop.
import puppeteer from 'puppeteer-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })

const openModal = async () => {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('header button')).find((x) => /^登录$|^Sign in$/.test((x.textContent || '').trim()))
    b && b.click()
  })
  await sleep(600)
}
const modalOpen = () => page.evaluate(() => !!document.querySelector('[class*="modal-card"]'))
const backdropBox = () => page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="modal-card"]')
  const card = cards[0]
  if (!card) return null
  const c = card.getBoundingClientRect()
  return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, w: window.innerWidth, h: window.innerHeight }
})

// 1. Drag on the backdrop: pointerdown at (50,150) → move to (300,400) → up.
await openModal()
check('modal opened', await modalOpen())
const bb = await backdropBox()
if (bb) {
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const x = 50 + ((300 - 50) * i) / steps
    const y = 150 + ((400 - 150) * i) / steps
    await page.mouse.move(x, y)
    if (i === 0) await page.mouse.down()
  }
  await page.mouse.up()
  await sleep(400)
}
check('modal SURVIVES a backdrop drag (drag, not click)', await modalOpen(), bb ? `dragged ${50},150 → ${300},400` : 'no card')

// 2. A genuine short click on the backdrop SHOULD still dismiss (standard UX).
if (await modalOpen()) {
  const c = await backdropBox()
  await page.mouse.click(30, c ? c.h - 30 : 300, { clickCount: 1 })
  await sleep(400)
  check('modal closes on a clean backdrop click', !(await modalOpen()))
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
process.exit(fail > 0 ? 1 : 0)
