import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
export class ComplianceMonitor {
    rules = new Map();
    toolHistory = new Map();
    violations = new Map();
    historyLimit;
    constructor(config) {
        this.historyLimit = config.historyLimit || 50;
        for (const rule of config.rules) {
            this.rules.set(rule.id, rule);
        }
        logger.info('ComplianceMonitor initialized', {
            rulesCount: this.rules.size,
            historyLimit: this.historyLimit,
        });
    }
    checkToolCall(agentId, toolName, args) {
        const toolCall = {
            agentId,
            toolName,
            args,
            timestamp: new Date(),
        };
        this.recordToolCall(toolCall);
        const context = {
            agentId,
            recentToolCalls: this.getRecentToolCalls(agentId),
        };
        const violations = [];
        let mostSevereAction = 'log';
        for (const rule of this.rules.values()) {
            const violationMessage = rule.validate(toolCall, context);
            if (violationMessage) {
                const violation = {
                    id: uuidv4(),
                    rule,
                    agentId,
                    toolCall,
                    message: violationMessage,
                    severity: rule.severity,
                    timestamp: new Date(),
                    context: {
                        targetFile: args.file_path,
                        recentTools: context.recentToolCalls,
                    },
                };
                violations.push(violation);
                this.recordViolation(violation);
                if (rule.action === 'block') {
                    mostSevereAction = 'block';
                }
                else if (rule.action === 'warn' && mostSevereAction !== 'block') {
                    mostSevereAction = 'warn';
                }
            }
        }
        const allowed = mostSevereAction !== 'block';
        if (!allowed) {
            logger.warn('Tool call blocked by compliance monitor', {
                agentId,
                toolName,
                violations: violations.length,
            });
        }
        return {
            allowed,
            violations,
            action: violations.length > 0 ? mostSevereAction : undefined,
        };
    }
    getRecentToolCalls(agentId, limit) {
        const history = this.toolHistory.get(agentId) || [];
        const actualLimit = limit || this.historyLimit;
        return history.slice(-actualLimit);
    }
    getStats(agentId) {
        const agentViolations = this.violations.get(agentId) || [];
        const totalToolCalls = this.toolHistory.get(agentId)?.length || 0;
        const violationsByRule = {};
        const violationsBySeverity = {
            critical: 0,
            major: 0,
            minor: 0,
        };
        for (const violation of agentViolations) {
            violationsByRule[violation.rule.id] =
                (violationsByRule[violation.rule.id] || 0) + 1;
            violationsBySeverity[violation.severity]++;
        }
        const complianceRate = totalToolCalls > 0
            ? (totalToolCalls - agentViolations.length) / totalToolCalls
            : 1.0;
        return {
            totalViolations: agentViolations.length,
            violationsByRule,
            violationsBySeverity,
            violationsByAgent: { [agentId]: agentViolations.length },
            complianceRate,
        };
    }
    getViolations(agentId) {
        return this.violations.get(agentId) || [];
    }
    clearHistory(agentId) {
        this.toolHistory.delete(agentId);
        this.violations.delete(agentId);
    }
    recordToolCall(toolCall) {
        if (!this.toolHistory.has(toolCall.agentId)) {
            this.toolHistory.set(toolCall.agentId, []);
        }
        const history = this.toolHistory.get(toolCall.agentId);
        history.push(toolCall);
        if (history.length > this.historyLimit) {
            this.toolHistory.set(toolCall.agentId, history.slice(-this.historyLimit));
        }
    }
    recordViolation(violation) {
        if (!this.violations.has(violation.agentId)) {
            this.violations.set(violation.agentId, []);
        }
        this.violations.get(violation.agentId).push(violation);
        logger.warn('Compliance violation detected', {
            agentId: violation.agentId,
            rule: violation.rule.id,
            severity: violation.severity,
            message: violation.message,
        });
    }
}
//# sourceMappingURL=ComplianceMonitor.js.map