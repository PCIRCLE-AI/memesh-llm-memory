import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
export declare const CreateBackupInputSchema: z.ZodObject<{
    dbPath: z.ZodOptional<z.ZodString>;
    compress: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    verify: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    prefix: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    compress: boolean;
    verify: boolean;
    dbPath?: string | undefined;
    prefix?: string | undefined;
}, {
    dbPath?: string | undefined;
    compress?: boolean | undefined;
    verify?: boolean | undefined;
    prefix?: string | undefined;
}>;
export declare const ListBackupsInputSchema: z.ZodObject<{
    dbPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dbPath?: string | undefined;
}, {
    dbPath?: string | undefined;
}>;
export declare const RestoreBackupInputSchema: z.ZodObject<{
    backupPath: z.ZodString;
    targetPath: z.ZodOptional<z.ZodString>;
    verify: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    backupPath: string;
    verify: boolean;
    targetPath?: string | undefined;
}, {
    backupPath: string;
    verify?: boolean | undefined;
    targetPath?: string | undefined;
}>;
export declare const CleanBackupsInputSchema: z.ZodObject<{
    dbPath: z.ZodOptional<z.ZodString>;
    dailyBackups: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    weeklyBackups: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    monthlyBackups: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    dailyBackups: number;
    weeklyBackups: number;
    monthlyBackups: number;
    dbPath?: string | undefined;
}, {
    dbPath?: string | undefined;
    dailyBackups?: number | undefined;
    weeklyBackups?: number | undefined;
    monthlyBackups?: number | undefined;
}>;
export declare const BackupStatsInputSchema: z.ZodObject<{
    dbPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dbPath?: string | undefined;
}, {
    dbPath?: string | undefined;
}>;
export type ValidatedCreateBackupInput = z.infer<typeof CreateBackupInputSchema>;
export type ValidatedListBackupsInput = z.infer<typeof ListBackupsInputSchema>;
export type ValidatedRestoreBackupInput = z.infer<typeof RestoreBackupInputSchema>;
export type ValidatedCleanBackupsInput = z.infer<typeof CleanBackupsInputSchema>;
export type ValidatedBackupStatsInput = z.infer<typeof BackupStatsInputSchema>;
export declare function executeCreateBackup(input: ValidatedCreateBackupInput, formatter: ResponseFormatter): Promise<CallToolResult>;
export declare function executeListBackups(input: ValidatedListBackupsInput, formatter: ResponseFormatter): Promise<CallToolResult>;
export declare function executeRestoreBackup(input: ValidatedRestoreBackupInput, formatter: ResponseFormatter): Promise<CallToolResult>;
export declare function executeCleanBackups(input: ValidatedCleanBackupsInput, formatter: ResponseFormatter): Promise<CallToolResult>;
export declare function executeBackupStats(input: ValidatedBackupStatsInput, formatter: ResponseFormatter): Promise<CallToolResult>;
//# sourceMappingURL=database-backup.d.ts.map