// src/compliance/ComplianceMonitor.ts
import type {
  ComplianceRule,
  ComplianceViolation,
  ComplianceStats,
  ToolCallRecord,
  RuleContext,
  RuleSeverity,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export interface ComplianceMonitorConfig {
  rules: ComplianceRule[];
  historyLimit?: number; // Max tool calls to track per agent
}

export interface CheckResult {
  allowed: boolean;
  violations: ComplianceViolation[];
  action?: 'block' | 'warn' | 'log';
}

export class ComplianceMonitor {
  private rules: Map<string, ComplianceRule> = new Map();
  private toolHistory: Map<string, ToolCallRecord[]> = new Map();
  private violations: Map<string, ComplianceViolation[]> = new Map();
  private historyLimit: number;

  constructor(config: ComplianceMonitorConfig) {
    this.historyLimit = config.historyLimit || 50;

    // Register rules
    for (const rule of config.rules) {
      this.rules.set(rule.id, rule);
    }

    logger.info('ComplianceMonitor initialized', {
      rulesCount: this.rules.size,
      historyLimit: this.historyLimit,
    });
  }

  /**
   * Check tool call against all rules
   */
  checkToolCall(agentId: string, toolName: string, args: any): CheckResult {
    const toolCall: ToolCallRecord = {
      agentId,
      toolName,
      args,
      timestamp: new Date(),
    };

    // Store tool call in history
    this.recordToolCall(toolCall);

    // Build rule context
    const context: RuleContext = {
      agentId,
      recentToolCalls: this.getRecentToolCalls(agentId),
    };

    // Check all rules
    const violations: ComplianceViolation[] = [];
    let mostSevereAction: 'block' | 'warn' | 'log' = 'log';

    for (const rule of this.rules.values()) {
      const violationMessage = rule.validate(toolCall, context);

      if (violationMessage) {
        const violation: ComplianceViolation = {
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

        // Determine most severe action
        if (rule.action === 'block') {
          mostSevereAction = 'block';
        } else if (rule.action === 'warn' && mostSevereAction !== 'block') {
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

  /**
   * Get recent tool calls for an agent
   */
  getRecentToolCalls(agentId: string, limit?: number): ToolCallRecord[] {
    const history = this.toolHistory.get(agentId) || [];
    const actualLimit = limit || this.historyLimit;
    return history.slice(-actualLimit);
  }

  /**
   * Get compliance stats for an agent
   */
  getStats(agentId: string): ComplianceStats {
    const agentViolations = this.violations.get(agentId) || [];
    const totalToolCalls = this.toolHistory.get(agentId)?.length || 0;

    const violationsByRule: Record<string, number> = {};
    const violationsBySeverity: Record<RuleSeverity, number> = {
      critical: 0,
      major: 0,
      minor: 0,
    };

    for (const violation of agentViolations) {
      // By rule
      violationsByRule[violation.rule.id] =
        (violationsByRule[violation.rule.id] || 0) + 1;

      // By severity
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

  /**
   * Get all violations for an agent
   */
  getViolations(agentId: string): ComplianceViolation[] {
    return this.violations.get(agentId) || [];
  }

  /**
   * Clear history for an agent
   */
  clearHistory(agentId: string): void {
    this.toolHistory.delete(agentId);
    this.violations.delete(agentId);
  }

  // Private methods

  private recordToolCall(toolCall: ToolCallRecord): void {
    if (!this.toolHistory.has(toolCall.agentId)) {
      this.toolHistory.set(toolCall.agentId, []);
    }

    const history = this.toolHistory.get(toolCall.agentId)!;
    history.push(toolCall);

    // Trim if exceeds limit
    if (history.length > this.historyLimit) {
      this.toolHistory.set(
        toolCall.agentId,
        history.slice(-this.historyLimit)
      );
    }
  }

  private recordViolation(violation: ComplianceViolation): void {
    if (!this.violations.has(violation.agentId)) {
      this.violations.set(violation.agentId, []);
    }

    this.violations.get(violation.agentId)!.push(violation);

    logger.warn('Compliance violation detected', {
      agentId: violation.agentId,
      rule: violation.rule.id,
      severity: violation.severity,
      message: violation.message,
    });
  }
}
