/**
 * Supported locales for CCB internationalization
 */
export type Locale = 'en' | 'zh-TW' | 'zh-CN' | 'ja';

/**
 * Represents an i18n message with optional parameters
 */
export interface I18nMessage {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * Dictionary of locale messages (key -> translated string)
 */
export interface LocaleMessages {
  [key: string]: string;
}

/**
 * All supported locales
 */
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'zh-TW', 'zh-CN', 'ja'] as const;

/**
 * Default locale when detection fails or locale is unsupported
 */
export const DEFAULT_LOCALE: Locale = 'en';
