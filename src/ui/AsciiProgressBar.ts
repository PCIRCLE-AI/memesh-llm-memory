/**
 * AsciiProgressBar - ASCII Progress Bar Utilities
 *
 * Provides beautiful ASCII progress bars for terminal output.
 * Uses Unicode block characters for smooth visual appearance.
 *
 * Features:
 * - Percentage bars with configurable width
 * - Ratio bars for comparing two values
 * - Distribution bars for multiple categories
 * - Color support via chalk (optional)
 */

import chalk from 'chalk';

// ============================================================================
// Types
// ============================================================================

export interface ProgressBarOptions {
  /** Total width of the bar (default: 20) */
  width?: number;
  /** Show percentage text (default: true) */
  showPercent?: boolean;
  /** Filled character (default: '█') */
  filledChar?: string;
  /** Empty character (default: '░') */
  emptyChar?: string;
  /** Use colors (default: true) */
  useColors?: boolean;
  /** Custom color for filled portion */
  filledColor?: 'green' | 'blue' | 'cyan' | 'yellow' | 'magenta' | 'red' | 'white';
}

export interface RatioBarOptions extends ProgressBarOptions {
  /** Labels for left and right values */
  labels?: [string, string];
  /** Characters for left side (default: '█') */
  leftChar?: string;
  /** Characters for right side (default: '▓') */
  rightChar?: string;
  /** Colors for left and right */
  colors?: [string, string];
}

export interface DistributionBarOptions {
  /** Total width of the bar (default: 30) */
  width?: number;
  /** Characters for each category */
  chars?: string[];
  /** Colors for each category */
  colors?: ('green' | 'blue' | 'cyan' | 'yellow' | 'magenta' | 'red' | 'white')[];
  /** Show legend (default: true) */
  showLegend?: boolean;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<ProgressBarOptions> = {
  width: 20,
  showPercent: true,
  filledChar: '█',
  emptyChar: '░',
  useColors: true,
  filledColor: 'green',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get chalk color function by name
 */
function getChalkColor(color: string): ((s: string) => string) | undefined {
  const colors: Record<string, (s: string) => string> = {
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

// ============================================================================
// Progress Bar Functions
// ============================================================================

/**
 * Create a simple percentage progress bar
 *
 * @param value - Current value (0-1 or 0-100)
 * @param options - Customization options
 * @returns Formatted progress bar string
 *
 * @example
 * ```typescript
 * progressBar(0.75);
 * // Returns: "███████████████░░░░░ 75%"
 *
 * progressBar(0.5, { width: 10, showPercent: false });
 * // Returns: "█████░░░░░"
 * ```
 */
export function progressBar(value: number, options: ProgressBarOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Normalize value to 0-1 range
  const normalizedValue = value > 1 ? value / 100 : value;
  const percent = Math.min(100, Math.max(0, normalizedValue * 100));
  const filled = Math.round((percent / 100) * opts.width);
  const empty = opts.width - filled;

  let filledPart = opts.filledChar.repeat(filled);
  const emptyPart = opts.emptyChar.repeat(empty);

  // Apply color if enabled
  if (opts.useColors) {
    const colorFn = chalk[opts.filledColor] || chalk.green;
    filledPart = colorFn(filledPart);
  }

  const bar = `${filledPart}${chalk.gray(emptyPart)}`;
  const percentText = opts.showPercent ? ` ${Math.round(percent)}%` : '';

  return `${bar}${percentText}`;
}

/**
 * Create a ratio bar comparing two values
 *
 * @param leftValue - Left side value
 * @param rightValue - Right side value
 * @param options - Customization options
 * @returns Formatted ratio bar string
 *
 * @example
 * ```typescript
 * ratioBar(70, 30, { labels: ['Fast', 'Deep'] });
 * // Returns: "██████████████▓▓▓▓▓▓ Fast: 70% | Deep: 30%"
 * ```
 */
export function ratioBar(
  leftValue: number,
  rightValue: number,
  options: RatioBarOptions = {}
): string {
  const opts = {
    width: 20,
    leftChar: '█',
    rightChar: '▓',
    colors: ['cyan', 'magenta'] as [string, string],
    labels: ['Left', 'Right'] as [string, string],
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

  // Apply colors
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

/**
 * Create a distribution bar for multiple categories
 *
 * @param values - Object with category names and values
 * @param options - Customization options
 * @returns Formatted distribution bar string
 *
 * @example
 * ```typescript
 * distributionBar({ fast: 50, deep: 30, balanced: 20 });
 * // Returns multi-colored bar with legend
 * ```
 */
export function distributionBar(
  values: Record<string, number>,
  options: DistributionBarOptions = {}
): string {
  const opts = {
    width: 30,
    chars: ['█', '▓', '▒', '░', '▪'],
    colors: ['cyan', 'magenta', 'yellow', 'green', 'blue'] as ('green' | 'blue' | 'cyan' | 'yellow' | 'magenta' | 'red' | 'white')[],
    showLegend: true,
    ...options,
  };

  const entries = Object.entries(values);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (total === 0) {
    return chalk.gray('░'.repeat(opts.width)) + ' No data';
  }

  const segments: string[] = [];
  const legendParts: string[] = [];

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

  // Adjust for rounding errors
  const currentWidth = segments.join('').replace(/\u001b\[[0-9;]*m/g, '').length;
  if (currentWidth < opts.width && segments.length > 0) {
    const lastColor = opts.colors[(entries.length - 1) % opts.colors.length];
    const lastChar = opts.chars[(entries.length - 1) % opts.chars.length];
    const colorFn = chalk[lastColor] || chalk.white;
    segments[segments.length - 1] += colorFn(lastChar.repeat(opts.width - currentWidth));
  }

  const bar = segments.join('');
  const legend = opts.showLegend ? `\n  ${legendParts.join('  ')}` : '';

  return `${bar}${legend}`;
}

/**
 * Create a labeled progress section with title and bar
 *
 * @param title - Section title
 * @param value - Progress value (0-1 or 0-100)
 * @param options - Customization options
 * @returns Formatted section string
 *
 * @example
 * ```typescript
 * labeledProgressBar('Success Rate', 0.85);
 * // Returns:
 * // "Success Rate:
 * //  █████████████████░░░ 85%"
 * ```
 */
export function labeledProgressBar(
  title: string,
  value: number,
  options: ProgressBarOptions = {}
): string {
  const bar = progressBar(value, options);
  return `${chalk.bold(title)}:\n  ${bar}`;
}

/**
 * Create a compact inline progress bar
 *
 * @param label - Short label
 * @param value - Progress value
 * @param options - Customization options
 * @returns Formatted inline bar
 *
 * @example
 * ```typescript
 * inlineProgressBar('CPU', 0.65);
 * // Returns: "CPU: █████████████░░░░░░░ 65%"
 * ```
 */
export function inlineProgressBar(
  label: string,
  value: number,
  options: ProgressBarOptions = {}
): string {
  const bar = progressBar(value, options);
  return `${chalk.gray(label + ':')} ${bar}`;
}

/**
 * Create a sparkline-style mini chart
 *
 * @param values - Array of values
 * @param options - Optional width
 * @returns Sparkline string
 *
 * @example
 * ```typescript
 * sparkline([1, 3, 7, 2, 5, 9, 4]);
 * // Returns: "▁▃▇▂▅█▄"
 * ```
 */
export function sparkline(values: number[], options: { useColors?: boolean } = {}): string {
  if (values.length === 0) return '';

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
