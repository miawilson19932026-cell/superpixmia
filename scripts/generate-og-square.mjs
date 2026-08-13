import sharp from 'sharp'
import { readFileSync } from 'fs'

// 1024×1024 square share card for WeChat / Open Graph.
// ≥600px so Facebook/Google also render it; 1:1 gives WeChat its big chat card.
// Source design lives in public/og-image-square.svg — edit that, then re-run this.
const svg = readFileSync('public/og-image-square.svg')

await sharp(svg).jpeg({ quality: 92 }).toFile('public/og-image-square.jpg')
console.log('✓ og-image-square.jpg (1024×1024 JPEG)')

await sharp(svg).png().toFile('public/og-image-square.png')
console.log('✓ og-image-square.png (1024×1024 PNG reference)')
