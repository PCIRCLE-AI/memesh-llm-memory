export function safeParseInt(value, defaultValue, min, max) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    const parsed = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(parsed) || !isFinite(parsed)) {
        return defaultValue;
    }
    if (min !== undefined && parsed < min) {
        return min;
    }
    if (max !== undefined && parsed > max) {
        return max;
    }
    return parsed;
}
export function safeParseFloat(value, defaultValue, min, max) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
        return defaultValue;
    }
    if (min !== undefined && parsed < min) {
        return min;
    }
    if (max !== undefined && parsed > max) {
        return max;
    }
    return parsed;
}
export function safeDivide(numerator, denominator, defaultValue = 0) {
    if (denominator === 0 || isNaN(denominator) || !isFinite(denominator)) {
        return defaultValue;
    }
    if (isNaN(numerator) || !isFinite(numerator)) {
        return defaultValue;
    }
    const result = numerator / denominator;
    if (isNaN(result) || !isFinite(result)) {
        return defaultValue;
    }
    return result;
}
export function safeMultiply(a, b, maxValue = Number.MAX_SAFE_INTEGER) {
    if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) {
        return 0;
    }
    const result = a * b;
    if (!isFinite(result) || result > maxValue) {
        return maxValue;
    }
    if (result < -maxValue) {
        return -maxValue;
    }
    return result;
}
export function safeAdd(a, b, maxValue = Number.MAX_SAFE_INTEGER) {
    if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) {
        return 0;
    }
    const result = a + b;
    if (!isFinite(result) || result > maxValue) {
        return maxValue;
    }
    if (result < -maxValue) {
        return -maxValue;
    }
    return result;
}
export function safePercentage(value, total, decimals = 2) {
    const result = safeDivide(value, total, 0) * 100;
    const multiplier = Math.pow(10, decimals);
    return Math.round(result * multiplier) / multiplier;
}
export function clamp(value, min, max) {
    if (isNaN(value) || !isFinite(value)) {
        return min;
    }
    return Math.max(min, Math.min(max, value));
}
export function isSafeInteger(value) {
    return Number.isSafeInteger(value);
}
export function bytesToMB(bytes, decimals = 2) {
    return safeParseFloat(safeDivide(bytes, 1024 * 1024, 0).toFixed(decimals), 0, 0);
}
export function mbToBytes(mb) {
    return Math.floor(safeMultiply(mb, 1024 * 1024));
}
//# sourceMappingURL=safeMath.js.map