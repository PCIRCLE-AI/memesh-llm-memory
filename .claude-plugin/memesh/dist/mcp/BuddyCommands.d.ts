export interface ParsedCommand {
    command: string;
    args: string;
    originalInput: string;
}
export interface HelpOptions {
    full?: boolean;
    format?: 'default' | 'simple' | 'detailed';
}
export declare class BuddyCommands {
    private static readonly ALIASES;
    private static readonly VALID_COMMANDS;
    static parse(input: string): ParsedCommand;
    static getHelp(command?: string, options?: HelpOptions): string;
    private static getQuickStartHelp;
    private static getFullHelp;
    private static getCommandHelp;
    private static getDoCommandHelp;
    private static getRememberCommandHelp;
    private static getHelpCommandHelp;
}
//# sourceMappingURL=BuddyCommands.d.ts.map