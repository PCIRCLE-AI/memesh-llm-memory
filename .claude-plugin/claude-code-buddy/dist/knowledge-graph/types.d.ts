export interface Entity {
    id?: number;
    name: string;
    type: EntityType;
    observations: string[];
    tags?: string[];
    metadata?: Record<string, any>;
    createdAt?: Date;
}
export type EntityType = 'decision' | 'bug_fix' | 'feature' | 'lesson_learned' | 'best_practice' | 'problem_solution' | 'technical_debt' | 'optimization' | 'refactoring';
export interface Relation {
    id?: number;
    from: string;
    to: string;
    relationType: RelationType;
    metadata?: Record<string, any>;
    createdAt?: Date;
}
export type RelationType = 'caused_by' | 'enabled_by' | 'follows_pattern' | 'solves' | 'replaced_by' | 'depends_on' | 'similar_to' | 'evolved_from';
export interface SearchQuery {
    type?: EntityType;
    tag?: string;
    namePattern?: string;
    limit?: number;
    offset?: number;
}
export interface RelationTrace {
    entity: string;
    relations: Array<{
        from: string;
        to: string;
        relationType: RelationType;
        metadata?: Record<string, any>;
    }>;
    depth?: number;
}
//# sourceMappingURL=types.d.ts.map