// Post-build: strip @layer wrappers from CSS for older browsers (Chrome <99)
// @layer was added in Chrome 99; browsers like 360 Safe may use Chromium 86-95
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

function stripLayers(css) {
  // Remove @layer declarations without blocks: "@layer components;"
  css = css.replace(/@layer\s+\w+\s*;/g, '')

  // Remove @layer name{ content } — keep content, drop the wrapper
  const LAYER_RE = /@layer\s+\w+\s*\{/g
  let result = ''
  let lastEnd = 0
  let match
  while ((match = LAYER_RE.exec(css)) !== null) {
    // Everything before this @layer tag
    result += css.slice(lastEnd, match.index)
    // Inside the @layer block — find matching closing }
    let depth = 1
    let i = match.index + match[0].length
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    // i is now past the matching closing brace; extract inner content
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
  const css = readFileSync(path, 'utf8')
  const flattened = stripLayers(css)
  writeFileSync(path, flattened, 'utf8')
  const before = (css.length / 1024).toFixed(1)
  const after = (flattened.length / 1024).toFixed(1)
  console.log(`  ✓ flattened ${file}: ${before}KB → ${after}KB`)
}
