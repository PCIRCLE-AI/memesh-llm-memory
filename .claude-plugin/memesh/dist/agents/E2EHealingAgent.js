import path from 'path';
import { TestOrchestrator } from './e2e-healing/orchestrator/TestOrchestrator.js';
import { DEFAULT_CONFIG } from './e2e-healing/config.js';
import { hashStackTrace } from '../telemetry/sanitization.js';
const MAX_LINES_CHANGED_PER_FIX = 100;
const MAX_DIRECTORY_DEPTH = 3;
const ALLOWED_FILE_PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
const FORBIDDEN_FILE_PATTERNS = ['**/node_modules/**', '**/dist/**'];
export class E2EHealingAgent {
    mcp;
    orchestrator;
    config;
    constructor(mcp, config) {
        this.mcp = mcp;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.orchestrator = new TestOrchestrator({
            maxAttempts: this.config.maxAttempts,
        });
    }
    async runTests(options) {
        const { testPath, autoApply = false, environment = 'dev' } = options;
        if (!testPath || typeof testPath !== 'string') {
            throw new Error('Invalid test path: must be a non-empty string');
        }
        const normalizedTestPath = testPath.trim();
        if (normalizedTestPath.length === 0) {
            throw new Error('Invalid test path: must be a non-empty string');
        }
        if (path.isAbsolute(normalizedTestPath)) {
            throw new Error('Invalid test path: absolute paths are not allowed');
        }
        if (normalizedTestPath.includes('..') || normalizedTestPath.includes('\0')) {
            throw new Error('Invalid test path: path traversal not allowed');
        }
        if (!normalizedTestPath.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
            throw new Error('Invalid test path: must be a test file (.test.ts, .spec.ts, etc.)');
        }
        if (normalizedTestPath.startsWith('-')) {
            throw new Error('Invalid test path: cannot start with "-"');
        }
        const safePathPattern = /^[a-zA-Z0-9_.\\/\\-]+$/;
        if (!safePathPattern.test(normalizedTestPath)) {
            throw new Error('Invalid test path: contains unsupported characters');
        }
        try {
            await this.mcp.memory.createEntities({
                entities: [
                    {
                        name: `E2E Test Run ${new Date().toISOString()}`,
                        entityType: 'e2e_test_run',
                        observations: [
                            `Test path: ${normalizedTestPath}`,
                            `Auto-apply: ${autoApply}`,
                            `Environment: ${environment}`,
                            `Started at: ${new Date().toISOString()}`,
                        ],
                    },
                ],
            });
            const result = await this.orchestrator.healE2ETest(normalizedTestPath, {
                maxAttempts: this.config.maxAttempts,
                maxFilesModified: this.config.maxAttempts,
                maxLinesChanged: MAX_LINES_CHANGED_PER_FIX,
                allowedFilePatterns: ALLOWED_FILE_PATTERNS,
                forbiddenFilePatterns: FORBIDDEN_FILE_PATTERNS,
                maxDirectoryDepth: MAX_DIRECTORY_DEPTH,
            });
            const healingResult = {
                success: result.status === 'healed',
                testsRun: 1,
                testsPassed: result.status === 'healed' ? 1 : 0,
                testsFailed: result.status === 'healed' ? 0 : 1,
                healingAttempts: result.attempts,
                healingSuccesses: result.status === 'healed' ? 1 : 0,
                message: this.formatOrchestratorResult(result),
                failedTests: result.status !== 'healed' ? [normalizedTestPath] : undefined,
            };
            await this.mcp.memory.createEntities({
                entities: [
                    {
                        name: `E2E Test Result ${new Date().toISOString()}`,
                        entityType: 'e2e_test_result',
                        observations: [
                            `Test path: ${normalizedTestPath}`,
                            `Status: ${result.status}`,
                            `Attempts: ${result.attempts}`,
                            `Completed at: ${new Date().toISOString()}`,
                        ],
                    },
                ],
            });
            return healingResult;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const stackTrace = error instanceof Error ? error.stack : undefined;
            const observations = [
                `Test path: ${normalizedTestPath}`,
                `Error: ${errorMessage}`,
                `Failed at: ${new Date().toISOString()}`,
            ];
            if (stackTrace) {
                observations.push(`Stack trace hash: ${hashStackTrace(stackTrace)}`);
            }
            await this.mcp.memory.createEntities({
                entities: [
                    {
                        name: `E2E Test Error ${new Date().toISOString()}`,
                        entityType: 'e2e_test_error',
                        observations,
                    },
                ],
            });
            throw error;
        }
    }
    formatOrchestratorResult(result) {
        const lines = [];
        switch (result.status) {
            case 'healed':
                lines.push(`✅ Test healed successfully after ${result.attempts} attempt(s)`);
                break;
            case 'unhealed':
                lines.push(`❌ Test could not be healed after ${result.attempts} attempt(s)`);
                break;
            case 'aborted':
                lines.push(`⚠️  Healing aborted after ${result.attempts} attempt(s)`);
                break;
            default:
                const _exhaustiveCheck = result.status;
                throw new Error(`Unexpected healing status: ${_exhaustiveCheck}`);
        }
        if (result.reason) {
            lines.push(`Reason: ${result.reason}`);
        }
        if (result.recommendation) {
            lines.push(`Recommendation: ${result.recommendation}`);
        }
        return lines.join('\n');
    }
    getConfig() {
        return this.config;
    }
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }
}
//# sourceMappingURL=E2EHealingAgent.js.map