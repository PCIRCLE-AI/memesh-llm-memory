import { logger } from '../utils/logger.js';
export class StatisticalAnalyzer {
    calculateMean(data) {
        if (data.length === 0) {
            return 0;
        }
        const sum = data.reduce((acc, val) => acc + val, 0);
        return sum / data.length;
    }
    calculateStdDev(data) {
        if (data.length === 0) {
            return 0;
        }
        if (data.length === 1) {
            return 0;
        }
        const mean = this.calculateMean(data);
        const squaredDiffs = data.map((val) => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / (data.length - 1);
        return Math.sqrt(variance);
    }
    welchTTest(control, treatment) {
        const n1 = control.length;
        const n2 = treatment.length;
        if (n1 < 2 || n2 < 2) {
            throw new Error('Sample sizes must be at least 2 for t-test');
        }
        const mean1 = this.calculateMean(control);
        const mean2 = this.calculateMean(treatment);
        const stdDev1 = this.calculateStdDev(control);
        const stdDev2 = this.calculateStdDev(treatment);
        const variance1 = Math.pow(stdDev1, 2) / n1;
        const variance2 = Math.pow(stdDev2, 2) / n2;
        const varianceSum = variance1 + variance2;
        if (varianceSum === 0) {
            logger.debug('[StatisticalAnalyzer] Zero varianceSum in welchTTest - both groups have identical values', {
                mean1,
                mean2,
                n1,
                n2,
            });
            return {
                tStatistic: 0,
                pValue: 1.0,
                degreesOfFreedom: n1 + n2 - 2,
                significant: false,
            };
        }
        const sqrtVarianceSum = Math.sqrt(varianceSum);
        if (sqrtVarianceSum === 0 || !Number.isFinite(sqrtVarianceSum)) {
            logger.warn('[StatisticalAnalyzer] sqrt(varianceSum) is degenerate', {
                varianceSum,
                sqrtVarianceSum,
            });
            return {
                tStatistic: 0,
                pValue: 1.0,
                degreesOfFreedom: n1 + n2 - 2,
                significant: false,
            };
        }
        const tStatistic = (mean1 - mean2) / sqrtVarianceSum;
        if (!Number.isFinite(tStatistic)) {
            logger.warn('[StatisticalAnalyzer] Invalid t-statistic', {
                mean1,
                mean2,
                variance1,
                variance2,
                tStatistic,
            });
            return {
                tStatistic: 0,
                pValue: 1.0,
                degreesOfFreedom: n1 + n2 - 2,
                significant: false,
            };
        }
        const numerator = Math.pow(varianceSum, 2);
        const denominator = Math.pow(variance1, 2) / (n1 - 1) + Math.pow(variance2, 2) / (n2 - 1);
        if (denominator === 0 || !Number.isFinite(denominator)) {
            return {
                tStatistic: 0,
                pValue: 1.0,
                degreesOfFreedom: n1 + n2 - 2,
                significant: false,
            };
        }
        const degreesOfFreedom = numerator / denominator;
        if (!Number.isFinite(degreesOfFreedom)) {
            logger.warn('[StatisticalAnalyzer] Invalid degrees of freedom', {
                numerator,
                denominator,
                degreesOfFreedom,
            });
            return {
                tStatistic: 0,
                pValue: 1.0,
                degreesOfFreedom: n1 + n2 - 2,
                significant: false,
            };
        }
        const pValue = this.tDistributionPValue(Math.abs(tStatistic), degreesOfFreedom);
        const twoTailedPValue = pValue * 2;
        if (!Number.isFinite(twoTailedPValue)) {
            logger.warn('[StatisticalAnalyzer] Invalid p-value', {
                tStatistic,
                degreesOfFreedom,
                pValue,
            });
            return {
                tStatistic,
                pValue: 1.0,
                degreesOfFreedom,
                significant: false,
            };
        }
        return {
            tStatistic,
            pValue: twoTailedPValue,
            degreesOfFreedom,
            significant: twoTailedPValue < 0.05,
        };
    }
    tDistributionPValue(t, df) {
        if (df > 30) {
            return this.normalCDF(-t);
        }
        const x = df / (df + t * t);
        const beta = this.incompleteBeta(x, df / 2, 0.5);
        return beta / 2;
    }
    normalCDF(z) {
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp((-z * z) / 2);
        const prob = d *
            t *
            (0.3193815 +
                t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return z > 0 ? 1 - prob : prob;
    }
    incompleteBeta(x, a, b) {
        if (x <= 0)
            return 0;
        if (x >= 1)
            return 1;
        if (a <= 0 || b <= 0 || !Number.isFinite(a) || !Number.isFinite(b)) {
            return 0;
        }
        const lnBeta = this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
        const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
        let f = 1.0;
        let c = 1.0;
        let d = 0.0;
        for (let m = 0; m <= 100; m++) {
            const aa = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
            d = 1 + aa * d;
            if (Math.abs(d) < 1e-30)
                d = 1e-30;
            c = 1 + aa / c;
            if (Math.abs(c) < 1e-30)
                c = 1e-30;
            d = 1 / d;
            f *= d * c;
            const aa2 = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
            d = 1 + aa2 * d;
            if (Math.abs(d) < 1e-30)
                d = 1e-30;
            c = 1 + aa2 / c;
            if (Math.abs(c) < 1e-30)
                c = 1e-30;
            d = 1 / d;
            const delta = d * c;
            f *= delta;
            if (Math.abs(delta - 1.0) < 1e-8)
                break;
        }
        return front * f;
    }
    logGamma(x) {
        if (x <= 0 || !Number.isFinite(x)) {
            return 0;
        }
        const cof = [
            76.18009172947146, -86.50532032941677, 24.01409824083091,
            -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
        ];
        let y = x;
        let tmp = x + 5.5;
        tmp -= (x + 0.5) * Math.log(tmp);
        let ser = 1.000000000190015;
        for (let j = 0; j < 6; j++) {
            ser += cof[j] / ++y;
        }
        return -tmp + Math.log((2.5066282746310005 * ser) / x);
    }
    calculateEffectSize(control, treatment) {
        const n1 = control.length;
        const n2 = treatment.length;
        if (n1 < 2 || n2 < 2) {
            return 0;
        }
        const mean1 = this.calculateMean(control);
        const mean2 = this.calculateMean(treatment);
        const stdDev1 = this.calculateStdDev(control);
        const stdDev2 = this.calculateStdDev(treatment);
        const pooledVariance = ((n1 - 1) * Math.pow(stdDev1, 2) + (n2 - 1) * Math.pow(stdDev2, 2)) /
            (n1 + n2 - 2);
        const pooledStdDev = Math.sqrt(pooledVariance);
        if (pooledStdDev === 0) {
            return 0;
        }
        return (mean1 - mean2) / pooledStdDev;
    }
    calculateConfidenceInterval(data, confidence = 0.95) {
        if (data.length === 0) {
            return [0, 0];
        }
        const mean = this.calculateMean(data);
        const stdDev = this.calculateStdDev(data);
        const n = data.length;
        if (n === 1) {
            return [mean, mean];
        }
        const alpha = 1 - confidence;
        const df = n - 1;
        const tCritical = this.getTCritical(alpha / 2, df);
        const sqrtN = Math.sqrt(n);
        const marginOfError = tCritical * (stdDev / sqrtN);
        if (!Number.isFinite(marginOfError)) {
            logger.warn('[StatisticalAnalyzer] Non-finite marginOfError in CI calculation', {
                tCritical,
                stdDev,
                sqrtN,
                marginOfError,
            });
            return [mean, mean];
        }
        return [mean - marginOfError, mean + marginOfError];
    }
    getTCritical(alpha, df) {
        const zCritical = this.getZCritical(alpha);
        if (df < 30) {
            const correction = 1 + (30 - df) * 0.02;
            return zCritical * correction;
        }
        return zCritical;
    }
    getZCritical(alpha) {
        if (Math.abs(alpha - 0.025) < 0.001)
            return 1.96;
        if (Math.abs(alpha - 0.05) < 0.001)
            return 1.645;
        if (Math.abs(alpha - 0.005) < 0.001)
            return 2.576;
        return Math.sqrt(2) * this.erfInv(1 - 2 * alpha);
    }
    erfInv(x) {
        if (x <= -1)
            return -6;
        if (x >= 1)
            return 6;
        if (x === 0)
            return 0;
        const a = 0.147;
        const b = 2 / (Math.PI * a) + Math.log(1 - x * x) / 2;
        const sqrt1 = Math.sqrt(b * b - Math.log(1 - x * x) / a);
        const sqrt2 = Math.sqrt(sqrt1 - b);
        return sqrt2 * Math.sign(x);
    }
}
//# sourceMappingURL=StatisticalAnalyzer.js.map