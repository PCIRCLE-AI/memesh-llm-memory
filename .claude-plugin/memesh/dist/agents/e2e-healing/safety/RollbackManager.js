import { spawn } from 'child_process';
export class RollbackManager {
    static TESTID_REGEX = /^[a-zA-Z0-9_-]+$/;
    static DESCRIPTION_REGEX = /^[a-zA-Z0-9\s_.,:-]+$/;
    static MESSAGE_REGEX = /^[a-zA-Z0-9\s_.,:-]+$/;
    checkpoints = new Map();
    rollbackHistory = [];
    MAX_ROLLBACK_HISTORY = 500;
    execFunction;
    constructor() {
        this.execFunction = this.defaultExec;
    }
    validateTestId(testId) {
        if (!RollbackManager.TESTID_REGEX.test(testId)) {
            throw new Error(`Invalid testId: "${testId}". Only alphanumeric, dashes, and underscores allowed.`);
        }
    }
    validateDescription(description) {
        if (!RollbackManager.DESCRIPTION_REGEX.test(description)) {
            throw new Error(`Invalid description: "${description}". Only alphanumeric, spaces, and basic punctuation allowed.`);
        }
    }
    validateMessage(message) {
        if (!RollbackManager.MESSAGE_REGEX.test(message)) {
            throw new Error(`Invalid commit message: "${message}". Only alphanumeric, spaces, and basic punctuation allowed.`);
        }
    }
    setExecFunction(fn) {
        this.execFunction = fn;
    }
    async createCheckpoint(testId, description) {
        this.validateTestId(testId);
        this.validateDescription(description);
        try {
            await this.execFunction('git', [
                'stash',
                'push',
                '-m',
                `E2E Healing: ${description}`,
            ]);
            const stashId = await this.getLatestStashId();
            const checkpoint = {
                testId,
                stashId,
                timestamp: Date.now(),
                description,
            };
            this.checkpoints.set(testId, checkpoint);
            return stashId;
        }
        catch (error) {
            this.checkpoints.delete(testId);
            throw new Error(`Failed to create checkpoint for test ${testId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async rollback(testId, reason = 'Fix failed') {
        const checkpoint = this.checkpoints.get(testId);
        if (!checkpoint) {
            throw new Error(`No checkpoint found for test ${testId}`);
        }
        try {
            await this.execFunction('git', ['stash', 'pop', checkpoint.stashId]);
            this.rollbackHistory.push({
                testId,
                timestamp: Date.now(),
                reason,
            });
            if (this.rollbackHistory.length > this.MAX_ROLLBACK_HISTORY) {
                this.rollbackHistory = this.rollbackHistory.slice(-this.MAX_ROLLBACK_HISTORY);
            }
            this.checkpoints.delete(testId);
        }
        catch (error) {
            throw new Error(`Failed to rollback test ${testId} using stash ${checkpoint.stashId}: ${error instanceof Error ? error.message : String(error)}. Manual recovery: git stash apply ${checkpoint.stashId}`);
        }
    }
    async commit(testId, message) {
        this.validateMessage(message);
        const checkpoint = this.checkpoints.get(testId);
        if (!checkpoint) {
            throw new Error(`No checkpoint found for test ${testId}`);
        }
        try {
            await this.execFunction('git', ['add', '.']);
            await this.execFunction('git', ['commit', '-m', message]);
            await this.execFunction('git', ['stash', 'drop', checkpoint.stashId]);
            this.checkpoints.delete(testId);
        }
        catch (error) {
            throw new Error(`Failed to commit changes for test ${testId}: ${error instanceof Error ? error.message : String(error)}. Stash ${checkpoint.stashId} preserved for manual review.`);
        }
    }
    getRollbackHistory() {
        return [...this.rollbackHistory];
    }
    async getLatestStashId() {
        const { stdout } = await this.execFunction('git', ['stash', 'list']);
        const firstLine = stdout.trim().split('\n')[0];
        const match = firstLine?.match(/^(stash@\{\d+\})/);
        if (!match) {
            throw new Error('Failed to get stash ID from git stash list');
        }
        return match[1];
    }
    async defaultExec(command, args) {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args);
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
            proc.on('error', (error) => {
                reject(error);
            });
        });
    }
}
//# sourceMappingURL=RollbackManager.js.map