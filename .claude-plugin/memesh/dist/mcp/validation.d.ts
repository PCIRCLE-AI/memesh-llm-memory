import { z } from 'zod';
export declare const TaskInputSchema: z.ZodObject<{
    taskDescription: z.ZodOptional<z.ZodString>;
    task_description: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const DashboardInputSchema: z.ZodObject<{
    format: z.ZodDefault<z.ZodOptional<z.ZodString & z.ZodType<"detailed" | "summary", string, z.core.$ZodTypeInternals<"detailed" | "summary", string>>>>;
    exportFormat: z.ZodOptional<z.ZodEnum<{
        json: "json";
        csv: "csv";
        markdown: "markdown";
    }>>;
    includeCharts: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    chartHeight: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const ListAgentsInputSchema: z.ZodObject<{}, z.core.$strip>;
export declare const ListSkillsInputSchema: z.ZodObject<{
    filter: z.ZodDefault<z.ZodOptional<z.ZodString & z.ZodType<"claude-code-buddy" | "user" | "all", string, z.core.$ZodTypeInternals<"claude-code-buddy" | "user" | "all", string>>>>;
}, z.core.$strip>;
export declare const UninstallInputSchema: z.ZodObject<{
    keepData: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    keepConfig: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const HookToolUseInputSchema: z.ZodObject<{
    toolName: z.ZodString;
    arguments: z.ZodOptional<z.ZodUnknown>;
    success: z.ZodBoolean;
    duration: z.ZodOptional<z.ZodNumber>;
    tokensUsed: z.ZodOptional<z.ZodNumber>;
    output: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RecallMemoryInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    query: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CreateEntitiesInputSchema: z.ZodObject<{
    entities: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        entityType: z.ZodString;
        observations: z.ZodArray<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const AddObservationsInputSchema: z.ZodObject<{
    observations: z.ZodArray<z.ZodObject<{
        entityName: z.ZodString;
        contents: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const CreateRelationsInputSchema: z.ZodObject<{
    relations: z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        relationType: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ValidatedTaskInput = z.infer<typeof TaskInputSchema>;
export type ValidatedDashboardInput = z.infer<typeof DashboardInputSchema>;
export type ValidatedListAgentsInput = z.infer<typeof ListAgentsInputSchema>;
export type ValidatedListSkillsInput = z.infer<typeof ListSkillsInputSchema>;
export type ValidatedUninstallInput = z.infer<typeof UninstallInputSchema>;
export type ValidatedHookToolUseInput = z.infer<typeof HookToolUseInputSchema>;
export type ValidatedRecallMemoryInput = z.infer<typeof RecallMemoryInputSchema>;
export type ValidatedCreateEntitiesInput = z.infer<typeof CreateEntitiesInputSchema>;
export type ValidatedAddObservationsInput = z.infer<typeof AddObservationsInputSchema>;
export type ValidatedCreateRelationsInput = z.infer<typeof CreateRelationsInputSchema>;
export declare const A2ASendTaskInputSchema: z.ZodObject<{
    targetAgentId: z.ZodString;
    taskDescription: z.ZodString;
    priority: z.ZodOptional<z.ZodEnum<{
        normal: "normal";
        high: "high";
        low: "low";
        urgent: "urgent";
    }>>;
    sessionId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const A2AGetTaskInputSchema: z.ZodObject<{
    targetAgentId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strip>;
export declare const A2AGetResultInputSchema: z.ZodObject<{
    targetAgentId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strip>;
export declare const A2AListTasksInputSchema: z.ZodObject<{
    state: z.ZodOptional<z.ZodEnum<{
        SUBMITTED: "SUBMITTED";
        WORKING: "WORKING";
        INPUT_REQUIRED: "INPUT_REQUIRED";
        COMPLETED: "COMPLETED";
        FAILED: "FAILED";
        CANCELED: "CANCELED";
        REJECTED: "REJECTED";
    }>>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const A2AListAgentsInputSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        all: "all";
        active: "active";
        inactive: "inactive";
    }>>;
}, z.core.$strip>;
export declare const A2AReportResultInputSchema: z.ZodObject<{
    taskId: z.ZodString;
    success: z.ZodBoolean;
    result: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ValidatedA2ASendTaskInput = z.infer<typeof A2ASendTaskInputSchema>;
export type ValidatedA2AGetTaskInput = z.infer<typeof A2AGetTaskInputSchema>;
export type ValidatedA2AGetResultInput = z.infer<typeof A2AGetResultInputSchema>;
export type ValidatedA2AListTasksInput = z.infer<typeof A2AListTasksInputSchema>;
export type ValidatedA2AListAgentsInput = z.infer<typeof A2AListAgentsInputSchema>;
export type ValidatedA2AReportResultInput = z.infer<typeof A2AReportResultInputSchema>;
export declare const GenerateTestsInputSchema: z.ZodObject<{
    specification: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ValidatedGenerateTestsInput = z.infer<typeof GenerateTestsInputSchema>;
export declare function formatValidationError(error: z.ZodError): string;
//# sourceMappingURL=validation.d.ts.map