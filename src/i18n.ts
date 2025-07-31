import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import language files
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import es from './locales/es/translation.json';
import de from './locales/de/translation.json';
import pt from './locales/pt/translation.json';
import zh from './locales/zh/translation.json';
import ja from './locales/ja/translation.json';
import ko from './locales/ko/translation.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
  pt: { translation: pt },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko }
};

// Detect user's preferred language
const detectUserLanguage = (): string => {
  // Check localStorage first
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
    return savedLanguage;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (resources[browserLang as keyof typeof resources]) {
    return browserLang;
  }

  // Check full browser language (e.g., fr-FR, es-ES)
  const fullBrowserLang = navigator.language;
  if (resources[fullBrowserLang as keyof typeof resources]) {
    return fullBrowserLang;
  }

  // Fallback to English
  return 'en';
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false,
    },

    // Custom language detection
    initImmediate: false,
  });

// Set initial language
const initialLanguage = detectUserLanguage();
i18n.changeLanguage(initialLanguage);

// Store detected language
localStorage.setItem('i18nextLng', initialLanguage);

export default i18n; 