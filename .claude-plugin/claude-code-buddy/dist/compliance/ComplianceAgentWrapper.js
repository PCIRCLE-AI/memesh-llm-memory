import { logger } from '../utils/logger.js';
export class ComplianceViolationError extends Error {
    violations;
    constructor(message, violations) {
        super(message);
        this.violations = violations;
        this.name = 'ComplianceViolationError';
    }
}
export class ComplianceAgentWrapper {
    agent;
    complianceMonitor;
    constructor(agent, complianceMonitor) {
        this.agent = agent;
        this.complianceMonitor = complianceMonitor;
        logger.info('Agent wrapped with compliance monitoring', {
            agentId: agent.id,
            agentName: agent.name,
        });
    }
    async executeTool(toolName, args) {
        const checkResult = this.complianceMonitor.checkToolCall(this.agent.id, toolName, args);
        if (!checkResult.allowed) {
            const errorMessage = checkResult.violations
                .map(v => v.message)
                .join('; ');
            logger.error('Tool execution blocked by compliance', {
                agentId: this.agent.id,
                toolName,
                violations: checkResult.violations.length,
            });
            throw new ComplianceViolationError(errorMessage, checkResult.violations);
        }
        return await this.agent.execute(toolName, args);
    }
    getComplianceStats() {
        return this.complianceMonitor.getStats(this.agent.id);
    }
    getViolations() {
        return this.complianceMonitor.getViolations(this.agent.id);
    }
    getAgent() {
        return this.agent;
    }
}
//# sourceMappingURL=ComplianceAgentWrapper.js.map