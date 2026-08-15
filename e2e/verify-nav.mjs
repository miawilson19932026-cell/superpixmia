// Verify the homepage tool-nav batch:
//  1. The nav grid has 8 cards — 5 real tools + Studio (recommended) + 2 AI cards.
//  2. The Studio card carries a "推荐"/"Hot" badge and navigates to /studio.
//  3. The AI cards carry a "🔥 建设中"/"🔥 Soon" badge, use the distinct dashed
//     style, and clicking one shows the "敬请期待"/"Coming soon" toast.
//
// Note: the test browser locale may be zh or en, so every label match accepts both.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const v = await fn(); if (v) return v; await sleep(150) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
page.on('pageerror', (e) => console.log('pageerror:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()) })

await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })

// ── 1. 8-card nav grid ──
const nav = await page.evaluate(() => {
  // The nav grid is the ONLY one carrying sm:grid-cols-4 (the single/batch mode
  // toggle below it is a plain "grid grid-cols-2 gap-2").
  const grid = document.querySelector('div.grid.grid-cols-2.sm\\:grid-cols-4')
  if (!grid) return { found: false }
  const cards = Array.from(grid.querySelectorAll('button'))
  const text = (b) => (b.textContent || '').trim().replace(/\s+/g, ' ')
  return {
    found: true,
    count: cards.length,
    labels: cards.map(text),
    studioBadge: cards.some((b) => /Hot|推荐/.test(text(b)) && /Studio|全能编辑/.test(text(b))),
    aiSoon: cards.filter((b) => /Soon|建设中/.test(text(b))).length,
    dashed: cards.filter((b) => /border-dashed/.test(b.className)).length,
  }
})
check('nav grid found on homepage', nav.found)
check('8 cards in nav grid (5 tools + Studio + 2 AI)', nav.count === 8, `${nav.count} cards`)
check('Studio card carries 推荐/Hot badge', nav.studioBadge, nav.labels.filter((l) => /Studio|全能编辑/.test(l)).join(' | '))
check('2 AI cards carry 🔥 建设中/Soon badge', nav.aiSoon === 2, `${nav.aiSoon}`)
check('2 AI cards use dashed style', nav.dashed === 2, `${nav.dashed}`)

// ── 2. AI card click → "敬请期待" toast ──
const clicked = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /AI Image|AI 生图/.test(x.textContent || ''))
  if (!b) return false
  b.click()
  return true
})
check('clicked the AI Image card', clicked)
const toastShown = await waitFor(() => page.evaluate(() => {
  const t = document.body.textContent || ''
  return /敬请期待|Coming soon/.test(t)
}))
check('toast "敬请期待 / Coming soon" appears', !!toastShown)

// ── 3. Studio card → navigates to /studio ──
await page.evaluate(() => {
  // The card's text is "推荐全能编辑" / "HotStudio" (badge + label), so match by contains.
  const b = Array.from(document.querySelectorAll('button')).find((x) => /Studio|全能编辑/.test((x.textContent || '').trim()) && !/AI|生图|工厂/.test(x.textContent || ''))
  b && b.click()
})
const onStudio = await waitFor(() => page.evaluate(() => location.pathname === '/studio'), 10000)
check('Studio card navigates to /studio', !!onStudio, `path=${await page.evaluate(() => location.pathname)}`)

// ── 4. the nav also renders on a tool page ──
await page.goto(BASE + '/compress', { waitUntil: 'networkidle2', timeout: 60000 })
const toolNav = await page.evaluate(() => {
  const grid = document.querySelector('div.grid.grid-cols-2.sm\\:grid-cols-4')
  return grid ? grid.querySelectorAll('button').length : -1
})
check('tool page also shows 8-card nav', toolNav === 8, `${toolNav} cards`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
