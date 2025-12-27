// src/compliance/ComplianceAgentWrapper.ts
import type { CollaborativeAgent } from '../collaboration/types.js';
import type { ComplianceMonitor } from './ComplianceMonitor.js';
import type { ComplianceViolation, ComplianceStats } from './types.js';
import { logger } from '../utils/logger.js';

export class ComplianceViolationError extends Error {
  constructor(
    message: string,
    public violations: ComplianceViolation[]
  ) {
    super(message);
    this.name = 'ComplianceViolationError';
  }
}

/**
 * Wraps an agent to enforce compliance rules
 */
export class ComplianceAgentWrapper {
  constructor(
    private agent: CollaborativeAgent,
    private complianceMonitor: ComplianceMonitor
  ) {
    logger.info('Agent wrapped with compliance monitoring', {
      agentId: agent.id,
      agentName: agent.name,
    });
  }

  /**
   * Execute tool with compliance checking
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    // Check compliance before execution
    const checkResult = this.complianceMonitor.checkToolCall(
      this.agent.id,
      toolName,
      args
    );

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

    // Execute tool via wrapped agent
    return await this.agent.execute(toolName, args);
  }

  /**
   * Get compliance statistics for this agent
   */
  getComplianceStats(): ComplianceStats {
    return this.complianceMonitor.getStats(this.agent.id);
  }

  /**
   * Get violation history for this agent
   */
  getViolations(): ComplianceViolation[] {
    return this.complianceMonitor.getViolations(this.agent.id);
  }

  /**
   * Get the wrapped agent
   */
  getAgent(): CollaborativeAgent {
    return this.agent;
  }
}
