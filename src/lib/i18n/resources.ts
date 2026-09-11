import en from '@/translations/en.json';
import te from '@/translations/te.json';

export const resources = {
  en: {
    translation: en,
  },
  te: {
    translation: te,
  },
};

export type Language = keyof typeof resources;
