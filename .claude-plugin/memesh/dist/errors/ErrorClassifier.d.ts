export declare enum ErrorCategory {
    CONFIGURATION = "configuration",
    CONNECTION = "connection",
    RUNTIME = "runtime",
    INTEGRATION = "integration",
    VALIDATION = "validation",
    PERMISSION = "permission",
    RESOURCE = "resource",
    UNKNOWN = "unknown"
}
export declare enum ErrorSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare enum RecoveryStrategy {
    RETRY = "retry",
    FALLBACK = "fallback",
    MANUAL = "manual",
    AUTO_FIX = "auto_fix",
    GRACEFUL_DEGRADATION = "graceful",
    ABORT = "abort"
}
export interface ClassifiedError {
    code: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    title: string;
    description: string;
    rootCause: string;
    recoveryStrategy: RecoveryStrategy;
    fixSteps: string[];
    autoFixAvailable: boolean;
    relatedDocs: Array<{
        title: string;
        url: string;
    }>;
    relatedCommands: string[];
    troubleshootingTips: string[];
    originalError: Error;
    context: Record<string, unknown>;
}
export declare class ErrorClassifier {
    classify(error: Error, context?: Record<string, unknown>): ClassifiedError;
    format(classified: ClassifiedError): string;
    private detectCategory;
    private getErrorDetails;
    private getConfigurationErrorDetails;
    private getConnectionErrorDetails;
    private getPermissionErrorDetails;
    private getResourceErrorDetails;
    private getValidationErrorDetails;
    private getIntegrationErrorDetails;
    private getRuntimeErrorDetails;
    private getUnknownErrorDetails;
    private getSeverityBadge;
}
export declare const errorClassifier: ErrorClassifier;
//# sourceMappingURL=ErrorClassifier.d.ts.map