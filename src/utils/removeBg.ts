let _removeBgModule: typeof import('@imgly/background-removal') | null = null

async function getRemoveBgModule() {
  if (!_removeBgModule) {
    _removeBgModule = await import('@imgly/background-removal')
  }
  return _removeBgModule
}

export async function removeImageBackground(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const { removeBackground } = await getRemoveBgModule()
  const blob = await removeBackground(file, {
    progress: (_key: string, current: number, total: number) => {
      onProgress?.(current / total)
    },
  })
  return blob
}
