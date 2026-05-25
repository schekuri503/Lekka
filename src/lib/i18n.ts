// ============================================================================
// i18n setup — English + Telugu
// ----------------------------------------------------------------------------
// Translations live in src/locales/*.json. Use the `useTranslation` hook
// from `react-i18next` in components:
//
//   const { t } = useTranslation();
//   return <h1>{t('dashboard.title')}</h1>;
// ============================================================================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/locales/en.json';
import te from '@/locales/te.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      te: { translation: te },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lekka-lang',
    },
  });

export default i18n;
