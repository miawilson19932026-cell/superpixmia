import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from '../i18n'
import { TOOL_KEYS, toolIcons, toolLabelKey } from '../lib/tools'
import { toolPaths } from '../lib/routes'

export default function Header() {
  const { t, lang, toggleLang } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile menu when navigating
  const closeMenu = () => setMenuOpen(false)

  // Lock page scroll while the mobile drawer is open (it overlays content)
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [menuOpen])

  // Desktop link style: pill, highlighted when the current route matches.
  const linkClass = (active: boolean) => `
    shrink-0 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200
    ${active
      ? 'glass-active text-[var(--accent)]'
      : 'text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
    }
  `

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex items-center justify-between py-2 sm:py-3">
          {/* Left: Brand + Tagline */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <NavLink to="/" onClick={closeMenu} className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
              <img src="/logo.svg" alt="SuperPixMia" className="h-10 sm:h-12 w-auto shrink-0" />
            </NavLink>

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

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => linkClass(isActive)}>
              {t.navHome}
            </NavLink>
            <NavLink to="/blog" onClick={closeMenu} className={({ isActive }) => linkClass(isActive)}>
              {t.navBlog}
            </NavLink>
            {/* Help = compact question-mark icon */}
            <NavLink
              to="/help"
              onClick={closeMenu}
              title={t.navHelp}
              aria-label={t.navHelp}
              className={({ isActive }) => `
                shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200
                ${isActive
                  ? 'glass-active text-[var(--accent)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
                }
              `}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </NavLink>
          </nav>

          {/* Right: Lang toggle + mobile hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleLang}
              className="text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-primary)] glass backdrop-blur-xl hover:border-white/[0.14] rounded-[var(--radius-sm)] px-2.5 py-1.5 transition-all"
              title="Switch language"
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={t.navHelp}
              aria-expanded={menuOpen}
              className="lg:hidden shrink-0 flex flex-col items-center justify-center gap-[5px] w-9 h-9 rounded-[var(--radius-sm)] glass backdrop-blur-xl hover:border-white/[0.14] transition-all"
            >
              <span className={`block h-[2px] w-4 rounded-full bg-current transition-all duration-200 ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
              <span className={`block h-[2px] w-4 rounded-full bg-current transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-[2px] w-4 rounded-full bg-current transition-all duration-200 ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
            </button>
          </div>
        </div>

      </div>

      {/* Mobile drawer: slide-in from the right — overlays content, no layout shift */}
      <div
        className={`lg:hidden fixed inset-0 z-[100] transition-opacity duration-300 ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMenu} />

        {/* Panel */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-[78%] max-w-xs flex flex-col border-l border-white/[0.08] glass shadow-2xl transition-transform duration-300 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
            <span className="text-sm font-black tracking-wider text-gradient">SuperPixMia</span>
            <button
              onClick={closeMenu}
              aria-label="Close menu"
              className="flex items-center justify-center w-8 h-8 rounded-full glass hover:border-white/[0.14] transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <MobileNavLink to="/" onClick={closeMenu} active={pathname === '/'}>
              {t.navHome}
            </MobileNavLink>
            <MobileNavLink to="/blog" onClick={closeMenu} active={pathname.startsWith('/blog')}>
              {t.navBlog}
            </MobileNavLink>
            <MobileNavLink to="/help" onClick={closeMenu} active={pathname.startsWith('/help')}>
              {t.navHelp}
            </MobileNavLink>

            {/* Tools — compact icon grid */}
            <p className="pt-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
              {lang === 'zh' ? '工具' : 'Tools'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TOOL_KEYS.map((tool) => {
                const isActive = pathname === toolPaths[tool]
                const icons = toolIcons[tool]
                const label = t[toolLabelKey[tool] as keyof typeof t] as string
                return (
                  <NavLink
                    key={tool}
                    to={toolPaths[tool]}
                    onClick={closeMenu}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'glass-active text-[var(--accent)]'
                        : 'text-[var(--text-dim)] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="h-4 w-4 shrink-0">{isActive ? icons.filled : icons.outline}</span>
                    <span className="truncate">{label}</span>
                  </NavLink>
                )
              })}
            </div>
          </nav>

          {/* Lang toggle */}
          <div className="p-3 border-t border-white/[0.06]">
            <button
              onClick={toggleLang}
              className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-sm)] glass px-3 py-2.5 text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
            >
              <span>{lang === 'zh' ? 'English' : '中文'}</span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-dim)]/70">{lang}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function MobileNavLink({
  to,
  onClick,
  active,
  children,
}: {
  to: string
  onClick: () => void
  active: boolean
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        active ? 'glass-active text-[var(--accent)]' : 'text-[var(--text-dim)] hover:bg-white/[0.04]'
      }`}
    >
      {children}
    </NavLink>
  )
}
