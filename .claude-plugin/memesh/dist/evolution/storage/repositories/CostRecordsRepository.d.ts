import Database from 'better-sqlite3';
import { type MicroDollars } from '../../../utils/money.js';
export interface CostRecord {
    id?: string;
    timestamp: Date;
    taskId: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    cost: MicroDollars;
}
export declare class CostRecordsRepository {
    private db;
    constructor(db: Database.Database);
    ensureSchema(): void;
    save(record: CostRecord): string;
    saveBatch(records: CostRecord[]): void;
    getAll(limit?: number): CostRecord[];
    getByTimeRange(start: Date, end: Date): CostRecord[];
    getByModel(modelName: string, limit?: number): CostRecord[];
    getTotalCost(timeRange?: {
        start: Date;
        end: Date;
    }): MicroDollars;
    getCostByModel(timeRange?: {
        start: Date;
        end: Date;
    }): Map<string, MicroDollars>;
    getStats(timeRange?: {
        start: Date;
        end: Date;
    }): {
        totalRecords: number;
        totalCost: MicroDollars;
        totalInputTokens: number;
        totalOutputTokens: number;
        avgCostPerRecord: MicroDollars;
    };
    deleteOlderThan(date: Date): number;
    count(): number;
    private rowToRecord;
}
//# sourceMappingURL=CostRecordsRepository.d.ts.map