import { Link } from 'react-router-dom'
import { useSeoMeta } from '../lib/useSeoMeta'
import { blogArticles, type BlogArticleData } from '../lib/blog-articles'
import CatMascot from './CatMascot'
import { sectionIcons, sectionIconKeys, useLang, BackButton } from './HelpPage'

// Blog module — knowledge/education content ("how to do a task"), distinct from
// the help center ("how to use our tools"). Same rendering pipeline, separate
// URL space (/blog) so search intent stays clean.

// Category badge — first tag doubles as a lightweight category chip.
function CategoryChip({ article, lang }: { article: BlogArticleData; lang: 'en' | 'zh' }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
      {article.category[lang]}
    </span>
  )
}

export function BlogHome() {
  useSeoMeta()
  const lang = useLang()
  const en = lang === 'en'

  return (
    <main className="flex-1 px-3 sm:px-6 py-8 sm:py-12 pb-24 sm:pb-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <BackButton fallback="/" />
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            {en ? 'Blog' : '博客'}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">{en ? 'Image Tips & Tutorials' : '图片知识库'}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--text-dim)]">
            {en
              ? 'Practical, jargon-free answers to the image problems you actually run into — why photos come out blurry in WeChat, which format to pick, how to keep quality when compressing. Every tutorial links to a free tool that fixes it in your browser.'
              : '用大白话回答你真正会遇到的图片问题——微信发图为什么变糊、格式怎么选、压缩怎么不损画质。每篇教程都配一个浏览器里免费解决的工具。'}
          </p>
        </div>

        <div className="mt-10 space-y-5">
          {blogArticles.map((article) => (
            <Link
              key={article.path}
              to={article.path}
              className="group relative block rounded-2xl glass border border-white/[0.06] p-5 sm:p-6 card-hover transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
                <CategoryChip article={article} lang={lang} />
                <span className="opacity-60">{article.date}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                {article.title[lang]}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
                {article.description[lang]}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">
                    #{tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 btn-gradient text-sm font-semibold rounded-[var(--radius-md)]"
          >
            {en ? 'Browse the free tools' : '看看免费工具'}
          </Link>
        </div>
        <div className="flex justify-center pt-8 sm:pt-10">
          <CatMascot positionClass="relative block" />
        </div>
      </div>
    </main>
  )
}

export function BlogArticlePage({ data }: { data: BlogArticleData }) {
  useSeoMeta()
  const lang = useLang()
  const en = lang === 'en'
  const related = blogArticles.filter((a) => a.path !== data.path)

  return (
    <main className="flex-1 px-3 sm:px-6 py-8 sm:py-12 pb-24 sm:pb-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <BackButton fallback="/blog" />
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          <Link to="/" className="hover:text-[var(--text-primary)]">{en ? 'Home' : '首页'}</Link>
          <span className="opacity-50">/</span>
          <Link to="/blog" className="hover:text-[var(--text-primary)]">{en ? 'Blog' : '博客'}</Link>
        </nav>

        {/* Title + meta */}
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
          <span className="text-gradient">{data.title[lang]}</span>
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
          <CategoryChip article={data} lang={lang} />
          <span className="opacity-60">{data.date}</span>
        </div>
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

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-dim)]">
              {en ? 'More from the blog' : '更多博客文章'}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((a) => (
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
        )}

        {/* Back to tools */}
        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 btn-gradient text-sm font-semibold rounded-[var(--radius-md)]"
          >
            {en ? 'Fix your image now — free' : '现在就免费解决图片问题'}
          </Link>
        </div>
        <div className="flex justify-center pt-8 sm:pt-10">
          <CatMascot positionClass="relative block" />
        </div>
      </div>
    </main>
  )
}
