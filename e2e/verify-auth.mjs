// Verify Phase 1 auth wiring (Supabase not configured locally, so this proves
// graceful degradation + UI):
//  1. Home header shows the Sign in button.
//  2. Clicking it opens the LoginModal (email + password + tabs).
//  3. Submitting without Supabase env shows a friendly inline error (no crash).
//  4. Batch ZIP quota: on /compress in batch mode with 2 processed images, the
//     1st download fires free (no login); the 2nd opens the login modal (site-
//     wide free-download quota).
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.PAGE_URL || 'http://localhost:4173'
const IMG = fileURLToPath(new URL('./mobile-big.png', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (fn, t = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { try { const v = await fn(); if (v) return v } catch {} await sleep(150) } return null }
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

// ── 1. Home: Sign in button in header ──
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })
const loginBtn = await waitFor(() => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('header button')).find((x) => /^登录$|^Sign in$/.test((x.textContent || '').trim()))
  return b ? b.textContent.trim() : null
}))
check('header shows Sign in button', !!loginBtn, loginBtn || '')

// ── 2. Click → modal opens ──
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('header button')).find((x) => /^登录$|^Sign in$/.test((x.textContent || '').trim()))
  b && b.click()
})
const modalOpen = await waitFor(() => page.evaluate(() => !!document.querySelector('input[type=email]')))
check('login modal opens', !!modalOpen)

// ── 3. Submit without Supabase → inline error, no crash ──
const errShown = await page.evaluate(async () => {
  const email = document.querySelector('input[type=email]')
  const pass = document.querySelector('input[type=password]')
  const setVal = (el, v) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  if (!email || !pass) return false
  setVal(email, 'test@example.com')
  setVal(pass, 'secret123')
  const form = email.closest('form')
  form && form.requestSubmit()
  return true
})
check('filled & submitted the form', !!errShown)
const gotError = await waitFor(() => page.evaluate(() => /Auth is not configured/i.test(document.body.textContent || '')))
check('graceful error shown (no Supabase env)', !!gotError)

// ── 4. Sign-up: 3-step OTP flow UI (send code → verify → set password) ──
// Tab clicks are scoped to the modal overlay (the header also has a "Sign in"
// button whose text collides with the modal's tab).
await page.evaluate(() => {
  const overlay = document.querySelector('input[type=email]')?.closest('div.fixed')
  const scope = overlay ?? document
  const b = Array.from(scope.querySelectorAll('button')).find((x) => /^注册$|^Create account$/.test((x.textContent || '').trim()))
  b && b.click()
})
const sendCodeBtn = await waitFor(() => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^发送验证码$|^Send code$/.test((x.textContent || '').trim()))
  return b ? b.textContent.trim() : null
}))
check('sign-up tab shows "Send code" button', !!sendCodeBtn, sendCodeBtn || '')

const sendErr = await page.evaluate(async () => {
  const email = document.querySelector('input[type=email]')
  const setVal = (el, v) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  if (!email) return false
  setVal(email, 'new@example.com')
  const btn = Array.from(document.querySelectorAll('button')).find((x) => /^发送验证码$|^Send code$/.test((x.textContent || '').trim()))
  if (!btn) return false
  btn.click()
  return true
})
check('clicked send code in sign-up', !!sendErr)
const codeErr = await waitFor(() => page.evaluate(() => /Auth is not configured/i.test(document.body.textContent || '')))
check('sign-up send code shows graceful error', !!codeErr)

// ── 5. Sign-in email-code method toggle ──
await page.evaluate(() => {
  const overlay = document.querySelector('input[type=email]')?.closest('div.fixed')
  const scope = overlay ?? document
  const b = Array.from(scope.querySelectorAll('button')).find((x) => /^登录$|^Sign in$/.test((x.textContent || '').trim()))
  b && b.click()
})
await sleep(200)
const codeLink = await waitFor(() => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /用邮箱验证码登录|Sign in with an email code/.test((x.textContent || '').trim()))
  return b ? b.textContent.trim() : null
}))
check('sign-in shows email-code login link', !!codeLink, codeLink || '')

await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /用邮箱验证码登录|Sign in with an email code/.test((x.textContent || '').trim()))
  b && b.click()
})
const codeSendBtn = await waitFor(() => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^发送验证码$|^Send code$/.test((x.textContent || '').trim()))
  return b ? b.textContent.trim() : null
}))
check('code method shows send-code button', !!codeSendBtn, codeSendBtn || '')

// Close modal via backdrop click
await page.mouse.click(40, 40)
await sleep(400)

// ── 6. Batch ZIP download: 1st free, 2nd asks to sign in ──
await page.goto(BASE + '/compress', { waitUntil: 'networkidle2', timeout: 60000 })
await page.evaluate(() => {
  localStorage.removeItem('spm-free-dl') // fresh download quota
  window.__dl = []
  const orig = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return orig.call(this) }
})
// Switch to batch mode
const toggled = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^批量$|^Batch$/.test((x.textContent || '').trim()))
  if (!b) return false
  b.click()
  return true
})
check('switched to batch mode', !!toggled)
await sleep(300)

// Upload 2 images (this puppeteer build has no setInputFiles — use the
// file-chooser interception API: trigger the hidden input's click, then accept)
const chooserPromise = page.waitForFileChooser()
await page.evaluate(() => { document.querySelector('input[type=file]').click() })
const chooser = await chooserPromise
await chooser.accept([IMG, IMG])
// Wait for processing to finish → the download button only renders when
// hasResult && !isProcessing (i.e. all batch items processed)
const dlLabel = await waitFor(() => page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('↓'))
  if (!b) return null
  return (b.textContent || '').replace(/↓/g, '').trim()
}), 30000)
check('download button rendered after processing', !!dlLabel, dlLabel || '')
check('batch button is a plain download (no login label)', !!dlLabel && !/sign in|登录/.test(dlLabel), dlLabel || '')

// First click (fresh quota) → the ZIP actually downloads (free, no login).
const clicked1 = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('↓'))
  if (!b) return false
  b.click()
  return true
})
const fired = await waitFor(() => page.evaluate(() => window.__dl.length > 0), 30000)
check('batch 1st download fires (free, no login)', !!clicked1 && !!fired,
  JSON.stringify(await page.evaluate(() => window.__dl)))

// Second click → quota exhausted → login modal opens instead of downloading.
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('↓'))
  b && b.click()
})
const gateModal = await waitFor(() => page.evaluate(() => !!document.querySelector('input[type=email]')))
check('batch 2nd download opens login modal', !!gateModal)
const dlCount2 = await page.evaluate(() => window.__dl.length)
check('batch 2nd download blocked (no new download)', dlCount2 === 1, `${dlCount2} downloads`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
if (pageErrors.length) console.log('page errors:', pageErrors)
await browser.close()
if (fail > 0) process.exit(1)
