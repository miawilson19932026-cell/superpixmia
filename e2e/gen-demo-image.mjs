// Generate a pretty demo photo (not a real photo — a synthetic scenic image)
// for the Studio demo GIF. Sunny sky, sea, a big sun, clouds. 1200×900.
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const W = 1200, H = 900
const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a7bd5"/>
      <stop offset="60%" stop-color="#6db3f2"/>
      <stop offset="100%" stop-color="#a8d8ff"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0e7c6b"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#fff7cc"/>
      <stop offset="70%" stop-color="#ffe680"/>
      <stop offset="100%" stop-color="#ffcc00"/>
    </radialGradient>
  </defs>

  <!-- sky -->
  <rect x="0" y="0" width="${W}" height="${H * 0.62}" fill="url(#sky)"/>
  <!-- sea -->
  <rect x="0" y="${H * 0.62}" width="${W}" height="${H * 0.38}" fill="url(#sea)"/>

  <!-- sun -->
  <circle cx="${W * 0.78}" cy="${H * 0.3}" r="90" fill="url(#sun)"/>

  <!-- clouds -->
  <g fill="#ffffff" opacity="0.9">
    <ellipse cx="${W * 0.25}" cy="${H * 0.2}" rx="120" ry="38"/>
    <ellipse cx="${W * 0.34}" cy="${H * 0.18}" rx="80" ry="30"/>
    <ellipse cx="${W * 0.18}" cy="${H * 0.16}" rx="60" ry="24"/>
    <ellipse cx="${W * 0.55}" cy="${H * 0.32}" rx="90" ry="28"/>
    <ellipse cx="${W * 0.63}" cy="${H * 0.3}" rx="55" ry="22"/>
  </g>

  <!-- a little sailboat -->
  <g>
    <path d="M${W * 0.3} ${H * 0.7} L${W * 0.3} ${H * 0.56} L${W * 0.44} ${H * 0.7} Z" fill="#ffffff"/>
    <path d="M${W * 0.3} ${H * 0.7} L${W * 0.3} ${H * 0.58} L${W * 0.19} ${H * 0.7} Z" fill="#fde047"/>
    <rect x="${W * 0.26}" y="${H * 0.7}" width="${W * 0.22}" height="14" rx="7" fill="#a16207"/>
  </g>

  <!-- sun sparkle reflection on water -->
  <g fill="#ffe680" opacity="0.6">
    <ellipse cx="${W * 0.78}" cy="${H * 0.68}" rx="6" ry="26"/>
    <ellipse cx="${W * 0.78}" cy="${H * 0.72}" rx="8" ry="30"/>
    <ellipse cx="${W * 0.78}" cy="${H * 0.76}" rx="6" ry="28"/>
    <ellipse cx="${W * 0.78}" cy="${H * 0.8}" rx="7" ry="26"/>
  </g>
</svg>`)

await sharp(svg).png().toFile(fileURLToPath(new URL('./demo-scenery.png', import.meta.url)))
console.log('written demo-scenery.png (1200×900)')
