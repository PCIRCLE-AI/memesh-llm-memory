import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
export interface AddObservationsArgs {
    observations: Array<{
        entityName: string;
        contents: string[];
    }>;
}
export declare const addObservationsTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            observations: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        entityName: {
                            type: string;
                            description: string;
                        };
                        contents: {
                            type: string;
                            items: {
                                type: string;
                            };
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
        };
        required: string[];
    };
    handler(args: AddObservationsArgs, knowledgeGraph: KnowledgeGraph): Promise<{
        updated: string[];
        count: number;
        notFound: string[] | undefined;
        errors: {
            entityName: string;
            error: string;
        }[] | undefined;
    }>;
};
//# sourceMappingURL=add-observations.d.ts.map