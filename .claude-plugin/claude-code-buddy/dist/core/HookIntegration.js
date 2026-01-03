import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
export class HookIntegration {
    detector;
    butler;
    triggerCallbacks = [];
    projectMemory;
    constructor(checkpointDetector, developmentButler) {
        this.detector = checkpointDetector;
        this.butler = developmentButler;
    }
    initializeProjectMemory(mcp) {
        this.projectMemory = new ProjectAutoTracker(mcp);
    }
    async detectCheckpointFromToolUse(toolData) {
        if (!toolData.success) {
            return null;
        }
        const { toolName, arguments: args } = toolData;
        if (toolName === 'Write') {
            const fileArgs = args;
            return {
                name: 'code-written',
                data: {
                    files: [fileArgs.file_path],
                    hasTests: this.isTestFile(fileArgs.file_path),
                    type: 'new-file',
                },
            };
        }
        if (toolName === 'Edit') {
            const fileArgs = args;
            return {
                name: 'code-written',
                data: {
                    files: [fileArgs.file_path],
                    hasTests: this.isTestFile(fileArgs.file_path),
                    type: 'modification',
                },
            };
        }
        if (toolName === 'Bash') {
            const bashArgs = args;
            if (this.isTestCommand(bashArgs.command)) {
                const testResults = this.parseTestOutput(toolData.output || '');
                return {
                    name: 'test-complete',
                    data: testResults,
                };
            }
        }
        if (toolName === 'Bash') {
            const bashArgs = args;
            if (this.isGitAddCommand(bashArgs.command)) {
                return {
                    name: 'commit-ready',
                    data: {
                        command: bashArgs.command,
                    },
                };
            }
        }
        return null;
    }
    async processToolUse(toolData) {
        const checkpoint = await this.detectCheckpointFromToolUse(toolData);
        if (checkpoint) {
            await this.detector.triggerCheckpoint(checkpoint.name, checkpoint.data);
            const context = {
                checkpoint: checkpoint.name,
                data: checkpoint.data,
                toolName: toolData.toolName,
            };
            for (const callback of this.triggerCallbacks) {
                callback(context);
            }
            if (this.projectMemory) {
                await this.recordToProjectMemory(checkpoint, toolData);
            }
        }
        if (this.projectMemory && toolData.tokensUsed) {
            const tokenHook = this.projectMemory.createTokenHook();
            await tokenHook(toolData.tokensUsed);
        }
    }
    async recordToProjectMemory(checkpoint, toolData) {
        if (!this.projectMemory)
            return;
        if (checkpoint.name === 'code-written' && checkpoint.data.files) {
            const fileChangeHook = this.projectMemory.createFileChangeHook();
            const files = checkpoint.data.files;
            const type = checkpoint.data.type;
            await fileChangeHook(files, `Code ${type}`);
        }
        if (checkpoint.name === 'test-complete') {
            const testResultHook = this.projectMemory.createTestResultHook();
            const { total, passed, failed } = checkpoint.data;
            await testResultHook({
                total,
                passed,
                failed,
                failures: [],
            });
        }
    }
    onButlerTrigger(callback) {
        this.triggerCallbacks.push(callback);
    }
    isTestFile(filePath) {
        return (filePath.includes('.test.') ||
            filePath.includes('.spec.') ||
            filePath.includes('/tests/'));
    }
    isTestCommand(command) {
        return (command.includes('npm test') ||
            command.includes('npm run test') ||
            command.includes('vitest') ||
            command.includes('jest') ||
            command.includes('mocha'));
    }
    isGitAddCommand(command) {
        return command.trim().startsWith('git add');
    }
    parseTestOutput(output) {
        const passedMatch = output.match(/(\d+)\s+(?:tests?\s+)?passed/i);
        const failedMatch = output.match(/(\d+)\s+(?:tests?\s+)?failed/i);
        const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
        const total = passed + failed;
        return { total, passed, failed };
    }
}
//# sourceMappingURL=HookIntegration.js.map