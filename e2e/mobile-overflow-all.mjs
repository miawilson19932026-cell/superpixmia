// Measure #root.scrollWidth vs viewport for every route at 390px.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:5175'
const routes = ['/', '/studio', '/compress', '/remove-bg', '/resize', '/convert', '/remove-watermark', '/help', '/blog']

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844 })
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((res) => setTimeout(res, 400))
  const m = await page.evaluate(() => {
    const root = document.getElementById('root')
    const vw = document.documentElement.clientWidth
    return { vw, rootScrollW: root ? root.scrollWidth : -1 }
  })
  const over = m.rootScrollW - m.vw
  console.log(`${r.padEnd(22)} root.scrollWidth=${m.rootScrollW} vw=${m.vw} overflow=${over > 0 ? '+' + over : over}px ${over > 0 ? '❌' : '✓'}`)
}
await browser.close()
