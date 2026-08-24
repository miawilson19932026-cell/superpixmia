// Smoke test for the new profile feature against the built preview server.
// Loads / and /profile, collects console errors + page errors, and asserts the
// logged-out /profile page shows the sign-in CTA. The first-login ProfileModal
// needs a real Supabase session, so that path is covered by manual QA.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:4173'

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--lang=en-US'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))

await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
await page.waitForSelector('header', { timeout: 10000 })
console.log('home: header rendered, title =', await page.title())

await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' })
await page.waitForSelector('button', { timeout: 10000 })
const bodyText = await page.evaluate(() => document.body.innerText)
const hasTitle = bodyText.includes('Personal Center')
const hasSignIn = bodyText.includes('Sign in')
console.log('/profile: has "Personal Center" =', hasTitle, '| has "Sign in" CTA =', hasSignIn)

// Switch to zh and confirm localized strings render
await page.goto(`${BASE}/profile?lang=zh`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 400))
const zhText = await page.evaluate(() => document.body.innerText)
console.log('/profile?lang=zh: has 个人中心 =', zhText.includes('个人中心'))

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
if (!hasTitle || !hasSignIn || errors.length) process.exit(1)
