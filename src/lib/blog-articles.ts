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
  keywords?: { en: string; zh: string } // per-post meta keywords; falls back to the shared default
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
    keywords: {
      en: 'wechat image blurry, wechat compresses images, image quality, send original image, fix blurry photos',
      zh: '微信图片模糊,微信压缩图片,图片清晰度,发送原图,图片变糊',
    },
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
  {
    path: '/blog/how-ai-sees-images',
    title: {
      en: 'How Does AI See Images? Pixels, Tensors & Neural Networks Explained',
      zh: 'AI 是怎么「看懂」图片的？像素、张量与神经网络完全解析',
    },
    description: {
      en: 'When you see a cat, an AI model sees a grid of numbers. A beginner-friendly walkthrough of how images become tensors, why convolutions look at small windows, and how stacked layers turn edges into full objects.',
      zh: '你看到一只猫，AI 看到的却是一堆数字。面向初学者的完整解析：图片如何变成张量、卷积为什么要一小块一小块地看、层与层堆叠如何把边缘拼成完整的物体。',
    },
    date: '2026-08-13',
    category: { en: 'AI & Computer Vision', zh: 'AI 与计算机视觉' },
    tags: ['computer vision', 'AI', 'tensor', 'CNN', 'neural networks', '图像识别', 'AI教程', '张量'],
    keywords: {
      en: 'how does ai see images, computer vision for beginners, image to tensor, what is a tensor, convolutional neural network, how neural networks see, image pixels explained',
      zh: 'AI怎么看图,计算机视觉入门,图像转张量,张量是什么,卷积神经网络,神经网络原理,图像像素',
    },
    sections: [
      {
        heading: {
          en: 'The big misunderstanding: to AI, an image is just numbers',
          zh: '最大的误解：在 AI 眼里，图片只是数字',
        },
        body: [
          {
            en: 'When you look at a photo you see a cat, a beach, a face. An AI model sees something completely different: a large, neatly arranged grid of numbers. That gap — between the picture you see and the array the model reads — is the single most important idea in computer vision. Once it clicks, convolutional networks, vision transformers, even generative models all start to make sense.',
            zh: '你看到一张照片，看到的是猫、海滩、人脸。AI 模型看到的完全是另一回事：一个巨大的、排列整齐的数字网格。你看到的「图片」和模型读到的「数组」之间的这道鸿沟，是计算机视觉里最关键的一步。想通了这一点，卷积网络、视觉 Transformer、甚至生成式模型，全都豁然开朗。',
          },
        ],
      },
      {
        heading: {
          en: 'Pixels — the atoms of a digital image',
          zh: '像素 — 数字图像的基本单位',
        },
        body: [
          {
            en: 'Every digital image is a grid of tiny squares called pixels. Resolution is just a way of saying how many pixels the grid has: a 224×224 image has 224 rows and 224 columns — 50,176 pixels in total. Each pixel lives at a specific coordinate in the grid, like a seat in a cinema. The picture you see is nothing more than that grid, colored cell by cell.',
            zh: '每张数字图像都是一个由无数小方格组成的网格，这些小方格就叫像素。「分辨率」不过是说这个网格有多少个像素：一张 224×224 的图有 224 行、224 列——总共 50,176 个像素。每个像素都待在网格里的一个固定坐标上，就像电影院里的一个座位。你看到的图像，本质上就是这个网格被一格一格涂上颜色。',
          },
        ],
      },
      {
        heading: {
          en: 'Channels — why one pixel is three numbers',
          zh: '通道 — 为什么一个像素是三个数字',
        },
        body: [
          {
            en: 'A single pixel is not "one color" — it is three numbers. On a screen every color is built from red, green, and blue light, and each is measured from 0 to 255. Black is (0,0,0), white is (255,255,255), pure red is (255,0,0). So a 224×224 color photo is not 50,176 numbers but 50,176 × 3 = 150,528 of them. One small image is already a six-figure sheet of numbers.',
            zh: '一个像素并不是「一个颜色」——它是三个数字。屏幕上任何颜色都由红、绿、蓝三色光混合而成，每种光用 0 到 255 表示强度。黑色是 (0,0,0)，白色是 (255,255,255)，纯红是 (255,0,0)。所以一张 224×224 的彩色照片不是 50,176 个数字，而是 50,176 × 3 = 150,528 个数字。一张小小的图，已经是一张六位数起步的数字表格。',
          },
        ],
        bullets: {
          en: [
            'A pixel = 3 values (R, G, B), each in 0–255',
            '224×224 RGB image = 150,528 numbers in total',
            'Grayscale images drop to 1 channel → 50,176 numbers',
            'This is why a "bigger image" means far more numbers, not just a little more',
          ],
          zh: [
            '一个像素 = 3 个数值（红、绿、蓝），每个范围 0~255',
            '224×224 的 RGB 图片 = 共 150,528 个数字',
            '灰度图只有 1 个通道 → 50,176 个数字',
            '这就是为什么「更大图片」意味着多得多得多得多的数字',
          ],
        },
      },
      {
        heading: {
          en: 'The "aha!" moment: an image IS a tensor',
          zh: '顿悟时刻：图片就是一个张量',
        },
        body: [
          {
            en: 'This is the moment most people learning AI remember: the image is a tensor. A tensor is just a multidimensional array — a list of lists of numbers. A color image is a three-dimensional tensor: height × width × channels. In PyTorch the convention is channels-first, so one photo is torch.Size([3, 224, 224]) — 3 channels, 224 rows, 224 columns. Train in batches and a fourth dimension appears: (batch_size, 3, 224, 224). When you keep seeing [3, 224, 224] in tutorials and error messages, it is not magic — it is a single picture.',
            zh: '这是大多数学 AI 的人都会记住的一刻：图片是一个张量。张量就是多维数组——一个装着数字的列表的列表。一张彩色图片就是一个三维张量：高 × 宽 × 通道。PyTorch 的约定是「通道在前」，所以一张照片就是 torch.Size([3, 224, 224])——3 个通道、224 行、224 列。训练时按批次喂入，会出现第四维：(batch_size, 3, 224, 224)。当你在教程和报错里反复看到 [3, 224, 224]，那不是魔法——它只是一张图片。',
          },
        ],
        bullets: {
          en: [
            'Tensor = a multidimensional array of numbers',
            'One RGB photo = (3, 224, 224) in PyTorch channels-first convention',
            'A batch of 32 photos = (32, 3, 224, 224)',
            'TensorFlow uses channels-last: (224, 224, 3) — same image, different order',
          ],
          zh: [
            '张量 = 多维数字数组',
            '一张 RGB 照片 = PyTorch 通道在前约定下的 (3, 224, 224)',
            '一个 32 张的批次 = (32, 3, 224, 224)',
            'TensorFlow 用「通道在后」：(224, 224, 3)——同一张图，只是顺序不同',
          ],
        },
      },
      {
        heading: {
          en: 'Normalization — why AI wants numbers between 0 and 1',
          zh: '归一化 — 为什么 AI 想要 0 到 1 之间的数字',
        },
        body: [
          {
            en: 'Raw pixels range from 0 to 255, but neural networks train far more happily on small numbers. Dividing every value by 255 rescales the image to a 0–1 range. Large values make gradients swing wildly and training unstable; small, centered values keep learning smooth. Many models go further and subtract a per-channel mean, then divide by a per-channel standard deviation — constants computed once from the training set. That is why almost every vision pipeline starts with an explicit normalize step.',
            zh: '原始像素的范围是 0 到 255，但神经网络在小数值上训练要舒服得多。把每个值除以 255，图片就缩放到 0~1 的范围。数值太大，梯度会剧烈摆动、训练不稳定；小而居中的数值能让学习平稳推进。很多模型更进一步：减去每个通道的均值，再除以每个通道的标准差——这些常数在训练集上预先算好。这就是几乎所有视觉训练流程都以一个显式的归一化步骤开头的原因。',
          },
        ],
      },
      {
        heading: {
          en: 'Convolutions — how AI actually "looks"',
          zh: '卷积 — AI 到底是怎么「看」的',
        },
        body: [
          {
            en: 'A convolutional neural network looks at an image the way a magnifying glass sweeps across a map. A small filter — typically 3×3 — slides over the grid, and at every position it computes a weighted sum of the pixels under it. Each filter learns to detect one pattern: a vertical edge, a horizontal line, a corner. Because each filter only "sees" a tiny window at a time, this is called a local receptive field. Sweep many filters across the whole image and you get many feature maps — each one marking where one pattern lives.',
            zh: '卷积神经网络看图，就像放大镜在地图上扫过。一个小滤波器——通常是 3×3——在网格上滑动，每到一处就计算它底下那些像素的加权和。每个滤波器学会检测一种模式：竖边、横线、角点。因为每个滤波器一次只能「看到」一个小窗口，这被称为局部感受野。让很多滤波器扫过整张图，就得到很多特征图——每一张都标记着某一种模式出现在哪里。',
          },
        ],
        bullets: {
          en: [
            'A 3×3 filter slides across the image like a magnifying glass',
            'Each filter detects one pattern — edge, line, corner',
            'Local receptive field: look at a small window, not the whole image',
            'Many filters in parallel → many feature maps',
          ],
          zh: [
            '一个 3×3 的滤波器像放大镜一样扫过整张图',
            '每个滤波器检测一种模式：边缘、直线、角点',
            '局部感受野：一次只看一个小窗口，而不是整张图',
            '许多滤波器并行 → 得到许多张特征图',
          ],
        },
      },
      {
        heading: {
          en: 'Stacking layers — from edges to faces',
          zh: '层层堆叠 — 从边缘到人脸',
        },
        body: [
          {
            en: 'A single convolutional layer only finds edges. The magic is stacking many of them. The first layers detect tiny patterns — edges, gradients, color blobs. The next layers combine those into textures and shapes — an eye, a wheel, a window. Deeper layers assemble those into full objects — a face, a car, a building. So when an AI "recognizes" a cat, it is not comparing to a mental picture; it is passing the image up a ladder of ever-more-abstract features until the final layer can answer "cat, 0.98". That hierarchy — simple to complex, local to global — is what "understanding" means for a vision model.',
            zh: '单独一层卷积只会找边缘。真正的魔法在于把很多层叠起来。最前几层检测微小的模式——边缘、渐变、色块。接下来几层把这些组合成纹理和形状——一只眼睛、一个轮子、一扇窗。更深的层再把它们组装成完整的物体——一张脸、一辆车、一栋楼。所以当 AI「认出」一只猫时，它并不是在对照一张印象中的照片；它是在把图片沿着一架抽象程度越来越高的梯子向上传递，直到最后一层能回答「猫，置信度 0.98」。这种从简单到复杂、从局部到整体的层级结构，就是视觉模型意义上的「理解」。',
          },
        ],
      },
      {
        heading: {
          en: 'Pooling — shrinking the map to see more',
          zh: '池化 — 缩小特征图，看得更远',
        },
        body: [
          {
            en: 'Between layers, networks shrink the feature maps with pooling — usually max pooling, which keeps the largest value in each small window. Pooling halves the spatial size at each step (224 → 112 → 56…) while keeping the important features. It does two jobs at once: each later filter effectively "sees" a larger area, and the model becomes tolerant of small shifts — wiggle the cat a few pixels and the pooled map barely changes. Less computation, more abstraction, more robustness.',
            zh: '在层与层之间，网络会用池化来缩小特征图——通常是最大池化，即每个小窗口里只保留最大值。池化每一步都把空间尺寸减半（224 → 112 → 56…），同时保留关键特征。它一举两得：后续滤波器在效果上「看到」更大的区域，模型也更能容忍微小偏移——把猫挪动几个像素，池化后的特征图几乎不变。计算更少、抽象更高、鲁棒性更强。',
          },
        ],
      },
      {
        heading: {
          en: 'The verdict — turning features into predictions',
          zh: '下结论 — 把特征变成预测结果',
        },
        body: [
          {
            en: 'After the last convolutional block, the network is left with compact feature maps that summarize the whole image. A fully connected layer flattens them into a single vector, and a softmax turns that vector into a probability for every class the model was trained on. Out comes the verdict: cat 0.98, dog 0.01, bird 0.001. That final step — many numbers in, a few probabilities out — is the same machinery behind an image classifier, a face detector, and, with a different output head, even an image generator.',
            zh: '在最后一个卷积块之后，网络手里是一组紧凑的特征图，它们概括了整张图片。全连接层把它们摊平成单个向量，softmax 再把这个向量变成模型训练过的每个类别的概率。最终结论出炉：猫 0.98、狗 0.01、鸟 0.001。这最后一步——许多数字进，几个概率出——正是图像分类器、人脸检测器背后的同一套机制；换一个输出头，甚至图像生成器也用同一套机制。',
          },
        ],
      },
      {
        heading: {
          en: 'Where image AI is going — transformers "read" images',
          zh: '图像 AI 的新方向 — Transformer 在「阅读」图片',
        },
        body: [
          {
            en: 'The newest architectures look at images differently. A Vision Transformer (ViT) chops the image into 16×16 patches and treats them like a sequence of words, letting an attention mechanism figure out which patches relate to which. Instead of local windows, it can relate any two parts of the image directly — that is why modern image models scale so well. Convolution is not going away (hybrid models still use it), but knowing the patch idea helps you read today\'s papers and model cards.',
            zh: '最新架构看图片的方式又不一样了。视觉 Transformer（ViT）把图片切成 16×16 的小块，把它们当成一串「单词」，让注意力机制去判断哪些小块彼此相关。它不再局限于局部窗口，而是能直接建立图像任意两个部分之间的联系——这正是现代图像模型越做越大的原因。卷积并没有退出历史舞台（混合模型仍在使用它），但理解了「切块」的思路，你就能读懂今天的论文和模型卡了。',
          },
        ],
      },
      {
        heading: {
          en: 'Try it yourself — images are just numbers you can touch',
          zh: '亲手试试 — 图片不过是你碰得到的数字',
        },
        body: [
          {
            en: 'None of this is abstract — the numbers are real, and you can poke at them with free tools. Open a photo in a compress tool and drag the quality slider: you are literally re-quantizing those pixel values as the file size responds live. Drop an image into a background remover and watch the AI segment it — it is reading the same pixel grid and deciding which cells belong to the subject. Once you know an image is a tensor, these tools stop feeling like magic and start feeling like something you could build yourself.',
            zh: '这一切都不是抽象的——数字是真实的，你可以用免费工具亲手戳一戳。在压缩工具里打开一张照片，拖动质量滑竿：随着文件体积实时变化，你其实是在重新量化那些像素值。把一张图丢进抠图工具，看着 AI 把它分割出来——它正在读取同一个像素网格，判断哪些格子属于主体。一旦你知道了图片就是张量，这些工具就不再像魔法，而更像是你自己也能做出来的东西。',
          },
        ],
      },
    ],
    faqs: [
      {
        q: { en: 'What is a tensor in simple terms?', zh: '用大白话说，张量是什么？' },
        a: {
          en: 'A tensor is just a multidimensional array — a grid of numbers with any number of dimensions. A color image is a 3D tensor (height × width × channels). "Tensor" sounds intimidating, but it is just a container with extra dimensions.',
          zh: '张量就是多维数组——一个可以有任意维度的数字网格。一张彩色图片就是三维张量（高 × 宽 × 通道）。「张量」听起来唬人，其实只是一个维度更多一点的数字容器。',
        },
      },
      {
        q: { en: 'Why do I keep seeing (3, 224, 224)?', zh: '为什么到处都在说 (3, 224, 224)？' },
        a: {
          en: 'Because 224×224 is a standard input size for image models and 3 is the RGB channels. In PyTorch\'s channels-first convention that shape means one image. TensorFlow flips the order to (224, 224, 3).',
          zh: '因为 224×224 是图像模型的标准输入尺寸，3 是 RGB 三个通道。在 PyTorch「通道在前」的约定下，这个形状就是一张图。TensorFlow 把它反过来写成 (224, 224, 3)。',
        },
      },
      {
        q: { en: 'Do neural networks see images the way humans do?', zh: '神经网络看图的方式和人一样吗？' },
        a: {
          en: 'No. Humans recognize objects from experience, context, and common sense; networks learn statistical patterns from labeled data. A model does not "know" a cat is a cat — it has learned a function that maps pixel grids to labels, and it can be confidently wrong in ways a human never would be.',
          zh: '不一样。人类靠经验、上下文和常识认物；网络靠标注数据学统计模式。模型并不知道「猫是猫」——它只是学到了一个把像素网格映射到标签的函数，而且可能以人类绝不会犯的方式自信地认错。',
        },
      },
      {
        q: { en: 'Why normalize images to 0–1 before training?', zh: '训练前为什么要归一化到 0~1？' },
        a: {
          en: 'Large values destabilize gradients and slow convergence. Dividing pixel values by 255 keeps numbers small and centered, which makes training faster and more reliable. Many pipelines then subtract a channel mean and divide by a channel standard deviation.',
          zh: '数值太大时梯度会不稳定、收敛变慢。把像素值除以 255，让数字保持小而居中，训练会更快更稳。很多流程随后还会减去通道均值、除以通道标准差。',
        },
      },
      {
        q: { en: 'What is the difference between a CNN and a Vision Transformer?', zh: 'CNN 和视觉 Transformer 有什么区别？' },
        a: {
          en: 'A CNN sweeps small local filters over the image, building understanding window by window. A Vision Transformer splits the image into patches and relates them with attention, so any two parts can interact directly. ViTs handle long-range relationships better and scale further, at a higher compute cost.',
          zh: 'CNN 用小的局部滤波器扫过图片，一个窗口一个窗口地建立理解。视觉 Transformer 把图片切成小块，用注意力机制建立小块之间的关系，任意两部分都能直接相互作用。ViT 在捕捉长距离关系上更强、可扩展性更好，但计算成本更高。',
        },
      },
      {
        q: { en: 'How much memory does one 224×224×3 image take?', zh: '一张 224×224×3 的图片占多少内存？' },
        a: {
          en: 'As a float32 tensor it is 224×224×3×4 bytes ≈ 0.6 MB per image, and a batch of 32 is about 19 MB. Models multiply that by the number of intermediate feature maps, which is why training vision models is where GPUs earn their keep.',
          zh: '以 float32 计算，一张图是 224×224×3×4 字节 ≈ 0.6MB，一个 32 张的批次约 19MB。模型还会乘上中间特征图的数量，这就是为什么训练视觉模型离不开 GPU。',
        },
      },
    ],
  },
  {
    path: '/blog/ai-image-prompt-guide',
    title: {
      en: 'AI Image Prompts That Actually Work — People & Animals (GPT, Gemini, Midjourney)',
      zh: 'AI 生图提示词指南：人物、动物怎么写？（GPT / Gemini / Midjourney）',
    },
    description: {
      en: 'Why do some AI images look great and yours miss the mark? Mostly the prompt. Learn the simple five-part structure behind good prompts, copy-ready templates for people and animals, what differs between GPT, Gemini and Midjourney — then how to cut out the subject and clean up the result with free browser tools.',
      zh: '为什么别人用 AI 生图那么好看，你的总差点意思？八成是提示词没写对。这篇讲清提示词的五段式结构、人物和动物都能直接抄的模板、GPT / Gemini / Midjourney 各自的写法，以及生成后怎么免费抠图、清理背景、导出高清图。',
    },
    date: '2026-08-23',
    category: { en: 'AI Tutorials', zh: 'AI 教程' },
    tags: ['AI生图', '提示词', 'Midjourney', 'ChatGPT', 'Gemini', '抠图', 'prompt', 'AI art'],
    keywords: {
      en: 'ai image prompts, how to write ai prompts, midjourney prompt, chatgpt image prompt, gemini image, ai portrait prompts, ai animal prompts, ai cutout, ai image background',
      zh: 'AI生图提示词,AI提示词怎么写,Midjourney提示词,ChatGPT生图,Gemini生图,人物提示词,动物提示词,AI抠图,AI换背景',
    },
    sections: [
      {
        heading: {
          en: 'How AI image generation actually works (in one minute)',
          zh: 'AI 生图是怎么一回事（一分钟弄懂原理）',
        },
        body: [
          {
            en: 'When you type a prompt and hit enter, what happens inside? Most image models today are "diffusion models": they start from pure random noise and, guided by your text, gradually erase the noise and shape a picture over many steps. ChatGPT and Gemini are language models that can also draw; Midjourney is a specialist whose whole job is generating images. Your prompt is the steering wheel — not a magic spell. The more specific and concrete your description, the closer the model lands.',
            zh: '你在输入框敲下一句话、按下回车，背后发生了什么？现在主流生图模型大多是「扩散模型」：它们从一堆随机噪点出发，被你的文字「指挥」着一轮一轮抹掉噪点、拼出画面。ChatGPT、Gemini 本质是语言模型、顺带能画图；Midjourney 是专精画图的模型。提示词就是方向盘——不是咒语。描述越具体、越贴近实物，模型开得就越准。',
          },
        ],
        bullets: {
          en: [
            'Diffusion = start from noise, gradually shape it into a picture using your text as a guide',
            'GPT / Gemini: general-purpose language models that also generate images — great with full sentences',
            'Midjourney: a dedicated image model — great at style, needs its own short-phrase format',
            'Rule of thumb: a vague prompt gives a vague image; a specific prompt gives a useful one',
          ],
          zh: [
            '扩散 = 从噪点出发，用文字当向导，一步步把画面拼出来',
            'GPT / Gemini：全能语言模型顺带生图，适合写整段自然语言',
            'Midjourney：专精画图的模型，风格表现力强，但有自己的短词+参数写法',
            '记住一句话：提示词越模糊，图越模糊；提示词越具体，图越能用',
          ],
        },
      },
      {
        heading: {
          en: 'The five-part structure of a good prompt',
          zh: '提示词的五段式结构',
        },
        body: [
          {
            en: 'Every strong prompt can be broken into five parts: (1) the subject, (2) its details and features, (3) the action or pose, (4) the setting and background, (5) the style and quality. In Chinese that looks like: 「主体 + 细节特征 + 动作姿势 + 环境背景 + 风格画质」. You do not need all five every time, but the more of them you fill in, the more control you have.',
            zh: '任何一个好用的提示词，都能拆成五段：（1）主体是什么；（2）它长什么样（细节特征）；（3）它在做什么（动作姿势）；（4）在什么环境里（环境背景）；（5）什么风格、什么画质。用中文写就是「主体 + 细节特征 + 动作姿势 + 环境背景 + 风格画质」。五段不必每次都写全，但填得越满，你对结果的掌控越强。',
          },
        ],
        bullets: {
          en: [
            'Subject: a woman / a cat / a city — who or what is in the picture',
            'Details: age, hair, clothes, fur, color, expression — what makes it specific',
            'Action: sitting, running, waving, looking at the camera',
            'Setting: on a beach, in a studio, snowy forest, plain background',
            'Style & quality: photorealistic, anime, watercolor, 8k, cinematic lighting',
          ],
          zh: [
            '主体：女人 / 猫 / 一座城市——画面里是谁、是什么',
            '细节：年龄、发型、服装、毛色、表情——让画面变得具体的东西',
            '动作：坐着、奔跑、挥手、看向镜头',
            '环境：海边、摄影棚、雪地森林、纯色背景',
            '风格画质：写实、动漫、水彩、8k、电影级光线',
          ],
        },
      },
      {
        heading: {
          en: 'How to write prompts for people',
          zh: '人物提示词怎么写',
        },
        body: [
          {
            en: 'For people, the model needs enough detail to know exactly who to draw. Go down the list: gender and age, face shape and facial features, hairstyle and hair color, clothes, pose, expression, lighting, and camera/angle. Replace "a girl" with a concrete description and the difference is night and day. For example: 「30 岁的中国女性，自然淡妆，黑色长直发，白色衬衫，微笑着看向镜头，柔和自然光，浅灰纯色背景，半身肖像照，真实摄影，细节丰富」.',
            zh: '画人物，模型需要足够的信息才能知道「画谁」。顺着清单往下写：性别年龄、脸型五官、发型发色、服装、姿势、表情、光线、镜头角度。把「一个女孩」换成一段具体的描述，效果天差地别。例如：「30 岁的中国女性，自然淡妆，黑色长直发，白色衬衫，微笑着看向镜头，柔和自然光，浅灰纯色背景，半身肖像照，真实摄影，细节丰富」。',
          },
        ],
        bullets: {
          en: [
            'Face: mention age, face shape, hairstyle, hair color, glasses if any',
            'Expression & pose: smiling, serious, looking away, hands in pockets',
            'Clothing: specific beats vague — "white shirt" beats "clothes"',
            'Quality words: photorealistic, high detail, 8k, cinematic lighting',
            'Watch out: hands and eyes are where models stumble — fewer fancy hand poses, more front-facing',
            'For a consistent character across images, keep the character part of the prompt fixed and change only the action',
          ],
          zh: [
            '面部：写年龄、脸型、发型、发色，戴不戴眼镜',
            '表情姿势：微笑、严肃、望向别处、手插口袋',
            '服装：「白色衬衫」远好过「穿着衣服」，越具体越好',
            '画质词：photorealistic（真实）、high detail（高细节）、8k、cinematic lighting（电影光线）',
            '注意：手指和眼睛是 AI 最容易翻车的地方——少安排复杂手势，多用正面视角',
            '想同一角色跨图保持长相一致：把角色描述部分固定不动，只改动作',
          ],
        },
      },
      {
        heading: {
          en: 'How to write prompts for animals',
          zh: '动物提示词怎么写',
        },
        body: [
          {
            en: 'Animals follow the same five-part structure, but the "details" slot is about species and breed, fur color and pattern, and the distinctive features that make the animal recognizable. A pet photo wants "cute, warm home light, shallow depth of field"; a wildlife shot wants "natural light, telephoto, sharp". Keep the species name in the prompt — "a ginger British Shorthair" beats "a cat" every time.',
            zh: '动物用的也是五段式，只是「细节」这一栏要换成：物种与品种、毛色花纹、以及让它一眼可辨认的特征。宠物照适合加「可爱、室内暖光、浅景深」；野生动物照适合加「自然光、长焦、锐利」。物种名一定要写进提示词——「一只橘色的英国短毛猫」永远好过「一只猫」。',
          },
        ],
        bullets: {
          en: [
            'Name the species AND the breed: "ginger British Shorthair" not "cat"',
            'Fur: color, pattern (striped, spotted), length (short, long, fluffy)',
            'Action: sleeping, running, sitting, looking up, begging',
            'Style switch: photorealistic pet photo / anime style / watercolor illustration',
            'Example: "a golden retriever puppy running on a sunny lawn, natural light, sharp, high-detail photography"',
          ],
          zh: [
            '物种 + 品种都要写：「橘色的英国短毛猫」，别只写「猫」',
            '毛发：颜色、花纹（条纹、斑点）、长短（短毛、长毛、蓬松）',
            '动作：睡觉、奔跑、端坐、抬头、作揖',
            '风格切换：写实宠物照 / 动漫风 / 水彩插画',
            '示例：「金毛寻回犬幼犬，在阳光草坪上奔跑，自然光，锐利，高清写实摄影」',
          ],
        },
      },
      {
        heading: {
          en: 'GPT, Gemini and Midjourney — how the writing style differs',
          zh: 'GPT / Gemini / Midjourney 的写法差异',
        },
        body: [
          {
            en: 'The same idea needs three slightly different ways of writing. In ChatGPT (DALL·E) and Gemini, write a full natural-language paragraph and you can even have a back-and-forth — "make the background plain", "change the shirt to red" — refining in conversation. Midjourney uses /imagine followed by short comma-separated phrases plus parameters: --ar 16:9 for aspect ratio, --v for model version, --style for a stylized look. Both styles work; just match the tool.',
            zh: '同一个想法，在三个工具里有三种写法。ChatGPT（DALL·E）和 Gemini 用一整段自然语言，而且可以像聊天一样来回改——「背景换成纯色」「衬衫改成红色」——边聊边调。Midjourney 用 /imagine 开头，后面跟逗号分隔的短词，再加参数：--ar 16:9 控制宽高比，--v 选模型版本，--style 走风格化。两种风格都能出好图，关键是对上用对工具。',
          },
        ],
        bullets: {
          en: [
            'ChatGPT (DALL·E): full sentences, very natural-language friendly, supports Chinese well',
            'Gemini: full sentences, and you can iterate in the same chat ("make it brighter")',
            'Midjourney: /imagine short phrases + parameters (--ar 16:9, --v 6, --q 2)',
            'Same prompt idea — Midjourney form: "portrait of a smiling woman, white shirt, soft light, plain background, photorealistic --ar 3:4"',
          ],
          zh: [
            'ChatGPT（DALL·E）：整段自然语言，对中文友好，支持边聊边改',
            'Gemini：整段自然语言，同一对话里可以继续让它微调（「再亮一点」）',
            'Midjourney：/imagine 短词 + 参数（--ar 16:9、--v 6、--q 2）',
            '同一条提示词——Midjourney 写法：「portrait of a smiling woman, white shirt, soft light, plain background, photorealistic --ar 3:4」',
          ],
        },
      },
      {
        heading: {
          en: 'Copy-ready templates for people and animals',
          zh: '直接抄的模板（人物 + 动物）',
        },
        body: [
          {
            en: 'Here are ready-to-use templates. Copy one, swap the details in the first two slots, and you are most of the way there. Keep the last slot (style + quality) when you like a look, and delete it when you want to try a different style.',
            zh: '下面几条模板可以直接抄。复制一条，把前两段（主体、细节）换掉，就完成了一大半。风格画质那段如果你喜欢就保留，想换风格就删掉它。',
          },
        ],
        bullets: {
          en: [
            'Portrait: "a 30-year-old Chinese woman, light makeup, long straight black hair, white shirt, soft smile, looking at camera, soft natural light, light gray plain background, half-body portrait, photorealistic, high detail"',
            'Anime girl: "anime style girl, twin tails, pink hair, purple eyes, sailor uniform, side profile, sunlight, cherry blossom background, high-detail illustration"',
            'Headshot: "professional headshot, man in his 40s, short hair, navy suit, confident smile, plain background, studio lighting"',
            'Cat: "a ginger British Shorthair, round face, big eyes, sitting upright, warm indoor light, photorealistic pet photography"',
            'Dog: "a golden retriever puppy running on a sunny lawn, natural light, sharp, high-detail photography"',
            'Wildlife: "a Siberian tiger walking through snow, sharp eyes, natural light, wildlife photography"',
          ],
          zh: [
            '写实女像：「30岁的中国女性，自然淡妆，黑色长直发，白色衬衫，微笑，看向镜头，柔和自然光，浅灰纯色背景，半身肖像照，真实摄影，高细节」',
            '动漫少女：「二次元动漫风格少女，双马尾，粉色头发，紫色眼睛，水手服，侧脸，阳光下，樱花背景，高细节插画」',
            '职业头像：「商务男士，40岁，短发，深蓝西装，自信微笑，纯色背景，摄影棚灯光，职业头像照」',
            '猫：「一只橘色的英国短毛猫，圆脸，大眼睛，端坐着，室内暖光，写实宠物摄影」',
            '狗：「金毛寻回犬幼犬，在阳光草坪上奔跑，自然光，锐利，高清写实」',
            '野生动物：「一只东北虎，在雪地里行走，眼神锐利，自然光，野生动物摄影」',
          ],
        },
      },
      {
        heading: {
          en: 'Why AI images usually still need a little cleanup',
          zh: '生成后为什么还要后期',
        },
        body: [
          {
            en: 'Even a great AI image rarely comes out perfect for the use you have in mind. The background is messy or busy, the edge of the subject has a thin white fringe, there is a text watermark or logo in a corner, or the resolution does not match where you want to post it. These are exactly the jobs a quick browser tool does in seconds — and doing them yourself is far easier than trying to get the AI to fix them.',
            zh: '再好看的 AI 图，通常也达不到你想要的「直接能用」：背景杂乱、主体边缘有白边、角落有文字或 Logo 水印、分辨率和你发布的平台对不上。这些恰恰是浏览器里的免费工具几秒钟能搞定的事——而且自己动手，远比让 AI 去修省事。',
          },
        ],
      },
      {
        heading: {
          en: 'Clean up with SuperPixMia — cutout, new background, watermark',
          zh: '用 SuperPixMia 后期：抠图、换背景、清理',
        },
        body: [
          {
            en: 'All the tools below run 100% in your browser — your AI image never gets uploaded. To swap the background: open the Remove Background tool, it cuts the person or animal out automatically and gives you a transparent PNG, then paste it onto any new background. To cut precisely by hand: open Studio and use Cut Out (trace a loop) or the magic-wand style Remove tool (click to select similar pixels). To fix a white fringe along the edge, click the fringe with Remove and it swallows it. To remove a watermark, logo or stray text, use the Remove Watermark tool (paint over it) or the Heal / Clone brushes in Studio. When you are done, resize, compress or convert to the format you need — every one of these tools also handles a whole batch at once.',
            zh: '下面这些工具全部在浏览器本地运行——你的 AI 图不会被上传。想换背景：打开「去背景」，它自动把人物或动物抠出来，输出透明 PNG，再贴到任意新背景上。想手动精抠：打开「全能编辑 Studio」，用「抠图」沿着主体描一圈，或用「去除」的魔棒点击选取相似区域。边缘有白边：用「去除」的魔棒点一下白边，会被整片吞掉。有文字水印、Logo、多余文字：用首页「去水印」涂抹覆盖，或用 Studio 里的「修复」画笔和「临摹」图章。最后用「改尺寸」「压缩」「格式转换」调整成你要的样子——而且每一个工具都能一次处理整个批次。',
          },
        ],
        bullets: {
          en: [
            'New background: Remove Background → transparent PNG → place on any new background',
            'Precise cutout: Studio → Cut Out (trace) or Remove (magic wand click)',
            'White fringe on the edge: click it with the Remove tool — it selects and clears it',
            'Watermark / text: Remove Watermark (paint over) or Studio Heal & Clone brushes',
            'Size & format: Resize, Compress, Convert — all also work in batch',
          ],
          zh: [
            '换背景：「去背景」→ 透明 PNG → 贴到任意新背景',
            '手动精抠：Studio「抠图」描边 /「去除」魔棒点击',
            '边缘白边：用「去除」的魔棒点击白边，整片选中并清除',
            '水印文字：首页「去水印」涂抹覆盖，或 Studio「修复」「临摹」画笔',
            '尺寸格式：改尺寸 / 压缩 / 格式转换——全部支持批量',
          ],
        },
      },
    ],
    faqs: [
      {
        q: { en: 'Which AI image tool is best for a beginner?', zh: '新手选哪个 AI 生图工具？' },
        a: {
          en: 'If you already use ChatGPT or Gemini, start there — natural language, easy to iterate in the same chat. If you want maximum style control, Midjourney is worth the learning curve. Whichever you pick, the prompt structure in this guide works for all of them.',
          zh: '如果你已经在用 ChatGPT 或 Gemini，就从它们开始——自然语言输入、能在同一对话里反复改。想要最强的风格控制，再学 Midjourney，它有一点学习成本但值得。无论选哪个，本指南的提示词结构都通用。',
        },
      },
      {
        q: { en: 'Should I write prompts in Chinese or English?', zh: '提示词写中文还是英文？' },
        a: {
          en: 'ChatGPT and Gemini handle Chinese well, so write whatever you are comfortable with. Midjourney understands Chinese but tends to perform best with English short phrases. If results feel off, translating the last part of your prompt to English usually helps.',
          zh: 'ChatGPT 和 Gemini 对中文支持很好，用你顺手的话写就行。Midjourney 认识中文，但英文短词效果通常更稳定。如果结果不对劲，把提示词后半段翻成英文试试，常常就好了。',
        },
      },
      {
        q: { en: 'Why do AI faces and hands still look weird?', zh: '为什么 AI 画的五官和手还是怪？' },
        a: {
          en: 'Faces and hands are the hardest parts for image models — there is no prompt that fully guarantees them. Reduce fancy hand poses, favor front-facing faces, and if a detail is wrong, regenerate or fix it later in a tool (paint over it) rather than fighting the model.',
          zh: '五官和手是生图模型最难的部分，没有哪个提示词能完全保证。少安排复杂手势、多用正面脸；某一处画崩了，直接重生成，或用画笔涂抹修复，别跟模型较劲。',
        },
      },
      {
        q: { en: 'After cutting out the subject, how do I put it on a new background?', zh: '抠完图怎么换背景？' },
        a: {
          en: 'Run Remove Background to get a transparent PNG, open it in any editor (or your messaging app), and paste it over your new background. For a matching soft edge, cut out with Studio instead of the auto tool for fine control.',
          zh: '先用「去背景」得到透明 PNG，然后在任意编辑器或聊天应用里把它贴到新背景上。想要更柔和的边缘，用 Studio「抠图」手动描边，控制更细。',
        },
      },
      {
        q: { en: 'The generated image has a white fringe around the subject. How do I clean it?', zh: '生成的图边缘有一圈白边，怎么清理？' },
        a: {
          en: 'Open the image in Studio, switch to the Remove tool, and click on the white fringe — the magic wand selects the thin white ring around the subject and clears it. Raise the tolerance if it misses thin areas.',
          zh: '把图放进 Studio，切到「去除」工具，点击白边——魔棒会自动选中主体周围那圈细白边并清除。如果细处没选中，把容差调大一点。',
        },
      },
    ],
  },
  {
    path: '/blog/make-ai-gif',
    title: {
      en: 'How to Make AI Animated GIFs (Stickers & Memes): AI Frames → Batch Cleanup → Assemble',
      zh: '用 AI 做动态图（表情包 / 贴纸）全教程：AI 生成关键帧 → 批量抠图去水印 → 合成 GIF',
    },
    description: {
      en: 'The frame-by-frame method: ask an AI to draw 4–6 frames of the same character in different poses, batch-clean every frame (cutout, watermark, uniform size) with free browser tools, then combine them into an animated GIF. No video model required.',
      zh: '逐帧法：让 AI 画出同一个角色的 4~6 帧不同动作，用免费的浏览器工具给所有帧批量抠图、去水印、统一尺寸，最后合成动态 GIF。不用视频模型，也能做出表情包和贴纸。',
    },
    date: '2026-08-23',
    category: { en: 'AI Tutorials', zh: 'AI 教程' },
    tags: ['GIF', '动态图', '表情包', '贴纸', 'AI生图', '批量抠图', 'animated sticker'],
    keywords: {
      en: 'make ai gif, ai animated gif, ai meme, ai stickers, frame by frame gif, ai gif tutorial, batch cutout, batch background removal',
      zh: 'AI做GIF,AI动态图,AI表情包,AI贴纸,逐帧GIF,AI动图教程,批量抠图,批量去背景',
    },
    sections: [
      {
        heading: {
          en: 'Two ways to make an animated image',
          zh: '做动态图的两条路子',
        },
        body: [
          {
            en: 'There are two ways to make an animated image. The first: use a text-to-video model (Runway, Kling, Hailuo, or similar) to generate a short clip, then convert it to a GIF. The second — the frame-by-frame method — is to have an image AI draw 4–6 still frames of the same character in different poses, then assemble them into a looping GIF. The frame method gives you control over every single frame: you can cut out the subject, remove a watermark, and fix a bad frame before it ever becomes part of the animation.',
            zh: '做动态图有两条路子。第一条：用文生视频模型（Runway、可灵、即梦等）生成一小段视频，再转成 GIF。第二条——也就是这篇教的「逐帧法」——让生图 AI 画出同一个角色的 4~6 张静态关键帧，再合成一个循环 GIF。逐帧法的好处是你掌控每一帧：可以先抠图、去水印、修好某一帧，再让它变成动画。',
          },
        ],
        bullets: {
          en: [
            'Video-model route: prompt → short clip → convert to GIF (feels like magic, but every frame is hard to fix)',
            'Frame-by-frame route: AI draws N still frames → you clean each one → assemble into a GIF',
            'Frame method wins for stickers, memes and simple loops where you want each frame to look right',
          ],
          zh: [
            '视频模型路线：一句话 → 一段短视频 → 转 GIF（很神奇，但每一帧都很难单独修）',
            '逐帧法路线：AI 画出 N 张静态帧 → 你自己修好每一帧 → 合成 GIF',
            '做表情包、贴纸、简单动作循环，逐帧法完胜——因为每帧都能单独把关',
          ],
        },
      },
      {
        heading: {
          en: 'Why the frame-by-frame method fits memes and stickers',
          zh: '为什么逐帧法特别适合表情包和贴纸',
        },
        body: [
          {
            en: 'A meme or sticker is essentially a 2-to-6-frame loop: blink, wave, nod, walk-cycle. Video models are overkill — they animate the background too, the character style drifts between frames, and you cannot fix one bad frame. With the frame method you can cut every frame to a transparent background (making a real sticker), scrub a watermark off one frame, and keep the character identical in all of them by reusing the same character description in each prompt.',
            zh: '表情包或贴纸，本质上就是 2~6 帧的循环：眨眼、挥手、点头、走路循环。用视频模型反而是杀鸡用牛刀——它会把背景也动起来、角色风格还会在帧之间漂移，而且某一帧坏了没法单独修。逐帧法里，你能把每一帧都抠成透明背景（做成真正的贴纸）、给某一帧擦掉水印、还能通过复用同一段角色描述让所有帧的角色长得一模一样。',
          },
        ],
      },
      {
        heading: {
          en: 'Step 1 — plan the frames before you generate',
          zh: '第一步：生成前先规划帧',
        },
        body: [
          {
            en: 'Decide three things before you open any AI tool. Frame count: 4–6 is the sweet spot for stickers and memes (fewer looks choppy, more gets heavy as a GIF). Frame size: pick one size for all frames, for example 512×512 or 1080×1080 — mismatched sizes break the assembly step. And the action loop: list the poses you want in order, e.g. eyes closed → eyes open → look left → look right → back. Writing the loop on paper first makes everything downstream smoother.',
            zh: '打开任何 AI 工具之前，先定三件事。帧数：4~6 帧是表情包和贴纸的最佳区间（太少会卡顿，太多 GIF 会很大）。尺寸：所有帧统一用同一个尺寸，比如 512×512 或 1080×1080——尺寸不一致，后面合成会出问题。动作循环：把想要的动作按顺序列出来，例如：闭眼 → 睁眼 → 看左 → 看右 → 回到闭眼。先在纸上把循环列清楚，后面每一步都顺。',
          },
        ],
      },
      {
        heading: {
          en: 'Step 2 — generate each frame with a consistent character',
          zh: '第二步：让 AI 生成每一帧，并保持角色一致',
        },
        body: [
          {
            en: 'Keep the character identical by keeping the character part of the prompt fixed and changing only the action. Write the character description once, then for each frame reuse it verbatim and append the new pose. The five-part structure from our prompt guide applies here too: 主体 + 细节 + 动作 + 环境 + 风格. Generate the frames one at a time so you can check each one.',
            zh: '想让角色保持一致，就把提示词里「角色描述」部分固定不动，只改动作。角色描述只写一次，然后每生成一帧，原样复用这段，后面追加新的动作。第一篇指南里的五段式在这里同样适用：主体 + 细节 + 动作 + 环境 + 风格。逐张生成、逐张检查，别一口气全出。',
          },
        ],
        bullets: {
          en: [
            'Fix the character: same species/age/hair/outfit words in every frame prompt',
            'Change only the action slot: "eyes closed" → "eyes open" → "looking left" → "looking right"',
            'Generate one frame at a time and check it before moving on',
            'Example loop for a cat sticker: "a ginger British Shorthair, round face, big eyes, plain background, sticker style, blinking eyes"',
          ],
          zh: [
            '固定角色：每帧提示词里，物种/年龄/毛发/服装那几个词原样不动',
            '只改动作：「闭眼」→「睁眼」→「看左」→「看右」',
            '一帧一帧生成，确认没问题再出下一帧',
            '猫贴纸的循环示例：「一只橘色英国短毛猫，圆脸，大眼睛，纯色背景，贴纸风格，眨眼」',
          ],
        },
      },
      {
        heading: {
          en: 'Step 3 — batch-clean all frames in SuperPixMia',
          zh: '第三步：把全部帧批量导入 SuperPixMia 后期',
        },
        body: [
          {
            en: 'This is where the platform earns its keep: every cleanup tool runs in the browser and handles a whole batch at once, so you import all frames in one go and download everything as one ZIP. Cut out the character from every frame with the Remove Background tool (batch mode) to get transparent PNGs — your GIF becomes a sticker. If any frame has a watermark or stray text, paint over it with the Remove Watermark tool, also in batch. Then make sure all frames are the same size with Resize (batch), and shrink file size with Compress (batch) before assembling.',
            zh: '这正是这个平台最省事的地方：每个后期工具都在浏览器里跑，而且都能一次处理整个批次——你把所有帧一次导入，一次性打包 ZIP 下载。用「去背景」工具（批量模式）把每一帧的角色都抠出来，得到透明 PNG——你的 GIF 就变成了贴纸。哪一帧上有水印或多余文字，用「去水印」涂抹掉，同样支持批量。再在合成前用「改尺寸」（批量）把所有帧统一成一样大小，用「压缩」（批量）把体积压下来。',
          },
        ],
        bullets: {
          en: [
            'Import every frame at once — each tool handles the whole batch and exports one ZIP',
            'Cutout for stickers: Remove Background (batch) → transparent PNG frames',
            'Cleanup: Remove Watermark (batch) → paint over text/logo on any frame',
            'Uniform size: Resize (batch) so all frames match before assembly',
            'Smaller file: Compress (batch) keeps the final GIF light',
          ],
          zh: [
            '所有帧一次导入——每个工具都支持批量，结果一键打包 ZIP',
            '贴纸关键：去背景（批量）→ 每帧都变成透明 PNG',
            '清理：去水印（批量）→ 哪一帧有文字/Logo 就涂哪一帧',
            '统一尺寸：改尺寸（批量），让所有帧在合成前尺寸一致',
            '控制体积：压缩（批量），让最终 GIF 轻一点',
          ],
        },
      },
      {
        heading: {
          en: 'Step 4 — assemble the frames into a GIF with the SuperPixMia GIF Maker',
          zh: '第四步：用 SuperPixMia GIF 合成器把帧合成 GIF',
        },
        body: [
          {
            en: 'SuperPixMia now has its own GIF Maker at /gif-maker, so the whole pipeline stays in one place. Add your cleaned frames in order (the tool keeps your order — reorder at any time), set the loop to "infinite" (that is what makes a sticker loop), pick a frame rate around 8–12 fps, and click Generate. Transparent PNG frames keep their transparency, so a cut-out sticker assembles into a true transparent animated sticker.',
            zh: 'SuperPixMia 现在自带「GIF 合成器」（/gif-maker），整条流程可以都在平台里完成。按顺序添加整理好的帧（工具会保留你的顺序，随时可调整），循环设为「无限循环」——这正是贴纸能一直转的原因，帧速率设到每秒 8~12 帧，点「生成」即可。透明 PNG 帧会保留透明背景，抠好的贴纸直接合成透明动图贴纸。',
          },
        ],
        bullets: {
          en: [
            'Assembly is in-platform now: SuperPixMia GIF Maker at /gif-maker',
            'Order the frames as planned — the tool keeps your order, reorder anytime',
            'Frame rate ~8–12 fps is the sweet spot for stickers and memes',
            'Transparent PNG frames → the GIF keeps transparency, a real sticker',
            'Cap the max edge at 512 or below to keep the GIF light',
          ],
          zh: [
            '合成在平台内完成：SuperPixMia GIF 合成器（/gif-maker）',
            '按规划好的顺序添加帧——工具保留顺序，随时可调整',
            '帧速率 8~12 fps 是表情包/贴纸的最佳区间',
            '透明 PNG 帧 → GIF 保留透明背景，就是真贴纸',
            '最大边长控制在 512 以内，GIF 更轻',
          ],
        },
      },
      {
        heading: {
          en: 'Bonus — putting the animation on a website (you may not even need a GIF)',
          zh: '加分项：把动画放到网站上（甚至不一定需要 GIF）',
        },
        body: [
          {
            en: 'If your animation is for a website, you often do not need to assemble a GIF at all. Our own mascot is a real example: the little cat on superpixmia.com is 5 static WebP images that the page swaps with JavaScript timers to create the blink and float effect — no GIF file anywhere. For 2–6 frames this is the lightest approach. You can do the same with plain CSS — a sprite sheet of frames flipped with the steps() timing function, or showing different <img> sources over time. GIF is still the best format for stickers you send in chat apps, but on a website, multiple still images give sharper edges, smaller bytes, and perfect transparency.',
            zh: '如果你的动画是要用在网站上，很多时候根本不用合成 GIF。我们官网的猫咪吉祥物就是一个真实案例：superpixmia.com 上那只小猫，是 5 张静态 WebP 图，页面用 JS 定时切换出眨眼、飘浮的动效——整个站没有任何 GIF 文件。2~6 帧的动画，这是最轻的做法。你完全可以用同样的方式：用 CSS 逐帧动画（雪碧图 + steps() 时序函数切换 background-position），或按时间切换不同的 <img> 图片。GIF 在聊天软件里发贴纸仍然是最佳选择，但在网站上，多张静态图片边缘更清晰、体积更小、透明也更完美。',
          },
        ],
        bullets: {
          en: [
            'Real example: the cat on superpixmia.com = 5 static WebP frames swapped by JS timers — no GIF file',
            'CSS sprite animation: one image + steps() to flip through frames',
            'Websites prefer still frames: sharper, lighter, perfect transparency',
            'GIF is still best for chat-app stickers; still frames win on the web',
          ],
          zh: [
            '真实案例：官网猫咪 = 5 张静态 WebP 帧 + JS 定时切换，没有 GIF 文件',
            'CSS 雪碧图逐帧动画：一张图 + steps() 切换帧',
            '网页上静态帧更优：更清晰、更小、透明完美',
            '聊天软件发贴纸还是 GIF 最好；网页上用静态帧更合适',
          ],
        },
      },
      {
        heading: {
          en: 'Optimizing and common pitfalls',
          zh: '优化与常见坑',
        },
        body: [
          {
            en: 'Three things trip people up most. Size: too many frames or too-high resolution makes a GIF that is megabytes heavy — compress the frames first and keep the loop short. Consistency: if the character changes between frames it looks like a jump-cut, so reuse the exact character words in every prompt. Loop point: the last frame should flow back into the first — plan the loop before generating, not after. If one frame is slightly off, fix that single frame instead of regenerating the whole set.',
            zh: '最常绊倒人的有三件事。体积：帧数太多或分辨率太高，GIF 会重达好几 MB——先把帧压缩好，循环也别太长。一致性：角色在帧之间变化，看起来就像跳帧——所以每帧提示词里角色那几个词必须一模一样。循环点：最后一帧要能无缝接回第一帧——在生成前规划好循环，而不是生成后补救。某一帧差一点，就单独修那一帧，别整套重来。',
          },
        ],
        bullets: {
          en: [
            'Keep it light: fewer frames + compressed frames = a usable GIF',
            'Reuse the exact character words in every frame prompt to avoid style jumps',
            'Plan the loop before generating so the last frame flows back into the first',
            'Fix a single bad frame, not the whole set',
          ],
          zh: [
            '控制体积：少几帧 + 帧先压缩 = GIF 才能用',
            '每帧复用一模一样的角色描述，避免画风跳变',
            '生成前规划好循环点，让最后一帧能接回第一帧',
            '某一帧坏了就修那一帧，别整套重来',
          ],
        },
      },
    ],
    faqs: [
      {
        q: { en: 'How many frames do I need for a sticker GIF?', zh: '做一个贴纸 GIF 需要几帧？' },
        a: {
          en: '4–6 frames is the sweet spot. Two frames reads as a flash, eight-plus gets heavy as a GIF file. For blinking and waving, 4 frames is plenty.',
          zh: '4~6 帧是最佳区间。2 帧看起来像闪一下，8 帧以上 GIF 文件会偏大。眨眼、挥手这类，4 帧就足够。',
        },
      },
      {
        q: { en: 'The character looks different in every frame. How do I keep it consistent?', zh: '每帧角色长得都不一样，怎么保持？' },
        a: {
          en: 'Copy the exact same character description into every frame prompt and change only the action part. If it still drifts, generate all frames in one session, or generate one master image and ask the AI to redraw it in different poses.',
          zh: '把同一段角色描述原样复制进每一帧的提示词，只改动作部分。还漂的话，就在同一次对话里连续生成所有帧，或先出一张角色定妆照，再让 AI 照着它画不同姿势。',
        },
      },
      {
        q: { en: 'Can I make a sticker with a transparent background?', zh: '能做透明背景的贴纸吗？' },
        a: {
          en: 'Yes. Run each frame through Remove Background (batch) to get transparent PNGs, then assemble the transparent frames into a GIF with an online GIF maker. The animation keeps the transparency.',
          zh: '可以。把每一帧都过一遍「去背景」（批量）得到透明 PNG，再用在线 GIF 工具把透明帧合成 GIF，动画会保留透明背景。',
        },
      },
      {
        q: { en: 'Why is my GIF file so large, and how do I make it smaller?', zh: '为什么我的 GIF 很大，怎么变小？' },
        a: {
          en: 'GIF compresses poorly, so frame count and resolution dominate the size. Reduce the number of frames, resize the frames smaller (e.g. 512px), and compress each frame before assembling. Lowering the frame rate to 8 fps also helps.',
          zh: 'GIF 的压缩效率本来就不高，帧数和分辨率决定体积。减少帧数、把帧改小（如 512px）、合成前逐帧压缩，再把帧速率降到 8fps，都会明显变小。',
        },
      },
      {
        q: { en: 'Does SuperPixMia generate GIF files?', zh: 'SuperPixMia 能直接生成 GIF 吗？' },
        a: {
          en: 'Yes — since the GIF Maker launched, SuperPixMia can assemble your cleaned frames into an animated GIF at /gif-maker. It still does not generate moving images from a prompt alone: you bring the AI frames, and the tool stitches, reorders, and tunes them into a looping GIF with transparency.',
          zh: '可以——上线 GIF 合成器后，SuperPixMia 可以在 /gif-maker 把你整理好的帧合成为动图 GIF。它仍然不是「输入一句话就生成动图」；你提供 AI 生成的帧，平台负责把帧拼接、排序、调帧率，合成带透明背景的循环 GIF。',
        },
      },
    ],
  },
]
