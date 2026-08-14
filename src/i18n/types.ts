import type { Lang } from '../types'

export interface Translations {
  brand: string
  brandTagline: string
  navHome: string
  navBlog: string
  navHelp: string
  toolResize: string
  toolCompress: string
  toolRemoveBg: string
  toolConvert: string
  toolWatermark: string
  toolCrop: string
  toolRotate: string
  toolRemoveWatermark: string
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
  bgRefineTitle: string
  bgRefineOpen: string
  bgRefineWand: string
  bgRefineBrush: string
  bgRefineErase: string
  bgRefineRestore: string
  bgRefineTolerance: string
  bgRefineBrushSize: string
  bgRefineUndo: string
  bgRefineRedo: string
  bgRefineReset: string
  bgRefineApply: string
  bgRefineCancel: string
  bgRefineHint: string
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
  cropPxTitle: string
  cropPxApply: string
  rotateTitle: string
  rotateLeft: string
  rotateRight: string
  rotateFlipH: string
  rotateFlipV: string
  rotateAngle: string
  rotateReset: string
  rotateHint: string
  removeWmTitle: string
  removeWmHint: string
  removeWmBrush: string
  removeWmPaint: string
  removeWmErase: string
  removeWmUndo: string
  removeWmClear: string
  removeWmApply: string
  removeWmResultHint: string
  removeWmDone: string
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
  toolRemoveWatermarkDesc: string
  toolCropDesc: string
  toolRotateDesc: string
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
  // Studio — combined single-image editor (/studio)
  studioTagline: string
  studioPickTitle: string
  studioPickHint: string
  studioOpen: string
  studioUploadNew: string
  studioToolsLabel: string
  studioRotate: string
  studioCrop: string
  studioText: string
  studioLogo: string
  studioPencil: string
  studioHeal: string
  studioCutout: string
  studioRemove: string
  studioResize: string
  studioApply: string
  studioUndo: string
  studioRedo: string
  studioDownload: string
  studioDownloading: string
  studioClear: string
  studioReset: string
  studioApplied: string
  studioBrushSize: string
  studioColor: string
  studioTextPlaceholder: string
  studioLogoHint: string
  studioSelectLogo: string
  studioOpacity: string
  studioTolerance: string
  studioAngle: string
  studioWidth: string
  studioHeight: string
  studioLockRatio: string
  studioFlipH: string
  studioFlipV: string
  studioErase: string
  studioFree: string
  // Download confirmation dialog
  studioDlTitle: string
  studioDlFormat: string
  studioDlDims: string
  studioDlSize: string
  studioDlCancel: string
  studioDlConfirm: string
  studioFormatSame: string
  // Interaction hints
  studioRotateHint: string
  studioCropHint: string
  studioCutoutHint: string
  studioWandHint: string
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
