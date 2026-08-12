// Vercel Edge Middleware — Chinese SEO: serve zh meta tags + zh structured data
// to Chinese users & Baidu spider, per route.
//
// English title/desc/JSON-LD is already baked into each prerendered static page
// by scripts/prerender.mjs. For accept-language zh, this swaps in the Chinese
// title/description/keywords/OG and injects Chinese FAQPage/HowTo JSON-LD. The
// SPA then hydrates into Chinese UI via ?lang= / navigator detection.
import { getRouteSeo } from './src/lib/seo'
import { ldToScript, zhToolLd, zhHomeFaqLd, zhArticleLd } from './src/lib/seo-jsonld'
import type { ToolType } from './src/types'

const TOOL_PATHS: Record<string, ToolType> = {
  '/compress': 'compress',
  '/remove-bg': 'remove-bg',
  '/resize': 'resize',
  '/convert': 'convert',
  '/watermark': 'watermark',
  '/crop': 'crop',
  '/rotate': 'rotate',
}

const HELP_PATHS = ['/help', '/help/how-to-remove-bg', '/help/png-compression-guide', '/help/image-formats-comparison', '/help/resize-image-guide']

const BLOG_PATHS = ['/blog', '/blog/wechat-images-blurry']

const SEO_PATHS = new Set(['/', ...Object.keys(TOOL_PATHS), ...HELP_PATHS, ...BLOG_PATHS])

function escapeAttr(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

// Chinese structured data per path: home gets FAQPage, tool pages get HowTo +
// FAQPage, help articles + blog posts get an Article block, /help and /blog
// list pages get nothing extra.
function zhJsonLdBlocks(path: string): string[] {
  if (path === '/') {
    return [ldToScript(zhHomeFaqLd())]
  }
  const tool = TOOL_PATHS[path]
  if (tool) {
    const { howTo, faq } = zhToolLd(tool)
    return [ldToScript(howTo), ldToScript(faq)]
  }
  if (path !== '/help' && path !== '/blog') {
    const article = zhArticleLd(path)
    if (article) return [ldToScript(article)]
  }
  return []
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname === '/index.html' ? '/' : url.pathname

  if (!SEO_PATHS.has(path)) {
    return fetch(request)
  }

  const acceptLang = request.headers.get('accept-language') || ''
  const isChinese = /^zh|,zh|zh-/i.test(acceptLang)

  if (!isChinese) {
    return fetch(request)
  }

  const res = await fetch(request)
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) {
    return res
  }

  let html = await res.text()

  const seo = getRouteSeo(path)
  const zh = seo.zh

  // Replace English meta with Chinese versions
  html = html.replace(/<title>.*?<\/title>/, `<title>${zh.title}</title>`)
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttr(zh.description)}" />`)
  html = html.replace(/<meta name="keywords"[^>]*>/, `<meta name="keywords" content="${escapeAttr(zh.keywords)}" />`)
  html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(seo.ogTitle)}" />`)
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(seo.ogDescription)}" />`)

  // Inject Chinese structured data for zh users & Baidu spider
  const zhBlocks = zhJsonLdBlocks(path)
  if (zhBlocks.length > 0) {
    html = html.replace('</head>', `${zhBlocks.join('\n')}\n</head>`)
  }

  return new Response(html, {
    status: res.status,
    headers: res.headers,
  })
}

export const config = { matcher: ['/', '/index.html', '/compress', '/remove-bg', '/resize', '/convert', '/watermark', '/crop', '/rotate', '/help', '/help/:path*', '/blog', '/blog/:path*'] }
