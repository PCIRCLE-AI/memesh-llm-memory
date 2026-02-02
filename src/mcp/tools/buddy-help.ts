import { z } from 'zod';
import { BuddyCommands } from '../BuddyCommands.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';

export const BuddyHelpInputSchema = z.object({
  command: z
    .string()
    .optional()
    .describe('Specific command to get help for (e.g., "do", "remember", "--all" for full reference)'),
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
 */
export async function executeBuddyHelp(
  input: ValidatedBuddyHelpInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    // Check for --all flag
    const showFull = input.command === '--all' || input.command === 'all';
    const command = showFull ? undefined : input.command;
    const options = { full: showFull };

    const helpText = BuddyCommands.getHelp(command, options);

    // For help command, return the formatted help directly without wrapper
    // This gives us better control over the visual presentation
    return {
      content: [
        {
          type: 'text' as const,
          text: helpText,
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
