export type ToolType = 'resize' | 'compress' | 'remove-bg' | 'convert' | 'watermark' | 'remove-watermark' | 'crop' | 'rotate'

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
