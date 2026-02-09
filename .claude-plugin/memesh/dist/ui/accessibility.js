export var WCAGLevel;
(function (WCAGLevel) {
    WCAGLevel["AA"] = "AA";
    WCAGLevel["AAA"] = "AAA";
})(WCAGLevel || (WCAGLevel = {}));
export function getRelativeLuminance(rgb) {
    const [r, g, b] = rgb.map(val => {
        const normalized = val / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function parseHexColor(hex) {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) {
        throw new Error(`Invalid hex color: ${hex}`);
    }
    if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
        throw new Error(`Invalid hex color: ${hex}`);
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
}
export function getContrastRatio(color1, color2) {
    const rgb1 = typeof color1 === 'string' ? parseHexColor(color1) : color1;
    const rgb2 = typeof color2 === 'string' ? parseHexColor(color2) : color2;
    const lum1 = getRelativeLuminance(rgb1);
    const lum2 = getRelativeLuminance(rgb2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
}
export function meetsWCAG(ratio, level, isLargeText = false) {
    const thresholds = {
        [WCAGLevel.AA]: isLargeText ? 3.0 : 4.5,
        [WCAGLevel.AAA]: isLargeText ? 4.5 : 7.0,
    };
    return ratio >= thresholds[level];
}
export function verifyContrast(foreground, background, level = WCAGLevel.AA, isLargeText = false) {
    const ratio = getContrastRatio(foreground, background);
    const passes = meetsWCAG(ratio, level, isLargeText);
    const result = {
        ratio: Math.round(ratio * 100) / 100,
        passes,
        level,
        isLargeText,
    };
    if (!passes) {
        const required = level === WCAGLevel.AA
            ? (isLargeText ? 3.0 : 4.5)
            : (isLargeText ? 4.5 : 7.0);
        return {
            ...result,
            recommendation: `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG ${level} requirement of ${required}:1. Consider using a darker foreground or lighter background.`,
        };
    }
    return result;
}
export function isScreenReaderEnabled() {
    return process.env.MEMESH_SCREEN_READER === '1'
        || process.env.MEMESH_SCREEN_READER === 'true';
}
export function emitScreenReaderEvent(event) {
    if (!isScreenReaderEnabled()) {
        return;
    }
    const output = JSON.stringify({
        screenReader: true,
        ...event,
    });
    process.stderr.write(`[SR] ${output}\n`);
}
export function formatForScreenReader(text) {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}
export function createAccessibleStatus(type, message) {
    const symbols = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
    };
    const symbol = symbols[type];
    const fullMessage = `${symbol} ${message}`;
    emitScreenReaderEvent({
        type: type === 'warning' ? 'error' : type,
        message: fullMessage,
        timestamp: Date.now(),
    });
    return fullMessage;
}
//# sourceMappingURL=accessibility.js.map