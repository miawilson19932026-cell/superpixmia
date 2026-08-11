import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from './i18n'
import type { ToolType } from './types'
import ParticleBg from './components/ParticleBg'
import Header from './components/Header'
import ToolWorkspace from './components/ToolWorkspace'
import SeoContent from './components/SeoContent'
import { HelpHome, HelpArticlePage } from './components/HelpPage'
import { useSeoMeta } from './lib/useSeoMeta'
import { HOME_TOOL } from './lib/routes'
import { helpArticles } from './lib/help-articles'

// A tool page = focused tool workspace + its per-tool SEO content block.
// The workspace is the exact same component used on the homepage — only the
// focused tool and the SEO body differ.
function ToolPage({ tool }: { tool: ToolType }) {
  useSeoMeta()
  return (
    <>
      <ToolWorkspace activeTool={tool} />
      <SeoContent tool={tool} />
    </>
  )
}

function HomePage() {
  useSeoMeta()
  return (
    <>
      <ToolWorkspace activeTool={HOME_TOOL} />
      <SeoContent />
    </>
  )
}

export default function App() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col">
      <ParticleBg />
      <div className="scanlines" />

      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compress" element={<ToolPage tool="compress" />} />
        <Route path="/remove-bg" element={<ToolPage tool="remove-bg" />} />
        <Route path="/resize" element={<ToolPage tool="resize" />} />
        <Route path="/convert" element={<ToolPage tool="convert" />} />
        <Route path="/help" element={<HelpHome />} />
        {helpArticles.map((a) => (
          <Route key={a.path} path={a.path} element={<HelpArticlePage data={a} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <footer className="border-t border-[var(--border)] py-4 mt-auto">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-dim)]">
          <span>{t.footerPrivacy}</span>
          <span className="hidden sm:inline">·</span>
          <span>{t.footerNoServer}</span>
        </div>
      </footer>
    </div>
  )
}
