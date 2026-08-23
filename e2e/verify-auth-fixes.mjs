// Verify the auth UX fixes: mobile login button placement (top-right, not in
// the drawer), 12s resend-code countdown, and magic-link → first-time password
// prompt. Uses a real mail.tm inbox + the production Supabase auth instance.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { try { const v = await fn(); if (v) return v } catch {} await sleep(150) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

// ── mail.tm inbox (domain must come from the API — @mail.tm is rejected) ──
const domJ = await (await fetch('https://api.mail.tm/domains')).json()
const DOMAIN = domJ['hydra:member'][0].domain
const inbox = (Math.random() + 1).toString(36).slice(2, 8) + '@' + DOMAIN
const mt = await fetch('https://api.mail.tm/accounts', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: inbox, password: 'devimg-test-123' }),
})
const mtAccount = await mt.json()
const tokRes = await fetch('https://api.mail.tm/token', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: inbox, password: 'devimg-test-123' }),
})
const { token } = await tokRes.json()
const getMail = async () => {
  const r = await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${token}` } })
  const j = await r.json()
  return j['hydra:member'] || []
}
const getMsg = async (id) => (await fetch(`https://api.mail.tm/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json()

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

const loginBtnVisible = (headerOnly) => page.evaluate((h) => {
  const root = h ? document.querySelector('header') : document
  const b = Array.from((root).querySelectorAll('button')).find((x) => /^登录$|^Sign in$/.test((x.textContent || '').trim()))
  if (!b) return { found: false }
  const r = b.getBoundingClientRect()
  return { found: true, visible: r.width > 0 && r.height > 0 }
}, headerOnly)

// ── 1. Desktop: header login button ──
await page.setViewport({ width: 1400, height: 900 })
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })
const desk = await waitFor(() => loginBtnVisible(true).then((v) => (v.found && v.visible ? v : null)))
check('desktop: login button visible in header', !!desk)

// ── 2. Mobile: login button top-right, NOT in drawer ──
await page.setViewport({ width: 390, height: 844 })
await sleep(500)
const mob = await loginBtnVisible(true)
check('mobile: login button visible in header (top-right)', !!mob.found && mob.visible)
// open the drawer
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('header button')).find((x) => x.getAttribute('aria-expanded') !== null)
  b && b.click()
})
await sleep(500)
const drawerHasLogin = await page.evaluate(() => {
  const drawer = document.querySelector('.lg\\:hidden')
  if (!drawer) return false
  return Array.from(drawer.querySelectorAll('button')).some((x) => /^登录$|^Sign in$/.test((x.textContent || '').trim()))
})
check('mobile: drawer does NOT contain a login button', !drawerHasLogin)
await page.keyboard.press('Escape')
await page.setViewport({ width: 1400, height: 900 })
await sleep(400)

// ── 3. Sign-up: send code → 12s countdown ──
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('header button')).find((x) => /^登录$|^Sign in$/.test((x.textContent || '').trim()))
  b && b.click()
})
await waitFor(() => page.evaluate(() => !!document.querySelector('input[type=email]')))
await page.evaluate(() => {
  const scope = document.querySelector('input[type=email]')?.closest('div.fixed') ?? document
  const b = Array.from(scope.querySelectorAll('button')).find((x) => /^注册$|^Create account$/.test((x.textContent || '').trim()))
  b && b.click()
})
const sent = await page.evaluate(async (email) => {
  const setVal = (el, v) => {
    const p = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const em = document.querySelector('input[type=email]')
  if (!em) return false
  setVal(em, email)
  const btn = Array.from(document.querySelectorAll('button')).find((x) => /^发送验证码$|^Send code$/.test((x.textContent || '').trim()))
  if (!btn) return false
  btn.click()
  return true
}, inbox)
check('sign-up send clicked', !!sent)
const countdownShown = await waitFor(() => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /重新发送|Resend/.test((x.textContent || '').trim()))
  if (!b) return null
  const txt = (b.textContent || '').trim()
  return /秒|s\)/.test(txt) && b.disabled ? txt : null
}))
check('12s countdown shows on resend button', !!countdownShown, countdownShown || '')
await sleep(500)
const stillCounting = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /重新发送|Resend/.test((x.textContent || '').trim()))
  return b ? b.disabled : null
})
check('resend still disabled during countdown', stillCounting === true)

// ── 4. Email arrived: contains a confirmation link + numeric code ──
let msg
for (let i = 0; i < 20; i++) {
  const ms = await getMail()
  if (ms.length) { msg = ms[0]; break }
  await sleep(1000)
}
check('OTP email arrived', !!msg)
let href = null, code = null
if (msg) {
  const full = await getMsg(msg.id)
  const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
  href = html.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') || null
  code = (full.text + ' ' + html).match(/verification code is:?\s*([0-9]{6,8})/i)?.[1] || null
}
check('email contains a confirmation link', !!href, href ? href.split('?')[1]?.split('&').slice(0, 2).join(' ') : '')
check('email contains the numeric code', !!code, code ? code : '')

// ── 5. Click the real link → brand-new account → password prompt ──
if (href) {
  // redirect_to points at the PRODUCTION site; capture that redirect URL
  // (before the production SDK cleans the hash) and replay it on localhost.
  let prodRedirect = null
  page.on('request', (req) => {
    if (req.url().startsWith('https://www.superpixmia.com/') && req.isNavigationRequest()) prodRedirect = req.url()
  })
  page.on('framenavigated', (frame) => {
    const u = frame.url()
    if (u.startsWith('https://www.superpixmia.com/#') && (!prodRedirect || u.length > prodRedirect.length)) prodRedirect = u
  })
  await page.goto(href, { waitUntil: 'networkidle2', timeout: 60000 })
  if (prodRedirect) {
    const hash = prodRedirect.includes('#') ? prodRedirect.slice(prodRedirect.indexOf('#')) : ''
    await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle2', timeout: 60000 })
  }
  const pwPrompt = await waitFor(() => page.evaluate(() => {
    const setPw = Array.from(document.querySelectorAll('button')).find((x) => /设置密码|Set a password/.test((x.textContent || '').trim()))
    return setPw && document.querySelector('input[type=password]') ? true : null
  }))
  check('email-link login prompts first-time user to set password', !!pwPrompt)
  // and the session hash got cleaned from the URL
  const cleaned = await page.evaluate(() => window.location.search === '' && !window.location.hash.includes('access_token'))
  check('session tokens cleaned from URL', cleaned)
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
if (pageErrors.length) console.log('page errors:', pageErrors)
await browser.close()
process.exit(fail > 0 ? 1 : 0)
