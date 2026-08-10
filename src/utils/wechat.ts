// Android WeChat can't long-press save blob:/data: images — it re-requests a
// real URL when saving. Upload the processed result to get a temporary
// HTTP(S) URL (auto-deleted ~30 min server-side, never stored long-term).
export async function uploadForWechat(blob: Blob): Promise<string> {
  const ext = blob.type === 'image/png' ? 'png'
    : blob.type === 'image/jpeg' ? 'jpg'
    : 'webp'

  const res = await fetch(`/api/wechat-image?ext=${ext}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  })

  if (!res.ok) {
    const msg = await res.json().catch(() => null)
    throw new Error(msg?.error || `Upload failed (${res.status})`)
  }
  const data = await res.json()
  return data.url as string
}
