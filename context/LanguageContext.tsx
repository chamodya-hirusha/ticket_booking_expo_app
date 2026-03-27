import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getDictionary } from '../utils/i18n';

export type SupportedLanguage = 'EN' | 'IT' | 'FR' | 'SG';

export const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'IT', label: 'Italiano', flag: '🇮🇹' },
  { code: 'FR', label: 'Français', flag: '🇫🇷' },
  { code: 'SG', label: 'Schwiizerdütsch', flag: '🇨🇭' },
];

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
  dict: Record<string, any>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<SupportedLanguage>('EN');

  const dict = getDictionary(language);

  /**
   * Resolve a dot-notation key from the dictionary.
   * e.g. t('profile.title') => "My Profile"
   * Falls back to English if key is missing.
   */
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = dict;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // Fallback to English
        let fallback: any = getDictionary('EN');
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // Return key itself if nothing found
          }
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }
    return typeof result === 'string' ? result : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dict }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
