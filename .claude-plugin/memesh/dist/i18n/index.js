import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types.js';
import { en } from './locales/en.js';
import { zhTW } from './locales/zh-TW.js';
import { zhCN } from './locales/zh-CN.js';
import { ja } from './locales/ja.js';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types.js';
const messages = {
    en,
    'zh-TW': zhTW,
    'zh-CN': zhCN,
    ja,
};
let currentLocale = DEFAULT_LOCALE;
const localeMapping = {
    en: 'en',
    en_US: 'en',
    en_GB: 'en',
    en_AU: 'en',
    zh_TW: 'zh-TW',
    zh_HK: 'zh-TW',
    zh_CN: 'zh-CN',
    zh: 'zh-CN',
    ja: 'ja',
    ja_JP: 'ja',
};
export function detectLocale() {
    const envLocale = process.env.LANGUAGE || process.env.LC_ALL || process.env.LANG || '';
    const langCode = envLocale.split('.')[0];
    if (!langCode) {
        return DEFAULT_LOCALE;
    }
    if (langCode in localeMapping) {
        return localeMapping[langCode];
    }
    const langOnly = langCode.split('_')[0];
    if (langOnly in localeMapping) {
        return localeMapping[langOnly];
    }
    return DEFAULT_LOCALE;
}
export function setLocale(locale) {
    if (locale && SUPPORTED_LOCALES.includes(locale)) {
        currentLocale = locale;
    }
    else {
        currentLocale = DEFAULT_LOCALE;
    }
}
export function getLocale() {
    return currentLocale;
}
export function t(key, params) {
    let message = messages[currentLocale]?.[key];
    if (!message && currentLocale !== DEFAULT_LOCALE) {
        message = messages[DEFAULT_LOCALE]?.[key];
    }
    if (!message) {
        return key;
    }
    if (params) {
        message = interpolateParams(message, params);
    }
    return message;
}
function interpolateParams(message, params) {
    let result = message;
    for (const [key, value] of Object.entries(params)) {
        const placeholder = `\${${key}}`;
        result = result.split(placeholder).join(String(value));
    }
    return result;
}
export function initLocale() {
    const detected = detectLocale();
    setLocale(detected);
}
initLocale();
//# sourceMappingURL=index.js.map