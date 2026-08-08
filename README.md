# SuperPixMia — Free Online Image Toolkit

**All processing happens in your browser. Nothing is uploaded to any server.**

SuperPixMia is a client-side image toolkit built for developers & designers. Resize, compress, remove backgrounds, and convert between 9 image formats — fast, private, and free forever.

## Features

- 📐 **Resize** — pixels / presets (OG Image, Favicon, Instagram, etc.), aspect ratio lock
- 📦 **Compress** — quality slider with real-time size comparison, keeps original format
- ✂️ **Remove Background** — AI-powered, runs locally via WebAssembly
- 🔄 **Convert** — PNG / JPEG / WebP / AVIF / BMP / ICO, batch support
- 🖱️ **Drag & Drop** — single or batch mode (up to 15 images)
- 📱 **Responsive** — works great on mobile, tablet, and desktop
- 🌍 **i18n** — English & 中文
- 🔒 **100% Private** — zero server, all processing in your browser

## Supported Formats

PNG, JPEG, WebP, AVIF, GIF, BMP, SVG, ICO, TIFF

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Compression | `browser-image-compression` |
| Background Removal | `@imgly/background-removal` (WASM) |
| Batch Download | `JSZip` |
| Deployment | Vercel |

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## License

MIT
