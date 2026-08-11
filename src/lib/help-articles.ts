// Help-center article content — bilingual, single source of truth.
// HelpPage.tsx renders these; the prerender script and Edge Middleware build the
// Article JSON-LD from the same title/description strings.
export interface HelpSection {
  heading: { en: string; zh: string }
  body: { en: string; zh: string }[]
  bullets?: { en: string[]; zh: string[] }
}

export interface HelpFaq {
  q: { en: string; zh: string }
  a: { en: string; zh: string }
}

export interface HelpArticleData {
  path: string
  title: { en: string; zh: string }
  description: { en: string; zh: string }
  updated: string
  sections: HelpSection[]
  faqs: HelpFaq[]
}

export const helpArticles: HelpArticleData[] = [
  {
    path: '/help/how-to-remove-bg',
    title: {
      en: 'How to Remove Image Background Free Online — Step-by-Step Guide',
      zh: '如何免费在线抠图去背景 — 完整教程',
    },
    description: {
      en: 'Remove image backgrounds for free in your browser. A step-by-step guide to the best methods — AI background removal, manual selection, and when each works best.',
      zh: '免费在线去除图片背景的完整教程。介绍 AI 抠图、手动选区等方法的原理、适用场景和详细步骤，附常见问题。',
    },
    updated: '2026-08-11',
    sections: [
      {
        heading: {
          en: 'Why remove a background?',
          zh: '为什么要去除图片背景？',
        },
        body: [
          {
            en: 'Removing a background is one of the most common image-editing tasks. Clean cutouts are essential for e-commerce product photos, ID photos, avatars and thumbnails, presentation graphics, and social-media posts. A subject on a transparent background can be dropped onto any new backdrop without ugly edges.',
            zh: '去除背景是最常见的图片处理需求之一。干净的抠图是电商商品图、证件照、头像缩略图、PPT 配图和社交媒体配图的基础。把主体抠到透明背景上，就可以随意叠加到任何新背景，不会留下难看的边缘。',
          },
        ],
        bullets: {
          en: [
            'E-commerce: show products on white, brand-colored, or scene backgrounds',
            'ID & passport photos: strict plain-background requirements',
            'Avatars & thumbnails: stand out from the crowd',
            'Composites & marketing: combine a cutout with any backdrop',
          ],
          zh: [
            '电商：商品图可以换白底、品牌色底或场景底',
            '证件照：对纯色背景有严格要求',
            '头像和缩略图：从众多图片中脱颖而出',
            '合成与营销：把主体合成到任何背景上',
          ],
        },
      },
      {
        heading: {
          en: 'Method 1 — AI automatic removal (fastest)',
          zh: '方法一：AI 自动抠图（最快）',
        },
        body: [
          {
            en: 'AI segmentation models detect the subject and cut it out in one click. SuperPixMia runs the model entirely in your browser via WebAssembly — no upload, no account, no watermarks. Upload your photo, click "Remove Background", and in a few seconds you get a transparent PNG.',
            zh: 'AI 分割模型能自动识别主体并一键抠出。SuperPixMia 的 AI 模型通过 WebAssembly 在你的浏览器内完整运行——无需上传、无需注册、无水印。上传照片，点击「去除背景」，几秒后就能得到透明 PNG。',
          },
        ],
        bullets: {
          en: [
            'Best for: people, products, animals with clear edges',
            'Takes 1–3 seconds per image after the model loads locally',
            'Preview against transparent, white, or black backgrounds',
            'Batch up to 15 images at once',
          ],
          zh: [
            '适合：边缘清晰的人物、商品、动物',
            '模型本地加载后，每张约 1~3 秒',
            '支持透明、白色、黑色背景预览',
            '一次最多批量处理 15 张',
          ],
        },
      },
      {
        heading: {
          en: 'Method 2 — manual selection (for tricky edges)',
          zh: '方法二：手动选区（处理复杂边缘）',
        },
        body: [
          {
            en: 'When the subject is very complex — fine hair strands, fur, lace, or a subject whose color blends into the background — automatic tools can leave artifacts. For those, use a manual tool: select the subject with a lasso or pen tool, feather the edge slightly, and refine around hair with a soft brush. Manual work takes longer but gives pixel-level control.',
            zh: '当主体非常复杂时——细碎发丝、毛发、蕾丝，或主体颜色与背景接近——自动工具可能留下瑕疵。这时建议用手动工具：用套索或钢笔工具选中主体，稍微羽化边缘，再用软画笔在发丝周围精修。手动处理更耗时，但能获得像素级的控制。',
          },
        ],
      },
      {
        heading: {
          en: 'Tips for a clean, professional cutout',
          zh: '获得干净抠图的实用技巧',
        },
        body: [
          {
            en: 'A clean cutout starts with a good source photo. The more contrast between subject and background, the better the AI result. Shoot with even lighting, avoid shadows crossing the subject, and keep resolution high enough that edges stay crisp. High-resolution inputs (at least 1000px on the long edge) produce noticeably cleaner cutouts.',
            zh: '干净的抠图从一张好照片开始。主体与背景的对比越强，AI 效果越好。拍摄时用均匀的光线，避免阴影落在主体上，并保证足够高的分辨率。输入分辨率越高（长边至少 1000px），抠图边缘越干净。',
          },
        ],
        bullets: {
          en: [
            'High contrast: subject should clearly differ from the background',
            'Even lighting: avoid strong shadows and hotspots on the subject',
            'High resolution: 1000px+ on the long edge for crisp edges',
            'Favor solid or smoothly lit backgrounds for best results',
          ],
          zh: [
            '高对比度：主体与背景要有明显差异',
            '均匀光线：避免强阴影和过曝落在主体上',
            '高分辨率：长边 1000px 以上边缘更清晰',
            '纯色或光线平滑的背景效果最好',
          ],
        },
      },
      {
        heading: {
          en: 'After removal: transparency, backgrounds & export',
          zh: '抠图之后：透明、换背景与导出',
        },
        body: [
          {
            en: 'A cutout is saved as a transparent PNG, which keeps the edges transparent and lets you place the subject anywhere. From there you can add a new background color, put the subject on a product scene, or keep it transparent for use on any color scheme.',
            zh: '抠图结果保存为透明 PNG，边缘保持透明，可以把主体放到任何地方。之后可以添加新背景色、把主体放进商品场景，或保持透明以便在任意配色下使用。',
          },
        ],
      },
    ],
    faqs: [
      {
        q: { en: 'Is background removal really free?', zh: '抠图真的免费吗？' },
        a: {
          en: 'Yes. SuperPixMia removes backgrounds completely free — no ads, no watermarks, no account, and no usage limits, because the AI runs locally in your browser.',
          zh: '完全免费。SuperPixMia 抠图无广告、无水印、无需注册，也没有使用次数限制——因为 AI 在你的浏览器本地运行。',
        },
      },
      {
        q: { en: 'Does it work on complex backgrounds like hair?', zh: '复杂背景（比如头发）也能抠干净吗？' },
        a: {
          en: 'The AI handles most cases well, including loose hair and fur. For very intricate edges, combine the AI result with manual refinement for the best output.',
          zh: 'AI 能很好地处理大多数情况，包括散落的头发和毛发。对于特别复杂的边缘，可以在 AI 结果基础上手动精修，获得最佳效果。',
        },
      },
      {
        q: { en: 'Which format should I download?', zh: '应该下载什么格式？' },
        a: {
          en: 'Download PNG to keep transparency. If you only need a filled background, JPEG or WebP works and is much smaller.',
          zh: '需要透明背景就下载 PNG。如果只是需要一个填好的背景，JPEG 或 WebP 更小，也够用。',
        },
      },
      {
        q: { en: 'Can I batch remove backgrounds?', zh: '可以批量抠图吗？' },
        a: {
          en: 'Yes, up to 15 images at once. Each cutout downloads as a transparent PNG, or all together as a ZIP.',
          zh: '可以，一次最多 15 张。每张抠图结果保存为透明 PNG，也可以一起打包成 ZIP 下载。',
        },
      },
    ],
  },
  {
    path: '/help/png-compression-guide',
    title: {
      en: 'PNG Compression Guide — How to Shrink PNG File Size Without Losing Quality',
      zh: 'PNG 压缩完全指南 — 无损减小 PNG 文件体积',
    },
    description: {
      en: 'Learn how PNG compression works, when it loses quality, and the fastest ways to shrink PNG file size — color depth, lossy WebP, and browser-based tools that keep your images private.',
      zh: '详解 PNG 压缩原理：什么时候会损失画质、如何无损减小文件体积、PNG 与 WebP 对比，以及如何在浏览器本地安全压缩 PNG 图片。',
    },
    updated: '2026-08-11',
    sections: [
      {
        heading: {
          en: 'Why PNG files are so large',
          zh: '为什么 PNG 文件那么大',
        },
        body: [
          {
            en: 'PNG is a lossless format: it stores every single pixel of the image, including areas of solid color and invisible transparency. That makes PNG perfect for logos, icons, screenshots, and UI graphics with sharp edges — but terrible for photos, which have thousands of subtle color gradients that PNG has to encode in full.',
            zh: 'PNG 是一种无损格式：它保存图像的每一个像素，包括纯色区域和不可见的透明区域。这使得 PNG 非常适合边缘锐利的 Logo、图标、截图和 UI 图形——但非常不适合照片，因为照片有成千上万微妙的颜色渐变，PNG 必须完整编码。',
          },
        ],
      },
      {
        heading: {
          en: 'How PNG compression actually works',
          zh: 'PNG 压缩的原理',
        },
        body: [
          {
            en: 'PNG uses two stages of compression. First it filters the pixel rows to remove predictable patterns, then it applies DEFLATE (the same algorithm behind ZIP) to the filtered data. Crucially, PNG compression is lossless — the decompressed image is byte-identical to the original. That is why re-saving a PNG never degrades it, and also why there is a hard floor on how small a PNG can get.',
            zh: 'PNG 使用两阶段压缩。首先对像素行做滤波，去掉可预测的规律；然后对滤波后的数据应用 DEFLATE（和 ZIP 相同的算法）。关键在于：PNG 压缩是无损的——解压后的图像与原图逐字节相同。这就是为什么反复保存 PNG 不会劣化，也是为什么 PNG 的体积有一个无法突破的硬下限。',
          },
        ],
      },
      {
        heading: {
          en: 'Lossless vs lossy: when PNG stops being the right choice',
          zh: '无损 vs 有损：什么时候该放弃 PNG',
        },
        body: [
          {
            en: 'For photos and images with smooth gradients, lossy formats like WebP and JPEG produce dramatically smaller files at visually identical quality — often 50–80% smaller. WebP also supports transparency, so it is the best drop-in replacement for PNG when size matters. Use PNG for anything with sharp edges or pixel-exact content (logos, screenshots, UI), and WebP/JPEG for everything photographic.',
            zh: '对于照片和带平滑渐变的图像，WebP、JPEG 等有损格式能在画质几乎无差别的情况下把体积缩小 50%~80%。WebP 还支持透明通道，因此当体积重要时，它是 PNG 的最佳替代。边缘锐利或需要像素级精确的内容（Logo、截图、UI）用 PNG；一切照片类内容用 WebP/JPEG。',
          },
        ],
        bullets: {
          en: [
            'Logos, icons, UI, screenshots → PNG (lossless, sharp edges)',
            'Photos & gradients → WebP / JPEG (much smaller)',
            'Need transparency + small size → WebP',
            'Need transparency + maximum compatibility → PNG',
          ],
          zh: [
            'Logo、图标、UI、截图 → PNG（无损、边缘锐利）',
            '照片和渐变 → WebP / JPEG（小得多）',
            '既要透明又要体积小 → WebP',
            '既要透明又要最大兼容性 → PNG',
          ],
        },
      },
      {
        heading: {
          en: 'Practical tips to shrink a PNG without losing quality',
          zh: '无损减小 PNG 体积的实用技巧',
        },
        body: [
          {
            en: 'When you must keep PNG, several techniques genuinely reduce size without visual loss: reduce the color depth from 32-bit RGBA to 24-bit or 8-bit indexed when the image has few colors; remove an unnecessary alpha channel; avoid saving JPEG artifacts into a PNG (re-save from the source); and resize before compressing — half the pixel dimensions can cut the file by more than half.',
            zh: '当必须保留 PNG 时，有几招能在无肉眼损失的情况下真正减小体积：当图片颜色少时，把 32 位 RGBA 降到 24 位或 8 位索引色；删除多余的透明通道；不要把 JPEG 压缩痕迹再存成 PNG（从原始文件重新保存）；先缩小再压缩——像素尺寸减半，文件往往能缩小一半以上。',
          },
        ],
        bullets: {
          en: [
            'Reduce color depth (32-bit → 24-bit / 8-bit indexed) for flat-color graphics',
            'Strip the alpha channel when you do not need transparency',
            'Resize large images first — resolution drives PNG size',
            'Re-compress from the original source, never from a JPEG',
          ],
          zh: [
            '纯色图形把色深从 32 位降到 24 位或 8 位索引色',
            '不需要透明时删除 Alpha 通道',
            '先缩小大图——分辨率直接决定 PNG 体积',
            '从原始文件重新压缩，绝不要从 JPEG 转存',
          ],
        },
      },
      {
        heading: {
          en: 'How to compress a PNG with SuperPixMia',
          zh: '如何用 SuperPixMia 压缩 PNG',
        },
        body: [
          {
            en: 'Open the Compress tool, drop your PNG, and drag the quality slider while watching the file size drop live. For a bigger win, use the Convert tool to switch the output to WebP — the transparent version keeps the alpha channel while cutting size dramatically. Everything runs in your browser: no upload, no watermarks, no limits.',
            zh: '打开「压缩」工具，拖入 PNG，拖动质量滑竿即可实时看到体积下降。想进一步缩小，用「格式转换」把输出改成 WebP——透明版本保留 Alpha 通道，同时体积大幅下降。全程在浏览器内运行：无需上传、无水印、无限制。',
          },
        ],
      },
    ],
    faqs: [
      {
        q: { en: 'Does PNG compression lose quality?', zh: 'PNG 压缩会损失画质吗？' },
        a: {
          en: 'No. PNG is a lossless format, so compressing it never changes a single pixel. The trade-off is that lossless compression reaches a hard size floor — for photos, switching to WebP or JPEG is the way to shrink further.',
          zh: '不会。PNG 是无损格式，压缩不会改变任何一个像素。代价是无损压缩有一个体积硬下限——照片类内容想进一步缩小，改用 WebP 或 JPEG 才有意义。',
        },
      },
      {
        q: { en: 'Why is my PNG still large after compressing?', zh: '为什么压缩后 PNG 还是很大？' },
        a: {
          en: 'Because PNG stores every pixel losslessly. Photos and complex gradients simply cannot be squeezed much as PNG. Convert to WebP to keep transparency while cutting 50–80% of the size.',
          zh: '因为 PNG 无损地保存每一个像素。照片和复杂渐变作为 PNG 本来就没多少压缩空间。转换成 WebP 可以在保留透明的同时缩小 50%~80%。',
        },
      },
      {
        q: { en: 'What is the smallest format with transparency?', zh: '支持透明的最小格式是什么？' },
        a: {
          en: 'WebP with alpha is typically the smallest format that keeps transparency, beating PNG significantly on photographic content. AVIF is even smaller but with slightly less browser support.',
          zh: '带 Alpha 的 WebP 通常是保留透明的最小格式，在照片类内容上明显优于 PNG。AVIF 更小，但浏览器支持稍弱。',
        },
      },
      {
        q: { en: 'How much smaller is WebP than PNG?', zh: 'WebP 比 PNG 小多少？' },
        a: {
          en: 'On photographic images, WebP is commonly 25–35% smaller than JPEG and 50–80% smaller than PNG at comparable visual quality. On flat-color graphics the gap is smaller.',
          zh: '在照片类图片上，同视觉质量下 WebP 通常比 JPEG 小 25%~35%，比 PNG 小 50%~80%。纯色图形上差距会小一些。',
        },
      },
    ],
  },
  {
    path: '/help/image-formats-comparison',
    title: {
      en: 'Image Formats Compared — PNG vs JPEG vs WebP vs AVIF',
      zh: '图片格式对比 — PNG、JPEG、WebP、AVIF 怎么选',
    },
    description: {
      en: 'A practical comparison of PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF — when to use each, size vs quality tradeoffs, and browser support.',
      zh: 'PNG、JPEG、WebP、AVIF、GIF、SVG、ICO、TIFF 九种图片格式的实用对比：各自优缺点、适用场景、体积与画质权衡、浏览器兼容性。',
    },
    updated: '2026-08-11',
    sections: [
      {
        heading: {
          en: 'Image formats at a glance',
          zh: '图片格式一览',
        },
        body: [
          {
            en: 'Every image format is a compromise between file size, quality, transparency, animation, and compatibility. Here is the quick verdict for the formats SuperPixMia supports.',
            zh: '每种图片格式都是在文件体积、画质、透明、动图和兼容性之间的权衡。下面是 SuperPixMia 支持的 9 种格式的速览结论。',
          },
        ],
        bullets: {
          en: [
            'PNG — lossless, transparency, sharp edges; heavier for photos',
            'JPEG — lossy, photographic, no transparency; small and universal',
            'WebP — modern hybrid, transparency + small size; great browser support',
            'AVIF — newest codec, smallest size, good support in modern browsers',
            'GIF — 8-bit, animation, dithering; use WebP/APNG for better quality',
            'SVG — vector, scales infinitely, tiny for logos & icons',
            'ICO — the Windows/website favicon format',
            'BMP — uncompressed, huge; for legacy/Windows assets',
            'TIFF — lossless, print & photography workflows, not for web',
          ],
          zh: [
            'PNG — 无损、透明、边缘锐利；照片类内容偏大',
            'JPEG — 有损、适合照片、无透明；小巧且通用',
            'WebP — 现代混合格式，透明+小体积，浏览器支持好',
            'AVIF — 最新编码，体积最小，现代浏览器支持好',
            'GIF — 8 位色、动图、有抖动；追求画质可用 WebP/APNG',
            'SVG — 矢量、无限缩放，Logo 和图标体积极小',
            'ICO — Windows 和网站的 favicon 图标格式',
            'BMP — 无压缩、体积巨大；用于旧版/Windows 素材',
            'TIFF — 无损，印刷和摄影工作流，不适合网页',
          ],
        },
      },
      {
        heading: {
          en: 'WebP vs PNG vs JPEG: the modern decision',
          zh: 'WebP vs PNG vs JPEG：现代选择',
        },
        body: [
          {
            en: 'For the web in 2026, WebP is the safe default: it supports transparency like PNG and compresses photos nearly as well as the newest codecs, with support in every major browser since 2020. JPEG remains the most universal lossy format for photos. PNG stays for pixel-exact work. AVIF gives the smallest files but check your audience\'s browsers first.',
            zh: '2026 年的网页上，WebP 是安全默认：它像 PNG 一样支持透明，照片压缩效果接近最新编码器，且自 2020 年起所有主流浏览器都支持。JPEG 仍是最通用的照片有损格式。PNG 留给需要像素级精确的场景。AVIF 文件最小，但先确认你的目标用户浏览器兼容性。',
          },
        ],
      },
      {
        heading: {
          en: 'Compression and quality trade-offs',
          zh: '压缩与画质的取舍',
        },
        body: [
          {
            en: 'Lossy formats (JPEG, WebP, AVIF) trade visible detail for smaller files — the lower the quality setting, the smaller the file and the softer the image. Lossless formats (PNG, TIFF) keep every pixel but hit a size floor. AVIF offers the best quality-per-byte, then WebP, then JPEG. A quality slider of 75–85 usually looks near-original on JPEG, while WebP can often go to 70–80 with the same look.',
            zh: '有损格式（JPEG、WebP、AVIF）用可见细节换小体积——质量越低文件越小、图像越软。无损格式（PNG、TIFF）保留每个像素，但有体积下限。单位体积画质 AVIF 最好，其次 WebP，再次 JPEG。JPEG 质量滑竿 75~85 通常接近原图，WebP 在 70~80 往往还能保持同样观感。',
          },
        ],
      },
      {
        heading: {
          en: 'Transparency and animation',
          zh: '透明与动图',
        },
        body: [
          {
            en: 'PNG, WebP, GIF, and AVIF support transparency; JPEG, BMP, and TIFF do not. For animation, GIF works everywhere but is limited to 256 colors. WebP animation and APNG offer much better quality with smaller files, at the cost of slightly less universal support.',
            zh: 'PNG、WebP、GIF、AVIF 支持透明；JPEG、BMP、TIFF 不支持。动图方面，GIF 兼容性最好但只有 256 色。WebP 动图和 APNG 画质好得多、体积也更小，代价是兼容性略差。',
          },
        ],
      },
      {
        heading: {
          en: 'When to pick each format — cheat sheet',
          zh: '何时选哪种格式 — 速查表',
        },
        body: [
          {
            en: 'Logo or icon → SVG (vector) or PNG. Website photo → WebP (with JPEG fallback). Social share image → PNG or JPEG at 1200×630. Favicon → ICO. Screenshot for UI review → PNG. Print-ready image → TIFF or PNG. Simple transparent graphic → WebP or PNG. Everything else → WebP.',
            zh: 'Logo 或图标 → SVG（矢量）或 PNG。网站图片 → WebP（可配 JPEG 兜底）。分享图 → 1200×630 的 PNG 或 JPEG。网站图标 → ICO。UI 截图 → PNG。印刷用图 → TIFF 或 PNG。简单的透明图形 → WebP 或 PNG。其余场景 → WebP。',
          },
        ],
      },
    ],
    faqs: [
      {
        q: { en: 'Which image format is best for the web?', zh: '网页上最好用哪种图片格式？' },
        a: {
          en: 'WebP is the best all-rounder for the web in 2026: transparent, small, and supported by every modern browser. Use AVIF when you need the absolute smallest files, and JPEG as a universal fallback for photos.',
          zh: '2026 年的网页上，WebP 是最均衡的选择：支持透明、体积小、所有现代浏览器都支持。需要极致小体积时用 AVIF，照片通用兜底用 JPEG。',
        },
      },
      {
        q: { en: 'Is WebP supported everywhere?', zh: 'WebP 在所有浏览器都支持吗？' },
        a: {
          en: 'Yes — every major browser (Chrome, Edge, Firefox, Safari, and WeChat/UC/QQ on mobile) has supported WebP since 2020. For very old or unusual clients, serve a JPEG or PNG fallback.',
          zh: '是的——2020 年起所有主流浏览器（Chrome、Edge、Firefox、Safari，以及移动端微信/UC/QQ 内置浏览器）都支持 WebP。针对极老或特殊客户端，可以配 JPEG/PNG 兜底。',
        },
      },
      {
        q: { en: 'How do I convert between formats without losing quality?', zh: '如何无损地在格式间转换？' },
        a: {
          en: 'Always convert from the original source file, never from an already-compressed JPEG. SuperPixMia converts locally in your browser between all 9 formats — no upload, no quality loss beyond the target format\'s own settings.',
          zh: '始终从原始文件转换，绝不要从已压缩的 JPEG 转存。SuperPixMia 在浏览器本地支持 9 种格式互转——无需上传，除了目标格式自身的参数外不额外损失画质。',
        },
      },
      {
        q: { en: 'What is the difference between PNG-8 and PNG-24?', zh: 'PNG-8 和 PNG-24 有什么区别？' },
        a: {
          en: 'PNG-8 stores up to 256 colors (good for flat graphics, very small), while PNG-24 stores truecolor with millions of colors (needed for photos and gradients). PNG-32 adds a full alpha channel for smooth transparency.',
          zh: 'PNG-8 最多保存 256 种颜色（适合纯色图形，体积很小）；PNG-24 保存真彩色、数百万种颜色（照片和渐变需要）。PNG-32 在 24 位基础上增加完整 Alpha 通道，支持平滑透明。',
        },
      },
    ],
  },
]
