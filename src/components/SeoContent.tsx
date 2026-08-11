import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n'
import type { ToolType } from '../types'
import { toolPaths, toolPathList } from '../lib/routes'
import {
  homeContent,
  toolContent,
  otherToolsLabels,
  helpArticleLinks,
} from '../lib/seo-content-data'

/**
 * Visible, indexable SEO content — bilingual (zh/en).
 *
 * Why it exists: the app renders as an SPA with almost no text, and the static
 * HTML carries HowTo / FAQPage structured data that Google only surfaces when
 * the questions and steps actually appear in visible page content. The text
 * below is the single source of truth shared with the JSON-LD generator.
 *
 * The homepage renders the all-tools overview; each tool page renders a focused
 * variant (tool headline + intro + HowTo + FAQ) plus cross-links to the other
 * tools and the help articles — internal links that pass SEO weight.
 */

// Feather-style inline icons per tool (mirrors the game-icon style used elsewhere)
const toolIcons: Record<string, React.ReactNode> = {
  resize: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
      <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  ),
  compress: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
      <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 13h8M8 9h5M8 17h3" />
    </svg>
  ),
  removeBg: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
      <path d="M4 4l16 16" /><circle cx="9" cy="9" r="4" /><path d="M13 13l5 5" />
    </svg>
  ),
  convert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
      <path d="M8 7h11M8 7l3-3M8 7l3 3" /><path d="M16 17H5M16 17l-3-3M16 17l-3 3" />
    </svg>
  ),
}

const toolKeyList: ToolType[] = ['resize', 'compress', 'remove-bg', 'convert']

const homeToolLabels: Record<'en' | 'zh', Record<ToolType, string>> = {
  en: {
    resize: 'Image Resizer',
    compress: 'Image Compressor',
    'remove-bg': 'AI Background Remover',
    convert: 'Image Format Converter',
  },
  zh: {
    resize: '图片改尺寸',
    compress: '图片压缩',
    'remove-bg': 'AI 抠图',
    convert: '图片格式转换',
  },
}

interface SeoContentProps {
  tool?: ToolType
}

export default function SeoContent({ tool }: SeoContentProps) {
  const { lang } = useTranslation()
  const en = lang === 'en'

  // Tool page: focused variant + cross-links. Home page: full overview.
  const content = tool ? toolContent[tool][lang] : homeContent[lang]

  return (
    <section aria-label={content.faqTitle} className="py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* ── Hero ── */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            {en ? 'Free · No Upload · 100% Local' : '免费 · 免上传 · 100% 本地'}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">
              {content.h1}
            </span>
            <span className="mt-1 block text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              {content.headline}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--text-dim)]">
            {content.intro}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--text-dim)]">
            <strong className="font-semibold text-[var(--text-primary)]">
              {en ? 'Privacy first — ' : '隐私优先 — '}
            </strong>
            {content.privacy}
          </p>
        </div>

        {/* ── Tools grid (home overview) / other-tools cross-links (tool pages) ── */}
        {tool ? (
          <div className="mt-12">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[var(--text-dim)]">
              {en ? 'Other free tools' : '其他免费工具'}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {toolPathList
                .filter((t) => t.tool !== tool)
                .map(({ tool: otherTool, path }) => (
                  <Link
                    key={otherTool}
                    to={path}
                    className="group relative rounded-2xl glass border border-white/[0.06] p-5 card-hover transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="glass-icon h-9 w-9 rounded-lg text-[var(--accent)]">
                        {toolIcons[otherTool]}
                      </span>
                      <h2 className="text-base font-semibold text-[var(--text-primary)]">
                        {otherToolsLabels[lang][otherTool]}
                      </h2>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        ) : (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {toolKeyList.map((key) => (
              <Link
                key={key}
                to={toolPaths[key]}
                className="group relative rounded-2xl glass border border-white/[0.06] p-5 card-hover transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="glass-icon h-9 w-9 rounded-lg text-[var(--accent)]">
                    {toolIcons[key]}
                  </span>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {homeToolLabels[lang][key]}
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">{toolContent[key][lang].intro}</p>
              </Link>
            ))}
          </div>
        )}

        {/* ── HowTo timeline ── */}
        <section className="mt-14">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-[var(--text-primary)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/12 text-[var(--accent)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 19h16M9 19V9l5-5 5 5v10" /><circle cx="12" cy="12" r="1.5" />
              </svg>
            </span>
            {content.howToTitle}
          </h2>
          <ol className="mt-5 space-y-0">
            {content.howToSteps.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {i < content.howToSteps.length - 1 && (
                  <span className="absolute left-[13px] top-8 bottom-0 w-px bg-gradient-to-b from-[var(--accent)]/40 to-transparent" />
                )}
                <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full glass-icon text-xs font-bold text-[var(--accent)]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="pt-1 text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-dim)]">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ accordion ── */}
        <section className="mt-14">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-[var(--text-primary)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/12 text-[var(--accent)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.35-1 .9-1 1.7M12 17h.01" />
              </svg>
            </span>
            {content.faqTitle}
          </h2>
          <div className="mt-5 space-y-3">
            {content.faqs.map((faq, i) => (
              <details
                key={faq.q}
                className="group glass rounded-xl border border-white/[0.06] overflow-hidden"
                open={i === 0}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <span className="text-[var(--accent)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M9 11l3 3 4-4" /><circle cx="12" cy="12" r="10" />
                      </svg>
                    </span>
                    {faq.q}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[var(--text-dim)] transition-transform duration-200 group-open:rotate-180">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="border-t border-white/[0.06] px-4 py-3.5 text-sm leading-relaxed text-[var(--text-dim)]">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Help articles (cross-links, tool pages only) ── */}
        {tool && (
          <section className="mt-14">
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-[var(--text-primary)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/12 text-[var(--accent)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
              </span>
              {en ? 'Learn more' : '了解更多'}
            </h2>
            <div className="mt-5 space-y-3">
              {helpArticleLinks[lang].map((a) => (
                <Link
                  key={a.path}
                  to={a.path}
                  className="group flex items-center justify-between gap-3 rounded-xl glass border border-white/[0.06] px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] card-hover transition-all duration-200"
                >
                  <span>{a.title}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[var(--text-dim)] transition-transform duration-200 group-hover:translate-x-0.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  )
}
