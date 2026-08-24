// Country list for the profile "country" field — ISO 3166-1 alpha-2 codes,
// displayed as "English 本国语言" (e.g. "Germany 德国"). Sorted by the English
// name so the <select> reads alphabetically. Stored as the ISO code in
// user_metadata (Profile.country); the display label is resolved at render time.

export interface Country {
  code: string
  en: string
  native: string
}

export const COUNTRIES: Country[] = [
  { code: 'AL', en: 'Albania', native: 'Shqipëria' },
  { code: 'AR', en: 'Argentina', native: 'Argentina' },
  { code: 'AU', en: 'Australia', native: 'Australia' },
  { code: 'AT', en: 'Austria', native: 'Österreich' },
  { code: 'BE', en: 'Belgium', native: 'België' },
  { code: 'BR', en: 'Brazil', native: 'Brasil' },
  { code: 'CA', en: 'Canada', native: 'Canada' },
  { code: 'CL', en: 'Chile', native: 'Chile' },
  { code: 'CN', en: 'China', native: '中国' },
  { code: 'CO', en: 'Colombia', native: 'Colombia' },
  { code: 'CZ', en: 'Czechia', native: 'Česko' },
  { code: 'DK', en: 'Denmark', native: 'Danmark' },
  { code: 'EG', en: 'Egypt', native: 'مصر' },
  { code: 'FI', en: 'Finland', native: 'Suomi' },
  { code: 'FR', en: 'France', native: 'France' },
  { code: 'DE', en: 'Germany', native: 'Deutschland' },
  { code: 'GR', en: 'Greece', native: 'Ελλάδα' },
  { code: 'HU', en: 'Hungary', native: 'Magyarország' },
  { code: 'IN', en: 'India', native: 'भारत' },
  { code: 'ID', en: 'Indonesia', native: 'Indonesia' },
  { code: 'IR', en: 'Iran', native: 'ایران' },
  { code: 'IE', en: 'Ireland', native: 'Éire' },
  { code: 'IL', en: 'Israel', native: 'ישראל' },
  { code: 'IT', en: 'Italy', native: 'Italia' },
  { code: 'JP', en: 'Japan', native: '日本' },
  { code: 'KZ', en: 'Kazakhstan', native: 'Қазақстан' },
  { code: 'MY', en: 'Malaysia', native: 'Malaysia' },
  { code: 'MX', en: 'Mexico', native: 'México' },
  { code: 'NL', en: 'Netherlands', native: 'Nederland' },
  { code: 'NZ', en: 'New Zealand', native: 'Aotearoa' },
  { code: 'NG', en: 'Nigeria', native: 'Nigeria' },
  { code: 'NO', en: 'Norway', native: 'Norge' },
  { code: 'PK', en: 'Pakistan', native: 'پاکستان' },
  { code: 'PE', en: 'Peru', native: 'Perú' },
  { code: 'PH', en: 'Philippines', native: 'Pilipinas' },
  { code: 'PL', en: 'Poland', native: 'Polska' },
  { code: 'PT', en: 'Portugal', native: 'Portugal' },
  { code: 'RO', en: 'Romania', native: 'România' },
  { code: 'RU', en: 'Russia', native: 'Россия' },
  { code: 'SA', en: 'Saudi Arabia', native: 'السعودية' },
  { code: 'SG', en: 'Singapore', native: 'Singapura' },
  { code: 'ZA', en: 'South Africa', native: 'Suid-Afrika' },
  { code: 'KR', en: 'South Korea', native: '대한민국' },
  { code: 'ES', en: 'Spain', native: 'España' },
  { code: 'SE', en: 'Sweden', native: 'Sverige' },
  { code: 'CH', en: 'Switzerland', native: 'Schweiz' },
  { code: 'TH', en: 'Thailand', native: 'ไทย' },
  { code: 'TR', en: 'Turkey', native: 'Türkiye' },
  { code: 'UA', en: 'Ukraine', native: 'Україна' },
  { code: 'AE', en: 'United Arab Emirates', native: 'الإمارات' },
  { code: 'GB', en: 'United Kingdom', native: 'United Kingdom' },
  { code: 'US', en: 'United States', native: 'United States' },
  { code: 'VN', en: 'Vietnam', native: 'Việt Nam' },
]

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]))

export function countryByCode(code?: string): Country | undefined {
  return code ? byCode.get(code) : undefined
}

/** Display label, e.g. "Germany 德国". Falls back to the raw code if unknown. */
export function countryLabel(code?: string): string {
  const c = countryByCode(code)
  return c ? `${c.en} ${c.native}` : code || ''
}
