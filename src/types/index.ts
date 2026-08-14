// The 5 standalone tools. crop / rotate / watermark were merged into the
// /studio editor (2026-08-14) and their old routes 301-redirect there.
export type ToolType = 'resize' | 'compress' | 'remove-bg' | 'convert' | 'remove-watermark'

export interface ImageState {
  originalFile: File | null
  originalUrl: string | null
  originalWidth: number
  originalHeight: number
  processedBlob: Blob | null
  processedUrl: string | null
  isProcessing: boolean
  activeTool: ToolType
  error: string | null
}

export interface Dimensions {
  width: number
  height: number
}

export interface PresetSize {
  label: string
  width: number
  height: number
}

export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'ico'

export type Lang = 'en' | 'zh'
