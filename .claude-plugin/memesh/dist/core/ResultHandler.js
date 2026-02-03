import { logger } from '../utils/logger.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';
export class ResultHandler {
    handleCompleted(task, result) {
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
            logger.debug(`BackgroundExecutor: Task ${task.taskId} already in terminal state '${task.status}', skipping completion update`);
            return;
        }
        task.status = 'completed';
        task.endTime = new Date();
        task.result = result;
        task.progress = {
            progress: 1.0,
            currentStage: 'completed',
        };
        logger.info(`BackgroundExecutor: Task ${task.taskId} completed`);
        this.executeCallback(() => {
            task.config.callbacks?.onComplete?.(result);
        }, task.taskId, 'onComplete');
    }
    handleFailed(task, error) {
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
            logger.debug(`BackgroundExecutor: Task ${task.taskId} already in terminal state '${task.status}', skipping failure update`);
            return;
        }
        task.status = 'failed';
        task.endTime = new Date();
        task.error = error;
        logger.error(`BackgroundExecutor: Task ${task.taskId} failed:`, error);
        this.executeCallback(() => {
            task.config.callbacks?.onError?.(error);
        }, task.taskId, 'onError');
    }
    handleCancelled(task) {
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
            logger.debug(`BackgroundExecutor: Task ${task.taskId} already in terminal state '${task.status}', skipping cancellation update`);
            return;
        }
        task.status = 'cancelled';
        task.endTime = new Date();
        logger.info(`BackgroundExecutor: Task ${task.taskId} cancelled`);
    }
    executeCallback(callback, taskId, callbackName) {
        try {
            callback();
        }
        catch (callbackError) {
            const sanitizedError = this.sanitizeCallbackError(callbackError);
            logger.error(`BackgroundExecutor: Error in ${callbackName} callback for task ${taskId}:`, sanitizedError);
        }
    }
    sanitizeCallbackError(error) {
        if (error instanceof Error) {
            const message = error.message || '';
            const sanitized = message
                .split('\n')
                .map(line => (looksLikeSensitive(line) ? `[REDACTED:${hashValue(line)}]` : line))
                .join('\n');
            return {
                name: error.name,
                message: sanitized,
                stack: error.stack,
            };
        }
        const errorStr = String(error);
        if (looksLikeSensitive(errorStr)) {
            return `[REDACTED:${hashValue(errorStr)}]`;
        }
        return error;
    }
}
//# sourceMappingURL=ResultHandler.js.map