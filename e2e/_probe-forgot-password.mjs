// End-to-end forgot-password flow against the REAL Supabase project:
//   register+confirm a mail.tm inbox (SDK) → open login → "Forgot password?"
//   → send reset email → follow the recovery link → set a NEW password →
//   sign in with the new password.
// The account must already exist — resetPasswordForEmail silently succeeds but
// sends nothing for unknown addresses (anti-enumeration).
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { try { const v = await fn(); if (v) return v } catch {} await sleep(150) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

// ── real Supabase client for the pre-registration step ──
const env = readFileSync('F:/Projects/devimg/.env.local', 'utf8')
const SUP_URL = (/VITE_SUPABASE_URL=(.+)/.exec(env)?.[1] || '').trim()
const SUP_ANON = (/VITE_SUPABASE_ANON_KEY=(.+)/.exec(env)?.[1] || '').trim()
const sb = createClient(SUP_URL, SUP_ANON, { auth: { persistSession: false, autoRefreshToken: false } })

// ── mail.tm inbox ──
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
    // Strict subject filter — do NOT fall back to ms[0]: the earlier sign-up
    // confirmation mail ("Confirm your email address") would be picked instead.
    const target = ms.find((m) => /reset|recover|password/i.test(m.subject || ''))
    if (target) { msg = target; break }
    if (i % 10 === 0) console.log(`  [mail] polling for reset mail… ${i}s`)
    await sleep(1000)
  }
  if (!msg) return null
  const full = await getMsg(msg.id)
  console.log('  [mail] subject:', full.subject)
  const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
  const text = (full.text || '') + ' ' + html
  const snippets = (full.text || '').match(/https?:\/\/[^\s]+/g) || []
  console.log('  [mail] text URLs:', JSON.stringify(snippets.map((s) => s.slice(0, 120))))
  // The reset mail links to the legacy Supabase verify endpoint
  // (…/auth/v1/verify?token=…&type=recovery) — there is NO token_hash. Prefer
  // the HTML href (mail.tm may soft-wrap the plain-text URL), fall back to text.
  const href = html.match(/href="([^"]*type=recovery[^"]*)"/i)?.[1]?.replace(/&amp;/g, '&') || null
  if (href) return href
  return text.match(/https?:\/\/[^\s"<>\\')]+type=recovery[^\s"<>\\')]*/)?.[0] || null
}

// ── pre-register + confirm the account (so reset mail actually gets sent) ──
const sendRes = await sb.auth.signInWithOtp({ email: inbox, options: { shouldCreateUser: true } })
check('prereg: sign-up OTP sent', !sendRes.error, sendRes.error?.message || '')
const code = await readCode()
check('prereg: OTP code received', !!code)
const verifyRes = code ? await sb.auth.verifyOtp({ email: inbox, token: code, type: 'email' }) : { error: new Error('no code') }
check('prereg: account confirmed', !verifyRes.error, verifyRes.error?.message || '')
const updRes = verifyRes.data?.session ? await sb.auth.updateUser({ password: OLD_PASSWORD }) : { error: new Error('no session') }
check('prereg: initial password set', !updRes.error, updRes.error?.message || '')

// ── browser helpers ──
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
const recoverHits = []
page.on('request', (req) => { if (req.url().includes('/auth/v1/recover')) recoverHits.push(req.method()) })
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

await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })
await sleep(300)

// ── 1. Open login (password is the default method) ──
await clickText('^Sign in$|^登录$', 'header')
await waitFor(() => page.evaluate(() => !!document.querySelector('[class*="modal-card"] input[type=email]')))
const pwShown = await page.evaluate(() => !!Array.from(document.querySelectorAll('[class*="modal-card"] input')).find((x) => x.type === 'password'))
check('login modal shows password field (default method)', pwShown)

// ── 2. "Forgot password?" → reset view ──
const forgot = await clickText('Forgot password|忘记密码')
check('"Forgot password?" link clickable', !!forgot)
const resetView = await waitFor(() => page.evaluate(() => {
  const card = document.querySelector('[class*="modal-card"]')
  const txt = card ? card.textContent || '' : ''
  return txt.includes('Reset password') && !!card.querySelector('input[type=email]') ? true : null
}))
check('reset view shows title + email field', !!resetView)

// ── 3. Fill email → send reset email ──
await fill('[class*="modal-card"] input[type=email]', inbox)
await sleep(200)
await clickText('^Send reset email$|^发送重置邮件$')
const sent = await waitFor(() => page.evaluate(() => {
  const card = document.querySelector('[class*="modal-card"]')
  return card && /Reset email sent|重置邮件已发送/.test(card.textContent || '') ? true : null
}), 15000)
check('recover API called', recoverHits.length > 0, `${recoverHits.length} hit(s)`)
check('"reset email sent" confirmation shown', !!sent)

// ── 4. Follow the recovery link from the inbox ──
const link = await readRecoveryLink()
check('recovery link received', !!link, (link || '').slice(0, 110))
if (!link) { console.log('ABORT: no recovery link — mail delivery or redirectTo config'); await browser.close(); process.exit(1) }

// The link resolves at the Supabase project, which 302-redirects to redirect_to
// with #access_token=…&type=recovery appended. If localhost is NOT in the
// project's redirect allowlist, redirect_to falls back to the PRODUCTION site —
// capture that redirect URL (before its SDK replaceStates the hash) and replay
// the session hash on localhost so AuthProvider sees the #type=recovery marker.
let landed = null
page.on('framenavigated', (frame) => {
  const u = frame.url()
  // Prefer the longest URL — the SDK strips the hash right after reading it.
  if (u.includes('#access_token') && (!landed || u.length > landed.length)) landed = u
})
await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 })
if (landed && !landed.startsWith(BASE)) {
  const hash = landed.slice(landed.indexOf('#'))
  console.log(`  [mail] redirect landed on ${landed.slice(0, 60)} → replaying hash on localhost`)
  await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle2', timeout: 60000 })
}

// ── 5. Recovery link opens the set-password overlay (reset heading) ──
const overlay = await waitFor(() => page.evaluate(() => {
  const card = document.querySelector('[class*="modal-card"]')
  if (!card) return null
  const txt = card.textContent || ''
  const pws = Array.from(card.querySelectorAll('input[type=password]'))
  return txt.includes('Reset password') && pws.length >= 2 ? { pws: pws.length } : null
}))
check('recovery link opens set-password overlay with reset heading', !!overlay, JSON.stringify(overlay))

// ── 6. Set the new password ──
await fill('[class*="modal-card"] input[type=password]', NEW_PASSWORD)
await fill('[class*="modal-card"] input[type=password]', NEW_PASSWORD, 1)
await sleep(200)
await clickText('^Set a password$|^设置密码$', '[class*="modal-card"]')
const closed = await waitFor(() => page.evaluate(() => {
  const card = document.querySelector('[class*="modal-card"]')
  return card && /Reset password|Set a password/.test(card.textContent || '') ? null : true
}))
check('set-password overlay closed after saving', !!closed)

// ── 7. Sign in with the NEW password ──
const inAfter = await waitFor(() => signedIn().then((v) => (v ? true : null)), 15000)
check('signed in after setting new password', !!inAfter)
if (inAfter) {
  await clickText('^Sign out$|^退出登录$', 'header')
  await waitFor(() => signedIn().then((v) => (v ? null : true)))
  await sleep(400)
  await clickText('^Sign in$|^登录$', 'header')
  await waitFor(() => page.evaluate(() => !!document.querySelector('[class*="modal-card"] input[type=email]')))
  await fill('[class*="modal-card"] input[type=email]', inbox)
  await sleep(150)
  await fill('[class*="modal-card"] input[type=password]', NEW_PASSWORD)
  await sleep(150)
  await page.evaluate(() => { const b = document.querySelector('[class*="modal-card"] button[type="submit"]'); if (b) b.click() })
  const relogin = await waitFor(() => signedIn().then((v) => (v ? true : null)), 15000)
  const errText = relogin ? '' : await page.evaluate(() => { const p = document.querySelector('.fixed .text-red-400'); return p ? p.textContent : '' })
  check('NEW password signs in', !!relogin, errText ? `error: "${errText}"` : '')
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
if (pageErrors.length) console.log('page errors:', pageErrors)
await browser.close()
process.exit(fail > 0 ? 1 : 0)
