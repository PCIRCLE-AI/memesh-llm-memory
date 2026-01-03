/**
 * LoadingIndicator - Reusable loading indicators for CLI
 *
 * Provides visual feedback for long-running operations:
 * - Animated spinners
 * - Progress messages with elapsed time
 * - Step-by-step progress tracking
 *
 * Usage:
 * ```typescript
 * const loader = new LoadingIndicator('Processing files');
 * loader.start();
 * // ... do work ...
 * loader.update('Reading file 1/10');
 * // ... more work ...
 * loader.succeed('Completed in 5s');
 * ```
 */

import chalk from 'chalk';

// ============================================================================
// Types
// ============================================================================

export interface LoadingOptions {
  /** Spinner animation frames */
  spinner?: string[];
  /** Update interval in ms (default: 80) */
  interval?: number;
  /** Show elapsed time (default: true) */
  showElapsed?: boolean;
  /** Use colors (default: true) */
  useColors?: boolean;
  /** Output stream (default: process.stderr for MCP compatibility) */
  stream?: NodeJS.WriteStream;
}

export interface StepProgress {
  current: number;
  total: number;
  label?: string;
}

// ============================================================================
// Spinner Animations
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
    gray: chalk.gray,
  };
  return colors[color];
}

export const SPINNERS = {
  /** Braille dots animation (smooth) */
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  /** Classic line animation */
  line: ['-', '\\', '|', '/'],
  /** Growing dots */
  growDots: ['.  ', '.. ', '...', ' ..', '  .', '   '],
  /** Arrow animation */
  arrow: ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'],
  /** Block animation */
  blocks: ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
  /** Simple bounce */
  bounce: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
};

// ============================================================================
// LoadingIndicator Class
// ============================================================================

/**
 * LoadingIndicator provides animated loading feedback in the terminal
 *
 * Features:
 * - Animated spinner with customizable frames
 * - Elapsed time tracking
 * - Step progress (current/total)
 * - Success/fail/warn end states
 */
export class LoadingIndicator {
  private message: string;
  private options: Required<LoadingOptions>;
  private intervalId?: NodeJS.Timeout;
  private frameIndex: number = 0;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private lastLineLength: number = 0;
  private cleanupBound: () => void;

  constructor(message: string, options: LoadingOptions = {}) {
    this.message = message;
    this.options = {
      spinner: options.spinner || SPINNERS.dots,
      interval: options.interval || 80,
      showElapsed: options.showElapsed ?? true,
      useColors: options.useColors ?? true,
      stream: options.stream || process.stderr,
    };
    // Bind cleanup for process exit handlers
    this.cleanupBound = () => this.dispose();
  }

  /**
   * Start the loading indicator
   */
  start(): this {
    if (this.isRunning) return this;

    this.isRunning = true;
    this.startTime = Date.now();
    this.frameIndex = 0;

    // Setup cleanup handlers to prevent memory leaks
    process.on('exit', this.cleanupBound);
    process.on('SIGINT', this.cleanupBound);
    process.on('SIGTERM', this.cleanupBound);

    this.render();
    this.intervalId = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.options.spinner.length;
      this.render();
    }, this.options.interval);

    // Allow process to exit even if interval is running
    if (this.intervalId.unref) {
      this.intervalId.unref();
    }

    return this;
  }

  /**
   * Dispose of resources (cleanup method)
   */
  dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    // Remove process handlers
    process.removeListener('exit', this.cleanupBound);
    process.removeListener('SIGINT', this.cleanupBound);
    process.removeListener('SIGTERM', this.cleanupBound);
  }

  /**
   * Update the loading message
   */
  update(message: string): this {
    this.message = message;
    if (this.isRunning) {
      this.render();
    }
    return this;
  }

  /**
   * Update with step progress (e.g., "3/10")
   */
  updateStep(step: StepProgress): this {
    const stepText = step.label
      ? `${step.label} (${step.current}/${step.total})`
      : `Step ${step.current}/${step.total}`;
    return this.update(stepText);
  }

  /**
   * Stop with success state
   */
  succeed(message?: string): void {
    this.stop('✓', message || this.message, 'green');
  }

  /**
   * Stop with failure state
   */
  fail(message?: string): void {
    this.stop('✗', message || this.message, 'red');
  }

  /**
   * Stop with warning state
   */
  warn(message?: string): void {
    this.stop('⚠', message || this.message, 'yellow');
  }

  /**
   * Stop with info state
   */
  info(message?: string): void {
    this.stop('ℹ', message || this.message, 'blue');
  }

  /**
   * Stop the loading indicator
   */
  stop(symbol: string = '●', message?: string, color?: string): void {
    if (!this.isRunning) return;

    // Use dispose for cleanup (clears interval and removes handlers)
    this.dispose();

    // Clear current line
    this.clearLine();

    // Write final message
    const elapsed = this.formatElapsed();
    const finalMessage = message || this.message;

    let symbolColored = symbol;
    if (this.options.useColors && color) {
      const colorFn = getChalkColor(color);
      if (colorFn) {
        symbolColored = colorFn(symbol);
      }
    }

    const elapsedText = this.options.showElapsed ? chalk.gray(` (${elapsed})`) : '';
    this.options.stream.write(`${symbolColored} ${finalMessage}${elapsedText}\n`);
  }

  /**
   * Check if indicator is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get elapsed time in seconds
   */
  get elapsed(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private render(): void {
    // Clear previous line
    this.clearLine();

    // Build line
    const frame = this.options.spinner[this.frameIndex];
    const elapsed = this.options.showElapsed ? ` ${chalk.gray(`(${this.formatElapsed()})`)}` : '';

    const spinner = this.options.useColors ? chalk.cyan(frame) : frame;
    const line = `${spinner} ${this.message}${elapsed}`;

    // Write line
    this.options.stream.write(line);
    this.lastLineLength = line.replace(/\x1b\[[0-9;]*m/g, '').length; // Strip ANSI codes for length
  }

  private clearLine(): void {
    // Move cursor to beginning and clear line
    this.options.stream.write('\r' + ' '.repeat(this.lastLineLength) + '\r');
  }

  private formatElapsed(): string {
    const seconds = this.elapsed;
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create and start a loading indicator in one call
 */
export function startLoading(message: string, options?: LoadingOptions): LoadingIndicator {
  return new LoadingIndicator(message, options).start();
}

/**
 * Execute an async function with a loading indicator
 */
export async function withLoading<T>(
  message: string,
  fn: (loader: LoadingIndicator) => Promise<T>,
  options?: LoadingOptions
): Promise<T> {
  const loader = startLoading(message, options);

  try {
    const result = await fn(loader);
    loader.succeed();
    return result;
  } catch (error) {
    loader.fail();
    throw error;
  }
}

/**
 * Execute steps with progress indicator
 */
export async function withSteps<T>(
  steps: Array<{ label: string; action: () => Promise<unknown> }>,
  options?: LoadingOptions
): Promise<void> {
  const total = steps.length;
  const loader = new LoadingIndicator('Starting...', options).start();

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      loader.updateStep({ current: i + 1, total, label: step.label });
      await step.action();
    }
    loader.succeed(`Completed ${total} steps`);
  } catch (error) {
    loader.fail('Failed');
    throw error;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default LoadingIndicator;
