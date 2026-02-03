import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
export interface CreateRelationsArgs {
    relations: Array<{
        from: string;
        to: string;
        relationType: string;
        metadata?: Record<string, unknown>;
    }>;
}
export declare const createRelationsTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            relations: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        from: {
                            type: string;
                            description: string;
                        };
                        to: {
                            type: string;
                            description: string;
                        };
                        relationType: {
                            type: string;
                            description: string;
                        };
                        metadata: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
        };
        required: string[];
    };
    handler(args: CreateRelationsArgs, knowledgeGraph: KnowledgeGraph): Promise<{
        created: {
            from: string;
            to: string;
            type: string;
        }[];
        count: number;
        missingEntities: string[] | undefined;
        errors: {
            from: string;
            to: string;
            error: string;
        }[] | undefined;
    }>;
};
//# sourceMappingURL=create-relations.d.ts.map