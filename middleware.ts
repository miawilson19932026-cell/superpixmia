// Vercel Edge Middleware — Chinese SEO: serve zh meta tags to Chinese users & Baidu spider

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

  return new Response(html, {
    status: res.status,
    headers: res.headers,
  })
}

export const config = { matcher: ['/', '/index.html'] }
