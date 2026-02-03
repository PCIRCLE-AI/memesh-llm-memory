import crypto from 'crypto';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';
import { ValidationError, NotFoundError } from '../errors/index.js';
export class ABTestManager {
    experiments = new Map();
    assignments = new Map();
    metrics = new Map();
    analyzer = new StatisticalAnalyzer();
    createExperiment(id, name, variants, trafficSplit, successMetric, options = {}) {
        if (variants.length !== trafficSplit.length) {
            throw new ValidationError('Variants and traffic split must have same length', {
                component: 'ABTestManager',
                method: 'createExperiment',
                variantsLength: variants.length,
                trafficSplitLength: trafficSplit.length,
                constraint: 'variants.length === trafficSplit.length',
            });
        }
        const sum = trafficSplit.reduce((acc, val) => acc + val, 0);
        if (Math.abs(sum - 1.0) > 0.001) {
            throw new ValidationError('Traffic split must sum to 1.0', {
                component: 'ABTestManager',
                method: 'createExperiment',
                actualSum: sum,
                constraint: 'sum(trafficSplit) === 1.0',
            });
        }
        const experiment = {
            id,
            name,
            description: name,
            variants,
            trafficSplit,
            successMetric,
            secondaryMetrics: options.secondaryMetrics,
            durationDays: options.durationDays ?? 7,
            minSampleSize: options.minSampleSize ?? 30,
            significanceLevel: options.significanceLevel ?? 0.05,
            status: 'draft',
        };
        this.experiments.set(id, experiment);
        this.assignments.set(id, []);
        this.metrics.set(id, new Map());
        return experiment;
    }
    startExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new NotFoundError(`Experiment ${experimentId} not found`, 'experiment', experimentId, { availableExperiments: Array.from(this.experiments.keys()) });
        }
        experiment.status = 'running';
        experiment.startedAt = new Date();
    }
    assignVariant(experimentId, agentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new NotFoundError(`Experiment ${experimentId} not found`, 'experiment', experimentId, { availableExperiments: Array.from(this.experiments.keys()) });
        }
        const assignments = this.assignments.get(experimentId);
        const existing = assignments.find((a) => a.agentId === agentId);
        if (existing) {
            return existing;
        }
        const variantIndex = this.hashToVariant(`${experimentId}:${agentId}`, experiment.trafficSplit);
        const assignment = {
            id: `${experimentId}:${agentId}`,
            experimentId,
            agentId,
            variantName: experiment.variants[variantIndex].name,
            assignedAt: new Date(),
        };
        assignments.push(assignment);
        return assignment;
    }
    hashToVariant(key, trafficSplit) {
        const hash = crypto.createHash('sha256').update(key).digest('hex');
        const hashInt = parseInt(hash.substring(0, 8), 16);
        const normalizedHash = (hashInt % 100000) / 100000;
        let cumulative = 0;
        for (let i = 0; i < trafficSplit.length; i++) {
            cumulative += trafficSplit[i];
            if (normalizedHash < cumulative) {
                return i;
            }
        }
        return trafficSplit.length - 1;
    }
    addMetric(experimentId, variantName, metrics) {
        if (!this.metrics.has(experimentId)) {
            this.metrics.set(experimentId, new Map());
        }
        const experimentMetrics = this.metrics.get(experimentId);
        if (!experimentMetrics.has(variantName)) {
            experimentMetrics.set(variantName, []);
        }
        experimentMetrics.get(variantName).push(metrics);
    }
    analyzeResults(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new NotFoundError(`Experiment ${experimentId} not found`, 'experiment', experimentId, { availableExperiments: Array.from(this.experiments.keys()) });
        }
        const experimentMetrics = this.metrics.get(experimentId);
        if (!experimentMetrics) {
            throw new NotFoundError(`No metrics found for experiment ${experimentId}`, 'experimentMetrics', experimentId, {
                experiment: experimentId,
                availableMetrics: Array.from(this.metrics.keys())
            });
        }
        const variantStats = {};
        for (const variant of experiment.variants) {
            const metrics = experimentMetrics.get(variant.name) || [];
            const successMetricValues = metrics.map((m) => m[experiment.successMetric] || 0);
            if (successMetricValues.length === 0) {
                variantStats[variant.name] = {
                    variantName: variant.name,
                    sampleSize: 0,
                    successRate: 0,
                    mean: 0,
                    stdDev: 0,
                    confidenceInterval: [0, 0],
                };
                continue;
            }
            const mean = this.analyzer.calculateMean(successMetricValues);
            const stdDev = this.analyzer.calculateStdDev(successMetricValues);
            const ci = this.analyzer.calculateConfidenceInterval(successMetricValues);
            variantStats[variant.name] = {
                variantName: variant.name,
                sampleSize: successMetricValues.length,
                successRate: mean,
                mean,
                stdDev,
                confidenceInterval: ci,
            };
        }
        const variantNames = experiment.variants.map((v) => v.name);
        const control = experimentMetrics.get(variantNames[0]) || [];
        const treatment = experimentMetrics.get(variantNames[1]) || [];
        const controlValues = control.map((m) => m[experiment.successMetric] || 0);
        const treatmentValues = treatment.map((m) => m[experiment.successMetric] || 0);
        let pValue = 1.0;
        let effectSize = 0;
        let winner = null;
        let recommendation = '';
        if (controlValues.length >= experiment.minSampleSize &&
            treatmentValues.length >= experiment.minSampleSize) {
            const tTest = this.analyzer.welchTTest(controlValues, treatmentValues);
            effectSize = this.analyzer.calculateEffectSize(controlValues, treatmentValues);
            pValue = tTest.pValue;
            if (pValue < experiment.significanceLevel) {
                const controlMean = this.analyzer.calculateMean(controlValues);
                const treatmentMean = this.analyzer.calculateMean(treatmentValues);
                winner = treatmentMean > controlMean ? variantNames[1] : variantNames[0];
                recommendation = `Statistically significant difference detected (p=${pValue.toFixed(4)}). Winner: ${winner}`;
            }
            else {
                recommendation = 'No statistically significant difference detected';
            }
        }
        else {
            recommendation = `Insufficient data. Need at least ${experiment.minSampleSize} samples per variant.`;
        }
        const results = {
            experimentId,
            winner,
            confidence: 1 - pValue,
            variantStats,
            statisticalTests: {
                testType: 't-test',
                pValue,
                effectSize,
                confidenceInterval: [0, 0],
            },
            recommendation,
        };
        return results;
    }
    getExperiment(experimentId) {
        return this.experiments.get(experimentId);
    }
}
//# sourceMappingURL=ABTestManager.js.map