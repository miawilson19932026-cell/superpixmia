// Cross-platform blob download. WeChat long-press + iOS Safari can't use a
// synthetic <a download> click, so we open the blob URL for manual saving.

import { getResultExtension } from './resize'

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
export const isWeChat = /MicroMessenger/i.test(ua)
export const isIOS = /iP(hone|ad|od)/i.test(ua)

export function downloadBlob(blob: Blob, baseName: string): void {
  const ext = getResultExtension(blob)
  const url = URL.createObjectURL(blob)
  if (isWeChat || isIOS) {
    window.open(url, '_blank')
    return
  }
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}-pixmia.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
