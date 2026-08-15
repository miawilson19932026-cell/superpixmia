import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from '../i18n'
import { useAuth } from '../lib/auth'
import { TOOL_KEYS, toolIcons, toolLabelKey, AI_COMING_ITEMS } from '../lib/tools'
import { toolPaths, EDITOR_PATH } from '../lib/routes'

export default function Header() {
  const { t, lang, toggleLang } = useTranslation()
  const { user, loading, openLogin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [comingToast, setComingToast] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile menu when navigating
  const closeMenu = () => setMenuOpen(false)

  // Auto-dismiss the "coming soon" toast (same UX as the homepage AI cards).
  useEffect(() => {
    if (!comingToast) return
    const t = setTimeout(() => setComingToast(false), 2600)
    return () => clearTimeout(t)
  }, [comingToast])

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
            {/* Studio — flagship combined editor */}
            <NavLink
              to={EDITOR_PATH}
              onClick={closeMenu}
              className={({ isActive }) => `
                shrink-0 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'glass-active text-[var(--accent)]'
                  : 'text-[var(--accent)]/80 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 border border-[var(--accent)]/25'
                }
              `}
            >
              <span className="text-gradient">{lang === 'zh' ? '全能编辑' : 'Studio'}</span>
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

          {/* Right: Auth + Lang toggle + mobile hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <div className="hidden sm:block w-16 h-8 rounded-[var(--radius-sm)] glass opacity-60" aria-hidden />
            ) : user ? (
              <div className="hidden sm:flex items-center gap-1.5 max-w-[160px]">
                <span className="text-xs text-[var(--text-dim)] truncate" title={user.email ?? ''}>
                  {user.email ?? '—'}
                </span>
                <button
                  onClick={signOut}
                  className="shrink-0 glass rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
                >
                  {t.authSignOut}
                </button>
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="hidden sm:block px-4 py-1.5 btn-gradient text-xs font-semibold rounded-[var(--radius-sm)]"
              >
                {t.authSignIn}
              </button>
            )}
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
            {user ? (
              <div className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 glass">
                <span className="text-xs text-[var(--text-dim)] truncate">{user.email ?? '—'}</span>
                <button onClick={signOut} className="shrink-0 text-xs font-medium text-[var(--accent)]">
                  {t.authSignOut}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  openLogin()
                  closeMenu()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 btn-gradient text-sm font-semibold"
              >
                {t.authSignIn}
              </button>
            )}
            <MobileNavLink to="/" onClick={closeMenu} active={pathname === '/'}>
              {t.navHome}
            </MobileNavLink>
            <MobileNavLink to="/blog" onClick={closeMenu} active={pathname.startsWith('/blog')}>
              {t.navBlog}
            </MobileNavLink>
            <MobileNavLink to="/help" onClick={closeMenu} active={pathname.startsWith('/help')}>
              {t.navHelp}
            </MobileNavLink>

            {/* Studio — flagship combined editor */}
            <NavLink
              to={EDITOR_PATH}
              onClick={closeMenu}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition-all border border-[var(--accent)]/25 ${
                pathname === EDITOR_PATH ? 'glass-active text-[var(--accent)]' : 'text-[var(--accent)]/85 hover:bg-[var(--accent)]/10'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <rect x="3" y="12" width="12" height="8" rx="2" opacity="0.5" />
                <rect x="5" y="13" width="12" height="8" rx="2" />
                <path d="M19 7l3-3 1.5 1.5-3 3z" transform="scale(0.9)" />
              </svg>
              <span className="text-gradient">{lang === 'zh' ? '全能编辑 · 单图多工具' : 'Studio · one image, many tools'}</span>
            </NavLink>

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
              {/* AI coming-soon cards — dashed orange, same style as the homepage
                  nav grid, so the new features show up in the mobile drawer too. */}
              {AI_COMING_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setComingToast(true)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all border border-dashed border-orange-400/25 text-[var(--text-dim)]/85 hover:text-[var(--text-primary)] hover:border-orange-400/40"
                >
                  <span className="h-4 w-4 shrink-0 text-orange-300/80">{item.icon}</span>
                  <span className="truncate flex-1">{lang === 'zh' ? item.labelZh : item.labelEn}</span>
                  <span
                    className="shrink-0 rounded-full px-1 py-[1px] text-[8px] font-semibold text-orange-300 leading-none whitespace-nowrap"
                    style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
                  >
                    🔥{lang === 'zh' ? '建设中' : 'Soon'}
                  </span>
                </button>
              ))}
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

      {/* Coming-soon toast for the AI cards (z above the drawer) */}
      {comingToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 rounded-full glass border border-[var(--accent)]/30 text-sm text-[var(--text-primary)] shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          {lang === 'zh' ? '🚧 敬请期待，AI 功能正在建设中' : '🚧 Coming soon — we are building it'}
        </div>
      )}
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
