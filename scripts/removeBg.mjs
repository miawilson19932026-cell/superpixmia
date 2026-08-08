import { removeBackground } from '@imgly/background-removal'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const inputPath = process.argv[2]
const outputPath = process.argv[3]

if (!inputPath || !outputPath) {
  console.error('Usage: node removeBg.mjs <input> <output>')
  process.exit(1)
}

console.log('Reading image...')
const buffer = readFileSync(inputPath)
// Convert to data URL to avoid blob: protocol issues in Node
const ext = inputPath.split('.').pop().toLowerCase()
const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

console.log('Removing background (this may take a moment)...')
const result = await removeBackground(dataUrl, {
  progress: (_key, current, total) => {
    const pct = Math.round((current / total) * 100)
    process.stdout.write(`\rProgress: ${pct}%`)
  },
})

const arrayBuffer = await result.arrayBuffer()
writeFileSync(outputPath, Buffer.from(arrayBuffer))
console.log(`\nDone! Saved to ${outputPath}`)
