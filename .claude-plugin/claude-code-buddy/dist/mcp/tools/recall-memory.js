export const recallMemoryTool = {
    name: 'recall-memory',
    description: 'Recall project memory from previous sessions. Returns recent code changes, test results, and work context.',
    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Maximum number of memories to return (default: 10)',
                default: 10,
            },
            query: {
                type: 'string',
                description: 'Optional search query to filter memories',
            },
        },
    },
    async handler(args, memoryManager) {
        const memories = await memoryManager.recallRecentWork({
            limit: args.limit || 10,
        });
        return {
            memories: memories.map(m => ({
                type: m.type,
                observations: m.observations,
                timestamp: m.metadata?.timestamp,
            })),
        };
    },
};
//# sourceMappingURL=recall-memory.js.map