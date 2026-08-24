// GIF encoding for the /gif-maker tool — runs entirely in the browser via gifenc.
//
// Transparency strategy (GIF has only 1-bit alpha, one palette entry):
//   1. prequantize forces every pixel's alpha to 0 or 255 (oneBitAlpha: 127),
//      so anti-aliased edges snap cleanly to transparent/opaque — no halo.
//   2. quantize in rgba4444 mode so the palette tracks alpha; clearAlpha maps
//      all fully-transparent pixels onto ONE entry [0,0,0,0].
//   3. applyPalette in rgba4444 mode picks the nearest palette color per pixel,
//      then we force pixels whose alpha is 0 to the transparent palette index —
//      matching can otherwise send a transparent pixel to a similar opaque color.
//   4. writeFrame with transparent:true + transparentIndex lets the frame restore
//      to transparency between frames (dispose=2), the correct behaviour for
//      animated transparent stickers.
//
// Each frame gets its own LOCAL color table (gifenc does this automatically when
// you pass a palette on a non-first frame), so per-frame palettes — including a
// per-frame transparent index — are fully supported.

import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette, prequantize } = gifenc

export interface GifFrameRgba {
  /** RGBA bytes, width * height * 4 */
  rgba: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}

export interface GifEncodeOptions {
  /** frames per second, used as the per-frame delay when `delays` is missing */
  fps: number
  /** true = loop forever, false = play once */
  loop: boolean
  /** per-frame hold time in ms (index i ↔ frame i); falls back to 1000/fps */
  delays?: number[]
}

/** Encode RGBA frames into a GIF Blob. All frames must already share the same size. */
export function framesToGifBlob(frames: GifFrameRgba[], opts: GifEncodeOptions): Blob {
  const { fps, loop, delays } = opts

  const gif = GIFEncoder()
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const { width, height } = frame
    // gifenc's `delay` option is in MILLISECONDS — it converts to the file's
    // centiseconds internally (delayTime = round(delay/10)). Pass the raw hold
    // time; clamping to 10ms keeps the centisecond field >= 1cs.
    const delay = Math.max(10, Math.round(delays?.[i] ?? 1000 / Math.max(1, fps)))

    // Copy so prequantize() mutates our copy, not the caller's buffer.
    const rgba = new Uint8ClampedArray(frame.rgba)
    prequantize(rgba, { oneBitAlpha: 127 })

    const palette = quantize(rgba, 256, { format: 'rgba4444', clearAlpha: true })
    const index = applyPalette(rgba, palette, 'rgba4444')

    // Force every fully-transparent pixel onto the transparent palette entry.
    let transparentIndex = -1
    for (let p = 0; p < palette.length; p++) {
      if (palette[p].length >= 4 && palette[p][3] === 0) { transparentIndex = p; break }
    }
    if (transparentIndex >= 0) {
      const data = new Uint32Array(rgba.buffer)
      for (let i = 0; i < data.length; i++) {
        if ((data[i] >>> 24) === 0) index[i] = transparentIndex
      }
    }

    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: loop ? 0 : -1, // 0 = infinite loop, -1 = play once
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
    })
  }
  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}
