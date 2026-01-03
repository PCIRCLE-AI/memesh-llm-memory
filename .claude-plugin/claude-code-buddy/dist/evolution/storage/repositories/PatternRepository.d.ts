import Database from 'better-sqlite3';
import type { Pattern, PatternQuery } from '../types';
export declare class PatternRepository {
    private db;
    constructor(db: Database.Database);
    recordPattern(pattern: Pattern): Promise<void>;
    getPattern(patternId: string): Promise<Pattern | null>;
    queryPatterns(query: PatternQuery): Promise<Pattern[]>;
    updatePattern(patternId: string, updates: Partial<Pattern>): Promise<void>;
    private rowToPattern;
}
//# sourceMappingURL=PatternRepository.d.ts.map