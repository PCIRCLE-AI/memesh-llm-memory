export interface WelchTTestResult {
    tStatistic: number;
    pValue: number;
    degreesOfFreedom: number;
}
export declare class StatisticalAnalyzer {
    calculateMean(data: number[]): number;
    calculateStdDev(data: number[]): number;
    welchTTest(control: number[], treatment: number[]): WelchTTestResult;
    private tDistributionPValue;
    private normalCDF;
    private incompleteBeta;
    private logGamma;
    calculateEffectSize(control: number[], treatment: number[]): number;
    calculateConfidenceInterval(data: number[], confidence?: number): [number, number];
    private getTCritical;
    private getZCritical;
    private erfInv;
}
//# sourceMappingURL=StatisticalAnalyzer.d.ts.map