import type { Locale } from './types.js';
export type { Locale, LocaleMessages, I18nMessage } from './types.js';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types.js';
export declare function detectLocale(): Locale;
export declare function setLocale(locale: Locale): void;
export declare function getLocale(): Locale;
export declare function t(key: string, params?: Record<string, string | number>): string;
export declare function initLocale(): void;
//# sourceMappingURL=index.d.ts.map