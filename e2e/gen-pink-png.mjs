// Generate a 200x150 RGBA test PNG: white background + a PINK semi-transparent
// watermark block (like a red/pink stamp) at center (70,50)-(130,100).
// Semi-transparent pink over white composites to ~(255,140,140).
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const W = 200, H = 150
const raw = Buffer.alloc((W * 4 + 1) * H)
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0 // filter: none
  for (let x = 0; x < W; x++) {
    const inWm = x >= 70 && x < 130 && y >= 50 && y < 100
    // fg pink (255,59,59) @ alpha 150 over white bg
    const a = inWm ? 150 : 0
    const o = y * (W * 4 + 1) + 1 + x * 4
    const r = inWm ? Math.round((255 * a + 255 * (255 - a)) / 255) : 255
    const g = inWm ? Math.round((59 * a + 255 * (255 - a)) / 255) : 255
    const b = g
    raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255
  }
}

let table
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256)
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c }
  }
  let c = 0xFFFFFFFF
  for (const bb of buf) c = table[(c ^ bb) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(new URL('./test-pink-watermark.png', import.meta.url), png)
console.log('written test-pink-watermark.png', png.length, 'bytes; watermark color ≈(255,140,140)')