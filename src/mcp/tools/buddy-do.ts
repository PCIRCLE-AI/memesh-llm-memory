import { z } from 'zod';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { ProjectAutoTracker } from '../../memory/ProjectAutoTracker.js';
import { logger } from '../../utils/logger.js';

export const BuddyDoInputSchema = z.object({
  task: z.string().trim().min(1).describe('Task description for MeMesh to process'),
});

export type ValidatedBuddyDoInput = z.infer<typeof BuddyDoInputSchema>;

/**
 * Extract goal, reason, and expected outcome from task description
 */
function extractTaskMetadata(task: string): {
  goal: string;
  reason?: string;
  expectedOutcome?: string;
} {
  const goalMatch = task.match(/^([^.!?]+)[.!?]/) || task.match(/to ([^,]+)/);
  const reasonMatch = task.match(/because ([^,\.]+)/) || task.match(/so that ([^,\.]+)/);
  const expectedMatch = task.match(/should ([^,\.]+)/) || task.match(/will ([^,\.]+)/);

  return {
    goal: goalMatch?.[1]?.trim() || task.substring(0, 100),
    reason: reasonMatch?.[1]?.trim(),
    expectedOutcome: expectedMatch?.[1]?.trim(),
  };
}

/**
 * buddy_do tool - Record task and provide guidance
 *
 * Records the task to project memory and returns guidance.
 * Task routing to specialized agents has been removed in favor of
 * direct Claude Code capabilities.
 *
 * Examples:
 *   task: "setup authentication"
 *   task: "refactor user service"
 *   task: "fix login bug"
 */
export async function executeBuddyDo(
  input: ValidatedBuddyDoInput,
  formatter: ResponseFormatter,
  autoTracker?: ProjectAutoTracker
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const startTime = Date.now();
  const taskId = `buddy-do-${startTime}`;

  try {
    // Record task start with metadata
    if (autoTracker) {
      const taskMeta = extractTaskMetadata(input.task);

      await autoTracker.recordTaskStart({
        task_description: input.task,
        goal: taskMeta.goal,
        reason: taskMeta.reason,
        expected_outcome: taskMeta.expectedOutcome,
        priority: 'normal',
      });

      logger.debug('Task start recorded', {
        goal: taskMeta.goal,
        hasReason: !!taskMeta.reason,
        hasExpectedOutcome: !!taskMeta.expectedOutcome,
      });
    }

    const durationMs = Date.now() - startTime;

    logger.debug('buddy_do task recorded', {
      taskId,
      durationMs,
    });

    const formattedResponse = formatter.format({
      agentType: 'buddy-do',
      taskDescription: input.task,
      status: 'success',
      results: {
        message: 'Task recorded. Proceed with execution using Claude Code capabilities.',
        stats: {
          durationMs,
        },
      },
    });

    // MeMesh memory reminder
    const memeshReminder = [
      '',
      'MeMesh Auto-Memory Reminder:',
      'After completing this task, save key implementation details:',
      '  create-entities with observations like:',
      '  - What was implemented (specific configs, values, patterns)',
      '  - Key decisions made and why',
      '  - Any gotchas or important notes for future reference',
    ].join('\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse + memeshReminder,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    logger.error('buddy_do task failed', { taskId, error: errorObj.message });

    const formattedError = formatter.format({
      agentType: 'buddy-do',
      taskDescription: input.task,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}
