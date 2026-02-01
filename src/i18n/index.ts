import type { Locale, LocaleMessages } from './types.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types.js';
import { en } from './locales/en.js';
import { zhTW } from './locales/zh-TW.js';
import { zhCN } from './locales/zh-CN.js';
import { ja } from './locales/ja.js';

// Re-export types
export type { Locale, LocaleMessages, I18nMessage } from './types.js';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types.js';

/**
 * Locale message dictionaries
 */
const messages: Record<Locale, LocaleMessages> = {
  en,
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  ja,
};

/**
 * Current active locale
 */
let currentLocale: Locale = DEFAULT_LOCALE;

/**
 * Mapping from system locale codes to supported locales
 */
const localeMapping: Record<string, Locale> = {
  en: 'en',
  en_US: 'en',
  en_GB: 'en',
  en_AU: 'en',
  zh_TW: 'zh-TW',
  zh_HK: 'zh-TW', // Hong Kong uses Traditional Chinese
  zh_CN: 'zh-CN',
  zh: 'zh-CN', // Default Chinese to Simplified
  ja: 'ja',
  ja_JP: 'ja',
};

/**
 * Detect system locale from environment variables
 *
 * Priority order:
 * 1. LANGUAGE (GNU gettext)
 * 2. LC_ALL (overrides all LC_* variables)
 * 3. LANG (fallback locale)
 *
 * @returns Detected locale or default 'en'
 */
export function detectLocale(): Locale {
  // Check environment variables in priority order
  const envLocale =
    process.env.LANGUAGE || process.env.LC_ALL || process.env.LANG || '';

  // Extract language code (e.g., 'en_US.UTF-8' -> 'en_US')
  const langCode = envLocale.split('.')[0];

  if (!langCode) {
    return DEFAULT_LOCALE;
  }

  // Try exact match first
  if (langCode in localeMapping) {
    return localeMapping[langCode];
  }

  // Try language-only match (e.g., 'zh_TW' -> 'zh')
  const langOnly = langCode.split('_')[0];
  if (langOnly in localeMapping) {
    return localeMapping[langOnly];
  }

  return DEFAULT_LOCALE;
}

/**
 * Set the current locale
 *
 * @param locale - Locale to set
 */
export function setLocale(locale: Locale): void {
  // Validate locale, fallback to default if invalid
  if (locale && SUPPORTED_LOCALES.includes(locale)) {
    currentLocale = locale;
  } else {
    currentLocale = DEFAULT_LOCALE;
  }
}

/**
 * Get the current locale
 *
 * @returns Current locale
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translate a key with optional parameter interpolation
 *
 * Parameter format: ${paramName}
 * Example: t('ccb.reminder.mistakes', { count: 3, days: 7 })
 *
 * @param key - Translation key (e.g., 'ccb.reminder.mistakes')
 * @param params - Optional parameters for interpolation
 * @returns Translated string or the key itself if not found
 */
export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  // Get message from current locale
  let message = messages[currentLocale]?.[key];

  // Fallback to English if not found in current locale
  if (!message && currentLocale !== DEFAULT_LOCALE) {
    message = messages[DEFAULT_LOCALE]?.[key];
  }

  // Return key if message not found
  if (!message) {
    return key;
  }

  // Interpolate parameters if provided
  if (params) {
    message = interpolateParams(message, params);
  }

  return message;
}

/**
 * Interpolate parameters into a message string
 *
 * @param message - Message with ${param} placeholders
 * @param params - Parameters to interpolate
 * @returns Interpolated message
 */
function interpolateParams(
  message: string,
  params: Record<string, string | number>
): string {
  let result = message;

  for (const [key, value] of Object.entries(params)) {
    // Replace all occurrences of ${key} with value
    const placeholder = `\${${key}}`;
    result = result.split(placeholder).join(String(value));
  }

  return result;
}

/**
 * Initialize locale detection on module load
 * Sets the current locale based on system environment
 */
export function initLocale(): void {
  const detected = detectLocale();
  setLocale(detected);
}

// Auto-initialize on module load
initLocale();
