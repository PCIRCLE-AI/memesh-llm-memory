import Database from 'better-sqlite3';
import type { Adaptation } from '../types';
export declare class AdaptationRepository {
    private db;
    constructor(db: Database.Database);
    recordAdaptation(adaptation: Adaptation): Promise<void>;
    getAdaptation(adaptationId: string): Promise<Adaptation | null>;
    queryAdaptations(filters: {
        patternId?: string;
        agentId?: string;
        taskType?: string;
        skillName?: string;
        isActive?: boolean;
    }): Promise<Adaptation[]>;
    private rowToAdaptation;
}
//# sourceMappingURL=AdaptationRepository.d.ts.map