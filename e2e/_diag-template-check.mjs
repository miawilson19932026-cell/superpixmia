// Check whether the Supabase "Reset Password" template now links to OUR site
// (/ ?token=…&type=recovery) instead of the supabase.co verify endpoint.
// QQ-mail's security pre-check consumes one-time tokens on the supabase.co URL,
// so the template must point at superpixmia.com for the fix to take effect.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('F:/Projects/devimg/.env.local', 'utf8')
const SUP_URL = (/VITE_SUPABASE_URL=(.+)/.exec(env)?.[1] || '').trim()
const SUP_ANON = (/VITE_SUPABASE_ANON_KEY=(.+)/.exec(env)?.[1] || '').trim()
const sb = createClient(SUP_URL, SUP_ANON, { auth: { persistSession: false, autoRefreshToken: false } })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const domJ = await (await fetch('https://api.mail.tm/domains')).json()
const DOMAIN = domJ['hydra:member'][0].domain
const inbox = (Math.random() + 1).toString(36).slice(2, 8) + '@' + DOMAIN
await fetch('https://api.mail.tm/accounts', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: inbox, password: 'devimg-test-123' }),
})
const tokRes = await fetch('https://api.mail.tm/token', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: inbox, password: 'devimg-test-123' }),
})
const { token } = await tokRes.json()
const getMail = async () => (await (await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${token}` } })).json())['hydra:member'] || []
const getMsg = async (id) => (await fetch(`https://api.mail.tm/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json()

// create account
await sb.auth.signInWithOtp({ email: inbox, options: { shouldCreateUser: true } })
let code = null
for (let i = 0; i < 30 && !code; i++) {
  const ms = await getMail()
  if (ms.length) {
    const full = await getMsg(ms[0].id)
    const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
    code = (full.text + ' ' + html).match(/verification code is:?\s*([0-9]{6,8})/i)?.[1] || null
  }
  if (!code) await sleep(1000)
}
const v = await sb.auth.verifyOtp({ email: inbox, token: code, type: 'email' })
if (v.data?.session) await sb.auth.updateUser({ password: 'diag-pass-123' })

// request reset
await sb.auth.resetPasswordForEmail(inbox, { redirectTo: 'https://www.superpixmia.com/' })
let link = null, subject = ''
for (let i = 0; i < 45 && !link; i++) {
  const ms = await getMail()
  const target = ms.find((m) => /reset|recover|password/i.test(m.subject || ''))
  if (target) {
    const full = await getMsg(target.id)
    subject = full.subject
    const html = (Array.isArray(full.html) ? full.html.join('') : full.html) || ''
    const text = (full.text || '') + ' ' + html
    link = html.match(/href="([^"]*type=recovery[^"]*)"/i)?.[1]?.replace(/&amp;/g, '&')
      || text.match(/https?:\/\/[^\s"<>\\')]+type=recovery[^\s"<>\\')]*/)?.[0] || null
  }
  if (!link) await sleep(1000)
}

if (!link) {
  console.log('RESULT: NO RESET LINK FOUND')
} else {
  const u = new URL(link)
  const fixed = u.hostname === 'www.superpixmia.com' && u.pathname === '/' && u.searchParams.get('token')
  console.log(`subject: ${subject}`)
  console.log(`link host : ${u.hostname}`)
  console.log(`link path : ${u.pathname}`)
  console.log(`query keys: ${[...u.searchParams.keys()].join(', ')}`)
  console.log(fixed
    ? 'RESULT: TEMPLATE UPDATED ✓ (links point at superpixmia.com — QQ-mail pre-check will NOT consume the token)'
    : 'RESULT: TEMPLATE NOT UPDATED ✗ (still the supabase.co verify URL — QQ mail will keep breaking the link)')
}
