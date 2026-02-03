export type Locale = 'en' | 'zh-TW' | 'zh-CN' | 'ja';
export interface I18nMessage {
    key: string;
    params?: Record<string, string | number>;
}
export interface LocaleMessages {
    [key: string]: string;
}
export declare const SUPPORTED_LOCALES: readonly Locale[];
export declare const DEFAULT_LOCALE: Locale;
//# sourceMappingURL=types.d.ts.map