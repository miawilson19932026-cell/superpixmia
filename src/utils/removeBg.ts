import { removeBackground } from '@imgly/background-removal'

export async function removeImageBackground(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const blob = await removeBackground(file, {
    progress: (_key: string, current: number, total: number) => {
      onProgress?.(current / total)
    },
  })
  return blob
}
