// Builds the JSON-LD <script> blocks for each route.
//
// Pure data + no Node APIs, so it can run in three places:
//   - the prerender script (bakes English structured data into each static page)
//   - Vercel Edge Middleware (injects Chinese structured data for zh users)
//   - the SPA itself, if we ever need to re-render after navigation
//
// Text comes from seo-content-data.ts — the SAME strings rendered visibly in
// SeoContent.tsx, so FAQ questions and HowTo steps always match visible content.
import type { ToolType } from '../types'
import { homeContent, toolContent, studioContent, gifMakerContent } from './seo-content-data'
import { helpArticles } from './help-articles'
import { blogArticles } from './blog-articles'
import { getRouteSeo } from './seo'

const SITE = 'https://www.superpixmia.com'

const toolNames: Record<ToolType, { en: string; zh: string }> = {
  compress: {
    en: 'SuperPixMia Online Image Compressor',
    zh: 'SuperPixMia 在线图片压缩工具',
  },
  'remove-bg': {
    en: 'SuperPixMia Online AI Background Remover',
    zh: 'SuperPixMia 在线 AI 抠图工具',
  },
  resize: {
    en: 'SuperPixMia Online Image Resizer',
    zh: 'SuperPixMia 在线图片改尺寸工具',
  },
  convert: {
    en: 'SuperPixMia Online Image Format Converter',
    zh: 'SuperPixMia 在线图片格式转换工具',
  },
  'remove-watermark': {
    en: 'SuperPixMia Online Image Watermark Remover',
    zh: 'SuperPixMia 在线去水印工具',
  },
}

const toolHowToName: Record<ToolType, { en: string; zh: string }> = {
  compress: { en: 'How to Compress Images Online with SuperPixMia', zh: '如何用 SuperPixMia 在线压缩图片' },
  'remove-bg': { en: 'How to Remove Image Backgrounds Online with SuperPixMia', zh: '如何用 SuperPixMia 在线去除图片背景' },
  resize: { en: 'How to Resize Images Online with SuperPixMia', zh: '如何用 SuperPixMia 在线调整图片尺寸' },
  convert: { en: 'How to Convert Image Formats Online with SuperPixMia', zh: '如何用 SuperPixMia 在线转换图片格式' },
  'remove-watermark': { en: 'How to Remove a Watermark from an Image Online with SuperPixMia', zh: '如何用 SuperPixMia 在线去除图片水印' },
}

const toolKeywords: Record<ToolType, { en: string[]; zh: string[] }> = {
  compress: { en: ['compress', 'image compression'], zh: ['压缩', '图片压缩'] },
  'remove-bg': { en: ['remove background', 'background removal'], zh: ['抠图', '去除背景'] },
  resize: { en: ['resize', 'image dimensions'], zh: ['改尺寸', '调整尺寸'] },
  convert: { en: ['convert', 'format conversion'], zh: ['转换', '格式互转'] },
  'remove-watermark': { en: ['remove watermark', 'erase watermark'], zh: ['去水印', '去除水印', '清除水印'] },
}

function organizationLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SuperPixMia',
    url: `${SITE}/`,
    logo: `${SITE}/logo.png`,
    description:
      'Free online image toolkit — resize, compress, remove backgrounds, and convert images 100% in your browser.',
    foundingDate: '2026',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://github.com/miawilson19932026-cell/superpixmia',
    },
  }
}

function softwareLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SuperPixMia',
    url: `${SITE}/`,
    description:
      'Free online image toolkit for developers and designers. Resize, compress, remove backgrounds, and convert images between 9 formats — all processed 100% in your browser.',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    browserRequirements: 'Requires JavaScript. Works in all modern browsers.',
    featureList: [
      'Image resizing with aspect ratio lock and presets',
      'Image compression with quality control',
      'AI background removal',
      'Format conversion (PNG, JPEG, WebP, AVIF, BMP, ICO)',
      'Batch processing up to 15 images',
      '100% client-side processing — images never leave your device',
      'Drag and drop, paste, or click to upload',
      'Mobile responsive design',
    ],
    author: { '@type': 'Organization', name: 'SuperPixMia' },
  }
}

function breadcrumbLd(pathname: string): object {
  const seo = getRouteSeo(pathname)
  const label = seo.en.title.split(' — ')[0].split(' | ')[0].trim()
  const items = [
    { '@type': 'ListItem', position: 1, name: 'SuperPixMia', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: label, item: `${SITE}${pathname === '/' ? '' : pathname}` },
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

function howToLd(tool: ToolType): object {
  const c = toolContent[tool].en
  const seo = getRouteSeo(`/${tool}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: toolHowToName[tool].en,
    description: seo.en.description,
    totalTime: 'PT30S',
    tool: { '@type': 'HowToTool', name: toolNames[tool].en },
    step: c.howToSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  }
}

function faqLd(faqs: { q: string; a: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

function articleLd(pathname: string, title: string, description: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: { '@type': 'Organization', name: 'SuperPixMia' },
    publisher: { '@type': 'Organization', name: 'SuperPixMia', logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    mainEntityOfPage: `${SITE}${pathname}`,
    image: `${SITE}/og-image.jpg`,
  }
}

export function toolPageLd(tool: ToolType): object[] {
  const blocks: object[] = [organizationLd(), softwareLd(), breadcrumbLd(`/${tool}`), howToLd(tool)]
  blocks.push(faqLd(toolContent[tool].en.faqs))
  return blocks
}

export function homePageLd(): object[] {
  const blocks: object[] = [organizationLd(), softwareLd(), breadcrumbLd('/'), howToLd('compress')]
  blocks.push(faqLd(homeContent.en.faqs))
  return blocks
}

export function articlePageLd(pathname: string, title: string, description: string): object[] {
  return [organizationLd(), softwareLd(), breadcrumbLd(pathname), articleLd(pathname, title, description)]
}

const studioHowToName = {
  en: 'How to Edit an Image Online with SuperPixMia Studio',
  zh: '如何用 SuperPixMia Studio 在线编辑图片',
}

// /studio — the combined single-image editor. FAQ + HowTo text comes from the
// SAME studioContent strings rendered visibly on the page (single source of
// truth), so Google's rich results always match the visible content.
export function editorPageLd(): object[] {
  const c = studioContent.en
  return [
    organizationLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SuperPixMia Studio',
      url: `${SITE}/studio`,
      description:
        'Free single-image editor in your browser — rotate, crop, add draggable text, stamp a logo, draw with a pencil, erase watermarks, cut out subjects, and resize. 100% client-side, no layers, no design tools needed.',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Rotate, flip, and free-angle rotation',
        'Crop with a draggable selection box',
        'Draggable text overlay',
        'Logo stamp',
        'Freehand pencil drawing',
        'Brush watermark removal',
        'Manual cutout and click-to-remove background',
        'Resize with aspect ratio lock',
        'Undo history',
        '100% client-side — images never leave your device',
      ],
    },
    breadcrumbLd('/studio'),
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: studioHowToName.en,
      description: c.intro,
      totalTime: 'PT1M',
      tool: { '@type': 'HowToTool', name: 'SuperPixMia Studio' },
      step: c.howToSteps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: s.desc,
      })),
    },
    faqLd(c.faqs),
  ]
}

// Chinese HowTo + FAQPage for /studio — injected by the Edge middleware for
// Chinese users and the Baidu spider.
export function zhStudioLd(): { howTo: object; faq: object } {
  const c = studioContent.zh
  const howTo: object = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: studioHowToName.zh,
    description: c.intro,
    totalTime: 'PT1M',
    tool: { '@type': 'HowToTool', name: 'SuperPixMia 全能编辑 Studio' },
    step: c.howToSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  }
  return { howTo, faq: faqLd(c.faqs) }
}

const gifMakerHowToName = {
  en: 'How to Make an Animated GIF Online with SuperPixMia GIF Maker',
  zh: '如何用 SuperPixMia GIF 合成器制作动图',
}

// /gif-maker — the multi-frame GIF assembler. FAQ + HowTo text comes from the
// SAME gifMakerContent strings rendered visibly on the page (single source of
// truth), mirroring how /studio builds its structured data.
export function gifMakerPageLd(): object[] {
  const c = gifMakerContent.en
  return [
    organizationLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SuperPixMia GIF Maker',
      url: `${SITE}/gif-maker`,
      description: c.intro,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Turn multiple images into an animated GIF',
        'Transparent PNG frames keep their transparency',
        'Frame rate control from 1 to 30 fps',
        'Infinite loop or play once',
        'Smart downscaling to keep files light',
        'Up to 30 frames',
        '100% client-side — frames never leave your device',
      ],
    },
    breadcrumbLd('/gif-maker'),
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: gifMakerHowToName.en,
      description: c.intro,
      totalTime: 'PT1M',
      tool: { '@type': 'HowToTool', name: 'SuperPixMia GIF Maker' },
      step: c.howToSteps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: s.desc,
      })),
    },
    faqLd(c.faqs),
  ]
}

// Chinese HowTo + FAQPage for /gif-maker — injected by the Edge middleware for
// Chinese users and the Baidu spider.
export function zhGifMakerLd(): { howTo: object; faq: object } {
  const c = gifMakerContent.zh
  const howTo: object = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: gifMakerHowToName.zh,
    description: c.intro,
    totalTime: 'PT1M',
    tool: { '@type': 'HowToTool', name: 'SuperPixMia GIF 合成器' },
    step: c.howToSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  }
  return { howTo, faq: faqLd(c.faqs) }
}

export function zhArticleLd(pathname: string): object | null {
  const article = [...helpArticles, ...blogArticles].find((a) => a.path === pathname)
  if (!article) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title.zh,
    description: article.description.zh,
    author: { '@type': 'Organization', name: 'SuperPixMia' },
    publisher: { '@type': 'Organization', name: 'SuperPixMia', logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    mainEntityOfPage: `${SITE}${pathname}`,
    image: `${SITE}/og-image.jpg`,
  }
}

export function ldToScript(block: object): string {
  return `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`
}

// For the middleware: Chinese JSON-LD variants of a tool's HowTo + FAQPage.
export function zhToolLd(tool: ToolType): { howTo: object; faq: object } {
  const c = toolContent[tool].zh
  const howTo: object = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: toolHowToName[tool].zh,
    description: c.intro,
    totalTime: 'PT30S',
    tool: { '@type': 'HowToTool', name: toolNames[tool].zh },
    step: c.howToSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  }
  return { howTo, faq: faqLd(c.faqs) }
}

export function zhHomeFaqLd(): object {
  return faqLd(homeContent.zh.faqs)
}

// Unused in the middleware for now, but kept so the article/prerender story is
// symmetric. Keyword lists are handy for tool pages if we ever add keyword meta
// per tool beyond seo.ts.
export { toolKeywords, toolNames }
