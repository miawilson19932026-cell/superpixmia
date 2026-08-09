// Post-build: 1. strip @layer wrappers  2. polyfill gap for Chrome 80+
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { transform } from 'lightningcss'

function stripLayers(css) {
  css = css.replace(/@layer\s+\w+\s*;/g, '')
  const LAYER_RE = /@layer\s+\w+\s*\{/g
  let result = ''
  let lastEnd = 0
  let match
  while ((match = LAYER_RE.exec(css)) !== null) {
    result += css.slice(lastEnd, match.index)
    let depth = 1
    let i = match.index + match[0].length
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    const contentStart = match.index + match[0].length
    result += css.slice(contentStart, i - 1)
    lastEnd = i
    LAYER_RE.lastIndex = i
  }
  result += css.slice(lastEnd)
  return result
}

const assetsDir = resolve('dist/assets')
const cssFiles = readdirSync(assetsDir).filter(f => f.endsWith('.css'))

for (const file of cssFiles) {
  const path = resolve(assetsDir, file)
  let css = readFileSync(path, 'utf8')

  // 1. Strip @layer
  css = stripLayers(css)

  // 2. Polyfill modern CSS for Chrome 80+ (gap, color-mix, etc.)
  try {
    const result = transform({
      filename: file,
      code: Buffer.from(css),
      targets: { chrome: 80 << 16 },
      minify: false,
    })
    css = result.code.toString()
  } catch (e) {
    console.warn(`  ⚠ Lightning CSS transform failed: ${e.message}`)
    console.warn(`  → using un-transformed CSS (may lack gap support in old browsers)`)
  }

  writeFileSync(path, css, 'utf8')
  console.log(`  ✓ processed ${file}: ${(css.length / 1024).toFixed(1)}KB`)
}
