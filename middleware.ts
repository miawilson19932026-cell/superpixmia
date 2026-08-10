// Vercel Edge Middleware — Chinese SEO: serve zh meta tags to Chinese users & Baidu spider

// Chinese FAQPage JSON-LD — questions mirror the visible zh FAQ in SeoContent.tsx
// (Google surfaces FAQ rich results only when questions appear in visible content).
const ZH_FAQ_JSONLD = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "SuperPixMia 真的免费吗？",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "是的，SuperPixMia 完全免费，无广告、无水印、无隐藏收费。所有图片处理都在你的浏览器本地完成。"
    }
  }, {
    "@type": "Question",
    "name": "我的图片会被上传到服务器吗？",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "不会。所有图片处理 100% 在浏览器内通过 Canvas API、WebAssembly 和客户端压缩库完成，你的图片绝不会离开你的设备。"
    }
  }, {
    "@type": "Question",
    "name": "SuperPixMia 支持哪些图片格式？",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "SuperPixMia 支持 9 种图片格式：PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF，可进行改尺寸、压缩、抠图和格式互转。"
    }
  }, {
    "@type": "Question",
    "name": "可以一次处理多张图片吗？",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "可以。SuperPixMia 支持最多 15 张图片的批量处理，可同时改尺寸、压缩或转换格式，并以 ZIP 压缩包形式下载。"
    }
  }, {
    "@type": "Question",
    "name": "抠图功能是怎么实现的？",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "SuperPixMia 使用 AI 抠图技术，通过 WebAssembly 在浏览器内完整运行。图片不会发送到任何外部服务器，隐私完全有保障。"
    }
  }]
}
</script>`

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname !== '/' && url.pathname !== '/index.html') {
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

  // Replace key SEO tags with Chinese versions for Baidu ranking
  html = html.replace(/<title>.*?<\/title>/, '<title>SuperPixMia — 免费在线图片工具 | PNG压缩、图片压缩、AI抠图、格式转换</title>')
  html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="SuperPixMia 免费在线图片处理工具，支持PNG压缩、图片压缩、AI抠图、格式转换。纯浏览器端处理，无需上传，100%保护隐私。支持9种图片格式。" />')
  html = html.replace(/<meta name="keywords"[^>]*>/, '<meta name="keywords" content="图片工具,PNG压缩,图片压缩,在线抠图,AI抠图,图片格式转换,图片改尺寸,JPEG压缩,WebP转换,AVIF转换,批量图片处理,免上传图片工具,免费在线压缩" />')
  html = html.replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="SuperPixMia — 免费在线图片工具 | PNG压缩、图片压缩、抠图、格式转换" />')
  html = html.replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="免费在线图片处理工具 — PNG压缩、图片压缩、AI抠图、格式转换，浏览器端完成，无需上传，100%隐私保护。" />')

  // Inject Chinese FAQPage structured data for zh users & Baidu spider
  html = html.replace('</head>', `${ZH_FAQ_JSONLD}\n</head>`)

  return new Response(html, {
    status: res.status,
    headers: res.headers,
  })
}

export const config = { matcher: ['/', '/index.html'] }
