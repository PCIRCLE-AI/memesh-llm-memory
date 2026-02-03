export interface ProgressBarOptions {
    width?: number;
    showPercent?: boolean;
    filledChar?: string;
    emptyChar?: string;
    useColors?: boolean;
    filledColor?: 'green' | 'blue' | 'cyan' | 'yellow' | 'magenta' | 'red' | 'white';
}
export interface RatioBarOptions extends ProgressBarOptions {
    labels?: [string, string];
    leftChar?: string;
    rightChar?: string;
    colors?: [string, string];
}
export interface DistributionBarOptions {
    width?: number;
    chars?: string[];
    colors?: ('green' | 'blue' | 'cyan' | 'yellow' | 'magenta' | 'red' | 'white')[];
    showLegend?: boolean;
}
export declare function progressBar(value: number, options?: ProgressBarOptions): string;
export declare function ratioBar(leftValue: number, rightValue: number, options?: RatioBarOptions): string;
export declare function distributionBar(values: Record<string, number>, options?: DistributionBarOptions): string;
export declare function labeledProgressBar(title: string, value: number, options?: ProgressBarOptions): string;
export declare function inlineProgressBar(label: string, value: number, options?: ProgressBarOptions): string;
export declare function sparkline(values: number[], options?: {
    useColors?: boolean;
}): string;
//# sourceMappingURL=AsciiProgressBar.d.ts.map