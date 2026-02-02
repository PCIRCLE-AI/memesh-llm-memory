/**
 * ProgressIndicator - Visual progress feedback for long operations
 *
 * Provides real-time feedback during task execution to reduce user anxiety
 * and improve perceived performance.
 *
 * Features:
 * - Step-by-step progress updates
 * - Elapsed time tracking
 * - Estimated completion time
 * - Spinner animation
 * - Success/failure indicators
 *
 * Usage:
 * ```typescript
 * const progress = new ProgressIndicator();
 * progress.start(['Analyzing task', 'Routing', 'Executing']);
 * await analyzeTask();
 * progress.nextStep();
 * await route();
 * progress.nextStep();
 * await execute();
 * progress.complete();
 * ```
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';

export interface ProgressStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface ProgressOptions {
  showElapsed?: boolean; // Show elapsed time
  showEstimate?: boolean; // Show estimated completion
  spinner?: string; // Spinner style (default: 'dots')
}

export class ProgressIndicator {
  private spinner: Ora | null = null;
  private steps: ProgressStep[] = [];
  private currentStepIndex = 0;
  private startTime: number = 0;
  private options: ProgressOptions;

  constructor(options: ProgressOptions = {}) {
    this.options = {
      showElapsed: true,
      showEstimate: true,
      spinner: 'dots',
      ...options,
    };
  }

  /**
   * Start progress tracking with a list of steps
   */
  start(steps: string[]): void {
    this.steps = steps.map((name) => ({
      name,
      status: 'pending' as const,
    }));
    this.currentStepIndex = 0;
    this.startTime = Date.now();

    if (this.steps.length > 0) {
      this.steps[0].status = 'in_progress';
    }

    this.updateSpinner();
  }

  /**
   * Move to the next step
   */
  nextStep(): void {
    if (this.currentStepIndex < this.steps.length) {
      this.steps[this.currentStepIndex].status = 'completed';
      this.currentStepIndex++;

      if (this.currentStepIndex < this.steps.length) {
        this.steps[this.currentStepIndex].status = 'in_progress';
        this.updateSpinner();
      }
    }
  }

  /**
   * Mark current step as failed
   */
  fail(error?: string): void {
    if (this.currentStepIndex < this.steps.length) {
      this.steps[this.currentStepIndex].status = 'failed';
    }

    if (this.spinner) {
      this.spinner.fail(chalk.red(error || 'Task failed'));
      this.spinner = null;
    }
  }

  /**
   * Complete all steps successfully
   */
  complete(message?: string): void {
    // Mark remaining steps as completed
    for (let i = this.currentStepIndex; i < this.steps.length; i++) {
      this.steps[i].status = 'completed';
    }

    if (this.spinner) {
      const elapsed = this.formatElapsedTime();
      const successMessage = message || 'Complete!';
      this.spinner.succeed(chalk.green(`${successMessage} ${elapsed}`));
      this.spinner = null;
    }
  }

  /**
   * Stop progress indicator without marking as complete
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Update spinner text with current progress
   */
  private updateSpinner(): void {
    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    const stepText = this.formatStepText();
    const timeText = this.formatTimeText();
    const text = `${stepText}${timeText}`;

    if (this.spinner) {
      this.spinner.text = text;
    } else {
      this.spinner = ora({
        text,
        spinner: this.options.spinner,
      }).start();
    }
  }

  /**
   * Format step text with progress indicator
   */
  private formatStepText(): string {
    const lines: string[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      let icon: string;
      let color: (text: string) => string;

      switch (step.status) {
        case 'completed':
          icon = '✓';
          color = chalk.green;
          break;
        case 'in_progress':
          icon = '◐';
          color = chalk.cyan;
          break;
        case 'failed':
          icon = '✗';
          color = chalk.red;
          break;
        default:
          icon = '○';
          color = chalk.dim;
      }

      lines.push(`${color(icon)} ${step.name}`);
    }

    const progress = `(${this.currentStepIndex + 1}/${this.steps.length})`;
    return `${chalk.cyan(progress)} ${lines[this.currentStepIndex]}`;
  }

  /**
   * Format time text (elapsed and/or estimated)
   */
  private formatTimeText(): string {
    const parts: string[] = [];

    if (this.options.showElapsed) {
      const elapsed = this.formatElapsedTime();
      parts.push(chalk.dim(elapsed));
    }

    if (this.options.showEstimate && this.currentStepIndex > 0) {
      const estimated = this.estimateCompletion();
      if (estimated) {
        parts.push(chalk.dim(`Est: ${estimated}`));
      }
    }

    return parts.length > 0 ? ` │ ${parts.join(' │ ')}` : '';
  }

  /**
   * Format elapsed time since start
   */
  private formatElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const ms = elapsed % 1000;

    if (seconds > 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else if (seconds > 0) {
      return `${seconds}s`;
    } else {
      return `${ms}ms`;
    }
  }

  /**
   * Estimate completion time based on current progress
   */
  private estimateCompletion(): string | null {
    if (this.currentStepIndex === 0) return null;

    const elapsed = Date.now() - this.startTime;
    const avgTimePerStep = elapsed / this.currentStepIndex;
    const remainingSteps = this.steps.length - this.currentStepIndex;
    const estimatedRemaining = avgTimePerStep * remainingSteps;

    const seconds = Math.floor(estimatedRemaining / 1000);
    if (seconds < 1) return null;

    if (seconds > 60) {
      const minutes = Math.floor(seconds / 60);
      return `~${minutes}m`;
    } else {
      return `~${seconds}s`;
    }
  }

  /**
   * Create a simple progress indicator for a single task
   */
  static simple(message: string, spinner: string = 'dots'): Ora {
    return ora({
      text: chalk.cyan(message),
      spinner,
    }).start();
  }

  /**
   * Show a success message
   */
  static success(message: string): void {
    ora().succeed(chalk.green(message));
  }

  /**
   * Show an error message
   */
  static error(message: string): void {
    ora().fail(chalk.red(message));
  }

  /**
   * Show a warning message
   */
  static warn(message: string): void {
    ora().warn(chalk.yellow(message));
  }

  /**
   * Show an info message
   */
  static info(message: string): void {
    ora().info(chalk.cyan(message));
  }
}
