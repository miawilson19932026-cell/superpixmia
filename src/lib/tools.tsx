import type { ReactNode } from 'react'
import type { ToolType } from '../types'

// ── AI coming-soon cards ──
// Shared by the homepage nav grid (ToolWorkspace) AND the mobile drawer
// (Header) so both entry points stay in sync. They render with a distinct
// dashed orange style and show a "coming soon" toast instead of navigating.
export const aiGenNavIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="15" height="15" rx="2" />
    <path d="M3 15l4-4 3 2.5 3.5-3.5 4.5 4" />
    <path d="M19 2.5V6M17.25 4.25h3.5" />
    <path d="M21 15v3M19.5 16.5h3" />
  </svg>
)
export const aiFactoryNavIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M4 21V10l4 3v-3l4 3v-3l4 3v-3l4 3v11" />
    <path d="M8 10V5" />
    <path d="M6 4l2 2-2 2" />
    <path d="M20 10V7" />
    <path d="M18 6l2 2-2 2" />
  </svg>
)
export const AI_COMING_ITEMS: { id: string; icon: ReactNode; labelZh: string; labelEn: string }[] = [
  { id: 'ai-gen', icon: aiGenNavIcon, labelZh: 'AI 生图', labelEn: 'AI Image' },
  { id: 'ai-factory', icon: aiFactoryNavIcon, labelZh: '图片工厂', labelEn: 'Image Factory' },
]

// Order used by the tool switcher and the help-side navigation.
// crop / rotate / watermark moved into the /studio editor (2026-08-14).
export const TOOL_KEYS: ToolType[] = ['resize', 'compress', 'remove-bg', 'convert', 'remove-watermark']

// i18n key for each tool's display label.
export const toolLabelKey: Record<ToolType, string> = {
  resize: 'toolResize',
  compress: 'toolCompress',
  'remove-bg': 'toolRemoveBg',
  convert: 'toolConvert',
  'remove-watermark': 'toolRemoveWatermark',
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
  'remove-watermark': {
    outline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="8" rx="2" />
        <path d="M7 4l10 16" />
        <circle cx="17" cy="5" r="1.1" opacity="0.55" />
      </svg>
    ),
    filled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="8" rx="2" fill="currentColor" opacity="0.12" />
        <rect x="4" y="8" width="16" height="8" rx="2" />
        <path d="M7 4l10 16" strokeWidth={3.2} opacity="0.25" />
        <path d="M7 4l10 16" />
      </svg>
    ),
  },
}
