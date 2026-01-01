import { z } from 'zod';
import { BuddyCommands } from '../BuddyCommands.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';

export const BuddyHelpInputSchema = z.object({
  command: z
    .string()
    .optional()
    .describe('Specific command to get help for (e.g., "do", "stats", "remember")'),
});

export type ValidatedBuddyHelpInput = z.infer<typeof BuddyHelpInputSchema>;

/**
 * buddy_help tool - Get help and documentation
 *
 * Shows:
 * - General help (all commands) if no command specified
 * - Specific command help if command name provided
 * - Examples and usage patterns
 * - Command aliases
 *
 * Examples:
 *   command: undefined  - Show all commands
 *   command: "do"       - Help for buddy_do
 *   command: "stats"    - Help for buddy_stats
 */
export async function executeBuddyHelp(
  input: ValidatedBuddyHelpInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const helpText = BuddyCommands.getHelp(input.command);

    const formattedResponse = formatter.format({
      agentType: 'buddy-help',
      taskDescription: input.command
        ? `Help for command: ${input.command}`
        : 'Show all commands',
      status: 'success',
      results: {
        help: helpText,
        command: input.command,
      },
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'buddy-help',
      taskDescription: input.command
        ? `Help for command: ${input.command}`
        : 'Show all commands',
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
