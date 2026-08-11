// Post-build prerender: generates a fully static HTML file per route so Google,
// Baidu, and social crawlers read the complete content without executing JS.
//
// Each route's page is rendered with renderToString + StaticRouter, then the
// route's title / meta / canonical / hreflang / JSON-LD are swapped into the
// built index.html skeleton. Output: dist/<route>/index.html.
//
// Known constraint: prerender output is English (Node has no navigator, so
// detectLang() defaults to 'en'). Chinese users get Chinese title/desc/JSON-LD
// injected by Vercel Edge Middleware (middleware.ts) by accept-language, then
// the SPA hydrates into Chinese via ?lang= / navigator detection.
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'

const SITE = 'https://www.superpixmia.com'
const DIST = resolve('dist')

// All routes: home, 4 tool pages, help center, 3 help articles.
const ROUTES = [
  { path: '/', tool: null, article: null },
  { path: '/compress', tool: 'compress', article: null },
  { path: '/remove-bg', tool: 'remove-bg', article: null },
  { path: '/resize', tool: 'resize', article: null },
  { path: '/convert', tool: 'convert', article: null },
  { path: '/help', tool: null, article: null },
  { path: '/help/how-to-remove-bg', tool: null, article: 'how-to-remove-bg' },
  { path: '/help/png-compression-guide', tool: null, article: 'png-compression-guide' },
  { path: '/help/image-formats-comparison', tool: null, article: 'image-formats-comparison' },
  { path: '/help/resize-image-guide', tool: null, article: 'resize-image-guide' },
]

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

const base = readFileSync(resolve(DIST, 'index.html'), 'utf8')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
  const { LangProvider } = await vite.ssrLoadModule('/src/i18n/index.tsx')
  const seo = await vite.ssrLoadModule('/src/lib/seo.ts')
  const seoJsonLd = await vite.ssrLoadModule('/src/lib/seo-jsonld.ts')
  const { helpArticles } = await vite.ssrLoadModule('/src/lib/help-articles.ts')

  for (const route of ROUTES) {
    console.log(`  · rendering ${route.path} …`)

    const appHtml = renderToString(
      React.createElement(
        StaticRouter,
        { location: route.path },
        React.createElement(LangProvider, null, React.createElement(App, null)),
      ),
    )

    const routeSeo = seo.getRouteSeo(route.path)
    const en = routeSeo.en
    const canonicalPath = route.path === '/' ? '' : route.path

    let html = base

    // Inject SSR-rendered app into the root div
    html = html.replace(/<div id="root"><\/div>/, `<div id="root">${appHtml}</div>`)

    // Title & core meta
    html = html.replace(/<title>.*?<\/title>/, `<title>${en.title}</title>`)
    html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttr(en.description)}" />`)
    html = html.replace(/<meta name="keywords"[^>]*>/, `<meta name="keywords" content="${escapeAttr(en.keywords)}" />`)

    // Canonical + hreflang
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${routeSeo.canonical}" />`)
    html = html.replace(/<link rel="alternate" hreflang="en"[^>]*>/, `<link rel="alternate" hreflang="en" href="${SITE}${canonicalPath}?lang=en" />`)
    html = html.replace(/<link rel="alternate" hreflang="zh"[^>]*>/, `<link rel="alternate" hreflang="zh" href="${SITE}${canonicalPath}?lang=zh" />`)
    html = html.replace(/<link rel="alternate" hreflang="x-default"[^>]*>/, `<link rel="alternate" hreflang="x-default" href="${routeSeo.canonical}" />`)

    // OG + Twitter (serve Google & social share previews)
    html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(routeSeo.ogTitle)}" />`)
    html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(routeSeo.ogDescription)}" />`)
    html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${routeSeo.canonical}" />`)
    html = html.replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeAttr(routeSeo.ogTitle)}" />`)
    html = html.replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeAttr(routeSeo.ogDescription)}" />`)

    // JSON-LD: drop the hardcoded homepage blocks, insert per-route structured data
    html = html.replace(/<!-- ── Structured Data[\s\S]*?<\/script>/g, '')
    let ldBlocks
    if (route.path === '/') {
      ldBlocks = seoJsonLd.homePageLd()
    } else if (route.tool) {
      ldBlocks = seoJsonLd.toolPageLd(route.tool)
    } else if (route.path === '/help') {
      ldBlocks = seoJsonLd.articlePageLd('/help', 'SuperPixMia Help Center', 'Guides and tutorials for compressing images, removing backgrounds, resizing, and converting formats.')
    } else if (route.article) {
      const article = helpArticles.find((a) => a.path === route.path)
      ldBlocks = article
        ? seoJsonLd.articlePageLd(route.path, article.title.en, article.description.en)
        : seoJsonLd.homePageLd()
    } else {
      ldBlocks = seoJsonLd.homePageLd()
    }
    const ldHtml = ldBlocks.map(seoJsonLd.ldToScript).join('\n    ')
    html = html.replace('</head>', `    ${ldHtml}\n  </head>`)

    const outPath = route.path === '/' ? resolve(DIST, 'index.html') : resolve(DIST, route.path.slice(1), 'index.html')
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, html, 'utf8')
    console.log(`  ✓ prerendered ${route.path} (${(html.length / 1024).toFixed(1)}KB)`)
  }
} finally {
  await vite.close()
}
