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
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const helpText = BuddyCommands.getHelp(input.command);

    const formattedResponse = formatter.format({
      success: true,
      message: input.command
        ? `📖 Help for: buddy ${input.command}`
        : '📖 Claude Code Buddy Help',
      data: {
        help: helpText,
        command: input.command,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching help';

    const formattedError = formatter.format({
      success: false,
      message: `❌ Failed to fetch help`,
      error: errorMessage,
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedError,
        },
      ],
    };
  }
}
