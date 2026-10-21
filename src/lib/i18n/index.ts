import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from '@/lib/i18n/resources'

export type Lang = 'en' | 'id'

const LANG_KEY = 'chatyuk-lang'

/** Default web = Bahasa Inggris (sama seperti default aplikasi Android). */
export const DEFAULT_LANG: Lang = 'en'

export function storedLang(): Lang {
  try {
    const value = localStorage.getItem(LANG_KEY)
    return value === 'id' ? 'id' : 'en'
  } catch {
    return DEFAULT_LANG
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function setLanguage(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // mode privat: abaikan
  }
  void i18n.changeLanguage(lang)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
}

/** Terapkan bahasa tersimpan saat aplikasi dimuat. */
export function initLanguage(): void {
  const lang = storedLang()
  void i18n.changeLanguage(lang)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
}

export default i18n
