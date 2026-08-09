import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('public/favicon.svg')

// 16x16 favicon
await sharp(svg).resize(16, 16).png().toFile('public/favicon-16.png')
console.log('✓ favicon-16.png')

// 32x32 favicon
await sharp(svg).resize(32, 32).png().toFile('public/favicon-32.png')
console.log('✓ favicon-32.png')

// 180x180 apple touch icon
await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('✓ apple-touch-icon.png')

// Update manifest to use new icon
const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf-8'))
manifest.icons = [
  { src: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
  { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
]
await import('fs').then(fs => fs.writeFileSync('public/manifest.json', JSON.stringify(manifest, null, 2)))
console.log('✓ manifest.json updated')
