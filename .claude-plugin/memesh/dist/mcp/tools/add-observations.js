export const addObservationsTool = {
    name: 'add-observations',
    description: 'Add new observations to existing entities in the Knowledge Graph. Update entities with additional information, notes, or findings.',
    inputSchema: {
        type: 'object',
        properties: {
            observations: {
                type: 'array',
                description: 'Array of observations to add to existing entities',
                items: {
                    type: 'object',
                    properties: {
                        entityName: {
                            type: 'string',
                            description: 'Name of the entity to add observations to',
                        },
                        contents: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of observation contents to add',
                        },
                    },
                    required: ['entityName', 'contents'],
                },
            },
        },
        required: ['observations'],
    },
    async handler(args, knowledgeGraph) {
        const updated = [];
        const notFound = [];
        const errors = [];
        for (const obs of args.observations) {
            try {
                const entity = await knowledgeGraph.getEntity(obs.entityName);
                if (!entity) {
                    notFound.push(obs.entityName);
                    continue;
                }
                const mergedObservations = [...entity.observations, ...obs.contents];
                await knowledgeGraph.createEntity({
                    name: entity.name,
                    entityType: entity.entityType,
                    observations: mergedObservations,
                    metadata: entity.metadata,
                });
                updated.push(obs.entityName);
            }
            catch (error) {
                errors.push({
                    entityName: obs.entityName,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return {
            updated,
            count: updated.length,
            notFound: notFound.length > 0 ? notFound : undefined,
            errors: errors.length > 0 ? errors : undefined,
        };
    },
};
//# sourceMappingURL=add-observations.js.map