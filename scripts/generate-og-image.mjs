import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('public/og-image.svg')

// 1200×630 PNG for OG (Facebook, Twitter, WeChat, etc.)
await sharp(svg).resize(1200, 630).png().toFile('public/og-image.png')
console.log('✓ og-image.png (1200×630)')

// Also generate 600×315 for WeChat (some versions prefer smaller)
await sharp(svg).resize(600, 315).png().toFile('public/og-image-600.png')
console.log('✓ og-image-600.png (600×315)')
