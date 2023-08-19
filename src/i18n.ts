import { createI18n } from 'vue-i18n'
import localePl from '@/locales/pl.json'
import localeEng from '@/locales/en.json'

export default createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'pl',
  fallbackLocale: 'pl',
  messages: {
    en: localeEng,
    pl: localePl
  },
})
