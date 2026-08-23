// gifenc v1.0.3 ships no TypeScript types — ambient declaration for the API
// surface we use (browser GIF encoding with per-frame palettes + transparency).
declare module 'gifenc' {
  export type GifencPaletteColor = [number, number, number] | [number, number, number, number]

  export function prequantize(
    rgba: Uint8Array | Uint8ClampedArray,
    opts?: { roundRGB?: number; roundAlpha?: number; oneBitAlpha?: number | boolean },
  ): void

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors?: number,
    opts?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444'
      clearAlpha?: boolean
      clearAlphaColor?: number
      clearAlphaThreshold?: number
      oneBitAlpha?: number | boolean
      useSqrt?: boolean
    },
  ): GifencPaletteColor[]

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifencPaletteColor[],
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array

  export function GIFEncoder(opts?: { initialCapacity?: number; auto?: boolean }): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: GifencPaletteColor[]
        delay?: number // centiseconds (1/100 s) — gifenc's encoder writes this raw
        repeat?: number // -1 = play once, 0 = loop forever, >0 = count
        first?: boolean
        transparent?: boolean
        transparentIndex?: number
        colorDepth?: number
        dispose?: number
      },
    ): void
    finish(): void
    bytes(): Uint8Array<ArrayBuffer>
    reset(): void
  }

  // gifenc ships both ESM and CJS builds; the ESM build's default export mirrors
  // module.exports, so default-import + destructure works in the browser AND in
  // Node/Vite SSR (the prerender step). This avoids fragile named-export
  // detection on the CJS build.
  const gifenc: {
    GIFEncoder: typeof GIFEncoder
    quantize: typeof quantize
    applyPalette: typeof applyPalette
    prequantize: typeof prequantize
  }
  export default gifenc
}
