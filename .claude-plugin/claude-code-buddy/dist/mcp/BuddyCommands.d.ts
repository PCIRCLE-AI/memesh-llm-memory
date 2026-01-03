export interface ParsedCommand {
    command: string;
    args: string;
    originalInput: string;
}
export declare class BuddyCommands {
    private static readonly ALIASES;
    private static readonly VALID_COMMANDS;
    static parse(input: string): ParsedCommand;
    static getHelp(command?: string): string;
    private static getGeneralHelp;
}
//# sourceMappingURL=BuddyCommands.d.ts.map