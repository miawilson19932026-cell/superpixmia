// Blind art audit for the 22 anime avatars (this model can't view images, so
// verify programmatically): each avatar must render non-blank AND have a
// unique pixel signature — i.e. the 22 don't collapse into near-identical art.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import puppeteer from 'puppeteer-core'
import { createHash } from 'crypto'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { pathToFileURL } from 'url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
// Transient audit HTML goes to the OS temp dir, not the user's C: root.
const AUDIT_HTML = join(tmpdir(), 'avatar-audit.html')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { ALL_AVATARS, default: AnimeAvatar } = await vite.ssrLoadModule('/src/components/avatars.tsx')
await vite.close()

const cells = ALL_AVATARS.map(
  (a) =>
    `<div id="c-${a.key}" style="background:#000">${renderToStaticMarkup(
      React.createElement(AnimeAvatar, { avatar: a.key, className: 'w-64 h-64' }),
    )}</div>`,
).join('')
writeFileSync(AUDIT_HTML, `<html><body style="margin:0">${cells}</body></html>`)

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto(pathToFileURL(AUDIT_HTML).href, { waitUntil: 'networkidle0' })

const sigs = await page.evaluate(async (keys) => {
  const out = []
  for (const a of keys) {
    const el = document.getElementById('c-' + a).querySelector('svg')
    if (!el) { out.push({ key: a, blank: true }); continue }
    const bbox = el.getBBox() // geometry bounds in viewBox units — misplaced shapes would blow this up
    const ser = new XMLSerializer().serializeToString(el)
    const url = URL.createObjectURL(new Blob([ser], { type: 'image/svg+xml' }))
    const img = new Image()
    await new Promise((res) => { img.onload = res; img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = 200; canvas.height = 200
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, 200, 200)
    const data = ctx.getImageData(0, 0, 200, 200).data
    let opaque = 0, sum = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 200) opaque++
      sum += (data[i] << 16) + (data[i + 1] << 8) + data[i + 2]
    }
    const bb = bbox && isFinite(bbox.x) ? `${Math.round(bbox.x)},${Math.round(bbox.y)},${Math.round(bbox.width)}x${Math.round(bbox.height)}` : 'BAD'
    out.push({ key: a, blank: opaque === 0, opaquePx: opaque, bbox: bb, hash: String((sum >>> 0).toString(36)).slice(0, 10) })
  }
  return out
}, ALL_AVATARS.map((a) => a.key))

let fail = 0
for (const s of sigs) {
  // bbox must sit inside the 0..64 viewBox (with a little slack) — out-of-frame
  // shapes would push it far outside.
  const [bx, by, bw, bh] = (s.bbox || '').split(/[,x]/).map(Number)
  const inFrame = Number.isFinite(bx) && bx >= -4 && by >= -4 && bx + bw <= 68 && by + bh <= 68
  const ok = !s.blank && s.opaquePx > 2000 && inFrame
  if (!ok) fail++
  console.log(`${ok ? '✓' : '✗'} ${s.key} opaque=${s.opaquePx} bbox=${s.bbox} sig=${s.hash}`)
}
const uniq = new Set(sigs.map((s) => s.hash))
console.log(`distinct pixel signatures: ${uniq.size}/20 (must be 20 — else some avatars look identical)`)
console.log(fail || uniq.size !== 20 ? 'AUDIT FAILED' : 'AUDIT PASSED')
await browser.close()
if (fail || uniq.size !== 20) process.exit(1)
