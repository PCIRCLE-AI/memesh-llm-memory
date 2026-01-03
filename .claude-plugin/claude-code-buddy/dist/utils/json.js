import { logger } from './logger.js';
export function safeJsonParse(jsonString, fallback) {
    if (!jsonString) {
        return fallback;
    }
    try {
        return JSON.parse(jsonString);
    }
    catch (error) {
        logger.warn('JSON parse error:', {
            error: error instanceof Error ? error.message : String(error),
            input: jsonString.substring(0, 100),
        });
        return fallback;
    }
}
export function tryParseJson(jsonString) {
    if (!jsonString) {
        return {
            success: false,
            error: 'Input is null or empty',
        };
    }
    try {
        const data = JSON.parse(jsonString);
        return {
            success: true,
            data,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
export function parseAndValidate(jsonString, validator, fallback) {
    if (!jsonString) {
        return fallback;
    }
    try {
        const parsed = JSON.parse(jsonString);
        if (validator(parsed)) {
            return parsed;
        }
        else {
            logger.warn('JSON validation failed:', {
                input: jsonString.substring(0, 100),
            });
            return fallback;
        }
    }
    catch (error) {
        logger.warn('JSON parse error:', {
            error: error instanceof Error ? error.message : String(error),
            input: jsonString.substring(0, 100),
        });
        return fallback;
    }
}
export function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isArray(value) {
    return Array.isArray(value);
}
export function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
//# sourceMappingURL=json.js.map