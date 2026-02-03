export class ProgressReporter {
    progressToken;
    sendProgress;
    constructor(progressToken, sendProgress) {
        this.progressToken = progressToken;
        this.sendProgress = sendProgress;
    }
    async report(current, total, message) {
        if (!this.progressToken) {
            return;
        }
        await this.sendProgress({
            progressToken: this.progressToken,
            progress: current,
            total,
        });
    }
    isEnabled() {
        return this.progressToken !== undefined;
    }
}
//# sourceMappingURL=ProgressReporter.js.map