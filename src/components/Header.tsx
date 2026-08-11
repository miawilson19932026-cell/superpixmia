import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from '../i18n'

export default function Header() {
  const { t, lang, toggleLang } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile menu when navigating
  const closeMenu = () => setMenuOpen(false)

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
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <NavLink to="/" onClick={closeMenu} className="flex items-center gap-3 sm:gap-4 min-w-0 shrink-0">
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
            <NavLink to="/help" onClick={closeMenu} className={({ isActive }) => linkClass(isActive)}>
              {t.navHelp}
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

        {/* Mobile dropdown nav */}
        {menuOpen && (
          <nav className="lg:hidden pb-3 space-y-1">
            <MobileNavLink to="/" onClick={closeMenu} active={pathname === '/'}>
              {t.navHome}
            </MobileNavLink>
            <MobileNavLink to="/help" onClick={closeMenu} active={pathname.startsWith('/help')}>
              {t.navHelp}
            </MobileNavLink>
          </nav>
        )}
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
