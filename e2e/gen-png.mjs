// Generate a 200x150 test PNG: white background + black 30x40 block (the "watermark")
// at center (85,55)-(115,95). Pure Node, no canvas.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const W = 200, H = 150
const raw = Buffer.alloc((W * 3 + 1) * H)
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0 // filter: none
  for (let x = 0; x < W; x++) {
    const inWm = x >= 85 && x < 115 && y >= 55 && y < 95
    const v = inWm ? 0 : 255
    const o = y * (W * 3 + 1) + 1 + x * 3
    raw[o] = v; raw[o + 1] = v; raw[o + 2] = v
  }
}

// CRC32
let table
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256)
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c }
  }
  let c = 0xFFFFFFFF
  for (const b of buf) c = table[(c ^ b) & 0xFF] ^ (c >>> 8)
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
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(new URL('./test-watermark.png', import.meta.url), png)
console.log('written test-watermark.png', png.length, 'bytes')
