// Generate a 200x150 test PNG for the magic-wand "white fringe" bug (#17):
// a black 20x20 core block (90,65)-(110,85) on a pure white background, with a
// 3px anti-aliased gray gradient between the black core and the white field.
// At max tolerance the wand selects the white + outer ~1.2px of fringe; the
// remaining ~1.8px of light-gray fringe is exactly the "残次白缺" that dilateMask
// must swallow. Pure Node, no canvas.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const W = 200, H = 150
const CORE = { x: 90, y: 65, w: 20, h: 20 } // [x, x+w) × [y, y+h)
const FRINGE = 3

const raw = Buffer.alloc((W * 3 + 1) * H)
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0 // filter: none
  for (let x = 0; x < W; x++) {
    // Outward distance to the core's edges (0 when inside the core's x/y span).
    const dxo = Math.max(CORE.x - x, x - (CORE.x + CORE.w - 1), 0)
    const dyo = Math.max(CORE.y - y, y - (CORE.y + CORE.h - 1), 0)
    const inCore = dxo === 0 && dyo === 0 && x >= CORE.x && x < CORE.x + CORE.w
    let v
    if (inCore) v = 0                                  // pure black subject
    else {
      const d = Math.sqrt(dxo * dxo + dyo * dyo)       // 0.01.. outward
      v = d >= FRINGE ? 255 : Math.round((255 * d) / FRINGE) // gradient → white
    }
    const o = y * (W * 3 + 1) + 1 + x * 3
    raw[o] = v; raw[o + 1] = v; raw[o + 2] = v
  }
}

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
writeFileSync(new URL('./test-white-edge.png', import.meta.url), png)
console.log('written test-white-edge.png', png.length, 'bytes')
