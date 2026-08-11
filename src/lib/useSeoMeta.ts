// React hook wrapping applySeoMeta: keeps document title/description/canonical/og
// in sync with the current route on client-side navigation. Kept separate from
// seo.ts (which must stay pure for the Edge Middleware bundle).
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from '../i18n'
import { getRouteSeo, applySeoMeta } from './seo'

export function useSeoMeta(): void {
  const { lang } = useTranslation()
  const { pathname } = useLocation()
  useEffect(() => {
    applySeoMeta(getRouteSeo(pathname), lang)
  }, [pathname, lang])
}
