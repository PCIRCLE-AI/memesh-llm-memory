import { NotFoundError } from '../errors/index.js';
export class CheckpointDetector {
    checkpoints = new Map();
    registerCheckpoint(checkpointName, callback, metadata) {
        if (!checkpointName || !callback) {
            return false;
        }
        this.checkpoints.set(checkpointName, {
            callbacks: [callback],
            metadata,
        });
        return true;
    }
    addCallback(checkpointName, callback) {
        const entry = this.checkpoints.get(checkpointName);
        if (!entry) {
            return false;
        }
        entry.callbacks.push(callback);
        return true;
    }
    isCheckpointRegistered(checkpointName) {
        return this.checkpoints.has(checkpointName);
    }
    getRegisteredCheckpoints() {
        return Array.from(this.checkpoints.keys());
    }
    async triggerCheckpoint(checkpointName, data) {
        if (!this.isCheckpointRegistered(checkpointName)) {
            throw new NotFoundError(`Checkpoint "${checkpointName}" is not registered`, 'checkpoint', checkpointName);
        }
        const entry = this.checkpoints.get(checkpointName);
        let failedCallbacks = 0;
        let firstError;
        for (const callback of entry.callbacks) {
            try {
                await callback(data);
            }
            catch (error) {
                failedCallbacks++;
                if (!firstError) {
                    firstError =
                        error instanceof Error ? error.message : 'Unknown error';
                }
            }
        }
        if (failedCallbacks === entry.callbacks.length) {
            return {
                triggered: false,
                checkpointName,
                error: firstError,
            };
        }
        return {
            triggered: true,
            checkpointName,
            failedCallbacks: failedCallbacks > 0 ? failedCallbacks : undefined,
        };
    }
    unregisterCheckpoint(checkpointName) {
        return this.checkpoints.delete(checkpointName);
    }
    getCheckpointMetadata(checkpointName) {
        return this.checkpoints.get(checkpointName)?.metadata;
    }
}
//# sourceMappingURL=CheckpointDetector.js.map