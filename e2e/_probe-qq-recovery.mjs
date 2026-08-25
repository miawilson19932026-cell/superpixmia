// Validates the QQ-mail fix for the reset-password flow. QQ's mail client
// security pre-check consumes Supabase's one-time recovery token before the user
// clicks, so every click lands on #error_code=otp_expired → "login failed".
//
// Fix: custom template makes the link point at OUR site ({{ .SiteURL }}/?token=…
// &type=recovery). The pre-check only fetches our static page (token NOT
// consumed); the browser performs the real exchange. Two scenarios here:
//   A. /?token=<fresh>&type=recovery  → AuthProvider GET-exchanges the token,
//      opens the set-password overlay → set new password → sign in with it.
//   B. /#error=access_denied&error_code=otp_expired… → login modal opens on the
//      "send a new reset email" view with an explanation (token was consumed).
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { try { const v = await fn(); if (v) return v } catch {} await sleep(150) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const env = readFileSync('F:/Projects/devimg/.env.local', 'utf8')
const SUP_URL = (/VITE_SUPABASE_URL=(.+)/.exec(env)?.[1] || '').trim()
const SUP_ANON = (/VITE_SUPABASE_ANON_KEY=(.+)/.exec(env)?.[1] || '').trim()
const sb = createClient(SUP_URL, SUP_ANON, { auth: { persistSession: false, autoRefreshToken: false } })

// ── fresh mail.tm inbox ──
const domJ = await (await fetch('https://api.mail.tm/domains')).json()
const DOMAIN = domJ['hydra:member'][0].domain
const inbox = (Math.random() + 1).toString(36).slice(2, 8) + '@' + DOMAIN
const OLD_PASSWORD = 'old-pass-2026'
const NEW_PASSWORD = 'new-pass-2026'
await fetch('https://api.mail.tm/accounts', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: inbox, password: 'devimg-test-123' }),
})
const tokRes = await fetch('https://api.mail.tm/token', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: inbox, password: 'devimg-test-123' }),
})
const { token } = await tokRes.json()
const getMail = async () => {
  const r = await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${token}` } })
  return (await r.json())['hydra:member'] || []
}
const getMsg = async (id) => (await fetch(`https://api.mail.tm/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json()
const readCode = async () => {
  let msg
  for (let i = 0; i < 30; i++) { const ms = await getMail(); if (ms.length) { msg = ms[0]; break } await sleep(1000) }
  if (!msg) return null
  const full = await getMsg(msg.id)
  const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
  return (full.text + ' ' + html).match(/verification code is:?\s*([0-9]{6,8})/i)?.[1] || null
}
const readRecoveryLink = async () => {
  let msg
  for (let i = 0; i < 45; i++) {
    const ms = await getMail()
    const target = ms.find((m) => /reset|recover|password/i.test(m.subject || ''))
    if (target) { msg = target; break }
    await sleep(1000)
  }
  if (!msg) return null
  const full = await getMsg(msg.id)
  const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
  const text = (full.text || '') + ' ' + html
  const href = html.match(/href="([^"]*type=recovery[^"]*)"/i)?.[1]?.replace(/&amp;/g, '&') || null
  if (href) return href
  return text.match(/https?:\/\/[^\s"<>\\')]+type=recovery[^\s"<>\\')]*/)?.[0] || null
}

// ── create a real account with a password ──
const o = await sb.auth.signInWithOtp({ email: inbox, options: { shouldCreateUser: true } })
const code = await readCode()
const v = code ? await sb.auth.verifyOtp({ email: inbox, token: code, type: 'email' }) : { error: new Error('no code') }
const upd = v.data?.session ? await sb.auth.updateUser({ password: OLD_PASSWORD }) : { error: new Error('no session') }
check('prereg: account created + password set', !upd.error, upd.error?.message || '')
const rp = await sb.auth.resetPasswordForEmail(inbox, { redirectTo: 'https://www.superpixmia.com/' })
check('reset email request sent', !rp.error, rp.error?.message || '')
const link = await readRecoveryLink()
const legacyToken = link ? new URL(link).searchParams.get('token') : null
check('recovery token obtained', !!legacyToken, link ? link.slice(0, 90) : 'NO LINK')

// ── browser ──
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
const clickText = async (pat, scopeSel) => {
  return page.evaluate(([re, scope]) => {
    const root = scope ? document.querySelector(scope) : document
    const rx = new RegExp(re)
    const b = root && Array.from(root.querySelectorAll('button')).find((x) => rx.test((x.textContent || '').trim()))
    if (b) b.click()
    return !!b
  }, [pat, scopeSel])
}
const signedIn = () => page.evaluate(() => !!Array.from(document.querySelectorAll('button')).find((x) => /Sign out|退出登录/.test((x.textContent || '').trim())))
const fill = (sel, v, index) => page.evaluate(([s, v, i]) => {
  const els = Array.from(document.querySelectorAll(s))
  const el = i != null ? els[i] : els[0]
  if (!el) return
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, [sel, v, index])

// ── Scenario A: custom-template link /?token=…&type=recovery ──
console.log('\n── A. /?token=…&type=recovery (custom template) ──')
// AuthProvider navigates to the Supabase verify endpoint; its redirect_to
// falls back to the PRODUCTION site (localhost is not in the allowlist), so
// capture that redirect hash and replay it on localhost.
let landed = null
page.on('framenavigated', (frame) => {
  const u = frame.url()
  if (u.includes('#access_token') && (!landed || u.length > landed.length)) landed = u
})
await page.goto(BASE + '/?token=' + encodeURIComponent(legacyToken) + '&type=recovery', { waitUntil: 'networkidle2', timeout: 60000 })
if (landed && !landed.startsWith(BASE)) {
  const hash = landed.slice(landed.indexOf('#'))
  console.log('  [recover] redirect landed on production → replaying hash on localhost')
  await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle2', timeout: 60000 })
}
const overlay = await waitFor(() => page.evaluate(() => {
  const card = document.querySelector('[class*="modal-card"]')
  if (!card) return null
  const txt = card.textContent || ''
  const pws = Array.from(card.querySelectorAll('input[type=password]'))
  return txt.includes('Reset password') && pws.length >= 2 ? { pws: pws.length } : null
}), 20000)
check('A: set-password overlay opens with reset heading', !!overlay, JSON.stringify(overlay))
const cleaned = await page.evaluate(() => !window.location.search && !window.location.hash.includes('access_token'))
check('A: token cleaned from URL after exchange', cleaned)
await fill('[class*="modal-card"] input[type=password]', NEW_PASSWORD)
await fill('[class*="modal-card"] input[type=password]', NEW_PASSWORD, 1)
await sleep(200)
await clickText('^Set a password$|^设置密码$', '[class*="modal-card"]')
const closed = await waitFor(() => page.evaluate(() => {
  const card = document.querySelector('[class*="modal-card"]')
  return card && /Reset password|Set a password/.test(card.textContent || '') ? null : true
}), 15000)
check('A: overlay closes after saving', !!closed)
const inA = await waitFor(() => signedIn().then((v) => (v ? true : null)), 15000)
check('A: signed in after exchange', !!inA)
if (inA) {
  await clickText('^Sign out$|^退出登录$', 'header')
  await waitFor(() => signedIn().then((v) => (v ? null : true)))
  await sleep(300)
  await clickText('^Sign in$|^登录$', 'header')
  await waitFor(() => page.evaluate(() => !!document.querySelector('[class*="modal-card"] input[type=email]')))
  await fill('[class*="modal-card"] input[type=email]', inbox)
  await sleep(150)
  await fill('[class*="modal-card"] input[type=password]', NEW_PASSWORD)
  await sleep(150)
  await page.evaluate(() => { const b = document.querySelector('[class*="modal-card"] button[type="submit"]'); if (b) b.click() })
  const relogin = await waitFor(() => signedIn().then((v) => (v ? true : null)), 15000)
  check('A: NEW password signs in', !!relogin)
}

// ── Scenario B: expired-link hash → login modal + "send new link" ──
console.log('\n── B. #error_code=otp_expired (QQ pre-check consumed token) ──')
// A distinct query forces a full document load — scenario A left the page at
// BASE/ (hash cleaned), and a bare hash change wouldn't re-mount React.
await page.goto(
  BASE + '/?_probe=' + Date.now() + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
  { waitUntil: 'networkidle2', timeout: 60000 },
)
const forgotView = await waitFor(() => page.evaluate(() => {
  const card = document.querySelector('[class*="modal-card"]')
  if (!card) return null
  const txt = card.textContent || ''
  const hasResetTitle = txt.includes('Reset password')
  const hasEmail = !!card.querySelector('input[type=email]')
  const hasNotice = /has expired|已失效/.test(txt)
  const hasSend = /Send reset email|发送重置邮件/.test(txt)
  return hasResetTitle && hasEmail && hasNotice && hasSend ? { hasNotice, hasSend } : null
}))
check('B: expired link opens login modal on "send new link" view', !!forgotView, JSON.stringify(forgotView))

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
if (pageErrors.length) console.log('page errors:', pageErrors)
await browser.close()
process.exit(fail > 0 ? 1 : 0)
