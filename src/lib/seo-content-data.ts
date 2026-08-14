// Visible bilingual SEO body content (single source of truth).
//
// SeoContent.tsx renders this into the DOM, and seo-jsonld.ts builds the FAQPage /
// HowTo / Article structured data from the SAME strings. Google surfaces rich
// results only when structured-data questions and steps also appear in visible
// page content — so keeping both driven by one file guarantees they match.
import type { ToolType } from '../types'

export interface FAQ {
  q: string
  a: string
}

export interface Content {
  h1: string
  headline: string
  intro: string
  privacy: string
  howToTitle: string
  howToSteps: { title: string; desc: string }[]
  faqTitle: string
  faqs: FAQ[]
}

export const homeContent: Record<'en' | 'zh', Content> = {
  en: {
    h1: 'SuperPixMia',
    headline: 'Free Online Image Tools, in Your Browser',
    intro:
      'SuperPixMia is a free, open-source, browser-based image toolkit. Resize, compress, remove backgrounds, and convert images between 9 formats — PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF — all processed 100% locally on your device.',
    privacy:
      'Unlike most online image tools, SuperPixMia never uploads your images. Everything runs in your browser with Canvas API and WebAssembly. No accounts, no ads, no watermarks, no hidden costs.',
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
    h1: 'SuperPixMia',
    headline: '免费在线图片工具，全程浏览器本地处理',
    intro:
      'SuperPixMia 是一款免费、开源的浏览器图片工具箱。支持图片改尺寸、压缩、AI 抠图，以及 9 种格式互转（PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF）——所有处理 100% 在你的设备本地完成。',
    privacy:
      '和大多数在线图片工具不同，SuperPixMia 绝不把你的图片上传到任何服务器。所有处理都在浏览器内通过 Canvas API 和 WebAssembly 完成。无需注册、无广告、无水印、无隐藏收费。',
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

// Per-tool focused content — HowTo steps and FAQ text drive both the visible
// per-tool page content and the per-tool HowTo / FAQPage structured data.
export const toolContent: Record<ToolType, Record<'en' | 'zh', Content>> = {
  compress: {
    en: {
      h1: 'Free Image Compressor',
      headline: 'Compress PNG, JPEG, WebP & AVIF Online — No Upload',
      intro:
        'Reduce PNG, JPEG, WebP, and AVIF file size with a real-time quality slider. Watch the file size drop before you download, and compress up to 15 images in one batch — 100% in your browser, no upload, no watermark.',
      privacy:
        'Compression happens locally in your browser with the Canvas API. Your images never leave your device, so compressing private photos, screenshots, or design assets stays private.',
      howToTitle: 'How to compress an image online',
      howToSteps: [
        {
          title: 'Upload or drag your image',
          desc: 'Drop any PNG, JPEG, WebP, or AVIF image into the compressor. You can add up to 15 images for batch compression.',
        },
        {
          title: 'Drag the quality slider',
          desc: 'The compressor runs instantly as you adjust quality between 1% and 100%. The grid shows original vs. compressed size in real time.',
        },
        {
          title: 'Download your smaller image',
          desc: 'Once the size looks right, click Download. Batch mode packages all results into a ZIP file.',
        },
      ],
      faqTitle: 'Image Compression FAQ',
      faqs: [
        {
          q: 'Does compressing an image lose quality?',
          a: 'It depends on the format. JPEG, WebP, and AVIF use lossy compression — lowering quality shrinks the file but may soften fine detail. PNG compression is lossless and keeps every pixel, which is why very detailed PNGs stay relatively large.',
        },
        {
          q: 'Why is my PNG file still large after compressing?',
          a: 'PNG stores every pixel, so photos and complex graphics compress poorly as PNG. For those, switch the output to WebP or AVIF — you will often cut the size by 50–80% at visually identical quality.',
        },
        {
          q: 'Is the image compressor really free?',
          a: 'Yes, completely free with no ads, no watermarks, and no account. Everything runs locally in your browser.',
        },
        {
          q: 'How many images can I compress at once?',
          a: 'Up to 15 images per batch. Each one is compressed in your browser, and the results download together as a ZIP.',
        },
      ],
    },
    zh: {
      h1: '免费图片压缩工具',
      headline: '在线压缩 PNG、JPEG、WebP、AVIF，免上传',
      intro:
        '通过实时质量滑竿降低 PNG、JPEG、WebP、AVIF 文件体积。下载前即可看到体积变化，支持一次批量压缩最多 15 张图片——全程浏览器本地处理，无需上传，无水印。',
      privacy:
        '压缩全程在浏览器内通过 Canvas API 本地完成，你的图片绝不会离开设备。压缩私人照片、截图或设计素材，隐私完全有保障。',
      howToTitle: '如何在线压缩图片',
      howToSteps: [
        {
          title: '上传或拖入图片',
          desc: '把任意 PNG、JPEG、WebP、AVIF 图片拖入压缩工具，最多可添加 15 张图片批量压缩。',
        },
        {
          title: '拖动质量滑竿',
          desc: '在 1%~100% 之间调节质量，压缩实时进行。网格中会同步显示原图与压缩后的体积对比。',
        },
        {
          title: '下载压缩后的图片',
          desc: '体积满意后点击「下载」。批量模式会把所有结果打包成 ZIP 文件。',
        },
      ],
      faqTitle: '图片压缩常见问题',
      faqs: [
        {
          q: '压缩图片会损失画质吗？',
          a: '取决于格式。JPEG、WebP、AVIF 属于有损压缩——质量越低体积越小，但细节可能变糊。PNG 压缩是无损的，保留每一个像素，所以细节复杂的 PNG 体积仍然较大。',
        },
        {
          q: '为什么 PNG 压缩后体积还是很大？',
          a: 'PNG 存储每一个像素，照片和复杂图形作为 PNG 压缩效率很低。这种情况下建议输出为 WebP 或 AVIF，通常能在画质几乎无差别的情况下缩小 50%~80%。',
        },
        {
          q: '图片压缩真的免费吗？',
          a: '完全免费，无广告、无水印、无需注册。所有处理都在浏览器本地完成。',
        },
        {
          q: '一次可以压缩多少张图片？',
          a: '单次最多 15 张。每张都在浏览器本地压缩，结果以 ZIP 形式一起下载。',
        },
      ],
    },
  },
  'remove-bg': {
    en: {
      h1: 'Free AI Background Remover',
      headline: 'Remove Image Background Online — No Upload',
      intro:
        'Remove image backgrounds with one click. AI segmentation runs entirely in your browser via WebAssembly — your photo never leaves your device. Preview the cutout against transparent, white, or black backgrounds, then download as a transparent PNG.',
      privacy:
        'The AI model runs locally on your device. Photos are never uploaded, which makes this the safest way to cut out product shots, portraits, or ID photos.',
      howToTitle: 'How to remove a background online',
      howToSteps: [
        {
          title: 'Upload your image',
          desc: 'Drop any PNG, JPEG, or WebP photo. The AI model needs about 1–3 seconds to load on first use, then runs locally.',
        },
        {
          title: 'Click Remove Background',
          desc: 'One click starts the AI segmentation. A progress bar shows the model cutting out the subject from the background.',
        },
        {
          title: 'Preview & download the cutout',
          desc: 'Compare the cutout against transparent, white, or black backgrounds. Click Download to save it as a transparent PNG.',
        },
      ],
      faqTitle: 'Background Removal FAQ',
      faqs: [
        {
          q: 'Is the background remover really free?',
          a: 'Yes — free, no ads, no watermark, and no account. The AI runs locally in your browser, so there are no server costs and no usage limits.',
        },
        {
          q: 'Does SuperPixMia upload my photos?',
          a: 'No. The AI background-removal model runs entirely in your browser via WebAssembly. Your photo never leaves your device.',
        },
        {
          q: 'What is the best image type for removal?',
          a: 'A subject with clear edges against a distinct background gives the cleanest cutout — for example a product shot on white, or a portrait with good contrast.',
        },
        {
          q: 'Can I batch remove backgrounds?',
          a: 'Yes, up to 15 images at once. Each cutout downloads as a transparent PNG, or all together as a ZIP.',
        },
      ],
    },
    zh: {
      h1: '免费 AI 抠图工具',
      headline: '在线一键去除图片背景，免上传',
      intro:
        '一键去除图片背景。AI 分割全程在你的浏览器内通过 WebAssembly 运行——照片绝不上传服务器。支持透明、白色、黑色背景预览，下载透明 PNG。',
      privacy:
        'AI 模型在本地设备上运行，照片绝不上传。这是处理商品图、人像、证件照背景最安全的方式。',
      howToTitle: '如何在线抠图去背景',
      howToSteps: [
        {
          title: '上传图片',
          desc: '拖入任意 PNG、JPEG、WebP 图片。AI 模型首次使用需要约 1~3 秒加载，之后在本地运行。',
        },
        {
          title: '点击「去除背景」',
          desc: '一键启动 AI 分割，进度条会显示模型把主体从背景中抠出的过程。',
        },
        {
          title: '预览并下载抠图结果',
          desc: '在透明、白色、黑色背景下对比抠图效果，然后点击「下载」保存为透明 PNG。',
        },
      ],
      faqTitle: '抠图常见问题',
      faqs: [
        {
          q: 'AI 抠图真的免费吗？',
          a: '完全免费，无广告、无水印、无需注册。AI 在浏览器本地运行，没有服务器成本，也没有使用次数限制。',
        },
        {
          q: 'SuperPixMia 会上传我的照片吗？',
          a: '不会。AI 抠图模型全程在浏览器内通过 WebAssembly 运行，你的照片绝不会离开设备。',
        },
        {
          q: '什么样的图片抠图效果最好？',
          a: '主体边缘清晰、与背景区分明显的图片效果最好——比如白底商品图，或者与背景对比明显的人像。',
        },
        {
          q: '可以批量抠图吗？',
          a: '可以，一次最多 15 张。每张抠图结果保存为透明 PNG，也可以一起打包成 ZIP 下载。',
        },
      ],
    },
  },
  resize: {
    en: {
      h1: 'Free Image Resizer',
      headline: 'Resize Images Online to Exact Dimensions',
      intro:
        'Resize images to exact pixel dimensions with built-in presets — OG image 1200×630, Instagram 1080×1080, favicon 32×32 — or custom width and height. Lock the aspect ratio for distortion-free scaling. Free, no upload.',
      privacy:
        'Resizing runs entirely in your browser. Original files stay on your device, so it is safe for documents, designs, and sensitive images.',
      howToTitle: 'How to resize an image online',
      howToSteps: [
        {
          title: 'Upload your image',
          desc: 'Drop any PNG, JPEG, WebP, or other supported image. Its current dimensions are shown automatically.',
        },
        {
          title: 'Pick a preset or enter custom size',
          desc: 'Choose a ready-made preset (OG, Instagram, favicon…) or type your own width and height. Lock the ratio to keep proportions.',
        },
        {
          title: 'Download the resized image',
          desc: 'The resized image is generated locally in your browser. Click Download to save it.',
        },
      ],
      faqTitle: 'Image Resize FAQ',
      faqs: [
        {
          q: 'Is the image resizer free?',
          a: 'Yes — free, no ads, no watermark, no account. Everything runs locally in your browser.',
        },
        {
          q: 'Can I set an exact pixel size?',
          a: 'Yes. Type any width and height, or pick a preset like OG image 1200×630, Instagram 1080×1080, or favicon 32×32.',
        },
        {
          q: 'How do I avoid a stretched or squashed image?',
          a: 'Enable the aspect-ratio lock. The tool keeps the original proportions and only lets you scale both dimensions together.',
        },
        {
          q: 'What size should my OG image be?',
          a: '1200×630 pixels is the recommended Open Graph image size — it renders well on most social platforms including WeChat, Facebook, and Twitter.',
        },
      ],
    },
    zh: {
      h1: '免费图片改尺寸工具',
      headline: '在线调整图片尺寸到精确像素',
      intro:
        '按精确像素调整图片尺寸，内置常用预设——OG 图 1200×630、Instagram 1080×1080、图标 32×32——也支持自定义宽高。可锁定宽高比避免变形。免费，免上传。',
      privacy:
        '改尺寸全程在浏览器内完成，原图只停留在你的设备上。处理文档、设计稿和敏感图片都非常安全。',
      howToTitle: '如何在线调整图片尺寸',
      howToSteps: [
        {
          title: '上传图片',
          desc: '拖入任意 PNG、JPEG、WebP 等格式图片，工具会自动识别当前尺寸。',
        },
        {
          title: '选择预设或自定义尺寸',
          desc: '选择现成预设（OG 图、Instagram、图标……）或输入自定义宽高。锁定宽高比可保持原始比例。',
        },
        {
          title: '下载调整后的图片',
          desc: '图片在浏览器本地生成，点击「下载」保存即可。',
        },
      ],
      faqTitle: '改尺寸常见问题',
      faqs: [
        {
          q: '改尺寸工具免费吗？',
          a: '完全免费，无广告、无水印、无需注册。所有处理都在浏览器本地完成。',
        },
        {
          q: '可以设置精确像素吗？',
          a: '可以。输入任意宽高即可，也可以直接选预设，如 OG 图 1200×630、Instagram 1080×1080、图标 32×32。',
        },
        {
          q: '如何避免图片被拉伸变形？',
          a: '开启宽高比锁定。工具会保持原始比例，只允许宽高同时缩放。',
        },
        {
          q: 'OG 图应该用多大尺寸？',
          a: '推荐 1200×630 像素，这是 Open Graph 图片的标准尺寸，在微信、Facebook、Twitter 等多数平台都能良好展示。',
        },
      ],
    },
  },
  convert: {
    en: {
      h1: 'Free Image Format Converter',
      headline: 'Convert Between 9 Image Formats — PNG, JPEG, WebP & More',
      intro:
        'Convert images between PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF — online for free. Perfect for generating favicons, optimizing images for the web, or sharing to social media. Batch convert up to 15 images. No upload.',
      privacy:
        'All conversion happens locally in your browser. Files never leave your device, so converting private or work images is safe.',
      howToTitle: 'How to convert an image online',
      howToSteps: [
        {
          title: 'Upload your image',
          desc: 'Drop any of the 9 supported formats into the converter. You can convert up to 15 files in one batch.',
        },
        {
          title: 'Pick the target format',
          desc: 'Choose the output format from the dropdown — PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, or TIFF. For ICO output you can also pick the icon size.',
        },
        {
          title: 'Download the converted file',
          desc: 'The conversion runs instantly in your browser. Click Download, or get everything as a ZIP in batch mode.',
        },
      ],
      faqTitle: 'Format Conversion FAQ',
      faqs: [
        {
          q: 'Is the image converter free?',
          a: 'Yes — free, no ads, no watermark, and no account. All conversion runs locally in your browser.',
        },
        {
          q: 'Which formats are supported?',
          a: 'PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, and TIFF — you can convert between any of the 9 formats.',
        },
        {
          q: 'How do I make a favicon from an image?',
          a: 'Convert your image to ICO. The tool includes common icon sizes (16×16, 32×32, 48×48) so you can generate a ready-to-use favicon.',
        },
        {
          q: 'Should I use WebP or PNG?',
          a: 'WebP is usually smaller for photos and graphics on the web. Use PNG when you need transparency or pixel-perfect detail. Our format comparison article explains the trade-offs in depth.',
        },
      ],
    },
    zh: {
      h1: '免费图片格式转换工具',
      headline: '在线 PNG、JPEG、WebP、AVIF 等 9 种格式互转',
      intro:
        '支持 PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF 9 种格式互转——免费在线使用。适合生成网站图标、优化网页图片，或分享到社交媒体。支持批量转换，免上传。',
      privacy:
        '所有转换都在浏览器本地完成，文件绝不会离开设备。转换私人图片或工作素材非常安全。',
      howToTitle: '如何在线转换图片格式',
      howToSteps: [
        {
          title: '上传图片',
          desc: '把 9 种支持格式中的任意图片拖入转换工具，一次最多转换 15 个文件。',
        },
        {
          title: '选择目标格式',
          desc: '从下拉框选择输出格式——PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF。转换为 ICO 时还可选择图标尺寸。',
        },
        {
          title: '下载转换后的文件',
          desc: '转换在浏览器内即时完成。点击「下载」保存，批量模式可打包成 ZIP。',
        },
      ],
      faqTitle: '格式转换常见问题',
      faqs: [
        {
          q: '图片转换免费吗？',
          a: '完全免费，无广告、无水印、无需注册。所有转换都在浏览器本地完成。',
        },
        {
          q: '支持哪些格式？',
          a: '支持 PNG、JPEG、WebP、AVIF、GIF、BMP、SVG、ICO、TIFF 9 种格式任意互转。',
        },
        {
          q: '如何用图片生成 favicon 图标？',
          a: '把图片转换为 ICO 格式即可。工具内置常用图标尺寸（16×16、32×32、48×48），可直接生成可用的网站图标。',
        },
        {
          q: '应该用 WebP 还是 PNG？',
          a: '网页上的照片和图形用 WebP 通常体积更小。需要透明背景或像素级细节时用 PNG。我们的图片格式对比文章有详细分析。',
        },
      ],
    },
  },
  'remove-watermark': {
    en: {
      h1: 'Free Online Watermark Remover',
      headline: 'Erase Watermarks, Stamps & Text in Seconds',
      intro:
        'Remove watermarks, stamps, logos, and stray text from images online for free. Paint over the mark with a brush and the tool rebuilds the covered area from the surrounding pixels so it blends back into the background. Great for cleaning up screenshots, downloads, and photos you own. All processing happens in your browser — nothing is uploaded.',
      privacy:
        'Everything runs locally in your browser — your images never leave your device. Safe for private photos, screenshots, and documents.',
      howToTitle: 'How to remove a watermark online',
      howToSteps: [
        {
          title: 'Upload your image',
          desc: 'Drop any PNG, JPEG, WebP, or other supported image into the watermark remover.',
        },
        {
          title: 'Paint over the watermark',
          desc: 'Use the brush to cover the watermark, stamp, or text you want to remove. Adjust the brush size as needed; Erase fixes any overshoot and Undo is one tap away.',
        },
        {
          title: 'Remove & download',
          desc: 'Click "Remove Watermark" and the covered area is rebuilt from the surrounding pixels. Download the clean image.',
        },
      ],
      faqTitle: 'Watermark Removal FAQ',
      faqs: [
        {
          q: 'Is the watermark remover free?',
          a: 'Yes — free, no ads, and no account. Everything runs locally in your browser, so there is no per-image limit.',
        },
        {
          q: 'Does it work on any background?',
          a: 'It works best when the area behind the watermark is flat or lightly textured — plain white, solid colors, or simple gradients. On busy photo backgrounds the result is softer, so try a smaller brush and cover the mark precisely.',
        },
        {
          q: 'Which marks can it remove?',
          a: 'Text watermarks, logo stamps, timestamps, and stray marks. Paint exactly over the mark — any overshoot is removed with the Erase brush.',
        },
        {
          q: 'Is my image uploaded to a server?',
          a: 'No. All processing happens in your browser via Canvas. Your image never leaves your device.',
        },
      ],
    },
    zh: {
      h1: '免费在线去水印工具',
      headline: '涂抹即可去除图片水印、印章和文字',
      intro:
        '免费在线去除图片水印。用笔刷涂抹覆盖要移除的水印、印章、Logo 或多余文字，工具会用周围的像素把被盖住的区域重新补回来，自然地融入背景。适合清理截图、下载的图片和自己拍摄的照片。全程浏览器本地处理，图片不会上传。',
      privacy:
        '所有处理都在浏览器本地完成，你的图片绝不会上传服务器。处理私人照片、截图和文档都非常安全。',
      howToTitle: '如何在线去水印',
      howToSteps: [
        {
          title: '上传图片',
          desc: '把任意 PNG、JPEG、WebP 等图片拖入去水印工具。',
        },
        {
          title: '涂抹覆盖水印',
          desc: '用笔刷涂满要移除的水印、印章或文字。可调节笔刷大小，涂多了用「擦除」修掉，随时可撤销上一步。',
        },
        {
          title: '去水印并下载',
          desc: '点击「开始去水印」，工具用周围像素把覆盖区域补全。下载处理后的图片即可。',
        },
      ],
      faqTitle: '去水印常见问题',
      faqs: [
        {
          q: '去水印工具免费吗？',
          a: '完全免费，无广告、无需注册。所有处理都在浏览器本地完成，没有张数限制。',
        },
        {
          q: '什么背景下去水印效果好？',
          a: '水印下方的背景越简单效果越好——纯白、纯色或简单的渐变背景最佳。背景复杂的照片效果会柔和一些，可以尝试用小笔刷精确覆盖水印。',
        },
        {
          q: '能去除哪些标记？',
          a: '文字水印、Logo 印章、时间戳和多余的标记都可以。用笔刷精确涂满水印即可，涂多了用「擦除」修掉。',
        },
        {
          q: '图片会被上传到服务器吗？',
          a: '不会。所有处理都在浏览器内通过 Canvas 完成，图片不会离开你的设备。',
        },
      ],
    },
  },
}

// Cross-link labels for the "other tools" block on tool pages
export const otherToolsLabels: Record<'en' | 'zh', Record<ToolType, string>> = {
  en: {
    resize: 'Resize image',
    compress: 'Compress image',
    'remove-bg': 'Remove background',
    convert: 'Convert format',
    'remove-watermark': 'Remove watermark',
  },
  zh: {
    resize: '图片改尺寸',
    compress: '图片压缩',
    'remove-bg': 'AI 抠图',
    convert: '格式转换',
    'remove-watermark': '图片去水印',
  },
}

export const helpArticleLinks: Record<'en' | 'zh', { path: string; title: string }[]> = {
  en: [
    { path: '/help/how-to-remove-bg', title: 'How to remove an image background' },
    { path: '/help/png-compression-guide', title: 'PNG compression guide' },
    { path: '/help/image-formats-comparison', title: 'Image formats compared' },
    { path: '/help/resize-image-guide', title: 'How to resize an image without losing quality' },
  ],
  zh: [
    { path: '/help/how-to-remove-bg', title: '如何免费在线抠图去背景' },
    { path: '/help/png-compression-guide', title: 'PNG 压缩完全指南' },
    { path: '/help/image-formats-comparison', title: '图片格式对比' },
    { path: '/help/resize-image-guide', title: '如何在线调整图片尺寸' },
  ],
}
