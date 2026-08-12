// Blog article content — bilingual, single source of truth.
//
// Conceptually distinct from the help center: /help = "how to use OUR tools"
// (user-success docs), /blog = "how to do a task / knowledge" (acquisition
// content that educates and links back to the tools). Both share the same
// rendering and prerender/JSON-LD pipeline, so the data model reuses the help
// section/FAQ types.
//
// A new blog post = one entry here + a route in App.tsx + an entry in
// seo.ts SEO_ROUTES + prerender.mjs ROUTES + middleware matcher + sitemap.xml.
import type { HelpSection, HelpFaq } from './help-articles'

export interface BlogArticleData {
  path: string
  title: { en: string; zh: string }
  description: { en: string; zh: string }
  date: string
  category: { en: string; zh: string }
  tags: string[]
  sections: HelpSection[]
  faqs: HelpFaq[]
}

export const blogArticles: BlogArticleData[] = [
  {
    path: '/blog/wechat-images-blurry',
    title: {
      en: 'Why WeChat Images Look Blurry — 5 Causes & Exact Fixes',
      zh: '微信图片为什么模糊？5 个原因与解决方法',
    },
    description: {
      en: 'WeChat makes your photos look blurry? It is not your phone. Auto-compression, the 25MB limit, and the "send original" checkbox are the real causes. Here are the 5 reasons and the exact fix for each.',
      zh: '微信发图片总变糊？不是手机坏了。微信默认压缩图片、单张 25MB 上限、"没勾选原图"都是元凶。这里列出 5 个原因，并逐个给出解决方法。',
    },
    date: '2026-08-12',
    category: { en: 'Image Tips', zh: '图片技巧' },
    tags: ['WeChat', 'compression', 'image quality', '压缩', '图片清晰度'],
    sections: [
      {
        heading: {
          en: 'Reason 1 — WeChat compresses every image by default',
          zh: '原因一：微信默认压缩每一张图片',
        },
        body: [
          {
            en: 'To keep chats fast and save server space, WeChat re-encodes every image you send. Unless you deliberately choose otherwise, the person on the other side receives a compressed copy — smaller in resolution and re-encoded at a lower quality. A photo taken on a modern phone (4000px+ wide) gets squeezed down to around 1280–1600px, which is exactly why it looks softer on the receiving end.',
            zh: '为了聊天加载快、节省服务器空间，微信会对你发送的每一张图片重新编码。除非你主动选择，否则对方收到的是压缩版——分辨率更小，画质被重新压过。现在手机拍的照片通常 4000px 以上宽，会被压到约 1280~1600px，这就是你看到对方收到的图变糊的直接原因。',
          },
        ],
      },
      {
        heading: {
          en: 'Reason 2 — You did not tick "Original"',
          zh: '原因二：发送时没勾选「原图」',
        },
        body: [
          {
            en: 'Before you hit send, WeChat shows a preview with a small "Original" option — on iOS it is the toggle above the keyboard, on Android it is usually a checkbox in the bottom-left of the preview. If you do not tick it, WeChat sends the compressed version even when the original is available. Ticking "Original" uploads the full-resolution file instead.',
            zh: '点发送前，微信会先弹出预览，上面有「原图」选项——iOS 上在键盘上方的按钮，安卓一般在预览左下角的勾选框。如果不勾选，微信就会发压缩版。勾上「原图」，才会上传完整分辨率的文件。',
          },
        ],
        bullets: {
          en: [
            'iOS: tap the "原图/Original" toggle above the keyboard before sending',
            'Android: tick the "原图/Original" checkbox in the preview corner',
            'Only applies to single-image chats — see Reasons 3–5 for the exceptions',
          ],
          zh: [
            'iOS：发送前点键盘上方的「原图」按钮',
            '安卓：勾选预览角落的「原图」勾选框',
            '仅单聊发图时生效——例外情况见原因三到五',
          ],
        },
      },
      {
        heading: {
          en: 'Reason 3 — Images over 25MB get force-compressed',
          zh: '原因三：超过 25MB 会被强制压缩',
        },
        body: [
          {
            en: 'Even with "Original" ticked, WeChat hard-limits a single image to roughly 25MB. Anything larger is automatically re-encoded down to fit, no matter what you choose. Raw photos, long panoramas, and uncompressed screenshots from high-resolution displays are the usual culprits. The fix: shrink the file before sending (see below).',
            zh: '就算勾了「原图」，微信对单张图片也有约 25MB 的硬性上限。超过的部分无论你怎么选都会被自动压缩。RAW 照片、长全景图、高分屏无损截图最容易超限。解决办法：发送前先把文件变小（见下方「标准流程」）。',
          },
        ],
      },
      {
        heading: {
          en: 'Reason 4 — Group chats and Moments always compress',
          zh: '原因四：群聊和朋友圈永远会压缩',
        },
        body: [
          {
            en: 'In group chats, WeChat applies stronger compression than in one-to-one chats, and recipients must manually tap "View original" to fetch the full file. In Moments (朋友圈), there is no original option at all — WeChat re-encodes every photo to a fixed size regardless of what you upload. If your photo looks blurry in a group or Moments, that is the platform\'s policy, not your file.',
            zh: '群聊里，微信的压缩比单聊更狠，且接收方要手动点「查看原图」才能拿到完整文件。而朋友圈根本没有「原图」选项——无论你传什么，微信都会把每张照片重新编码成固定尺寸。如果你觉得图片在群里或朋友圈里糊，那是平台规则，不是你的文件问题。',
          },
        ],
        bullets: {
          en: [
            'Group chats: recipients must tap "View original" to see full resolution',
            'Moments: always compressed, no original option — optimize the file before uploading',
            'Friends-only vs public: same compression rules apply',
          ],
          zh: [
            '群聊：接收方要点「查看原图」才能看到完整分辨率',
            '朋友圈：永远压缩、无原图选项——上传前先把文件优化好',
            '仅好友可见和公开可见：压缩规则一样',
          ],
        },
      },
      {
        heading: {
          en: 'Reason 5 — Re-saving and re-forwarding doubles the damage',
          zh: '原因五：转发和保存再发会二次压缩',
        },
        body: [
          {
            en: 'Every time an image is saved and re-sent, or forwarded through several chats, it is compressed again. Each hop loses a little more sharpness. That is why an image that looks fine at first becomes soft after being forwarded three or four times. Send the original source file directly instead of re-sending a saved copy.',
            zh: '图片每次被保存再发送、或经过多次转发，都会被再次压缩。每经过一跳就损失一点清晰度。这就是为什么一开始看着正常的图，转发了三四次就变软了。尽量直接发送原始文件，而不是转发保存过的副本。',
          },
        ],
      },
      {
        heading: {
          en: 'The fix — how to send perfectly sharp images every time',
          zh: '解决方法：每次发清晰图的「标准流程」',
        },
        body: [
          {
            en: 'Rule of thumb: keep the file under WeChat\'s limit and let WeChat do as little re-encoding as possible. If your image is a huge PNG or a high-res JPEG, compress or resize it first so it stays under ~20MB at a reasonable resolution, then send it with "Original" ticked. A 1600–2000px long edge is more than enough for viewing on a phone screen and stays small enough to pass through without forced compression.',
            zh: '经验法则：让文件小于微信限制，让微信尽量少重新编码。如果你的图片是很大的 PNG 或超高分 JPEG，先压缩或改尺寸，让它控制在约 20MB 以内、分辨率合理，然后勾选「原图」发送。长边 1600~2000px 在手机屏幕上看完全够用，又小到不会触发强制压缩。',
          },
        ],
        bullets: {
          en: [
            'Compress first: shrink file size without visible quality loss (SuperPixMia Compress tool)',
            'Resize if needed: 1600–2000px long edge is plenty for chat',
            'Prefer JPEG/WebP over PNG for photos — much smaller at the same quality',
            'Send with "Original" ticked, and send the source file, not a forwarded copy',
          ],
          zh: [
            '先压缩：在无肉眼损失的前提下缩小文件（用 SuperPixMia「压缩」工具）',
            '必要时改尺寸：聊天场景长边 1600~2000px 足够',
            '照片类优先用 JPEG/WebP 而不是 PNG——同画质体积小得多',
            '发送时勾「原图」，且发原始文件，别转发保存过的副本',
          ],
        },
      },
    ],
    faqs: [
      {
        q: { en: 'What is the maximum image size WeChat accepts?', zh: '微信单张图片最大能发多大？' },
        a: {
          en: 'Roughly 25MB per image in chats. Anything larger is force-compressed. Keep files under ~20MB and tick "Original" for the best quality.',
          zh: '聊天里单张约 25MB。超过会被强制压缩。把文件控制在 20MB 以内并勾选「原图」，画质最好。',
        },
      },
      {
        q: { en: 'I ticked "Original" but it is still blurry. Why?', zh: '我勾了「原图」为什么还是糊？' },
        a: {
          en: 'Either the file exceeded 25MB (so it was force-compressed), you were in a group or Moments (which always compress), or the image was already low-resolution to begin with. Compress or resize it first, then send the original.',
          zh: '要么文件超过 25MB 被强制压缩，要么你是在群聊或朋友圈（永远压缩），要么原图本身分辨率就不高。先压缩或改尺寸，再发原图。',
        },
      },
      {
        q: { en: 'Does sending "Original" use a lot of data?', zh: '发「原图」会很费流量吗？' },
        a: {
          en: 'Yes, "Original" uploads the full file, so it uses more data and takes longer. For most photos, compressing to 1600–2000px first gives a great-looking result at a fraction of the size — best of both worlds.',
          zh: '会，「原图」上传完整文件，更费流量也更慢。对大多数照片，先压到长边 1600~2000px，画质依然很好，体积却小得多——两全其美。',
        },
      },
      {
        q: { en: 'How do I post a sharp photo to Moments?', zh: '朋友圈怎么发清晰图？' },
        a: {
          en: 'Moments always re-encodes photos, so the only control you have is the input: optimize the image before uploading — proper resolution, good compression, JPEG or WebP format. Start with the best-quality source you can and WeChat\'s compression will do the least damage.',
          zh: '朋友圈永远会重新编码，你唯一能控制的是上传前的输入：先优化图片——合适的分辨率、良好的压缩、JPEG 或 WebP 格式。源头画质越好，微信压缩的损失越小。',
        },
      },
    ],
  },
]
