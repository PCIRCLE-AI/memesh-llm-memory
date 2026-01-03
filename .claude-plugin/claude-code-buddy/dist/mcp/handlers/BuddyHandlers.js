import { z } from 'zod';
import { ValidationError } from '../../errors/index.js';
import { logError } from '../../utils/errorHandler.js';
import { executeBuddyDo, BuddyDoInputSchema, } from '../tools/buddy-do.js';
import { executeBuddyStats, BuddyStatsInputSchema, } from '../tools/buddy-stats.js';
import { executeBuddyRemember, BuddyRememberInputSchema, } from '../tools/buddy-remember.js';
import { executeBuddyHelp, BuddyHelpInputSchema, } from '../tools/buddy-help.js';
export class BuddyHandlers {
    router;
    formatter;
    projectMemoryManager;
    constructor(router, formatter, projectMemoryManager) {
        this.router = router;
        this.formatter = formatter;
        this.projectMemoryManager = projectMemoryManager;
    }
    async handleBuddyDo(args) {
        let validatedInput;
        try {
            validatedInput = BuddyDoInputSchema.parse(args);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyDo',
                operation: 'validating buddy_do input',
                data: { providedArgs: args },
            });
            if (error instanceof z.ZodError) {
                throw new ValidationError('Invalid buddy_do input', {
                    component: 'BuddyHandlers',
                    method: 'handleBuddyDo',
                    schema: 'BuddyDoInputSchema',
                    providedArgs: args,
                });
            }
            throw error;
        }
        try {
            return await executeBuddyDo(validatedInput, this.router, this.formatter);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyDo',
                operation: 'executing buddy_do command',
                data: { task: validatedInput.task },
            });
            throw error;
        }
    }
    async handleBuddyStats(args) {
        let validatedInput;
        try {
            validatedInput = BuddyStatsInputSchema.parse(args);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyStats',
                operation: 'validating buddy_stats input',
                data: { providedArgs: args },
            });
            if (error instanceof z.ZodError) {
                throw new ValidationError('Invalid buddy_stats input', {
                    component: 'BuddyHandlers',
                    method: 'handleBuddyStats',
                    schema: 'BuddyStatsInputSchema',
                    providedArgs: args,
                });
            }
            throw error;
        }
        try {
            return await executeBuddyStats(validatedInput, this.formatter);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyStats',
                operation: 'executing buddy_stats command',
                data: { period: validatedInput.period },
            });
            throw error;
        }
    }
    async handleBuddyRemember(args) {
        let validatedInput;
        try {
            validatedInput = BuddyRememberInputSchema.parse(args);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyRemember',
                operation: 'validating buddy_remember input',
                data: { providedArgs: args },
            });
            if (error instanceof z.ZodError) {
                throw new ValidationError('Invalid buddy_remember input', {
                    component: 'BuddyHandlers',
                    method: 'handleBuddyRemember',
                    schema: 'BuddyRememberInputSchema',
                    providedArgs: args,
                });
            }
            throw error;
        }
        try {
            return await executeBuddyRemember(validatedInput, this.projectMemoryManager, this.formatter);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyRemember',
                operation: 'executing buddy_remember command',
                data: { query: validatedInput.query },
            });
            throw error;
        }
    }
    async handleBuddyHelp(args) {
        let validatedInput;
        try {
            validatedInput = BuddyHelpInputSchema.parse(args);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyHelp',
                operation: 'validating buddy_help input',
                data: { providedArgs: args },
            });
            if (error instanceof z.ZodError) {
                throw new ValidationError('Invalid buddy_help input', {
                    component: 'BuddyHandlers',
                    method: 'handleBuddyHelp',
                    schema: 'BuddyHelpInputSchema',
                    providedArgs: args,
                });
            }
            throw error;
        }
        try {
            return await executeBuddyHelp(validatedInput, this.formatter);
        }
        catch (error) {
            logError(error, {
                component: 'BuddyHandlers',
                method: 'handleBuddyHelp',
                operation: 'executing buddy_help command',
                data: { command: validatedInput.command },
            });
            throw error;
        }
    }
}
//# sourceMappingURL=BuddyHandlers.js.map