import { logger } from '../utils/logger.js';
export class ResultHandler {
    handleCompleted(task, result) {
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
        task.status = 'failed';
        task.endTime = new Date();
        task.error = error;
        logger.error(`BackgroundExecutor: Task ${task.taskId} failed:`, error);
        this.executeCallback(() => {
            task.config.callbacks?.onError?.(error);
        }, task.taskId, 'onError');
    }
    handleCancelled(task) {
        task.status = 'cancelled';
        task.endTime = new Date();
        logger.info(`BackgroundExecutor: Task ${task.taskId} cancelled`);
    }
    executeCallback(callback, taskId, callbackName) {
        try {
            callback();
        }
        catch (callbackError) {
            logger.error(`BackgroundExecutor: Error in ${callbackName} callback for task ${taskId}:`, callbackError);
        }
    }
}
//# sourceMappingURL=ResultHandler.js.map