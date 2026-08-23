# SuperPixMia — Product Hunt Launch Kit

> 提交地址：https://www.producthunt.com/posts/new
> 所有字段均可直接复制粘贴。发布当天尽量选**美西时间早上（PT 00:00 发布，赶当天榜单）**，最佳窗口一般是发布日当天第一个整点。

---

## 1. 基本信息

| 字段 | 内容 |
|------|------|
| **Name** | `SuperPixMia` |
| **Website URL** | `https://www.superpixmia.com/` |
| **Tagline** | 见下方（≤60 字符，结尾不要句号） |
| **Topics** | `Developer Tools` · `Design Tools` · `Web App`（最多 3 个） |
| **Logo** | `ih-logo.png`（800×800 透明 PNG，仓库根目录） |

### Tagline 选项（三选一，推荐第一个）

1. **`Resize, compress, remove BG & convert in your browser`**（53 字符）
   — 最稳：说清是什么 + 在哪用，一眼看懂。

2. **`Your images never leave your browser — free & private`**（55 字符）
   — 差异化打法：主打「照片不上传 = 隐私」，和同类工具站拉开差距。注意它没点明功能，依赖名字配合。

3. **`Free, private image toolkit — resize, compress & remove BG`**（58 字符）
   — 折中：免费 + 隐私 + 主要功能，信息最全。

> 发布前用手机宽度再看一眼 tagline 是否被截断；PH 只显示一行。

---

## 2. Description（260–400 字符最佳，上限 ~500）

```
SuperPixMia is a free, open-source image toolkit that runs 100% in your browser. Resize with presets, compress with a quality slider, remove backgrounds with AI (WebAssembly), and convert between 9 formats — PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, TIFF. Batch up to 15 images at once and download as ZIP. No uploads, no ads, no watermarks — your images never leave your device.
```

（约 390 字符，符合要求。需要更短可删掉 "download as ZIP"。）

---

## 3. Gallery 图片（4–6 张，推荐 1270×760，16:9）

第一张建议用 GIF（≤10MB），其余用真实截图。**展示真实 UI，别放文字堆砌的图。**

| # | 内容 | 说明 |
|---|------|------|
| 1 | **Studio 演示 GIF**（旋转→加字→涂鸦→裁剪） | 已写好采集脚本 `e2e/studio-demo-gif.mjs`，跑出来就是 PH 最爱的"动态演示" |
| 2 | **首页四工具总览**（Resize / Compress / Remove BG / Convert 同框） | 让路人 3 秒看懂产品是什么 |
| 3 | **Remove Background 前后对比** | 视觉冲击最强的一张，用 `e2e/demo-scenery.png` |
| 4 | **Resize 预设面板**（OG Image / Favicon / Instagram…） | 开发者看到就懂 |
| 5 | **Compress 前后大小对比** | 数字变化比文字有说服力 |
| 6 | **Convert 批量转格式**（9 格式 + ZIP 下载） | 收尾展示广度 |

**logo 用 `ih-logo.png`（800×800），别用 512 那张（偏小）。**

---

## 4. First Comment（发布后第一条评论，带节奏用）

发布后立刻自己发第一条评论讲「故事 + 身份 + 需求」，别等别人先聊：

```
Hi PH! 👋 I'm Mia — a 10-year product manager who can't code, and I built SuperPixMia with the help of AI as a solo maker.

The problem: every online image tool uploads your photos to their server. Screenshots, product shots, even private photos — gone the moment you hit "compress". I wanted a toolkit where nothing ever leaves my machine.

So I made SuperPixMia: resize, compress, remove backgrounds, and convert between 9 formats — all running in your browser via WebAssembly. No sign-up needed, no ads, no watermarks, free forever. The background remover is surprisingly good — try it with a portrait photo.

This is my first Product Hunt launch and honestly I'm nervous 😄 What would you add? What's missing? Real feedback means the world to me — roast away.
```

（也可以加一句：中文也可以提，但 PH 评论区英文为主。）

---

## 5. 发布前 checklist

- [ ] 登录功能收尾、本地验证、push 上线（PH 流量进来时登录不能是坏的）
- [ ] 确认 `https://www.superpixmia.com/studio` 在手机 + 桌面都正常
- [ ] 生成 gallery：先跑 `node e2e/studio-demo-gif.mjs` 出 GIF，再补 4–5 张截图
- [ ] 头像 / 个人简介写清楚「10y PM · solo maker · building with AI」
- [ ] 想好并填好 PH 的 Maker 信息（链接到你的 GitHub / X，@superpixmia 已有）
- [ ] 选发布日：周中（周二~周四）最佳，避开周末；发布后头 12 小时是黄金窗口
- [ ] 提前准备 2–3 位朋友真实评论（别买水军，社区看得穿）
- [ ] 发布后 12–24h 内回复每一条评论，不要只发不管

---

## 6. 记住两件事

1. **PH 是增长/验证渠道，不是收入渠道。** 免费产品在 PH 反而更容易被投票。支付/定价等拿到真实需求信号再做。
2. **上不上首页是算法的事，别灰心。** 工具类目竞争大，即使没上首页，当天的直接流量 + 外链 + 注册也一样值钱。发完至少再挂 3–4 天，随时回评论。
