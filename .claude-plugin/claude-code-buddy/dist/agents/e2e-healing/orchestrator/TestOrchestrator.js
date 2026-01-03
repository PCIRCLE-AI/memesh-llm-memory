export class TestOrchestrator {
    maxAttempts;
    testRunner;
    analyzer;
    fixApplier;
    constructor(config) {
        this.maxAttempts = config.maxAttempts;
    }
    setTestRunner(runner) {
        this.testRunner = runner;
    }
    setAnalyzer(analyzer) {
        this.analyzer = analyzer;
    }
    setFixApplier(applier) {
        this.fixApplier = applier;
    }
    async healE2ETest(testFile, constraints) {
        if (!this.testRunner) {
            throw new Error('TestRunner not configured');
        }
        const context = {
            testFile,
            failureHistory: [],
            constraints: constraints,
        };
        let currentAttempt = 0;
        while (currentAttempt < this.maxAttempts) {
            currentAttempt++;
            const testResult = await this.testRunner(testFile);
            if (testResult.status === 'success') {
                return {
                    status: 'healed',
                    attempts: currentAttempt,
                    history: context.failureHistory,
                };
            }
            if (!this.analyzer || !testResult.error) {
                break;
            }
            const analysis = await this.analyzer(testResult.error, context);
            if (!this.fixApplier) {
                break;
            }
            const fixResult = await this.fixApplier(analysis, context);
            if (fixResult.status === 'skipped') {
                return {
                    status: 'aborted',
                    reason: fixResult.reason,
                    attempts: currentAttempt,
                    history: context.failureHistory,
                };
            }
            context.failureHistory.push({
                attemptNumber: currentAttempt,
                error: testResult.error,
                analysis: analysis.rootCause,
                fixApplied: fixResult,
                result: 'failed',
            });
        }
        return {
            status: 'unhealed',
            attempts: currentAttempt,
            history: context.failureHistory,
            recommendation: 'Manual intervention required',
        };
    }
}
//# sourceMappingURL=TestOrchestrator.js.map