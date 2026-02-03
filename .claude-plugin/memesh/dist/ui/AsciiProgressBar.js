import chalk from 'chalk';
const DEFAULT_OPTIONS = {
    width: 20,
    showPercent: true,
    filledChar: '█',
    emptyChar: '░',
    useColors: true,
    filledColor: 'green',
};
function getChalkColor(color) {
    const colors = {
        green: chalk.green,
        blue: chalk.blue,
        cyan: chalk.cyan,
        yellow: chalk.yellow,
        magenta: chalk.magenta,
        red: chalk.red,
        white: chalk.white,
    };
    return colors[color];
}
export function progressBar(value, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const normalizedValue = value > 1 ? value / 100 : value;
    const percent = Math.min(100, Math.max(0, normalizedValue * 100));
    const filled = Math.round((percent / 100) * opts.width);
    const empty = opts.width - filled;
    let filledPart = opts.filledChar.repeat(filled);
    const emptyPart = opts.emptyChar.repeat(empty);
    if (opts.useColors) {
        const colorFn = chalk[opts.filledColor] || chalk.green;
        filledPart = colorFn(filledPart);
    }
    const bar = `${filledPart}${chalk.gray(emptyPart)}`;
    const percentText = opts.showPercent ? ` ${Math.round(percent)}%` : '';
    return `${bar}${percentText}`;
}
export function ratioBar(leftValue, rightValue, options = {}) {
    const opts = {
        width: 20,
        leftChar: '█',
        rightChar: '▓',
        colors: ['cyan', 'magenta'],
        labels: ['Left', 'Right'],
        useColors: true,
        ...options,
    };
    const total = leftValue + rightValue;
    if (total === 0) {
        return `${chalk.gray('░'.repeat(opts.width))} No data`;
    }
    const leftPercent = (leftValue / total) * 100;
    const rightPercent = (rightValue / total) * 100;
    const leftWidth = Math.round((leftPercent / 100) * opts.width);
    const rightWidth = opts.width - leftWidth;
    let leftPart = opts.leftChar.repeat(leftWidth);
    let rightPart = opts.rightChar.repeat(rightWidth);
    if (opts.useColors) {
        const leftColor = getChalkColor(opts.colors[0]) || chalk.cyan;
        const rightColor = getChalkColor(opts.colors[1]) || chalk.magenta;
        leftPart = leftColor(leftPart);
        rightPart = rightColor(rightPart);
    }
    const bar = `${leftPart}${rightPart}`;
    const legend = `${opts.labels[0]}: ${Math.round(leftPercent)}% | ${opts.labels[1]}: ${Math.round(rightPercent)}%`;
    return `${bar} ${legend}`;
}
export function distributionBar(values, options = {}) {
    const opts = {
        width: 30,
        chars: ['█', '▓', '▒', '░', '▪'],
        colors: ['cyan', 'magenta', 'yellow', 'green', 'blue'],
        showLegend: true,
        ...options,
    };
    const entries = Object.entries(values);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    if (total === 0) {
        return chalk.gray('░'.repeat(opts.width)) + ' No data';
    }
    const segments = [];
    const legendParts = [];
    entries.forEach(([name, value], index) => {
        const percent = (value / total) * 100;
        const width = Math.round((percent / 100) * opts.width);
        const char = opts.chars[index % opts.chars.length];
        const color = opts.colors[index % opts.colors.length];
        if (width > 0) {
            const colorFn = chalk[color] || chalk.white;
            segments.push(colorFn(char.repeat(width)));
        }
        if (value > 0) {
            const colorFn = chalk[color] || chalk.white;
            legendParts.push(`${colorFn(char)} ${name}: ${Math.round(percent)}%`);
        }
    });
    const currentWidth = segments.join('').replace(/\u001b\[[0-9;]*m/g, '').length;
    if (currentWidth < opts.width && segments.length > 0) {
        const lastEntry = entries[entries.length - 1];
        const lastColor = opts.colors[(entries.length - 1) % opts.colors.length];
        const lastChar = opts.chars[(entries.length - 1) % opts.chars.length];
        const colorFn = chalk[lastColor] || chalk.white;
        segments[segments.length - 1] += colorFn(lastChar.repeat(opts.width - currentWidth));
    }
    const bar = segments.join('');
    const legend = opts.showLegend ? `\n  ${legendParts.join('  ')}` : '';
    return `${bar}${legend}`;
}
export function labeledProgressBar(title, value, options = {}) {
    const bar = progressBar(value, options);
    return `${chalk.bold(title)}:\n  ${bar}`;
}
export function inlineProgressBar(label, value, options = {}) {
    const bar = progressBar(value, options);
    return `${chalk.gray(label + ':')} ${bar}`;
}
export function sparkline(values, options = {}) {
    if (values.length === 0)
        return '';
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const result = values.map((v) => {
        const normalized = (v - min) / range;
        const index = Math.min(Math.floor(normalized * blocks.length), blocks.length - 1);
        return blocks[index];
    }).join('');
    return options.useColors ? chalk.cyan(result) : result;
}
//# sourceMappingURL=AsciiProgressBar.js.map