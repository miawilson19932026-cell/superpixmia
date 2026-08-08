import { useTranslation } from '../i18n'

export default function Header() {
  const { lang, toggleLang } = useTranslation()

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex items-center justify-between py-2 sm:py-3">
          {/* Left: Brand + Tagline */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img src="/logo.svg" alt="SuperPixMia" className="h-10 sm:h-12 w-auto shrink-0" />

            {lang === 'zh' ? (
              <div className="hidden sm:block min-w-0">
                <p className="text-sm sm:text-lg font-black tracking-wider leading-tight">
                  <span className="text-gradient">轻量化</span>
                  <span className="text-white/85">一站式图像工具</span>
                </p>
                <p className="text-[12px] sm:text-sm tracking-[0.15em] text-[var(--text-dim)]/80 mt-0.5">
                  简易极速，<span className="text-emerald-300/80 font-semibold">数据安全</span>无负担
                </p>
              </div>
            ) : (
              <div className="hidden sm:block min-w-0">
                <p className="text-sm sm:text-lg font-black tracking-wider leading-tight">
                  <span className="text-gradient">Lightweight</span>
                  <span className="text-white/85"> image toolkit</span>
                </p>
                <p className="text-[12px] sm:text-sm tracking-[0.15em] text-[var(--text-dim)]/80 mt-0.5">
                  simple, fast, <span className="text-gradient font-bold">100% private</span>
                </p>
              </div>
            )}
          </div>

          {/* Right: Lang Toggle only */}
          <button
            onClick={toggleLang}
            className="shrink-0 text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-primary)] glass backdrop-blur-xl hover:border-white/[0.14] rounded-[var(--radius-sm)] px-2.5 py-1.5 transition-all"
            title="Switch language"
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </div>
    </header>
  )
}
