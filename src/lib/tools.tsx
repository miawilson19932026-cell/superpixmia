import type { ReactNode } from 'react'
import type { ToolType } from '../types'

// Order used by the tool switcher and the help-side navigation.
export const TOOL_KEYS: ToolType[] = ['resize', 'compress', 'remove-bg', 'convert', 'watermark', 'crop', 'rotate']

// i18n key for each tool's display label.
export const toolLabelKey: Record<ToolType, string> = {
  resize: 'toolResize',
  compress: 'toolCompress',
  'remove-bg': 'toolRemoveBg',
  convert: 'toolConvert',
  watermark: 'toolWatermark',
  crop: 'toolCrop',
  rotate: 'toolRotate',
}

/* ── Gaming Icons (outline / filled) ── */
export const toolIcons: Record<ToolType, { outline: ReactNode; filled: ReactNode }> = {
  resize: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 8h3M3 16h3M21 8h-3M21 16h-3M8 3v3M16 3v3M8 21v-3M16 21v-3" opacity="0.5" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.12" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 8h5M3 16h5M21 8h-5M21 16h-5M8 3v5M16 3v5M8 21v-5M16 21v-5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  compress: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 14h8M8 11h6M8 17h4" />
        <path d="M17 5l2 2-2 2M7 19l-2-2 2-2" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.12" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <rect x="8" y="9" width="8" height="3" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="8" y="14" width="6" height="2.5" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="8" y="18.5" width="4" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <path d="M17 5l2 2-2 2M7 19l-2-2 2-2" />
      </svg>
    ),
  },
  'remove-bg': {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="3.5" />
        <path d="M6 20v-1.5a5.5 5.5 0 0110.5-2" />
        <path d="M18 14l2 2-2 2M20 16h-8" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="3.5" fill="currentColor" opacity="0.15" />
        <circle cx="12" cy="9" r="3.5" />
        <path d="M6 20v-1.5a5.5 5.5 0 0110.5-2" />
        <path d="M18 14l2 2-2 2M20 16h-8" />
        <circle cx="19" cy="5" r="1.2" fill="currentColor" opacity="0.6" />
        <path d="M19 3.5v3M17.5 5h3" strokeWidth={1} opacity="0.6" />
      </svg>
    ),
  },
  convert: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16l4-4 3 2 4-4 7 6" />
        <path d="M16 5l4 4-4 4M8 19l-4-4 4-4" opacity="0.5" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.12" />
        <text x="7" y="19" textAnchor="middle" fill="currentColor" fontSize="5" fontWeight="700" opacity="0.6">PNG</text>
        <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.15" />
        <text x="17" y="9" textAnchor="middle" fill="currentColor" fontSize="4.5" fontWeight="700">WEBP</text>
        <path d="M7 13V8a2 2 0 012-2h1M17 11v5a2 2 0 01-2 2h-1" />
        <path d="M6 10l2-2 2 2M16 14l2 2-2 2" />
      </svg>
    ),
  },
  watermark: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5s6 6.1 6 10a6 6 0 11-12 0c0-3.9 6-10 6-10z" />
        <path d="M9 14.5a3 3 0 003 3" opacity="0.6" />
        <path d="M8 9l2 2-2 2M16 9l-2 2 2 2" opacity="0.5" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5s6 6.1 6 10a6 6 0 11-12 0c0-3.9 6-10 6-10z" fill="currentColor" opacity="0.12" />
        <path d="M12 3.5s6 6.1 6 10a6 6 0 11-12 0c0-3.9 6-10 6-10z" />
        <text x="12" y="15" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="700">WM</text>
      </svg>
    ),
  },
  crop: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 002 2h14" />
        <path d="M18 22V8a2 2 0 00-2-2H2" />
        <path d="M6 6h-1M19 18v1" opacity="0.5" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 002 2h14" />
        <path d="M18 22V8a2 2 0 00-2-2H2" />
        <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.12" stroke="none" />
        <rect x="7" y="7" width="10" height="10" rx="1.5" strokeDasharray="2.5 2" opacity="0.7" />
      </svg>
    ),
  },
  rotate: {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        <circle cx="12" cy="12" r="2.5" opacity="0.5" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.15" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 10v4M10 12h4" opacity="0.6" />
      </svg>
    ),
  },
}
