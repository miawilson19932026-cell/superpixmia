// Verify the two profile-form UX changes against the built preview server:
//   1. Birthday uses THREE selects (year / month / day), not a native date picker.
//   2. Avatar collapses to ONE large preview; "Change avatar" expands the grid,
//      picking one selects it and collapses back.
// Injects the same fake session as _smoke-profile-authed.mjs (without
// profile_completed) so the first-login ProfileModal opens.
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:4173'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })

let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }

// Seed a fake logged-in user WITHOUT profile_completed so the modal opens.
const openProfileModal = async () => {
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => {
    localStorage.setItem('spm-auth-token', JSON.stringify({
      access_token: 'e2e-fake-token', refresh_token: 'e2e-fake-refresh', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
      user: {
        id: 'e2e-form-user', email: 'form@test.com', aud: 'authenticated', role: 'authenticated',
        created_at: '2020-01-01T00:00:00.000Z', user_metadata: { nickname: 'FormTest' },
      },
    }))
  })
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  // labels are uppercased by CSS, so match case-insensitively for BIRTHDAY
  await page.waitForFunction(() => document.body.innerText.toUpperCase().includes('BIRTHDAY') && document.body.innerText.includes('Change avatar'), { timeout: 10000 })
}

await openProfileModal()

// ── 1. Birthday = three selects, no native date picker ──
const bday = await page.evaluate(() => {
  const dateInputs = document.querySelectorAll('input[type=date]').length
  const labels = Array.from(document.querySelectorAll('label')).find((l) => /Birthday/.test(l.textContent || ''))
  const grid = labels?.nextElementSibling
  const selects = grid ? Array.from(grid.querySelectorAll('select')) : []
  return { dateInputs, selectCount: selects.length, placeholders: selects.map((s) => s.options[0].textContent?.trim()) }
})
check('no native date input in the form', bday.dateInputs === 0, `found ${bday.dateInputs}`)
check('birthday has exactly 3 selects', bday.selectCount === 3, `got ${bday.selectCount}`)
check('select placeholders are Year / Month / Day', JSON.stringify(bday.placeholders) === JSON.stringify(['Year', 'Month', 'Day']), JSON.stringify(bday.placeholders))
const yrOpts = await page.evaluate(() => {
  const labels = Array.from(document.querySelectorAll('label')).find((l) => /Birthday/.test(l.textContent || ''))
  const sel = labels?.nextElementSibling?.querySelector('select')
  return sel ? sel.options.length : 0
})
check('year select has a sane option count', yrOpts >= 40 && yrOpts <= 120, `options=${yrOpts}`)

// ── 2. Avatar: collapsed preview first, expands on "Change avatar" ──
const collapsed = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('[class*="modal-card"] button')).filter((b) => /Change avatar/.test(b.textContent || ''))
  // Avatar cells have aria-label "male avatar male-1" (space-avatar-space);
  // the Change-avatar button is "Change avatar" and must NOT count.
  const cells = Array.from(document.querySelectorAll('[aria-label*=" avatar "]')).length
  // Before any gender/avatar is chosen the preview shows a neutral placeholder,
  // otherwise the chosen avatar's svg — either way the large circle exists.
  const bigPreview = Array.from(document.querySelectorAll('button')).some((b) => !!b.querySelector('span[class*="w-16 h-16"]'))
  return { changeBtn: btns.length, cells, bigPreview }
})
check('collapsed: exactly one "Change avatar" button', collapsed.changeBtn === 1, `got ${collapsed.changeBtn}`)
check('collapsed: NO avatar grid cells', collapsed.cells === 0, `got ${collapsed.cells}`)
check('collapsed: large preview shown', collapsed.bigPreview)

await page.evaluate(() => {
  Array.from(document.querySelectorAll('[class*="modal-card"] button')).find((b) => /Change avatar/.test(b.textContent || ''))?.click()
})
await page.waitForFunction(() => document.querySelectorAll('[aria-label*=" avatar "]').length >= 20, { timeout: 5000 })
const expanded = await page.evaluate(() => ({
  cells: Array.from(document.querySelectorAll('[aria-label*=" avatar "]')).length,
  groups: Array.from(document.querySelectorAll('[class*="modal-card"] p')).filter((p) => /Classic anime|Cool international/.test(p.textContent || '')).length,
}))
check('expanded: 20 avatar cells appear', expanded.cells === 20, `got ${expanded.cells}`)
check('expanded: both look groups labelled', expanded.groups === 2, `got ${expanded.groups}`)

// pick male-1 (first cell) → collapses, preview shows it
await page.evaluate(() => document.querySelectorAll('[aria-label*=" avatar "]')[0]?.click())
await page.waitForFunction(() => document.querySelectorAll('[aria-label*=" avatar "]').length === 0, { timeout: 5000 })
const afterPick = await page.evaluate(() => {
  const svg = document.querySelector('button span[class*="w-16 h-16"] svg[data-avatar]')
  return svg ? svg.getAttribute('data-avatar') : null
})
check('picking collapses the grid again', await page.evaluate(() => document.querySelectorAll('[aria-label*=" avatar "]').length === 0))
check('picked avatar shown in preview', afterPick === 'male-1', `data-avatar=${afterPick}`)

// ── 3. /profile edit form (non-compact) also uses the three selects ──
// Skip the modal, then go to the page again with profile_completed to avoid it.
await page.evaluate(() => {
  const skip = Array.from(document.querySelectorAll('button')).find((b) => /Skip/.test(b.textContent || ''))
  if (skip) skip.click()
})
await page.evaluate(() => {
  const meta = { nickname: 'FormTest', profile_completed: true }
  localStorage.setItem('spm-auth-token', JSON.stringify({
    access_token: 'e2e-fake-token', refresh_token: 'e2e-fake-refresh', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
    user: {
      id: 'e2e-form-user', email: 'form@test.com', aud: 'authenticated', role: 'authenticated',
      created_at: '2020-01-01T00:00:00.000Z', user_metadata: meta,
    },
  }))
})
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('Edit profile') || document.body.innerText.includes('Edit') || document.body.innerText.includes('Change password'), { timeout: 10000 })
// Open the edit form
await page.evaluate(() => {
  const ed = Array.from(document.querySelectorAll('button')).find((b) => /Edit/.test(b.textContent || ''))
  if (ed) ed.click()
})
await page.waitForFunction(() => !!document.querySelector('input[type=text], input[type=email]'), { timeout: 5000 })
const editForm = await page.evaluate(() => ({
  dateInputs: document.querySelectorAll('input[type=date]').length,
  birthdaySelects: (() => {
    const labels = Array.from(document.querySelectorAll('label')).find((l) => /Birthday/.test(l.textContent || ''))
    const grid = labels?.nextElementSibling
    return grid ? grid.querySelectorAll('select').length : 0
  })(),
}))
check('/profile edit form: no date input', editForm.dateInputs === 0)
check('/profile edit form: 3 birthday selects', editForm.birthdaySelects === 3, `got ${editForm.birthdaySelects}`)

console.log(`\n=== ${pass} passed, ${fail} failed ===`)
await browser.close()
process.exit(fail > 0 ? 1 : 0)
