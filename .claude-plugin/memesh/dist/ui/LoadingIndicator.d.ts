export interface LoadingOptions {
    spinner?: string[];
    interval?: number;
    showElapsed?: boolean;
    useColors?: boolean;
    stream?: NodeJS.WriteStream;
}
export interface StepProgress {
    current: number;
    total: number;
    label?: string;
}
export declare const SPINNERS: {
    dots: string[];
    line: string[];
    growDots: string[];
    arrow: string[];
    blocks: string[];
    bounce: string[];
};
export declare class LoadingIndicator {
    private message;
    private options;
    private intervalId?;
    private frameIndex;
    private startTime;
    private isRunning;
    private lastLineLength;
    private cleanupBound;
    constructor(message: string, options?: LoadingOptions);
    start(): this;
    dispose(): void;
    update(message: string): this;
    updateStep(step: StepProgress): this;
    succeed(message?: string): void;
    fail(message?: string): void;
    warn(message?: string): void;
    info(message?: string): void;
    stop(symbol?: string, message?: string, color?: string): void;
    get running(): boolean;
    get elapsed(): number;
    private render;
    private clearLine;
    private formatElapsed;
}
export declare function startLoading(message: string, options?: LoadingOptions): LoadingIndicator;
export declare function withLoading<T>(message: string, fn: (loader: LoadingIndicator) => Promise<T>, options?: LoadingOptions): Promise<T>;
export declare function withSteps<T>(steps: Array<{
    label: string;
    action: () => Promise<unknown>;
}>, options?: LoadingOptions): Promise<void>;
export default LoadingIndicator;
//# sourceMappingURL=LoadingIndicator.d.ts.map