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
        const length = rootCause.length;
        if (length > 500)
            return 0.9;
        if (length > 200)
            return 0.7;
        if (length > 100)
            return 0.5;
        return 0.3;
    }
}
//# sourceMappingURL=FailureAnalyzer.js.map