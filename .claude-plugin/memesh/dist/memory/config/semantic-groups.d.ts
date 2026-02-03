export type SemanticGroup = string[];
export interface SemanticGroupsConfig {
    groups: SemanticGroup[];
}
export declare const SEMANTIC_GROUPS: SemanticGroup[];
export declare function getSemanticGroups(): SemanticGroup[];
export declare function findSemanticGroup(keyword: string): SemanticGroup | undefined;
export declare function areSemanticallySimilar(keyword1: string, keyword2: string): boolean;
//# sourceMappingURL=semantic-groups.d.ts.map