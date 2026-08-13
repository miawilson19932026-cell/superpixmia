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
]
