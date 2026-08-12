import type { Lang } from '../types'

export interface Translations {
  brand: string
  brandTagline: string
  navHome: string
  navHelp: string
  toolResize: string
  toolCompress: string
  toolRemoveBg: string
  toolConvert: string
  toolWatermark: string
  toolCrop: string
  dropTitle: string
  dropHint: string
  dropBrowse: string
  dropFormats: string
  dropMaxSize: string
  dropNewImage: string
  resizeTitle: string
  width: string
  height: string
  lockRatio: string
  unlockRatio: string
  presets: string
  presetLabels: Record<string, string>
  applyResize: string
  compressTitle: string
  quality: string
  originalSize: string
  compressedSize: string
  saved: string
  compressFormat: string
  keepOriginal: string
  applyCompress: string
  bgRemoveTitle: string
  removeBgBtn: string
  removingBg: string
  bgPreview: string
  bgTransparent: string
  bgWhite: string
  bgBlack: string
  applyRemoveBg: string
  bgRemoveGuide: string
  convertTitle: string
  convertTo: string
  convertSize: string
  applyConvert: string
  convertGuide: string
  watermarkTitle: string
  watermarkText: string
  watermarkImage: string
  watermarkTextPlaceholder: string
  watermarkTextHint: string
  watermarkLogo: string
  watermarkLogoHint: string
  watermarkPosition: string
  watermarkTiled: string
  watermarkOpacity: string
  watermarkSize: string
  watermarkColor: string
  cropTitle: string
  cropRatio: string
  cropFree: string
  cropApply: string
  cropHint: string
  cropDragHint: string
  download: string
  downloading: string
  footerPrivacy: string
  footerNoUpload: string
  footerNoServer: string
  errorFileTooBig: string
  errorUnsupportedFormat: string
  errorProcess: string
  errorBgRemove: string
  processing: string
  done: string
  preview: string
  result: string
  clickToEnlarge: string
  resetZoom: string
  zoomHint: string
  // Tool intros
  toolResizeDesc: string
  toolCompressDesc: string
  toolRemoveBgDesc: string
  toolConvertDesc: string
  toolWatermarkDesc: string
  toolCropDesc: string
  dropIconAlt: string
  // Batch mode
  modeSingle: string
  modeBatch: string
  images: string
  processAll: string
  downloadZip: string
  batchLimit: string
  imageOf: string
  clearAll: string
  catBubble: string
}

// Detect language from URL param, browser, or localStorage
export function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  // URL ?lang= wins — the sitemap lists /?lang=en and /?lang=zh variants
  const urlLang = new URLSearchParams(window.location.search).get('lang')
  if (urlLang === 'en' || urlLang === 'zh') return urlLang
  const stored = localStorage.getItem('pixmia-lang') as Lang | null
  if (stored === 'en' || stored === 'zh') return stored
  const nav = navigator.language.toLowerCase()
  if (nav.startsWith('zh')) return 'zh'
  return 'en'
}

export function setLang(lang: Lang): void {
  localStorage.setItem('pixmia-lang', lang)
}
