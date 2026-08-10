import { useTranslation } from '../i18n'

/**
 * Visible, indexable SEO content — bilingual (zh/en).
 *
 * Why it exists: the app renders as an SPA with almost no text, and index.html
 * carries HowTo / FAQPage structured data that Google only surfaces when the
 * questions and steps actually appear in visible page content. English FAQ
 * wording below matches the FAQPage JSON-LD in index.html verbatim.
 */
interface FAQ {
  q: string
  a: string
}

interface Content {
  intro: string
  privacy: string
  tools: { title: string; desc: string }[]
  howToTitle: string
  howToSteps: { title: string; desc: string }[]
  faqTitle: string
  faqs: FAQ[]
}

const content: Record<'en' | 'zh', Content> = {
  en: {
    intro:
      'SuperPixMia is a free, open-source, browser-based image toolkit. Resize, compress, remove backgrounds, and convert images between 9 formats — PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF — all processed 100% locally on your device.',
    privacy:
      'Unlike most online image tools, SuperPixMia never uploads your images. Everything runs in your browser with Canvas API and WebAssembly. No accounts, no ads, no watermarks, no hidden costs.',
    tools: [
      {
        title: 'Image Resizer',
        desc: 'Resize images to exact pixel dimensions with presets (OG image 1200×630, Instagram 1080×1080, favicon 32×32, and more) or custom width and height. Lock or unlock the aspect ratio for distortion-free scaling.',
      },
      {
        title: 'Image Compressor',
        desc: 'Reduce PNG, JPEG, WebP, and AVIF file size with a real-time quality slider. Watch the file size drop before you download, and compress up to 15 images in one batch.',
      },
      {
        title: 'AI Background Remover',
        desc: 'Remove image backgrounds with one click. AI segmentation runs entirely in your browser via WebAssembly — your photo never leaves your device. Preview against transparent, white, or black backgrounds.',
      },
      {
        title: 'Image Format Converter',
        desc: 'Convert between 9 image formats: PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF. Perfect for generating favicons, sharing to social media, or optimizing images for the web.',
      },
    ],
    howToTitle: 'How to compress an image online',
    howToSteps: [
      {
        title: 'Upload or drag your image',
        desc: 'Click the upload area or drag and drop any PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, or TIFF image into SuperPixMia.',
      },
      {
        title: 'Select the Compress tool',
        desc: 'Click the Compress tab in the toolbar. SuperPixMia automatically compresses the image as you adjust the quality slider between 1% and 100%.',
      },
      {
        title: 'Adjust quality and download',
        desc: 'Slide to your desired quality level. See the file size reduction in real time, then click Download to save your compressed image to your device.',
      },
    ],
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      {
        q: 'Is SuperPixMia really free?',
        a: 'Yes, SuperPixMia is completely free with no ads, no watermarks, and no hidden costs. All image processing runs locally in your browser.',
      },
      {
        q: 'Are my images uploaded to any server?',
        a: 'No. All image processing happens 100% in your browser using Canvas API, WebAssembly, and client-side compression libraries. Your images never leave your device.',
      },
      {
        q: 'What image formats does SuperPixMia support?',
        a: 'SuperPixMia supports 9 image formats: PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF. You can resize, compress, remove backgrounds, and convert between these formats.',
      },
      {
        q: 'Can I process multiple images at once?',
        a: 'Yes, SuperPixMia supports batch processing of up to 15 images simultaneously. You can resize, compress, or convert them all at once and download as a ZIP file.',
      },
      {
        q: 'How does the background remover work?',
        a: 'SuperPixMia uses AI-powered background removal that runs entirely in your browser via WebAssembly. No images are sent to external servers, ensuring complete privacy.',
      },
    ],
  },
  zh: {
    intro:
      'SuperPixMia 是一款免费、开源的浏览器图片工具箱。支持图片改尺寸、压缩、AI 抠图，以及 9 种格式互转（PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF）——所有处理 100% 在你的设备本地完成。',
    privacy:
      '和大多数在线图片工具不同，SuperPixMia 绝不把你的图片上传到任何服务器。所有处理都在浏览器内通过 Canvas API 和 WebAssembly 完成。无需注册、无广告、无水印、无隐藏收费。',
    tools: [
      {
        title: '图片改尺寸',
        desc: '按精确像素调整图片尺寸，内置常用预设（OG 图 1200×630、Instagram 1080×1080、图标 32×32 等），也支持自定义宽高。可锁定或解锁宽高比，避免图片变形。',
      },
      {
        title: '图片压缩',
        desc: '通过实时质量滑竿降低 PNG、JPEG、WebP、AVIF 文件体积。下载前即可看到体积变化，支持一次批量压缩最多 15 张图片。',
      },
      {
        title: 'AI 抠图',
        desc: '一键去除图片背景。AI 分割全程在你的浏览器内通过 WebAssembly 运行——照片绝不上传服务器。支持透明、白色、黑色背景预览。',
      },
      {
        title: '图片格式转换',
        desc: '支持 PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF 9 种格式互转。适合生成网站图标、分享到社交媒体，或为网页优化图片。',
      },
    ],
    howToTitle: '如何在线压缩图片',
    howToSteps: [
      {
        title: '上传或拖入图片',
        desc: '点击上传区域，或把任意 PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF 图片拖入 SuperPixMia。',
      },
      {
        title: '选择「压缩」工具',
        desc: '点击工具栏的「压缩」选项卡。拖动 1%~100% 的质量滑竿，SuperPixMia 会自动实时压缩图片。',
      },
      {
        title: '调节质量并下载',
        desc: '滑动到你满意的质量档位，实时查看文件体积减少情况，然后点击「下载」把压缩后的图片保存到本地。',
      },
    ],
    faqTitle: '常见问题',
    faqs: [
      {
        q: 'SuperPixMia 真的免费吗？',
        a: '是的，SuperPixMia 完全免费，无广告、无水印、无隐藏收费。所有图片处理都在你的浏览器本地完成。',
      },
      {
        q: '我的图片会被上传到服务器吗？',
        a: '不会。所有图片处理 100% 在浏览器内通过 Canvas API、WebAssembly 和客户端压缩库完成，你的图片绝不会离开你的设备。',
      },
      {
        q: 'SuperPixMia 支持哪些图片格式？',
        a: 'SuperPixMia 支持 9 种图片格式：PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF，可进行改尺寸、压缩、抠图和格式互转。',
      },
      {
        q: '可以一次处理多张图片吗？',
        a: '可以。SuperPixMia 支持最多 15 张图片的批量处理，可同时改尺寸、压缩或转换格式，并以 ZIP 压缩包形式下载。',
      },
      {
        q: '抠图功能是怎么实现的？',
        a: 'SuperPixMia 使用 AI 抠图技术，通过 WebAssembly 在浏览器内完整运行。图片不会发送到任何外部服务器，隐私完全有保障。',
      },
    ],
  },
}

export default function SeoContent() {
  const { lang } = useTranslation()
  const c = content[lang]
  const en = lang === 'en'

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

  return (
    <section aria-label={c.faqTitle} className="py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* ── Hero ── */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            {en ? 'Free · No Upload · 100% Local' : '免费 · 免上传 · 100% 本地'}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">
              {en ? 'SuperPixMia' : 'SuperPixMia'}
            </span>
            <span className="mt-1 block text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              {en ? 'Free Online Image Tools, in Your Browser' : '免费在线图片工具，全程浏览器本地处理'}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--text-dim)]">
            {c.intro}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--text-dim)]">
            <strong className="font-semibold text-[var(--text-primary)]">
              {en ? 'Privacy first — ' : '隐私优先 — '}
            </strong>
            {c.privacy}
          </p>
        </div>

        {/* ── Tools grid ── */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {c.tools.map((tool, i) => (
            <article
              key={tool.title}
              className="group relative rounded-2xl glass border border-white/[0.06] p-5 card-hover transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="glass-icon h-9 w-9 rounded-lg text-[var(--accent)]">
                  {toolIcons[['resize', 'compress', 'removeBg', 'convert'][i]]}
                </span>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{tool.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">{tool.desc}</p>
            </article>
          ))}
        </div>

        {/* ── HowTo timeline ── */}
        <section className="mt-14">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-[var(--text-primary)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/12 text-[var(--accent)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 19h16M9 19V9l5-5 5 5v10" /><circle cx="12" cy="12" r="1.5" />
              </svg>
            </span>
            {c.howToTitle}
          </h2>
          <ol className="mt-5 space-y-0">
            {c.howToSteps.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {i < c.howToSteps.length - 1 && (
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
            {c.faqTitle}
          </h2>
          <div className="mt-5 space-y-3">
            {c.faqs.map((faq, i) => (
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
      </div>
    </section>
  )
}
