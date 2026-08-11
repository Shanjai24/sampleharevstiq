import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';

const savedLng = typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
const initialLng = (savedLng || 'en').split('-')[0];

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta }
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
