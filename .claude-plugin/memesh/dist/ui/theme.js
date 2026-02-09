import { verifyContrast, WCAGLevel } from './accessibility.js';
export const colors = {
    primary: {
        light: '#8b9dc3',
        main: '#667eea',
        dark: '#5568d3',
        darker: '#764ba2',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
    },
    text: {
        primary: '#f9fafb',
        secondary: '#d1d5db',
        muted: '#9ca3af',
        inverse: '#111827',
    },
    background: {
        primary: '#111827',
        secondary: '#1f2937',
        tertiary: '#374151',
    },
};
export const typography = {
    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    fontSize: {
        xs: '10px',
        sm: '12px',
        base: '14px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
    },
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};
export const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 48,
    8: 64,
};
export const icons = {
    success: '✓',
    error: '❌',
    warning: '⚠',
    info: 'ℹ',
    pending: '○',
    inProgress: '◐',
    play: '▶',
    pause: '⏸',
    stop: '⏹',
    refresh: '↻',
    arrowRight: '→',
    arrowLeft: '←',
    arrowUp: '↑',
    arrowDown: '↓',
    file: '📄',
    folder: '📁',
    code: '💻',
    settings: '⚙',
    search: '🔍',
    filter: '⏺',
    star: '⭐',
    check: '✓',
    cross: '❌',
    bullet: '•',
    chevronRight: '›',
    chevronDown: '∨',
    task: '📋',
    lightbulb: '💡',
    rocket: '🚀',
    gear: '⚙️',
    memory: '🧠',
};
export const borders = {
    light: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        cross: '┼',
        teeLeft: '├',
        teeRight: '┤',
        teeTop: '┬',
        teeBottom: '┴',
    },
    heavy: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        horizontal: '━',
        vertical: '┃',
        cross: '╋',
        teeLeft: '┣',
        teeRight: '┫',
        teeTop: '┳',
        teeBottom: '┻',
    },
    double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║',
        cross: '╬',
        teeLeft: '╠',
        teeRight: '╣',
        teeTop: '╦',
        teeBottom: '╩',
    },
};
export const animation = {
    duration: {
        fast: 150,
        normal: 300,
        slow: 500,
    },
    spinners: {
        dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        line: ['|', '/', '-', '\\'],
        arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
        circle: ['◐', '◓', '◑', '◒'],
    },
};
export const theme = {
    colors,
    typography,
    spacing,
    icons,
    borders,
    animation,
};
export function verifyThemeContrast() {
    const results = [];
    const combinations = [
        { name: 'Primary text on primary background', fg: colors.text.primary, bg: colors.background.primary },
        { name: 'Secondary text on primary background', fg: colors.text.secondary, bg: colors.background.primary },
        { name: 'Muted text on primary background', fg: colors.text.muted, bg: colors.background.primary },
        { name: 'Primary text on secondary background', fg: colors.text.primary, bg: colors.background.secondary },
        { name: 'Secondary text on secondary background', fg: colors.text.secondary, bg: colors.background.secondary },
        { name: 'Success color on primary background', fg: colors.success, bg: colors.background.primary },
        { name: 'Error color on primary background', fg: colors.error, bg: colors.background.primary },
        { name: 'Warning color on primary background', fg: colors.warning, bg: colors.background.primary },
        { name: 'Info color on primary background', fg: colors.info, bg: colors.background.primary },
    ];
    for (const { name, fg, bg } of combinations) {
        const result = verifyContrast(fg, bg, WCAGLevel.AA, false);
        results.push({
            name,
            foreground: fg,
            background: bg,
            ...result,
        });
    }
    return results;
}
export function printContrastResults() {
    const results = verifyThemeContrast();
    console.log('\n=== WCAG Contrast Ratio Verification ===\n');
    results.forEach(result => {
        const symbol = result.passes ? '✓' : '✗';
        const status = result.passes ? 'PASS' : 'FAIL';
        console.log(`${symbol} ${result.name}: ${result.ratio}:1 (${status})`);
        if (result.recommendation) {
            console.log(`  → ${result.recommendation}`);
        }
    });
    const totalPassed = results.filter(r => r.passes).length;
    const totalFailed = results.length - totalPassed;
    console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed\n`);
}
//# sourceMappingURL=theme.js.map