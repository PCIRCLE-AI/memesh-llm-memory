export class FixGenerator {
    sdk;
    setSDK(sdk) {
        this.sdk = sdk;
    }
    async generate(input) {
        if (!this.sdk) {
            throw new Error('AgentSDKAdapter not configured');
        }
        const targetFile = this.determineTargetFile(input);
        const result = await this.sdk.generateFix({
            rootCause: input.rootCause,
            codeContext: input.codeContext,
            testFile: input.testFile,
        });
        return {
            code: result.code,
            targetFile,
            tokensUsed: result.tokensUsed,
            cacheHit: result.cacheHit,
        };
    }
    determineTargetFile(input) {
        const rootCauseLower = input.rootCause.toLowerCase();
        const styleKeywords = ['css', 'style', 'class'];
        const isStyleIssue = styleKeywords.some(keyword => rootCauseLower.includes(keyword));
        if (input.styleFile && isStyleIssue) {
            return input.styleFile;
        }
        return input.componentFile ?? input.testFile.replace('.test.', '.');
    }
}
//# sourceMappingURL=FixGenerator.js.map