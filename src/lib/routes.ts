// Route <-> tool mapping. The homepage (`/`) and the 4 tool pages share the same
// tool workspace; the route decides which tool is focused. Tabs are <Link>/navigate
// so every tool also exists as its own indexable URL.
import type { ToolType } from '../types'

export const toolPaths: Record<ToolType, string> = {
  resize: '/resize',
  compress: '/compress',
  'remove-bg': '/remove-bg',
  convert: '/convert',
  watermark: '/watermark',
  crop: '/crop',
}

export const toolPathList: { tool: ToolType; path: string }[] = Object.entries(toolPaths).map(
  ([tool, path]) => ({ tool: tool as ToolType, path }),
)

export function toolFromPath(pathname: string): ToolType | null {
  for (const [tool, path] of Object.entries(toolPaths)) {
    if (pathname === path) return tool as ToolType
  }
  return null
}

// Homepage focuses the compress tool by default (best perceived value, matches
// most search intent) but all tabs remain visible as internal links.
export const HOME_TOOL: ToolType = 'compress'
