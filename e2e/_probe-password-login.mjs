// Reproduce the reported bug end-to-end against the REAL Supabase project:
//   OTP sign-up (email code) → set password → sign out → password login.
// Uses a throwaway mail.tm inbox exactly like verify-auth-fixes.mjs. If the
// password login fails here, the bug is in our code; if it passes, the user's
// account state / email is the problem (and code-login is the recovery path).
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { try { const v = await fn(); if (v) return v } catch {} await sleep(150) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

// ── mail.tm inbox ──
const domJ = await (await fetch('https://api.mail.tm/domains')).json()
const DOMAIN = domJ['hydra:member'][0].domain
const inbox = (Math.random() + 1).toString(36).slice(2, 8) + '@' + DOMAIN
const PASSWORD = '19930506' // same shape as the user's reported password
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
  for (let i = 0; i < 25; i++) { const ms = await getMail(); if (ms.length) { msg = ms[0]; break } await sleep(1000) }
  if (!msg) return null
  const full = await getMsg(msg.id)
  const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
  return (full.text + ' ' + html).match(/verification code is:?\s*([0-9]{6,8})/i)?.[1] || null
}

// ── browser helpers ──
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('request', (req) => {
  const u = req.url()
  if (u.includes('/auth/v1/')) console.log(`  [req] ${req.method()} ${u.replace(/^.*?\/auth\/v1/, '/auth/v1')}`)
})
page.on('response', async (res) => {
  const u = res.url()
  if (u.includes('/auth/v1/')) {
    let body = ''
    try { body = (await res.text()).slice(0, 200) } catch {}
    console.log(`  [res] ${res.status()} ${u.replace(/^.*?\/auth\/v1/, '/auth/v1')} → ${body}`)
  }
})
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log(`  [console.error] ${msg.text().slice(0, 300)}`)
})
// Log modal presence so we can see exactly when it closes.
const logModal = async (tag) => {
  const st = await page.evaluate(() => {
    const m = document.querySelector('[class*="modal-card"]')
    const email = !!document.querySelector('input[type=email]')
    return { open: !!m, email }
  })
  console.log(`  [modal ${tag}] ${JSON.stringify(st)}`)
}
const setVal = (el, v) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const clickText = async (pat, scopeSel) => {
  await page.evaluate(([re, scope]) => {
    const root = scope ? document.querySelector(scope) : document
    const rx = new RegExp(re)
    const b = root && Array.from(root.querySelectorAll('button')).find((x) => rx.test((x.textContent || '').trim()))
    if (b) b.click()
    return !!b
  }, [pat, scopeSel])
}
const signedIn = () => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /退出登录|Sign out/.test((x.textContent || '').trim()))
  return !!b
})

await page.setViewport({ width: 1400, height: 900 })

// ── 1. Open login → sign-up tab ──
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })
await sleep(300)
await logModal('initial')
const hdr = await clickText('^登录$|^Sign in$', 'header')
await sleep(500)
await logModal('after-header-login')
const emailIn = await waitFor(() => page.evaluate(() => !!document.querySelector('input[type=email]')))
await logModal('after-wait-email')
const reg = await clickText('^注册$|^Create account$')
await sleep(500)
await logModal('after-register-tab')
const sendBtn = await waitFor(() => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /发送验证码|Send code/.test((x.textContent || '').trim()))
  return !!b && !!document.querySelector('input[type=email]')
}))
await logModal('after-wait-sendbtn')
console.log('  [clicks] header=', hdr, 'reg=', reg, 'sendBtnVisible=', sendBtn, 'url=', await page.url())

// ── 2. Send sign-up code ──
await page.evaluate((email) => {
  const em = document.querySelector('input[type=email]')
  if (!em) return
  const proto = HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(em, email)
  em.dispatchEvent(new Event('input', { bubbles: true }))
}, inbox)
await sleep(200)
await logModal('before-send')
const clickedSend = await clickText('发送验证码|Send code')
await sleep(300)
await logModal('after-send')
console.log('  [clickedSend]', clickedSend)
const sendState = await waitFor(() => page.evaluate(() => {
  const err = document.querySelector('.fixed .text-red-400')
  const b = Array.from(document.querySelectorAll('button')).find((x) => /重新发送|Resend/.test((x.textContent || '').trim()))
  const emailVal = document.querySelector('input[type=email]')?.value
  return b ? { resent: true, err: err ? err.textContent : null, emailVal } : null
}))
check('sign-up code requested', !!sendState && sendState.resent, JSON.stringify(sendState))
if (!sendState || !sendState.resent) {
  const dump = await page.evaluate(() => {
    const fixed = Array.from(document.querySelectorAll('.fixed')).map((el, i) => ({
      i, txt: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 80), rect: el.getBoundingClientRect().height,
    }))
    const modals = Array.from(document.querySelectorAll('[class*="modal-card"], [class*="max-w-sm"]')).map((el) => (el.textContent || '').replace(/\s+/g, ' ').slice(0, 80))
    return { fixed, modals, hasEmail: !!document.querySelector('input[type=email]'), hasPw: !!document.querySelector('input[type=password]') }
  })
  console.log('send failed — dump:', JSON.stringify(dump, null, 1))
}

// ── 3. Verify code ──
const code = await readCode()
check('OTP code received', !!code, code || '')
if (!code) { console.log('\nABORT: no code — mail.tm or Supabase email down'); await browser.close(); process.exit(1) }
await page.evaluate((c) => {
  // The OTP code field: inputmode="numeric" (or the text input whose
  // placeholder mentions 验证码/code) — NOT the email input.
  const el = document.querySelector('input[inputmode="numeric"]')
    || Array.from(document.querySelectorAll('input')).find((x) => x.type === 'text' && /验证码|code/i.test(x.placeholder || ''))
  if (!el) return
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, c)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, code)
await sleep(200)
const verifyClicked = await clickText('验证$|^Verify$')
// Poll the modal every 300ms so we see HOW it gets stuck.
let lastState = null
for (let i = 0; i < 12; i++) {
  await sleep(300)
  const st = await page.evaluate(() => {
    const m = document.querySelector('[class*="modal-card"]')
    const txt = m ? (m.textContent || '').replace(/\s+/g, ' ') : ''
    const pw = Array.from(document.querySelectorAll('input[type=password]')).length
    const err = document.querySelector('.fixed .text-red-400')
    const signedOutBtn = Array.from(document.querySelectorAll('button')).some((x) => /退出登录|Sign out/.test((x.textContent || '').trim()))
    return { txt: txt.slice(0, 60), pw, err: err ? err.textContent : null, signedOutBtn }
  })
  if (JSON.stringify(st) !== JSON.stringify(lastState)) { console.log(`  [poll ${i}]`, JSON.stringify(st)) }
  lastState = st
  if (st.pw >= 2) break
}
const finalDump = await page.evaluate(() => {
  const modals = Array.from(document.querySelectorAll('[class*="modal-card"]')).map((el) => (el.textContent || '').replace(/\s+/g, ' ').slice(0, 80))
  const pw = Array.from(document.querySelectorAll('input[type=password]')).length
  return { modals, pw }
})
console.log('  [final-state]', JSON.stringify(finalDump))
const pwStep = lastState.pw >= 2 || finalDump.pw >= 2 ? true : await waitFor(() => page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input[type=password]'))
  return inputs.length >= 2 ? inputs : null
}), 5000)
check('sign-up reaches the set-password step', !!pwStep)

// ── 4. Set the password ──
if (pwStep) {
  await page.evaluate((p) => {
    const inputs = Array.from(document.querySelectorAll('input[type=password]'))
    const proto = HTMLInputElement.prototype
    inputs.forEach((el) => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, p); el.dispatchEvent(new Event('input', { bubbles: true })) })
  }, PASSWORD)
  await sleep(200)
  await clickText('完成|^Done$')
  const done = await waitFor(() => page.evaluate(() => !document.querySelector('input[type=password]')))
  check('set-password step completed (modal closed)', !!done)
}
const inAfterSignup = await waitFor(() => signedIn().then((v) => (v ? true : null)))
check('signed in after sign-up', !!inAfterSignup)

// ── 5. Sign out, then try PASSWORD login with the same credentials ──
if (inAfterSignup) {
  await clickText('退出登录|Sign out', 'header')
  await waitFor(() => signedIn().then((v) => (v ? null : true)))
  await sleep(500)
  // Close the profile modal if it reappeared after sign-out in the prior state.
  await page.evaluate(() => {
    const skip = Array.from(document.querySelectorAll('button')).find((x) => /^跳过$|^Skip/.test((x.textContent || '').trim()))
    if (skip) skip.click()
  })
  await sleep(300)
  await clickText('^登录$|^Sign in$', 'header')
  await waitFor(() => page.evaluate(() => !!document.querySelector('input[type=email]')))
  // The modal reopens in sign-up mode (mode state persisted) — switch to sign-in.
  await clickText('^登录$|^Sign in$', '[class*="modal-card"]')
  await sleep(300)
  await page.evaluate((email) => {
    const em = document.querySelector('input[type=email]')
    if (!em) return
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(em, email)
    em.dispatchEvent(new Event('input', { bubbles: true }))
  }, inbox)
  await sleep(200)
  await page.evaluate((p) => {
    const pw = Array.from(document.querySelectorAll('input[type=password]')).find((x) => x.type === 'password')
    if (!pw) return
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(pw, p)
    pw.dispatchEvent(new Event('input', { bubbles: true }))
  }, PASSWORD)
  await sleep(200)
  const preLogin = await page.evaluate(() => {
    const m = document.querySelector('[class*="modal-card"]')
    const email = document.querySelector('input[type=email]')?.value || null
    const pw = Array.from(document.querySelectorAll('input[type=password]')).map((x) => x.value || '').join(',')
    const submit = Array.from(document.querySelectorAll('[class*="modal-card"] button[type="submit"]')).map((b) => ({ txt: (b.textContent || '').trim(), disabled: b.disabled }))
    return { txt: m ? (m.textContent || '').replace(/\s+/g, ' ').slice(0, 80) : null, email, pw, submit }
  })
  console.log('  [pre-login]', JSON.stringify(preLogin))
  await page.evaluate(() => {
    const b = document.querySelector('[class*="modal-card"] button[type="submit"]')
    if (b) b.click()
  })
  const loggedIn = await waitFor(() => signedIn().then((v) => (v ? true : null)), 15000)
  const errText = loggedIn ? '' : await page.evaluate(() => {
    const p = document.querySelector('.fixed .text-red-400')
    return p ? p.textContent : ''
  })
  check('password login succeeds after OTP sign-up', !!loggedIn, errText ? `error: "${errText}"` : '')
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
if (pageErrors.length) console.log('page errors:', pageErrors)
await browser.close()
process.exit(fail > 0 ? 1 : 0)
