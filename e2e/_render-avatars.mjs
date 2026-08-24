// Render all 20 anime avatars to a single screenshot so the hand-drawn SVG can
// be eyeballed (tests prove the wiring, not the art). Not part of the test
// suite — a dev aid. Run after a build (vite preview / dev not needed).
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
// Preview outputs live in the repo (root), not the user's C: drive.
const HTML_PATH = fileURLToPath(new URL('../avatars-render.html', import.meta.url))
const OUT_PATH = fileURLToPath(new URL('../avatars-preview.jpg', import.meta.url))

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { ALL_AVATARS, default: AnimeAvatar } = await vite.ssrLoadModule('/src/components/avatars.tsx')
await vite.close()

const cells = ALL_AVATARS.map(
  (a) =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;background:#1a1d24;border-radius:12px;padding:12px">
       ${renderToStaticMarkup(React.createElement(AnimeAvatar, { avatar: a.key, className: 'w-20 h-20' }))}
       <span style="color:#cfd6e4;font:12px monospace">${a.key}</span>
     </div>`,
).join('')

writeFileSync(
  HTML_PATH,
  `<html><head><meta charset="utf-8"></head><body style="background:#0d0f14;margin:24px;display:flex;flex-wrap:wrap;gap:16px">${cells}</body></html>`,
)

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 900, height: 620, deviceScaleFactor: 2 })
await page.goto(pathToFileURL(HTML_PATH).href, { waitUntil: 'networkidle0' })
await page.screenshot({ path: OUT_PATH, type: 'jpeg', quality: 92 })
await browser.close()
console.log('saved ' + OUT_PATH)
