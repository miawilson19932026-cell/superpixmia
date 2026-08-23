// /studio — pick ONE image, then work in the combined editor.
import { useCallback, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from '../../i18n'
import EditorWorkspace, { StudioTutorial, type SourceImage } from './EditorWorkspace'
import SeoContent from '../SeoContent'
import CatMascot from '../CatMascot'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/x-icon', 'image/tiff', 'image/vnd.microsoft.icon']
const MAX_SIZE = 50 * 1024 * 1024

export default function EditorPage() {
  const { t, lang } = useTranslation()
  const [source, setSource] = useState<SourceImage | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => setSource({ file, url, width: img.width, height: img.height })
    img.src = url
  }, [])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const f = Array.from(files)[0]
    if (!f) return
    if (!ACCEPTED.includes(f.type)) { alert(t.errorUnsupportedFormat); return }
    if (f.size > MAX_SIZE) { alert(t.errorFileTooBig); return }
    onPick(f)
  }, [onPick, t])

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }} />
      {source ? (
        <div>
          <EditorWorkspace key={source.url} source={source} onReset={() => setSource(null)} onReplace={() => inputRef.current?.click()} />
          <SeoContent variant="studio" />
        </div>
      ) : (
        <div>
          <div className="mx-auto max-w-2xl w-full px-3 sm:px-6 pt-14 sm:pt-16 pb-10">
      <h1 className="text-center text-2xl sm:text-3xl font-black">
        <span className="text-gradient">{lang === 'zh' ? '全能编辑 Studio' : 'Studio Editor'}</span>
      </h1>
      <p className="text-center text-xs sm:text-sm text-[var(--text-dim)] mt-2 mb-8 max-w-md mx-auto leading-relaxed">
        {t.studioTagline}
      </p>

      <div className="relative">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          tabIndex={0}
          className={`
            relative p-8 sm:p-10 rounded-[var(--radius-xl)] glass neon-top-line cursor-pointer
            flex flex-col items-center justify-center gap-3 transition-all duration-300 outline-none
            ${isDragOver ? 'scale-[1.01]' : ''}
          `}
          style={{
            border: isDragOver ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(59,130,246,0.12)',
            boxShadow: isDragOver ? '0 0 24px var(--accent-glow)' : undefined,
          }}
        >
          {/* Centerpiece icon: layered brushes */}
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragOver ? 'bg-[var(--accent)]/12 scale-110' : 'bg-white/[0.04]'}`}>
            <svg className={`w-20 h-20 sm:w-24 sm:h-24 transition-all duration-300 ${isDragOver ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]/55'}`}
              viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="12" width="30" height="24" rx="5" opacity="0.25" />
              <rect x="5" y="13" width="30" height="24" rx="5" opacity="0.55" />
              <path d="M14 22h8M14 26h6M14 30h7" opacity="0.7" />
              <path d="M37 9l5-5 2 2-5 5z" />
              <path d="M38 8l4 4" strokeWidth={2.4} />
            </svg>
          </div>
          <p className="text-lg sm:text-xl">
            {lang === 'zh' ? (
              <><span className="text-gradient font-bold">选择一张图片</span><span className="text-white/70 font-medium">开始全能编辑</span></>
            ) : (
              <><span className="text-gradient font-bold">Pick one image</span><span className="text-white/70 font-medium"> to start</span></>
            )}
          </p>
          <button type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }} className="px-5 py-2.5 btn-gradient text-sm font-medium rounded-[var(--radius-md)]">
            {t.studioOpen}
          </button>
          <div className="flex flex-col items-center gap-1 text-[10px] sm:text-[11px] text-[var(--text-dim)] text-center leading-relaxed">
            <span>{t.dropFormats}</span>
            <span>{t.dropMaxSize}</span>
          </div>
        </div>
          <CatMascot />
        </div>
      </div>

      <div className="mx-auto max-w-6xl w-full px-3 sm:px-6 pb-14">
        <StudioTutorial lang={lang} />
      </div>

          <SeoContent variant="studio" />
      </div>
      )}
    </>
  )
}
