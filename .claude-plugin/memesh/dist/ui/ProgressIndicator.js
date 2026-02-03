import ora from 'ora';
import chalk from 'chalk';
export class ProgressIndicator {
    spinner = null;
    steps = [];
    currentStepIndex = 0;
    startTime = 0;
    options;
    constructor(options = {}) {
        this.options = {
            showElapsed: true,
            showEstimate: true,
            spinner: 'dots',
            ...options,
        };
    }
    start(steps) {
        this.steps = steps.map((name) => ({
            name,
            status: 'pending',
        }));
        this.currentStepIndex = 0;
        this.startTime = Date.now();
        if (this.steps.length > 0) {
            this.steps[0].status = 'in_progress';
        }
        this.updateSpinner();
    }
    nextStep() {
        if (this.currentStepIndex < this.steps.length) {
            this.steps[this.currentStepIndex].status = 'completed';
            this.currentStepIndex++;
            if (this.currentStepIndex < this.steps.length) {
                this.steps[this.currentStepIndex].status = 'in_progress';
                this.updateSpinner();
            }
        }
    }
    fail(error) {
        if (this.currentStepIndex < this.steps.length) {
            this.steps[this.currentStepIndex].status = 'failed';
        }
        if (this.spinner) {
            this.spinner.fail(chalk.red(error || 'Task failed'));
            this.spinner = null;
        }
    }
    complete(message) {
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
    stop() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }
    updateSpinner() {
        const currentStep = this.steps[this.currentStepIndex];
        if (!currentStep)
            return;
        const stepText = this.formatStepText();
        const timeText = this.formatTimeText();
        const text = `${stepText}${timeText}`;
        if (this.spinner) {
            this.spinner.text = text;
        }
        else {
            this.spinner = ora({
                text,
                spinner: this.options.spinner,
            }).start();
        }
    }
    formatStepText() {
        const lines = [];
        for (let i = 0; i < this.steps.length; i++) {
            const step = this.steps[i];
            let icon;
            let color;
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
    formatTimeText() {
        const parts = [];
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
    formatElapsedTime() {
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const ms = elapsed % 1000;
        if (seconds > 60) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
        else if (seconds > 0) {
            return `${seconds}s`;
        }
        else {
            return `${ms}ms`;
        }
    }
    estimateCompletion() {
        if (this.currentStepIndex === 0)
            return null;
        const elapsed = Date.now() - this.startTime;
        const avgTimePerStep = elapsed / this.currentStepIndex;
        const remainingSteps = this.steps.length - this.currentStepIndex;
        const estimatedRemaining = avgTimePerStep * remainingSteps;
        const seconds = Math.floor(estimatedRemaining / 1000);
        if (seconds < 1)
            return null;
        if (seconds > 60) {
            const minutes = Math.floor(seconds / 60);
            return `~${minutes}m`;
        }
        else {
            return `~${seconds}s`;
        }
    }
    static simple(message, spinner = 'dots') {
        return ora({
            text: chalk.cyan(message),
            spinner,
        }).start();
    }
    static success(message) {
        ora().succeed(chalk.green(message));
    }
    static error(message) {
        ora().fail(chalk.red(message));
    }
    static warn(message) {
        ora().warn(chalk.yellow(message));
    }
    static info(message) {
        ora().info(chalk.cyan(message));
    }
}
//# sourceMappingURL=ProgressIndicator.js.map