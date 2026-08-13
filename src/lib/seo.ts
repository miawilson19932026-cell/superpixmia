// Per-route SEO metadata — drives client-side <title>/<meta> updates (useSeoMeta),
// the prerender step, and Vercel Edge Middleware for Chinese users.
//
// Keep the FAQ/HowTo wording here aligned with the visible content rendered in
// SeoContent.tsx and the help articles — Google surfaces rich results only when
// the same text appears in visible DOM.

import { blogArticles } from './blog-articles'

export interface SeoMeta {
  title: string
  description: string
  keywords: string
}

export interface RouteSeo {
  en: SeoMeta
  zh: SeoMeta
  canonical: string
  ogTitle: string
  ogDescription: string
}

const SITE = 'https://www.superpixmia.com'

export const SEO_ROUTES: Record<string, RouteSeo> = {
  '/': {
    en: {
      title: 'SuperPixMia — Free Online Image Tools | Resize, Compress, Remove Background, Convert',
      description:
        'SuperPixMia is a free online image toolkit for developers & designers. Resize, compress, remove backgrounds, and convert images between 9 formats — all processed 100% in your browser. No upload, no ads, no watermarks.',
      keywords:
        'image tools, online image editor, free image tools, resize image, compress image, remove background, convert image format',
    },
    zh: {
      title: 'SuperPixMia — 免费在线图片工具 | 图片压缩、AI抠图、格式转换',
      description:
        'SuperPixMia 免费在线图片处理工具，支持图片压缩、AI 抠图、格式转换、改尺寸。纯浏览器端处理，无需上传，100% 保护隐私。支持 9 种图片格式。',
      keywords: '图片工具,图片压缩,在线抠图,AI抠图,图片格式转换,图片改尺寸,免费在线压缩',
    },
    canonical: `${SITE}/`,
    ogTitle: 'SuperPixMia — Free Online Image Tools',
    ogDescription: 'Resize, compress, remove backgrounds, and convert images between 9 formats — all in your browser. No upload, no ads, 100% private.',
  },
  '/compress': {
    en: {
      title: 'Free Image Compressor — Compress PNG, JPEG, WebP & AVIF Online',
      description:
        'Compress PNG, JPEG, WebP, and AVIF images online for free. Adjust quality with a live slider, watch file size drop before you download, and batch compress up to 15 images — 100% in your browser, no upload.',
      keywords: 'compress image, image compressor, png compressor, jpeg compressor, webp compressor, avif, compress photo online, reduce image size',
    },
    zh: {
      title: '图片压缩 - 在线压缩 PNG/JPEG/WebP/AVIF，免费免上传',
      description:
        '免费在线图片压缩工具，支持 PNG、JPEG、WebP、AVIF 格式。实时质量滑竿调节，下载前即可看到文件体积变化，支持批量压缩最多 15 张。浏览器本地处理，无需上传。',
      keywords: '图片压缩,PNG压缩,JPEG压缩,WebP压缩,图片体积缩小,在线压缩图片,免费图片压缩',
    },
    canonical: `${SITE}/compress`,
    ogTitle: 'Free Image Compressor — Compress PNG, JPEG, WebP & AVIF',
    ogDescription: 'Compress images online for free. Live quality slider, real-time size preview, batch up to 15 images. 100% in your browser, no upload.',
  },
  '/remove-bg': {
    en: {
      title: 'Free AI Background Remover — Remove Image Background Online',
      description:
        'Remove image backgrounds with one click using AI. Runs entirely in your browser via WebAssembly — your photo never leaves your device. Preview against transparent, white, or black backgrounds. Free, no upload.',
      keywords: 'remove background, background remover, transparent background, AI background removal, cut out image, erase background, png transparent',
    },
    zh: {
      title: 'AI 抠图 - 在线去除图片背景，免费免上传',
      description:
        '免费 AI 抠图工具，一键去除图片背景。AI 分割全程在浏览器内通过 WebAssembly 运行，照片绝不上传服务器。支持透明、白色、黑色背景预览。',
      keywords: 'AI抠图,去背景,在线抠图,图片去底,透明背景,抠图工具,免上传抠图',
    },
    canonical: `${SITE}/remove-bg`,
    ogTitle: 'Free AI Background Remover — Remove Image Background Online',
    ogDescription: 'Remove image backgrounds with one click. AI runs entirely in your browser — no upload, no watermarks. Free.',
  },
  '/resize': {
    en: {
      title: 'Free Image Resizer — Resize Images Online to Exact Dimensions',
      description:
        'Resize images online to exact pixel dimensions. Built-in presets for OG image (1200×630), Instagram, favicon, and more, or set custom width and height. Lock aspect ratio for distortion-free scaling. Free, no upload.',
      keywords: 'resize image, image resizer, resize photo, image dimensions, og image size, instagram size, favicon size',
    },
    zh: {
      title: '图片改尺寸 - 在线调整图片尺寸到精确像素',
      description:
        '免费在线图片改尺寸工具，按精确像素调整图片大小。内置 OG 图 1200×630、Instagram 1080×1080、图标 32×32 等预设，也支持自定义宽高。可锁定宽高比，避免变形。',
      keywords: '图片改尺寸,图片缩放,在线调整尺寸,OG图尺寸,Instagram尺寸,图片像素调整',
    },
    canonical: `${SITE}/resize`,
    ogTitle: 'Free Image Resizer — Resize Images Online',
    ogDescription: 'Resize images to exact pixel dimensions with presets or custom sizes. Lock aspect ratio. Free, no upload.',
  },
  '/convert': {
    en: {
      title: 'Free Image Converter — Convert PNG, JPEG, WebP, AVIF, GIF, SVG & ICO Online',
      description:
        'Convert images between 9 formats — PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF — online for free. Perfect for favicons, social media, or web optimization. Batch convert up to 15 images. No upload.',
      keywords: 'image converter, convert png to jpeg, convert webp, avif converter, png to ico, favicon generator, format converter',
    },
    zh: {
      title: '图片格式转换 - 在线 PNG/JPEG/WebP/AVIF/ICO 互转',
      description:
        '免费在线图片格式转换工具，支持 PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF 9 种格式互转。适合生成网站图标、分享社交媒体或网页图片优化。支持批量转换。',
      keywords: '图片格式转换,PNG转JPEG,WebP转换,AVIF转换,PNG转ICO,favicon生成,格式互转',
    },
    canonical: `${SITE}/convert`,
    ogTitle: 'Free Image Converter — Convert PNG, JPEG, WebP & More',
    ogDescription: 'Convert images between 9 formats online for free. Perfect for favicons, social media, or web optimization. No upload.',
  },
  '/watermark': {
    en: {
      title: 'Free Online Watermark Maker — Add Text or Logo Watermark to Images',
      description:
        'Add a text or logo watermark to your images online for free. Choose any of 9 corner positions or tile the watermark across the whole image, adjust opacity and size, and protect your photos before sharing — 100% in your browser, no upload.',
      keywords: 'add watermark, watermark image, image watermark, text watermark, logo watermark, protect photos, watermark maker, batch watermark',
    },
    zh: {
      title: '图片加水印 - 在线添加文字或 Logo 水印，免费免上传',
      description:
        '免费在线图片加水印工具，支持文字水印和 Logo 水印。可选择任意角落位置或平铺整张图片，自由调节不透明度与大小。分享前保护你的照片版权。浏览器本地处理，无需上传。',
      keywords: '图片加水印,水印工具,文字水印,Logo水印,图片防盗,加水印防转载,批量加水印',
    },
    canonical: `${SITE}/watermark`,
    ogTitle: 'Free Online Watermark Maker — Add Text or Logo Watermark',
    ogDescription: 'Add a text or logo watermark to images online for free. Corner or tiled, adjustable opacity and size. 100% in your browser, no upload.',
  },
  '/remove-watermark': {
    en: {
      title: 'Free Online Watermark Remover — Erase Watermarks, Stamps & Text',
      description:
        'Remove watermarks, stamps, logos, and stray text from images online for free. Paint over the mark with a brush and the tool rebuilds the covered area from the surrounding pixels. Works great on flat and light backgrounds. 100% in your browser, no upload, no per-image limit.',
      keywords: 'remove watermark, watermark remover, erase watermark, remove stamp, remove text from image, clean image online',
    },
    zh: {
      title: '在线去水印 - 免费去除图片水印，涂抹即可',
      description:
        '免费在线去水印工具。用笔刷涂抹覆盖水印、印章或多余文字，工具自动用周围像素把覆盖区域补全，自然融入背景。适合清理截图、下载的图片。纯浏览器处理，免上传，不限张数。',
      keywords: '去水印,在线去水印,去除水印,图片去水印,清除水印,去印章,去图片上的文字',
    },
    canonical: `${SITE}/remove-watermark`,
    ogTitle: 'Free Online Watermark Remover — Erase Watermarks & Text',
    ogDescription: 'Paint over a watermark with a brush and it\'s rebuilt from the surrounding pixels. Free, 100% in your browser, no upload.',
  },
  '/crop': {
    en: {
      title: 'Free Online Image Cropper — Crop Photos to Any Size or Ratio',
      description:
        'Crop images online for free with a draggable selection box. Pick a preset ratio — 1:1, 4:3, 3:4, 16:9, or 9:16 — or crop freely, then download without any quality loss. Perfect for social media, thumbnails, and profile photos. 100% in your browser, no upload.',
      keywords: 'crop image, image cropper, crop photo, crop to 1:1, 16:9 crop, crop picture online, free photo cropper',
    },
    zh: {
      title: '图片裁剪 - 在线自由裁剪图片比例，免费免上传',
      description:
        '免费在线图片裁剪工具，用可拖拽选框自由选择保留区域。内置 1:1、4:3、3:4、16:9、9:16 常用比例，适合发朋友圈、小红书、视频封面和头像，也支持自由裁剪。无损输出，浏览器本地处理。',
      keywords: '图片裁剪,裁剪图片,在线裁剪,1:1裁剪,16:9裁剪,照片裁剪,免费裁剪工具',
    },
    canonical: `${SITE}/crop`,
    ogTitle: 'Free Online Image Cropper — Crop Photos to Any Ratio',
    ogDescription: 'Crop images online for free with a draggable box. Preset ratios for social media or free crop, no quality loss. 100% in your browser.',
  },
  '/rotate': {
    en: {
      title: 'Free Online Image Rotator — Rotate, Flip & Straighten Photos',
      description:
        'Rotate images online for free — 90° clockwise or counterclockwise, 180°, or any angle with a fine-tune slider to straighten tilted photos. Mirror left-right or top-bottom. All processed in your browser, no upload, no quality loss.',
      keywords: 'rotate image, image rotator, flip image, mirror photo, straighten photo, rotate photo online, flip horizontal, flip vertical',
    },
    zh: {
      title: '图片旋转 - 在线旋转、翻转照片，免费免上传',
      description:
        '免费在线图片旋转工具：一键顺时针/逆时针 90°、180°，或拖动滑竿任意角度微调，把拍歪的照片转正。支持水平/垂直镜像翻转。浏览器本地处理，无损，无需上传。',
      keywords: '图片旋转,旋转图片,照片翻转,镜像,水平翻转,垂直翻转,照片转正,免费旋转工具',
    },
    canonical: `${SITE}/rotate`,
    ogTitle: 'Free Online Image Rotator — Rotate, Flip & Straighten Photos',
    ogDescription: 'Rotate images 90° or any angle to straighten photos, and mirror left-right or top-bottom. 100% in your browser, no upload.',
  },
  '/help': {
    en: {
      title: 'Help Center — SuperPixMia Guides & Tutorials',
      description:
        'Learn how to compress images, remove backgrounds, resize, and convert formats with SuperPixMia. Step-by-step guides, format comparisons, and best practices.',
      keywords: 'image tips, compress guide, remove background guide, png compression, image formats',
    },
    zh: {
      title: '帮助中心 - SuperPixMia 使用指南与教程',
      description:
        '学习如何使用 SuperPixMia 压缩图片、去除背景、调整尺寸和转换格式。图文教程、格式对比、实用技巧。',
      keywords: '图片教程,压缩指南,抠图教程,PNG压缩,图片格式对比',
    },
    canonical: `${SITE}/help`,
    ogTitle: 'Help Center — SuperPixMia Guides & Tutorials',
    ogDescription: 'Step-by-step guides for compressing, removing backgrounds, resizing, and converting images.',
  },
  '/help/how-to-remove-bg': {
    en: {
      title: 'How to Remove Image Background Free Online — Step-by-Step Guide',
      description:
        'Remove image backgrounds for free in your browser. A step-by-step guide to the best methods — AI background removal, manual selection, and when each works best.',
      keywords: 'how to remove background, remove background guide, transparent background tutorial',
    },
    zh: {
      title: '如何免费在线抠图去背景 — 完整教程',
      description:
        '免费在线去除图片背景的完整教程。介绍 AI 抠图、手动选区等方法的原理、适用场景和详细步骤，附常见问题。',
      keywords: '抠图教程,去背景教程,在线抠图方法,透明背景教程',
    },
    canonical: `${SITE}/help/how-to-remove-bg`,
    ogTitle: 'How to Remove Image Background Free Online',
    ogDescription: 'A step-by-step guide to removing image backgrounds for free in your browser.',
  },
  '/help/png-compression-guide': {
    en: {
      title: 'PNG Compression Guide — How to Shrink PNG File Size Without Losing Quality',
      description:
        'Learn how PNG compression works, when it loses quality, and the fastest ways to shrink PNG file size — color depth, lossy WebP, and browser-based tools that keep your images private.',
      keywords: 'png compression, reduce png size, png vs webp, lossless compression',
    },
    zh: {
      title: 'PNG 压缩完全指南 — 无损减小 PNG 文件体积',
      description:
        '详解 PNG 压缩原理：什么时候会损失画质、如何无损减小文件体积、PNG 与 WebP 对比，以及如何在浏览器本地安全压缩 PNG 图片。',
      keywords: 'PNG压缩,PNG体积缩小,PNG转WebP,无损压缩',
    },
    canonical: `${SITE}/help/png-compression-guide`,
    ogTitle: 'PNG Compression Guide — Shrink PNG Size Without Losing Quality',
    ogDescription: 'How PNG compression works, when it loses quality, and the fastest ways to shrink PNG file size.',
  },
  '/help/image-formats-comparison': {
    en: {
      title: 'Image Formats Compared — PNG vs JPEG vs WebP vs AVIF',
      description:
        'A practical comparison of PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF — when to use each, size vs quality tradeoffs, and browser support.',
      keywords: 'image formats, png vs jpeg, webp vs png, avif, best image format',
    },
    zh: {
      title: '图片格式对比 — PNG、JPEG、WebP、AVIF 怎么选',
      description:
        'PNG、JPEG、WebP、AVIF、GIF、SVG、ICO、TIFF 九种图片格式的实用对比：各自优缺点、适用场景、体积与画质权衡、浏览器兼容性。',
      keywords: '图片格式,PNG和JPEG对比,WebP,AVIF,最佳图片格式',
    },
    canonical: `${SITE}/help/image-formats-comparison`,
    ogTitle: 'Image Formats Compared — PNG vs JPEG vs WebP vs AVIF',
    ogDescription: 'A practical comparison of image formats: when to use each, size vs quality tradeoffs, browser support.',
  },
  '/help/resize-image-guide': {
    en: {
      title: 'How to Resize an Image Online — Keep Quality & Proportions',
      description:
        'Learn how to resize images online without losing quality — pixel dimensions, aspect ratios, resize vs crop, and the right sizes for web, email, and social media.',
      keywords: 'resize image, image resizer, resize online, aspect ratio, resize without losing quality',
    },
    zh: {
      title: '如何在线调整图片尺寸 — 保持画质与比例',
      description:
        '详解如何在线调整图片尺寸：像素尺寸与分辨率、保持比例的技巧、缩放与裁剪的区别，以及网页、邮件、社交平台的最合适尺寸。',
      keywords: '调整图片尺寸,在线改图片大小,图片缩放,宽高比,不失真缩放',
    },
    canonical: `${SITE}/help/resize-image-guide`,
    ogTitle: 'How to Resize an Image Online — Keep Quality & Proportions',
    ogDescription: 'Resize images online without losing quality — pixel dimensions, aspect ratios, and the right sizes for every use.',
  },
  '/blog': {
    en: {
      title: 'Image Tips & Tutorials — SuperPixMia Blog',
      description:
        'Practical, jargon-free answers to the image problems you actually run into — blurry WeChat photos, which format to pick, compressing without losing quality. Each tutorial links to a free tool that fixes it in your browser.',
      keywords: 'image tips, image tutorial, wechat image blurry, compress image, image format guide',
    },
    zh: {
      title: '图片知识库 — SuperPixMia 博客',
      description:
        '用大白话回答你真正会遇到的图片问题：微信发图为什么变糊、图片格式怎么选、压缩怎么不损画质。每篇教程都配一个浏览器里免费解决的工具。',
      keywords: '图片技巧,图片教程,微信图片模糊,图片压缩,图片格式',
    },
    canonical: `${SITE}/blog`,
    ogTitle: 'Image Tips & Tutorials — SuperPixMia Blog',
    ogDescription: 'Practical answers to the image problems you actually run into, each with a free browser-based fix.',
  },
}

// Blog posts get their SEO entries from the same blog-articles.ts data source
// (title/description), so a new post only needs editing one file.
for (const a of blogArticles) {
  SEO_ROUTES[a.path] = {
    en: {
      title: a.title.en,
      description: a.description.en,
      keywords: a.keywords?.en ?? 'image tips, image tutorial, image compression, image quality',
    },
    zh: {
      title: a.title.zh,
      description: a.description.zh,
      keywords: a.keywords?.zh ?? '图片技巧,图片教程,图片压缩,图片清晰度',
    },
    canonical: `${SITE}${a.path}`,
    ogTitle: a.title.en,
    ogDescription: a.description.en,
  }
}

export function getRouteSeo(pathname: string): RouteSeo {
  return SEO_ROUTES[pathname] ?? SEO_ROUTES['/']
}

// Client-side: update document head when the route changes.
// The prerender step bakes the correct tags into each static HTML file, so this
// only matters for in-app navigation after hydration.
export function applySeoMeta(seo: RouteSeo, lang: 'en' | 'zh'): void {
  if (typeof document === 'undefined') return
  const m = seo[lang]
  document.title = m.title
  const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, key)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
  setMeta('name', 'description', m.description)
  setMeta('name', 'keywords', m.keywords)
  setMeta('property', 'og:title', seo.ogTitle)
  setMeta('property', 'og:description', seo.ogDescription)
  setMeta('property', 'og:url', seo.canonical)

  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', seo.canonical)
}
