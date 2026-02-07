import { type ParsedSessionMemory } from './types.js';
export declare class SessionMemoryParser {
    private static readonly MAX_INPUT_SIZE;
    parse(markdown: string): ParsedSessionMemory;
    private splitSections;
    private parseTextSection;
    private filterItalicLines;
    private parseFileReferences;
    private parseWorkflow;
    private parseErrors;
    private finalizeError;
    private parseLearnings;
    private classifyLearning;
    private parseWorklog;
}
//# sourceMappingURL=SessionMemoryParser.d.ts.map