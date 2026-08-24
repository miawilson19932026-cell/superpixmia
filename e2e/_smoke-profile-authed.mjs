// Smoke test for the LOGGED-IN profile feature against the built preview server.
// The build carries real Supabase env (.env.local), so we inject a fake session
// at the fixed storageKey 'spm-auth-token' (same trick as verify-studio.mjs) to
// exercise: the /profile view (avatar, nickname, change-password card), header
// avatar+nickname, and that male/female avatars render DIFFERENT gradients.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:4173'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })

const errors = []
// "Failed to load resource" = network-status noise from the injected fake session
// (real Supabase calls 403 with a token that isn't on the server) — not a JS error.
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text()) })
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

// Must run AFTER an initial goto (localStorage needs a same-origin document),
// then reload so AuthProvider picks the injected session up from getSession().
const seedSession = async (gender, nickname = 'Mia', avatar) => {
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(([gender, nickname, avatar]) => {
    const meta = { nickname, gender, profile_completed: true }
    if (avatar) meta.avatar = avatar
    localStorage.setItem('spm-auth-token', JSON.stringify({
      access_token: 'e2e-fake-token', refresh_token: 'e2e-fake-refresh', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
      user: {
        id: 'e2e-user', email: 'e2e@test.com', aud: 'authenticated', role: 'authenticated',
        created_at: '2020-01-01T00:00:00.000Z',
        user_metadata: meta,
      },
    }))
  }, [gender, nickname, avatar])
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
}

const avatarGradients = () => page.evaluate(() =>
  Array.from(document.querySelectorAll('span[class*="from-sky-400"], span[class*="from-pink-400"], span[class*="from-violet-400"]'))
    .map((s) => s.className),
)

// ── 1. Male profile: avatar (blue), nickname, change-password card ──
await seedSession('male')
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('Change password'), { timeout: 10000 })
const male = (await page.evaluate(() => document.body.innerText)).toLowerCase()
check('nickname shown on /profile', male.includes('mia'))
check('change-password card present', male.includes('change password') && male.includes('current password') && male.includes('new password'))
check('gender label = Male', male.includes('gender') && male.includes('male'))
const pwInputs = await page.evaluate(() => document.querySelectorAll('input[type=password]').length)
check('3 password inputs (current/new/confirm)', pwInputs === 3, `got ${pwInputs}`)
const grads1 = await avatarGradients()
check('male avatar = blue gradient', grads1.some((c) => c.includes('from-sky-400') && c.includes('to-blue-600')), grads1.join(' | '))

// ── 2. No profile modal over the page (profile_completed suppresses it) ──
const modalShown = await page.evaluate(() => !!Array.from(document.querySelectorAll('p')).find((p) => /Let us get to know you|让我们更了解你/.test(p.textContent || '')))
check('no first-login modal on /profile', !modalShown)

// ── 3. Header shows avatar + nickname (desktop) ──
const headerText = await page.evaluate(() => {
  const h = document.querySelector('header')
  return { text: h ? h.innerText : '', grads: Array.from(h?.querySelectorAll('span[class*="from-sky-400"], span[class*="from-pink-400"]') || []).map((s) => s.className) }
})
check('header shows nickname', headerText.text.includes('Mia'))
check('header avatar is blue (male)', headerText.grads.some((c) => c.includes('from-sky-400')))

// ── 4. Female profile: avatar flips to pink ──
await seedSession('female', 'Luna')
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('Change password'), { timeout: 10000 })
const grads2 = await avatarGradients()
check('female avatar = pink gradient', grads2.some((c) => c.includes('from-pink-400') && c.includes('to-rose-500')), grads2.join(' | '))
check('female nickname updates', (await page.evaluate(() => document.body.innerText)).includes('Luna'))

// ── 5. zh: change-password strings localize ──
await seedSession('male')
await page.goto(`${BASE}/profile?lang=zh`, { waitUntil: 'networkidle2', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('修改密码'), { timeout: 10000 })
const zhText = await page.evaluate(() => document.body.innerText)
check('zh: 修改密码 title', zhText.includes('修改密码'))
check('zh: 当前密码 / 新密码 fields', zhText.includes('当前密码') && zhText.includes('新密码'))

// ── 6. Chosen anime avatar renders (header + profile), overrides gender look ──
await seedSession('male', 'Mia', 'male-3')
await page.waitForFunction(() => document.querySelector('[data-avatar]'), { timeout: 10000 })
const animeKeys = await page.evaluate(() => Array.from(document.querySelectorAll('[data-avatar]')).map((s) => s.getAttribute('data-avatar')))
check('header + profile show the chosen anime avatar (male-3)', animeKeys.filter((k) => k === 'male-3').length >= 2, animeKeys.join(','))
check('no silhouette gradient when anime avatar set', !(await avatarGradients()).some((c) => c.includes('from-sky-400') || c.includes('from-pink-400')))

// ── 7. Edit mode: avatar picker shows all 20 anime avatars (two groups) ──
const editBtn = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^Edit$/.test((x.textContent || '').trim()))
  if (b) { b.click(); return true } return false
})
check('clicked Edit', !!editBtn)
await page.waitForFunction(() => document.querySelectorAll('form [data-avatar]').length === 20, { timeout: 10000 })
const pickerKeys = await page.evaluate(() => Array.from(document.querySelectorAll('form [data-avatar]')).map((s) => s.getAttribute('data-avatar')))
check('avatar picker shows all 20 avatars', pickerKeys.length === 20, pickerKeys.join(','))
check('5 male + 5 female keys present', ['male-1','male-2','male-3','male-4','male-5'].every((k) => pickerKeys.includes(k)) && ['female-1','female-2','female-3','female-4','female-5'].every((k) => pickerKeys.includes(k)))
check('cool international group present (cool-1…cool-10)', ['cool-1','cool-2','cool-3','cool-4','cool-5','cool-6','cool-7','cool-8','cool-9','cool-10'].every((k) => pickerKeys.includes(k)))
check('no leftover cool-11/cool-12 (deduped)', !pickerKeys.includes('cool-11') && !pickerKeys.includes('cool-12'))

// ── 7b. Country field: bilingual options (English + native), alphabetical ──
const countrySel = await page.evaluate(() => {
  const sel = Array.from(document.querySelectorAll('form select'))[1] // gender, country, occupation
  if (!sel) return null
  const opts = Array.from(sel.options).map((o) => ({ v: o.value, t: (o.textContent || '').trim() }))
  return { count: opts.length, opts }
})
check('country select exists', !!countrySel)
const countryOk = countrySel && countrySel.opts.slice(1).every((o, i, arr) => i === 0 || arr[i - 1].t.localeCompare(o.t, 'en') <= 0)
check('country options sorted alphabetically (by English name)', !!countryOk)
check('country shows "Germany Deutschland" and "China 中国"', !!countrySel && countrySel.opts.some((o) => o.v === 'DE' && o.t === 'Germany Deutschland') && countrySel.opts.some((o) => o.v === 'CN' && o.t === 'China 中国'), countrySel ? countrySel.opts.filter((o) => o.v === 'DE' || o.v === 'CN').map((o) => o.t).join(' · ') : '')
const pressed = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-pressed="true"]')).map((b) => b.getAttribute('aria-label')))
check('seeded avatar is pre-selected', pressed.some((l) => l && l.includes('male-3')), pressed.join(','))
// picking a different avatar marks it selected
await page.evaluate(() => { const b = Array.from(document.querySelectorAll('[aria-pressed]')).find((x) => (x.getAttribute('aria-label') || '').includes('female-1')); b && b.click() })
await new Promise((r) => setTimeout(r, 150))
const pressed2 = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-pressed="true"]')).map((b) => b.getAttribute('aria-label')))
check('tapping a new avatar switches selection', pressed2.some((l) => l && l.includes('female-1')), pressed2.join(','))

// ── 7c. Country renders on the /profile display from stored metadata ──
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('spm-auth-token'))
  raw.user.user_metadata = { nickname: 'Mia', gender: 'male', country: 'CN', profile_completed: true }
  localStorage.setItem('spm-auth-token', JSON.stringify(raw))
})
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('China 中国'), { timeout: 10000 })
const countryShown = await page.evaluate(() => /China 中国/.test(document.body.innerText))
check('country "China 中国" shown on /profile', countryShown)

// ── 7d. Usage reasons: richer preset tags + custom input on "Other" ──
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^Edit$/.test((x.textContent || '').trim()))
  if (b) b.click()
})
await page.waitForFunction(() => document.querySelector('form button[aria-pressed]'), { timeout: 10000 })
const reasonEnriched = await page.evaluate(() => {
  const form = document.querySelector('form')
  const txt = form ? form.textContent || '' : ''
  return txt.includes('GIF / stickers') && txt.includes('Remove backgrounds') && txt.includes('Product shots')
})
check('usage-reason tags enriched (new presets present)', !!reasonEnriched)
const clickedOther = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('form button')).find((x) => (x.textContent || '').includes('Other'))
  if (b) { b.click(); return true } return false
})
await new Promise((r) => setTimeout(r, 100))
const otherInput = await page.evaluate(() => {
  const inp = Array.from(document.querySelectorAll('form input')).find((i) => (i.placeholder || '').includes('Describe your use case'))
  return !!inp
})
check('custom reason input appears when "Other" selected', clickedOther && otherInput)

// ── 8. Gender → default avatar (no avatar picked yet) ──
await seedSession('male', 'Mia') // no avatar in metadata → avatarTouched=false
await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((x) => /^Edit$/.test((x.textContent || '').trim())), { timeout: 10000 })
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^Edit$/.test((x.textContent || '').trim()))
  if (b) b.click()
})
await page.waitForFunction(() => document.querySelector('form [data-avatar]'), { timeout: 10000 })
// change gender select → female should pre-select female-1
await page.evaluate(() => {
  const sel = document.querySelector('form select')
  if (!sel) return
  const proto = HTMLSelectElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(sel, 'female')
  sel.dispatchEvent(new Event('change', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 200))
const pressedDef = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-pressed="true"]')).map((b) => b.getAttribute('aria-label')))
check('gender female auto-selects female-1 default', pressedDef.some((l) => l && l.includes('female-1')), pressedDef.join(',') || '(none selected)')

// ── 9. Breadcrumb on /profile (quick return to home) ──
await seedSession('female', 'Luna')
const crumb = await page.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Breadcrumb"]')
  if (!nav) return null
  const link = nav.querySelector('a')
  return { linkHref: link ? link.getAttribute('href') : null, text: (nav.textContent || '').replace(/\s+/g, ' ').trim() }
})
check('breadcrumb nav with home link', !!crumb && crumb.linkHref === '/' && crumb.text.includes('Personal Center'), JSON.stringify(crumb))

// ── 10. ProfileModal: X button (Skip for now) closes without repeating ──
// No profile_completed in metadata + fresh profile flag → first-login modal opens.
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 60000 })
await page.evaluate(() => {
  localStorage.setItem('spm-auth-token', JSON.stringify({
    access_token: 'e2e-fake-token', refresh_token: 'e2e-fake-refresh', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
    user: {
      id: 'e2e-user2', email: 'e2e2@test.com', aud: 'authenticated', role: 'authenticated',
      created_at: '2020-01-01T00:00:00.000Z',
      user_metadata: { nickname: 'Mia' },
    },
  }))
  localStorage.removeItem('spm:profile:e2e-user2')
})
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
await page.waitForFunction(() => /Help us know you better|让我们更了解你/.test(document.body.innerText), { timeout: 10000 })
const xClicked = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="Skip for now"]')
  if (!b) return false
  b.click()
  return true
})
check('ProfileModal X button (aria-label=Skip for now) exists', xClicked)
await page.waitForFunction(() => !/Help us know you better|让我们更了解你/.test(document.body.innerText), { timeout: 10000 })
check('ProfileModal X closes the modal', true)

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
if (fail || errors.length) process.exit(1)
