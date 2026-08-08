import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Lang } from '../types'
import type { Translations } from './types'
import { detectLang, setLang as persistLang } from './types'
import zh from './zh'
import en from './en'

const tMap: Record<Lang, Translations> = { zh, en }

interface LangContextValue {
  t: Translations
  lang: Lang
  toggleLang: () => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'zh' ? 'en' : 'zh'
      persistLang(next)
      return next
    })
  }, [])

  return (
    <LangContext.Provider value={{ t: tMap[lang], lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useTranslation must be used within LangProvider')
  return ctx
}
