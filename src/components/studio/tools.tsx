import type { ReactNode } from 'react'

// The combined single-image editor's tool ids. These are NOT part of ToolType —
// they live only inside the /studio workbench.
export type StudioToolId =
  | 'rotate'
  | 'crop'
  | 'text'
  | 'logo'
  | 'pencil'
  | 'heal'
  | 'cutout'
  | 'remove'
  | 'resize'

// Tools that paint / mask on the canvas get a "Clear" in their panel; the rest
// are pure-parameter transforms.
export const PAINT_TOOLS: StudioToolId[] = ['pencil', 'heal', 'cutout', 'remove', 'text', 'logo']

export interface StudioToolDef {
  id: StudioToolId
  labelKey: 'studioRotate' | 'studioCrop' | 'studioText' | 'studioLogo' | 'studioPencil' | 'studioHeal' | 'studioCutout' | 'studioRemove' | 'studioResize'
  icon: ReactNode
}

export const STUDIO_TOOLS: StudioToolDef[] = [
  {
    id: 'rotate',
    labelKey: 'studioRotate',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'crop',
    labelKey: 'studioCrop',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 002 2h14" />
        <path d="M18 22V8a2 2 0 00-2-2H2" />
        <rect x="7" y="7" width="10" height="10" rx="1.5" strokeDasharray="2.5 2" />
      </svg>
    ),
  },
  {
    id: 'text',
    labelKey: 'studioText',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5h14M12 5v14" />
        <path d="M9 19h6" />
      </svg>
    ),
  },
  {
    id: 'logo',
    labelKey: 'studioLogo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3.5s6 6.1 6 10a6 6 0 11-12 0c0-3.9 6-10 6-10z" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    ),
  },
  {
    id: 'pencil',
    labelKey: 'studioPencil',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
      </svg>
    ),
  },
  {
    id: 'heal',
    labelKey: 'studioHeal',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="8" rx="2" />
        <path d="M7 4l10 16" />
        <circle cx="17" cy="5" r="1.1" />
      </svg>
    ),
  },
  {
    id: 'cutout',
    labelKey: 'studioCutout',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="12" r="3.2" />
        <circle cx="18" cy="6" r="2.6" />
        <circle cx="18" cy="18" r="2.6" />
        <path d="M8.8 10.5l6.5-3.2M8.8 13.5l6.5 3.2" />
      </svg>
    ),
  },
  {
    id: 'remove',
    labelKey: 'studioRemove',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5s6 6.1 6 10a6 6 0 11-12 0c0-3.9 6-10 6-10z" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'resize',
    labelKey: 'studioResize',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 8h3M3 16h3M21 8h-3M21 16h-3M8 3v3M16 3v3M8 21v-3M16 21v-3" opacity="0.5" />
        <path d="M9 15l6-6M15 9h-3M15 9v3" />
      </svg>
    ),
  },
]
