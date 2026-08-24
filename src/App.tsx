import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from './i18n'
import type { ToolType } from './types'
import ParticleBg from './components/ParticleBg'
import Header from './components/Header'
import ToolWorkspace from './components/ToolWorkspace'
import SeoContent from './components/SeoContent'
import { HelpHome, HelpArticlePage } from './components/HelpPage'
import { BlogHome, BlogArticlePage } from './components/BlogPage'
import { useSeoMeta } from './lib/useSeoMeta'
import { HOME_TOOL, EDITOR_PATH } from './lib/routes'
import { helpArticles } from './lib/help-articles'
import { blogArticles } from './lib/blog-articles'
// Heavy pages load on demand (route-level code splitting): the Studio editor,
// animation maker, and profile only ship their JS when actually visited. Keeps
// the first screen light. prerender.mjs waits for all lazy chunks (allReady).
const EditorPage = lazy(() => import('./components/studio/EditorPage'))
const GifMakerPage = lazy(() => import('./components/GifMakerPage'))
const ProfilePage = lazy(() => import('./components/ProfilePage'))

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

// Scroll to top on every route change — SPA navigation doesn't reset scroll
// position by default, so CTA links (e.g. help → home) would land mid-page.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { t, lang } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <ParticleBg />
      <div className="scanlines" />

      <Header />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24 text-sm text-[var(--text-dim)]">…</div>
        }
      >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compress" element={<ToolPage tool="compress" />} />
        <Route path="/remove-bg" element={<ToolPage tool="remove-bg" />} />
        <Route path="/resize" element={<ToolPage tool="resize" />} />
        <Route path="/convert" element={<ToolPage tool="convert" />} />
        <Route path="/remove-watermark" element={<ToolPage tool="remove-watermark" />} />
        <Route path={EDITOR_PATH} element={<EditorPage />} />
        <Route path="/gif-maker" element={<GifMakerPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpHome />} />
        {helpArticles.map((a) => (
          <Route key={a.path} path={a.path} element={<HelpArticlePage data={a} />} />
        ))}
        <Route path="/blog" element={<BlogHome />} />
        {blogArticles.map((a) => (
          <Route key={a.path} path={a.path} element={<BlogArticlePage data={a} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

      <footer className="border-t border-[var(--border)] py-4 mt-auto">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-dim)]">
          <span>{t.footerPrivacy}</span>
          <span className="flex items-center gap-3">
            <Link to="/blog" className="hover:text-[var(--text-primary)] transition-colors">{lang === 'zh' ? '博客' : 'Blog'}</Link>
            <Link to="/help" className="hover:text-[var(--text-primary)] transition-colors">{lang === 'zh' ? '帮助' : 'Help'}</Link>
          </span>
          <span>{t.footerNoServer}</span>
        </div>
      </footer>
    </div>
  )
}
