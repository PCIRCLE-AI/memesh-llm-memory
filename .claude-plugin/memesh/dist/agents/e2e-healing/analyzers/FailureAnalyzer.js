export class FailureAnalyzer {
    sdk;
    setSDK(sdk) {
        this.sdk = sdk;
    }
    async analyze(evidence) {
        if (!this.sdk) {
            throw new Error('AgentSDKAdapter not configured');
        }
        if (!evidence.error) {
            throw new Error('No error to analyze');
        }
        const result = await this.sdk.analyzeFailure({
            error: evidence.error,
            screenshot: evidence.screenshot,
            codeContext: evidence.testCode,
            useExtendedThinking: true,
        });
        const confidence = this.calculateConfidence(result.rootCause);
        return {
            rootCause: result.rootCause,
            confidence,
            tokensUsed: result.tokensUsed,
        };
    }
    calculateConfidence(rootCause) {
        const thresholds = [
            { minLength: 500, confidence: 0.9 },
            { minLength: 200, confidence: 0.7 },
            { minLength: 100, confidence: 0.5 },
        ];
        const match = thresholds.find(t => rootCause.length > t.minLength);
        return match?.confidence ?? 0.3;
    }
}
//# sourceMappingURL=FailureAnalyzer.js.map