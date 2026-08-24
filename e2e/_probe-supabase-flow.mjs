// Backend-only round trip against the REAL Supabase project, bypassing the React
// UI. Answers: does "OTP sign-up → set password → sign out → password login"
// work at the SDK level? If this passes, the failure is in our UI; if it fails,
// the bug is in the Supabase project config / account state.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('F:/Projects/devimg/.env.local', 'utf8')
const URL = (/VITE_SUPABASE_URL=(.+)/.exec(env)?.[1] || '').trim()
const ANON = (/VITE_SUPABASE_ANON_KEY=(.+)/.exec(env)?.[1] || '').trim()
const PASSWORD = '19930506'

let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

// ── mail.tm inbox ──
const domJ = await (await fetch('https://api.mail.tm/domains')).json()
const DOMAIN = domJ['hydra:member'][0].domain
const email = (Math.random() + 1).toString(36).slice(2, 8) + '@' + DOMAIN
await fetch('https://api.mail.tm/accounts', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: email, password: 'devimg-test-123' }),
})
const tokRes = await fetch('https://api.mail.tm/token', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: email, password: 'devimg-test-123' }),
})
const { token } = await tokRes.json()
const getMail = async () => {
  const r = await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${token}` } })
  return (await r.json())['hydra:member'] || []
}
const getMsg = async (id) => (await fetch(`https://api.mail.tm/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json()

// 1. Sign-up: send OTP (create account)
const sendRes = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
check('1. send sign-up OTP (shouldCreateUser)', !sendRes.error, sendRes.error?.message || '')

// 2. Read the code
let msg
for (let i = 0; i < 25; i++) { const ms = await getMail(); if (ms.length) { msg = ms[0]; break } await new Promise((r) => setTimeout(r, 1000)) }
let code = null
if (msg) {
  const full = await getMsg(msg.id)
  const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
  code = (full.text + ' ' + html).match(/verification code is:?\s*([0-9]{6,8})/i)?.[1] || null
}
check('2. OTP code received', !!code, code || '')

// 3. Verify the code (establishes session, confirms email)
const verifyRes = code ? await sb.auth.verifyOtp({ email, token: code, type: 'email' }) : { error: new Error('no code') }
check('3. verifyOtp succeeds', !verifyRes.error, verifyRes.error?.message || '')
console.log('    session user:', verifyRes.data?.user?.email, '· confirmed:', verifyRes.data?.user?.email_confirmed_at ? 'yes' : 'NO')

// 4. Set password (updateUser) on the fresh session
const updateRes = verifyRes.data?.session ? await sb.auth.updateUser({ password: PASSWORD }) : { error: new Error('no session') }
check('4. updateUser({ password }) succeeds', !updateRes.error, updateRes.error?.message || '')
console.log('    session age at updateUser:', verifyRes.data?.session?.expires_at ? Math.round((verifyRes.data.session.expires_at * 1000 - Date.now()) / 1000) + 's remaining' : 'n/a')

// 5. Sign out
if (verifyRes.data?.session) await sb.auth.signOut()
check('5. signed out', true)

// 6. Password login
const loginRes = await sb.auth.signInWithPassword({ email, password: PASSWORD })
check('6. password login succeeds', !loginRes.error, loginRes.error?.message || '')
console.log('    login user:', loginRes.data?.user?.email)

// 7. What happens if we verify a code twice (the user's possible double-path)?
if (code && verifyRes.data?.session) {
  await sb.auth.signOut()
  const again = await sb.auth.verifyOtp({ email, token: code, type: 'email' })
  check('7. re-verify same code still works', !again.error, again.error?.message || '')
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
