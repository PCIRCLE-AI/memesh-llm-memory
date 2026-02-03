import { z } from 'zod';
import { BuddyCommands } from '../BuddyCommands.js';
export const BuddyHelpInputSchema = z.object({
    command: z
        .string()
        .optional()
        .describe('Specific command to get help for (e.g., "do", "remember", "--all" for full reference)'),
});
export async function executeBuddyHelp(input, formatter) {
    try {
        const showFull = input.command === '--all' || input.command === 'all';
        const command = showFull ? undefined : input.command;
        const options = { full: showFull };
        const helpText = BuddyCommands.getHelp(command, options);
        return {
            content: [
                {
                    type: 'text',
                    text: helpText,
                },
            ],
        };
    }
    catch (error) {
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
                    type: 'text',
                    text: formattedError,
                },
            ],
        };
    }
}
//# sourceMappingURL=buddy-help.js.map