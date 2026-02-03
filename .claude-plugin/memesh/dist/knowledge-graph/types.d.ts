export interface Entity {
    id?: number;
    name: string;
    entityType: EntityType;
    observations: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
    contentHash?: string;
    createdAt?: Date;
}
export type EntityType = 'decision' | 'bug_fix' | 'feature' | 'lesson_learned' | 'best_practice' | 'problem_solution' | 'technical_debt' | 'optimization' | 'refactoring' | 'learning_experience' | 'code_change' | 'test_result' | 'session_snapshot' | 'project_snapshot' | 'workflow_checkpoint' | 'commit' | 'prevention_rule' | 'user_preference';
export interface Relation {
    id?: number;
    from: string;
    to: string;
    relationType: RelationType;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
}
export type RelationType = 'caused_by' | 'enabled_by' | 'follows_pattern' | 'solves' | 'replaced_by' | 'depends_on' | 'similar_to' | 'evolved_from';
export interface SearchQuery {
    entityType?: EntityType;
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
        metadata?: Record<string, unknown>;
    }>;
    depth?: number;
}
//# sourceMappingURL=types.d.ts.map