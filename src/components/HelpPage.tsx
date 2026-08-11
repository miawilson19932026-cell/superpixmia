import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n'
import { useSeoMeta } from '../lib/useSeoMeta'
import { helpArticles, type HelpArticleData } from '../lib/help-articles'

// Feather-style helpers
const sectionIcons: Record<string, React.ReactNode> = {
  question: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.35-1 .9-1 1.7M12 17h.01" />
    </svg>
  ),
  lightbulb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7c-.8.6-1 1.5-1 2.3h-6c0-.8-.2-1.7-1-2.3A7 7 0 0 1 12 2z" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
}

const sectionIconKeys = ['question', 'lightbulb', 'wrench', 'list', 'info']

function useLang() {
  const { lang } = useTranslation()
  return lang
}

export function HelpHome() {
  useSeoMeta()
  const lang = useLang()
  const en = lang === 'en'

  return (
    <main className="flex-1 px-3 sm:px-6 py-8 sm:py-12 pb-24 sm:pb-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            {en ? 'Help Center' : '帮助中心'}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">{en ? 'Guides & Tutorials' : '使用指南与教程'}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--text-dim)]">
            {en
              ? 'Step-by-step guides for compressing images, removing backgrounds, resizing, and choosing the right format — everything runs in your browser.'
              : '压缩图片、去除背景、调整尺寸、选择正确格式的图文教程——所有处理都在你的浏览器内完成。'}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {helpArticles.map((article, i) => (
            <Link
              key={article.path}
              to={article.path}
              className="group relative rounded-2xl glass border border-white/[0.06] p-5 card-hover transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span className="glass-icon h-9 w-9 rounded-lg text-[var(--accent)]">
                {sectionIcons[sectionIconKeys[i % sectionIconKeys.length]]}
              </span>
              <h2 className="mt-3 text-base font-semibold leading-snug text-[var(--text-primary)]">
                {article.title[lang]}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)] line-clamp-3">
                {article.description[lang]}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                {en ? 'Read guide' : '阅读教程'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

export function HelpArticlePage({ data }: { data: HelpArticleData }) {
  useSeoMeta()
  const lang = useLang()
  const en = lang === 'en'

  return (
    <main className="flex-1 px-3 sm:px-6 py-8 sm:py-12 pb-24 sm:pb-6">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          <Link to="/" className="hover:text-[var(--text-primary)]">{en ? 'Home' : '首页'}</Link>
          <span className="opacity-50">/</span>
          <Link to="/help" className="hover:text-[var(--text-primary)]">{en ? 'Help' : '帮助中心'}</Link>
        </nav>

        {/* Title */}
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
          <span className="text-gradient">{data.title[lang]}</span>
        </h1>
        <p className="mt-3 text-sm text-[var(--text-dim)]">
          {en ? `Updated ${data.updated}` : `更新于 ${data.updated}`}
        </p>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--text-dim)]">
          {data.description[lang]}
        </p>

        {/* Sections */}
        <div className="mt-10 space-y-8">
          {data.sections.map((section, i) => (
            <section key={i} className="rounded-2xl glass border border-white/[0.06] p-5 sm:p-6">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-[var(--text-primary)]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/12 text-[var(--accent)]">
                  {sectionIcons[sectionIconKeys[i % sectionIconKeys.length]]}
                </span>
                {section.heading[lang]}
              </h2>
              <div className="mt-4 space-y-3">
                {section.body.map((p, j) => (
                  <p key={j} className="text-sm leading-relaxed text-[var(--text-dim)]">{p[lang]}</p>
                ))}
              </div>
              {section.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {section.bullets[lang].map((b, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--text-dim)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--accent)]">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* FAQ */}
        {data.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-[var(--text-primary)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/12 text-[var(--accent)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.35-1 .9-1 1.7M12 17h.01" />
                </svg>
              </span>
              {en ? 'Frequently Asked Questions' : '常见问题'}
            </h2>
            <div className="mt-5 space-y-3">
              {data.faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group glass rounded-xl border border-white/[0.06] overflow-hidden"
                  open={i === 0}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] list-none [&::-webkit-details-marker]:hidden">
                    <span>{faq.q[lang]}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[var(--text-dim)] transition-transform duration-200 group-open:rotate-180">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="border-t border-white/[0.06] px-4 py-3.5 text-sm leading-relaxed text-[var(--text-dim)]">
                    {faq.a[lang]}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related articles */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-dim)]">
            {en ? 'Related guides' : '相关教程'}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {helpArticles
              .filter((a) => a.path !== data.path)
              .map((a) => (
                <Link
                  key={a.path}
                  to={a.path}
                  className="group rounded-2xl glass border border-white/[0.06] p-4 card-hover transition-all duration-200"
                >
                  <h3 className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{a.title[lang]}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-dim)]">{a.description[lang]}</p>
                </Link>
              ))}
          </div>
        </section>

        {/* Back to tools */}
        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 btn-gradient text-sm font-semibold rounded-[var(--radius-md)]"
          >
            {en ? 'Start using the tools' : '立即使用工具'}
          </Link>
        </div>
      </div>
    </main>
  )
}
