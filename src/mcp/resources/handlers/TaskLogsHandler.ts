// src/mcp/resources/handlers/TaskLogsHandler.ts
import { ResourceContent } from '../ResourceRegistry.js';
import { URITemplateParams } from '../URITemplateHandler.js';

/**
 * Task Logs Resource Handler
 *
 * Provides execution logs for specific tasks.
 * URI Template: ccb://task/{taskId}/logs
 */

export class TaskLogsHandler {
  /**
   * Handle task logs request
   *
   * @param params - URI template parameters
   * @returns Resource content with task logs
   */
  async handle(params: URITemplateParams): Promise<ResourceContent> {
    const taskId = params.taskId;

    if (!taskId) {
      throw new Error('Missing required parameter: taskId');
    }

    // In real implementation, fetch from BackgroundExecutor or task storage
    const logs = await this.fetchTaskLogs(taskId);

    return {
      uri: `ccb://task/${taskId}/logs`,
      mimeType: 'text/plain',
      text: logs,
    };
  }

  /**
   * Fetch task logs from storage
   *
   * @param taskId - Task ID
   * @returns Task logs as plain text
   *
   * NOTE: This feature is not yet implemented. BackgroundExecutor does not
   * currently expose log retrieval methods. To implement this properly:
   * 1. Add getTaskLogs() method to BackgroundExecutor
   * 2. Store execution logs in EvolutionStore
   * 3. Inject BackgroundExecutor or EvolutionStore into this handler
   *
   * For now, this returns a clear message about the limitation.
   */
  private async fetchTaskLogs(taskId: string): Promise<string> {
    return `Task Logs - Feature Not Yet Available
=====================================

Task ID: ${taskId}

Detailed task execution logs are not yet available in this version.

This feature requires:
- Log capture in BackgroundExecutor
- Log storage in EvolutionStore
- Integration with task lifecycle tracking

Current workaround:
- Check task status via BackgroundExecutor.getProgress()
- Monitor console logs during task execution
- Use UIEventBus for progress events

Status: Planned for future release
`;
  }
}
