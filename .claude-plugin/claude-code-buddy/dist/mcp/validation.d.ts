import { z } from 'zod';
export declare const TaskInputSchema: z.ZodEffects<z.ZodObject<{
    taskDescription: z.ZodOptional<z.ZodString>;
    task_description: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    taskDescription?: string | undefined;
    priority?: number | undefined;
    task_description?: string | undefined;
}, {
    taskDescription?: string | undefined;
    priority?: number | undefined;
    task_description?: string | undefined;
}>, {
    taskDescription?: string | undefined;
    priority?: number | undefined;
    task_description?: string | undefined;
}, {
    taskDescription?: string | undefined;
    priority?: number | undefined;
    task_description?: string | undefined;
}>;
export declare const DashboardInputSchema: z.ZodObject<{
    format: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodString, "summary" | "detailed", string>>>;
    exportFormat: z.ZodOptional<z.ZodEnum<["json", "csv", "markdown"]>>;
    includeCharts: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    chartHeight: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    format: "summary" | "detailed";
    includeCharts: boolean;
    chartHeight: number;
    exportFormat?: "json" | "csv" | "markdown" | undefined;
}, {
    format?: string | undefined;
    includeCharts?: boolean | undefined;
    exportFormat?: "json" | "csv" | "markdown" | undefined;
    chartHeight?: number | undefined;
}>;
export declare const ListAgentsInputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const ListSkillsInputSchema: z.ZodObject<{
    filter: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodString, "user" | "all" | "claude-code-buddy", string>>>;
}, "strip", z.ZodTypeAny, {
    filter: "user" | "all" | "claude-code-buddy";
}, {
    filter?: string | undefined;
}>;
export declare const UninstallInputSchema: z.ZodObject<{
    keepData: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    keepConfig: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    keepData: boolean;
    keepConfig: boolean;
}, {
    dryRun?: boolean | undefined;
    keepData?: boolean | undefined;
    keepConfig?: boolean | undefined;
}>;
export declare const WorkflowGuidanceInputSchema: z.ZodObject<{
    phase: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phase: string;
}, {
    phase: string;
}>;
export declare const RecordTokenUsageInputSchema: z.ZodObject<{
    inputTokens: z.ZodNumber;
    outputTokens: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    inputTokens: number;
    outputTokens: number;
}, {
    inputTokens: number;
    outputTokens: number;
}>;
export declare const GenerateSmartPlanInputSchema: z.ZodObject<{
    featureDescription: z.ZodString;
    requirements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    featureDescription: string;
    requirements?: string[] | undefined;
    constraints?: string[] | undefined;
}, {
    featureDescription: string;
    requirements?: string[] | undefined;
    constraints?: string[] | undefined;
}>;
export declare const GitSaveWorkInputSchema: z.ZodObject<{
    description: z.ZodString;
    autoBackup: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    autoBackup: boolean;
}, {
    description: string;
    autoBackup?: boolean | undefined;
}>;
export declare const GitListVersionsInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
}, {
    limit?: number | undefined;
}>;
export declare const GitShowChangesInputSchema: z.ZodObject<{
    compareWith: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    compareWith?: string | undefined;
}, {
    compareWith?: string | undefined;
}>;
export declare const GitGoBackInputSchema: z.ZodObject<{
    identifier: z.ZodString;
}, "strip", z.ZodTypeAny, {
    identifier: string;
}, {
    identifier: string;
}>;
export declare const GitSetupInputSchema: z.ZodObject<{
    existingGit: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    existingGit?: boolean | undefined;
}, {
    existingGit?: boolean | undefined;
}>;
export declare const RecallMemoryInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    query: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    query?: string | undefined;
}, {
    query?: string | undefined;
    limit?: number | undefined;
}>;
export type ValidatedTaskInput = z.infer<typeof TaskInputSchema>;
export type ValidatedDashboardInput = z.infer<typeof DashboardInputSchema>;
export type ValidatedListAgentsInput = z.infer<typeof ListAgentsInputSchema>;
export type ValidatedListSkillsInput = z.infer<typeof ListSkillsInputSchema>;
export type ValidatedUninstallInput = z.infer<typeof UninstallInputSchema>;
export type ValidatedWorkflowGuidanceInput = z.infer<typeof WorkflowGuidanceInputSchema>;
export type ValidatedRecordTokenUsageInput = z.infer<typeof RecordTokenUsageInputSchema>;
export type ValidatedGenerateSmartPlanInput = z.infer<typeof GenerateSmartPlanInputSchema>;
export type ValidatedGitSaveWorkInput = z.infer<typeof GitSaveWorkInputSchema>;
export type ValidatedGitListVersionsInput = z.infer<typeof GitListVersionsInputSchema>;
export type ValidatedGitShowChangesInput = z.infer<typeof GitShowChangesInputSchema>;
export type ValidatedGitGoBackInput = z.infer<typeof GitGoBackInputSchema>;
export type ValidatedGitSetupInput = z.infer<typeof GitSetupInputSchema>;
export type ValidatedRecallMemoryInput = z.infer<typeof RecallMemoryInputSchema>;
export declare function formatValidationError(error: z.ZodError): string;
//# sourceMappingURL=validation.d.ts.map