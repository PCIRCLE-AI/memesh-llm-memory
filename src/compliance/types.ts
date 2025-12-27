/**
 * Compliance Rule Types
 */

export type RuleSeverity = 'critical' | 'major' | 'minor';

export type RuleAction = 'block' | 'warn' | 'log';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  action: RuleAction;

  /**
   * Validate tool call against this rule
   * Returns violation message if rule is broken, undefined otherwise
   */
  validate(
    toolCall: ToolCallRecord,
    context: RuleContext
  ): string | undefined;
}

export interface RuleContext {
  agentId: string;
  recentToolCalls: ToolCallRecord[];
  agentType?: string;
  taskType?: string;
}

export interface ToolCallRecord {
  agentId: string;
  toolName: string;
  args: any;
  timestamp: Date;
}

export interface ComplianceViolation {
  id: string;
  rule: ComplianceRule;
  agentId: string;
  toolCall: ToolCallRecord;
  message: string;
  severity: RuleSeverity;
  timestamp: Date;
  context: {
    targetFile?: string;
    recentTools: ToolCallRecord[];
    agentType?: string;
  };
}

export interface ComplianceStats {
  totalViolations: number;
  violationsByRule: Record<string, number>;
  violationsBySeverity: Record<RuleSeverity, number>;
  violationsByAgent: Record<string, number>;
  complianceRate: number; // 0-1
}
