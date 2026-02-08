/**
 * Accessibility Utilities
 *
 * Provides tools for ensuring WCAG compliance and screen reader support:
 * - Color contrast ratio calculation (WCAG AA/AAA)
 * - Screen reader event emission
 * - Accessible text formatting
 */

/**
 * WCAG Contrast Ratio Levels
 */
export enum WCAGLevel {
  /** 4.5:1 for normal text, 3:1 for large text */
  AA = 'AA',
  /** 7:1 for normal text, 4.5:1 for large text */
  AAA = 'AAA',
}

/**
 * Screen reader event types
 */
export type ScreenReaderEventType =
  | 'progress'
  | 'status'
  | 'error'
  | 'success'
  | 'info'
  | 'navigation';

/**
 * Screen reader event data
 */
export interface ScreenReaderEvent {
  type: ScreenReaderEventType;
  message: string;
  progress?: number;
  total?: number;
  timestamp: number;
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 *
 * @param rgb - RGB color values [r, g, b] where each is 0-255
 * @returns Relative luminance (0-1)
 *
 * @example
 * ```typescript
 * const luminance = getRelativeLuminance([255, 255, 255]); // 1.0 (white)
 * const luminance = getRelativeLuminance([0, 0, 0]); // 0.0 (black)
 * ```
 */
export function getRelativeLuminance(rgb: [number, number, number]): number {
  // Convert to 0-1 range
  const [r, g, b] = rgb.map(val => {
    const normalized = val / 255;
    // Apply gamma correction
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  // Calculate luminance using WCAG formula
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse hex color to RGB
 *
 * @param hex - Hex color string (e.g., "#667eea" or "667eea")
 * @returns RGB array [r, g, b]
 *
 * @example
 * ```typescript
 * parseHexColor('#667eea'); // [102, 126, 234]
 * parseHexColor('667eea');  // [102, 126, 234]
 * ```
 */
export function parseHexColor(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');

  if (cleanHex.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  // Validate hex characters
  if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return [r, g, b];
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 *
 * @param color1 - First color (hex or RGB)
 * @param color2 - Second color (hex or RGB)
 * @returns Contrast ratio (1-21)
 *
 * @example
 * ```typescript
 * // White on black
 * getContrastRatio('#ffffff', '#000000'); // 21 (maximum contrast)
 *
 * // Gray on white
 * getContrastRatio('#9ca3af', '#ffffff'); // ~3.94
 * ```
 */
export function getContrastRatio(
  color1: string | [number, number, number],
  color2: string | [number, number, number]
): number {
  const rgb1 = typeof color1 === 'string' ? parseHexColor(color1) : color1;
  const rgb2 = typeof color2 === 'string' ? parseHexColor(color2) : color2;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG level
 *
 * @param ratio - Contrast ratio to check
 * @param level - WCAG level (AA or AAA)
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether ratio meets the level
 *
 * @example
 * ```typescript
 * meetsWCAG(4.5, WCAGLevel.AA, false); // true (normal text AA)
 * meetsWCAG(3.0, WCAGLevel.AA, false); // false (below 4.5:1)
 * meetsWCAG(3.0, WCAGLevel.AA, true);  // true (large text AA)
 * ```
 */
export function meetsWCAG(
  ratio: number,
  level: WCAGLevel,
  isLargeText: boolean = false
): boolean {
  const thresholds = {
    [WCAGLevel.AA]: isLargeText ? 3.0 : 4.5,
    [WCAGLevel.AAA]: isLargeText ? 4.5 : 7.0,
  };

  return ratio >= thresholds[level];
}

/**
 * Verify color combination meets WCAG standards
 *
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @param level - WCAG level to check (default: AA)
 * @param isLargeText - Whether text is large (default: false)
 * @returns Verification result with ratio and pass/fail
 *
 * @example
 * ```typescript
 * verifyContrast('#f9fafb', '#111827');
 * // Returns: { ratio: 16.06, passes: true, level: 'AA', isLargeText: false }
 * ```
 */
export function verifyContrast(
  foreground: string,
  background: string,
  level: WCAGLevel = WCAGLevel.AA,
  isLargeText: boolean = false
): {
  ratio: number;
  passes: boolean;
  level: WCAGLevel;
  isLargeText: boolean;
  recommendation?: string;
} {
  const ratio = getContrastRatio(foreground, background);
  const passes = meetsWCAG(ratio, level, isLargeText);

  const result = {
    ratio: Math.round(ratio * 100) / 100,
    passes,
    level,
    isLargeText,
  };

  // Add recommendation if fails
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

/**
 * Screen reader mode enabled check
 *
 * Checks if screen reader mode is enabled via environment variable.
 * Set MEMESH_SCREEN_READER=1 to enable.
 *
 * @returns Whether screen reader mode is enabled
 *
 * @example
 * ```typescript
 * // In terminal: export MEMESH_SCREEN_READER=1
 * if (isScreenReaderEnabled()) {
 *   console.log('Plain text output');
 * } else {
 *   console.log(chalk.green('Colored output'));
 * }
 * ```
 */
export function isScreenReaderEnabled(): boolean {
  return process.env.MEMESH_SCREEN_READER === '1'
    || process.env.MEMESH_SCREEN_READER === 'true';
}

/**
 * Emit screen reader event
 *
 * Emits a structured event for screen reader consumption.
 * Events are written to stderr in JSON format when screen reader mode is enabled.
 *
 * @param event - Screen reader event to emit
 *
 * @example
 * ```typescript
 * emitScreenReaderEvent({
 *   type: 'progress',
 *   message: 'Loading files',
 *   progress: 5,
 *   total: 10,
 *   timestamp: Date.now(),
 * });
 * ```
 */
export function emitScreenReaderEvent(event: ScreenReaderEvent): void {
  if (!isScreenReaderEnabled()) {
    return;
  }

  // Write to stderr as JSON for screen reader tools to parse
  const output = JSON.stringify({
    screenReader: true,
    ...event,
  });

  process.stderr.write(`[SR] ${output}\n`);
}

/**
 * Format text for screen readers
 *
 * Removes ANSI color codes and ensures clean text output
 *
 * @param text - Text to format
 * @returns Clean text without ANSI codes
 *
 * @example
 * ```typescript
 * const colored = chalk.green('Success');
 * formatForScreenReader(colored); // 'Success'
 * ```
 */
export function formatForScreenReader(text: string): string {
  // Remove ANSI color codes
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Create accessible status message
 *
 * Creates a status message with both visual (symbol + color) and
 * semantic (screen reader) representations.
 *
 * @param type - Status type
 * @param message - Status message
 * @returns Accessible status string
 *
 * @example
 * ```typescript
 * createAccessibleStatus('success', 'File saved');
 * // Returns: '✓ File saved' (with screen reader event emitted)
 * ```
 */
export function createAccessibleStatus(
  type: 'success' | 'error' | 'warning' | 'info',
  message: string
): string {
  const symbols = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  };

  const symbol = symbols[type];
  const fullMessage = `${symbol} ${message}`;

  // Emit screen reader event
  emitScreenReaderEvent({
    type: type === 'warning' ? 'error' : type,
    message: fullMessage,
    timestamp: Date.now(),
  });

  return fullMessage;
}
