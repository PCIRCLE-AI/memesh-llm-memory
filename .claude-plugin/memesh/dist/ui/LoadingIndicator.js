import chalk from 'chalk';
function getChalkColor(color) {
    const colors = {
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
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['-', '\\', '|', '/'],
    growDots: ['.  ', '.. ', '...', ' ..', '  .', '   '],
    arrow: ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'],
    blocks: ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
    bounce: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
};
export class LoadingIndicator {
    message;
    options;
    intervalId;
    frameIndex = 0;
    startTime = 0;
    isRunning = false;
    lastLineLength = 0;
    cleanupBound;
    constructor(message, options = {}) {
        this.message = message;
        this.options = {
            spinner: options.spinner || SPINNERS.dots,
            interval: options.interval || 80,
            showElapsed: options.showElapsed ?? true,
            useColors: options.useColors ?? true,
            stream: options.stream || process.stderr,
        };
        this.cleanupBound = () => this.dispose();
    }
    start() {
        if (this.isRunning)
            return this;
        this.isRunning = true;
        this.startTime = Date.now();
        this.frameIndex = 0;
        process.on('exit', this.cleanupBound);
        process.on('SIGINT', this.cleanupBound);
        process.on('SIGTERM', this.cleanupBound);
        this.render();
        this.intervalId = setInterval(() => {
            this.frameIndex = (this.frameIndex + 1) % this.options.spinner.length;
            this.render();
        }, this.options.interval);
        if (this.intervalId.unref) {
            this.intervalId.unref();
        }
        return this;
    }
    dispose() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.isRunning = false;
        process.removeListener('exit', this.cleanupBound);
        process.removeListener('SIGINT', this.cleanupBound);
        process.removeListener('SIGTERM', this.cleanupBound);
    }
    update(message) {
        this.message = message;
        if (this.isRunning) {
            this.render();
        }
        return this;
    }
    updateStep(step) {
        const stepText = step.label
            ? `${step.label} (${step.current}/${step.total})`
            : `Step ${step.current}/${step.total}`;
        return this.update(stepText);
    }
    succeed(message) {
        this.stop('✓', message || this.message, 'green');
    }
    fail(message) {
        this.stop('✗', message || this.message, 'red');
    }
    warn(message) {
        this.stop('⚠', message || this.message, 'yellow');
    }
    info(message) {
        this.stop('ℹ', message || this.message, 'blue');
    }
    stop(symbol = '●', message, color) {
        if (!this.isRunning)
            return;
        this.dispose();
        this.clearLine();
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
    get running() {
        return this.isRunning;
    }
    get elapsed() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
    render() {
        this.clearLine();
        const frame = this.options.spinner[this.frameIndex];
        const elapsed = this.options.showElapsed ? ` ${chalk.gray(`(${this.formatElapsed()})`)}` : '';
        const spinner = this.options.useColors ? chalk.cyan(frame) : frame;
        const line = `${spinner} ${this.message}${elapsed}`;
        this.options.stream.write(line);
        this.lastLineLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    }
    clearLine() {
        this.options.stream.write('\r' + ' '.repeat(this.lastLineLength) + '\r');
    }
    formatElapsed() {
        const seconds = this.elapsed;
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
}
export function startLoading(message, options) {
    return new LoadingIndicator(message, options).start();
}
export async function withLoading(message, fn, options) {
    const loader = startLoading(message, options);
    try {
        const result = await fn(loader);
        loader.succeed();
        return result;
    }
    catch (error) {
        loader.fail();
        throw error;
    }
}
export async function withSteps(steps, options) {
    const total = steps.length;
    const loader = new LoadingIndicator('Starting...', options).start();
    try {
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            loader.updateStep({ current: i + 1, total, label: step.label });
            await step.action();
        }
        loader.succeed(`Completed ${total} steps`);
    }
    catch (error) {
        loader.fail('Failed');
        throw error;
    }
}
export default LoadingIndicator;
//# sourceMappingURL=LoadingIndicator.js.map