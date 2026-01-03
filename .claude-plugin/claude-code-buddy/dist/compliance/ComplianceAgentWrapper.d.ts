import type { CollaborativeAgent } from '../collaboration/types.js';
import type { ComplianceMonitor } from './ComplianceMonitor.js';
import type { ComplianceViolation, ComplianceStats } from './types.js';
export declare class ComplianceViolationError extends Error {
    violations: ComplianceViolation[];
    constructor(message: string, violations: ComplianceViolation[]);
}
export declare class ComplianceAgentWrapper {
    private agent;
    private complianceMonitor;
    constructor(agent: CollaborativeAgent, complianceMonitor: ComplianceMonitor);
    executeTool(toolName: string, args: any): Promise<any>;
    getComplianceStats(): ComplianceStats;
    getViolations(): ComplianceViolation[];
    getAgent(): CollaborativeAgent;
}
//# sourceMappingURL=ComplianceAgentWrapper.d.ts.map