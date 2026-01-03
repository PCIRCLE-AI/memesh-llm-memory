import { z } from 'zod';
import { BuddyCommands } from '../BuddyCommands.js';
export const BuddyHelpInputSchema = z.object({
    command: z
        .string()
        .optional()
        .describe('Specific command to get help for (e.g., "do", "stats", "remember")'),
});
export async function executeBuddyHelp(input, formatter) {
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
                    type: 'text',
                    text: formattedResponse,
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