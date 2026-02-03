import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import { logger } from '../utils/logger.js';
import { TestOutputParser } from './TestOutputParser.js';
export class HookIntegration {
    detector;
    butler;
    triggerCallbacks = [];
    projectMemory;
    lastCheckpoint;
    testParser;
    projectAutoTracker;
    constructor(checkpointDetector, developmentButler, projectAutoTracker) {
        this.detector = checkpointDetector;
        this.butler = developmentButler;
        this.testParser = new TestOutputParser();
        this.projectAutoTracker = projectAutoTracker;
    }
    initializeProjectMemory(mcp) {
        if (this.projectMemory) {
            return;
        }
        this.projectMemory = new ProjectAutoTracker(mcp);
    }
    async detectCheckpointFromToolUse(toolData) {
        if (!toolData.success) {
            return null;
        }
        const { toolName, arguments: args } = toolData;
        if (!args || typeof args !== 'object') {
            return null;
        }
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
            if (this.isGitCommitCommand(bashArgs.command)) {
                return {
                    name: 'committed',
                    data: {
                        command: bashArgs.command,
                        message: this.extractGitCommitMessage(bashArgs.command),
                    },
                };
            }
            if (this.isTestCommand(bashArgs.command)) {
                const testResults = this.testParser.parse(toolData.output || '');
                return {
                    name: 'test-complete',
                    data: testResults,
                };
            }
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
        this.ensureProjectMemoryInitialized();
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
                await this.recordCheckpointProgress(checkpoint, toolData);
            }
        }
        if (toolData.output && this.shouldRecordError(toolData.output)) {
            const args = toolData.arguments;
            const command = args?.command || 'unknown command';
            await this.recordErrorFromOutput(toolData.output, command);
        }
        if (this.projectMemory && toolData.tokensUsed) {
            const tokenHook = this.projectMemory.createTokenHook();
            await tokenHook(toolData.tokensUsed);
        }
    }
    async recordToProjectMemory(checkpoint, _toolData) {
        if (!this.projectMemory)
            return;
        if (checkpoint.name === 'code-written' && checkpoint.data.files) {
            const fileChangeHook = this.projectMemory.createFileChangeHook();
            const files = checkpoint.data.files;
            const type = checkpoint.data.type;
            await fileChangeHook(files, `Code ${type}`);
        }
        if (checkpoint.name === 'test-complete') {
            if (!this.isValidTestResults(checkpoint.data)) {
                logger.warn('Invalid test results data structure, skipping memory record', {
                    checkpoint: checkpoint.name,
                    data: checkpoint.data,
                });
                return;
            }
            const testResultHook = this.projectMemory.createTestResultHook();
            const testResults = checkpoint.data;
            const { total, passed, failed, failedTests } = testResults;
            const failures = failedTests.map(test => {
                const parts = [];
                if (test.file) {
                    parts.push(`${test.file}:`);
                }
                parts.push(test.name);
                if (test.error) {
                    parts.push(`- ${test.error}`);
                }
                return parts.join(' ');
            });
            await testResultHook({
                total,
                passed,
                failed,
                failures,
            });
        }
    }
    static TRACKED_PHASES = new Set(['code-written', 'test-complete', 'commit-ready', 'committed']);
    async recordCheckpointProgress(checkpoint, toolData) {
        if (!this.projectMemory || !HookIntegration.TRACKED_PHASES.has(checkpoint.name)) {
            return;
        }
        if (checkpoint.name !== 'code-written' && checkpoint.name !== 'committed') {
            await this.projectMemory.flushPendingCodeChanges(checkpoint.name);
        }
        if (checkpoint.name === 'committed') {
            const { command, message } = checkpoint.data;
            await this.projectMemory.recordCommit({
                command,
                message: message ?? undefined,
                output: toolData.output,
            });
        }
        if (checkpoint.name === this.lastCheckpoint) {
            return;
        }
        const details = this.buildCheckpointDetails(checkpoint, toolData);
        await this.projectMemory.recordWorkflowCheckpoint(checkpoint.name, details);
        this.lastCheckpoint = checkpoint.name;
    }
    buildCheckpointDetails(checkpoint, toolData) {
        const details = [`Trigger: ${toolData.toolName}`];
        const data = checkpoint.data;
        switch (checkpoint.name) {
            case 'code-written': {
                const files = data.files ?? [];
                details.push(`Files changed: ${files.length}`);
                break;
            }
            case 'test-complete': {
                const { total, passed, failed } = data;
                if (total > 0)
                    details.push(`Tests: ${passed}/${total} passed`);
                if (failed > 0)
                    details.push(`Failed: ${failed}`);
                break;
            }
            case 'commit-ready': {
                const command = data.command;
                if (command)
                    details.push(`Command: ${command}`);
                break;
            }
            case 'committed': {
                const message = data.message;
                if (message)
                    details.push(`Message: ${message}`);
                break;
            }
        }
        if (toolData.duration) {
            details.push(`Duration: ${toolData.duration}ms`);
        }
        return details;
    }
    ensureProjectMemoryInitialized() {
        if (this.projectMemory) {
            return;
        }
        const mcp = this.butler.getToolInterface();
        if (!mcp.supportsMemory()) {
            return;
        }
        this.initializeProjectMemory(mcp);
    }
    onButlerTrigger(callback) {
        this.triggerCallbacks.push(callback);
    }
    static TEST_FILE_PATTERNS = ['.test.', '.spec.', '/tests/'];
    static TEST_COMMAND_PATTERNS = ['npm test', 'npm run test', 'vitest', 'jest', 'mocha'];
    isTestFile(filePath) {
        return HookIntegration.TEST_FILE_PATTERNS.some(p => filePath.includes(p));
    }
    isTestCommand(command) {
        return HookIntegration.TEST_COMMAND_PATTERNS.some(p => command.includes(p));
    }
    isGitAddCommand(command) {
        return command.trim().startsWith('git add');
    }
    isGitCommitCommand(command) {
        return this.findGitCommitSegment(command) !== null;
    }
    extractGitCommitMessage(command) {
        const segment = this.findGitCommitSegment(command);
        const source = segment ?? command;
        const messages = [];
        const regex = /-m\s+(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
        let match;
        while ((match = regex.exec(source)) !== null) {
            const message = match[1] ?? match[2] ?? match[3];
            if (message) {
                messages.push(message);
            }
        }
        return messages.length > 0 ? messages.join('\n') : null;
    }
    findGitCommitSegment(command) {
        const segments = command
            .split(/&&|;/)
            .map(segment => segment.trim())
            .filter(Boolean);
        for (const segment of segments) {
            if (/^git\s+commit(\s|$)/.test(segment)) {
                return segment;
            }
        }
        return null;
    }
    isValidTestResults(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const obj = data;
        return (typeof obj.total === 'number' &&
            typeof obj.passed === 'number' &&
            typeof obj.failed === 'number' &&
            Array.isArray(obj.failedTests) &&
            obj.failedTests.every((test) => test &&
                typeof test === 'object' &&
                typeof test.name === 'string'));
    }
    shouldRecordError(output) {
        const errorPatterns = [
            /error:/i,
            /exception:/i,
            /failed:/i,
            /\d+ failing/i,
            /build failed/i,
        ];
        return errorPatterns.some(pattern => pattern.test(output));
    }
    async recordErrorFromOutput(output, command) {
        const lines = output.split('\n');
        const errorLine = lines.find(line => /error:|exception:|failed:/i.test(line));
        if (!errorLine || !this.projectAutoTracker) {
            return;
        }
        const match = errorLine.match(/(\w+Error|Exception|Failed):\s*(.+)/i);
        const errorType = match?.[1] || 'Unknown Error';
        const errorMessage = match?.[2] || errorLine.substring(0, 100);
        await this.projectAutoTracker.recordError({
            error_type: errorType,
            error_message: errorMessage,
            context: `Command: ${command}`,
            resolution: 'Detected during command execution',
        });
    }
}
//# sourceMappingURL=HookIntegration.js.map