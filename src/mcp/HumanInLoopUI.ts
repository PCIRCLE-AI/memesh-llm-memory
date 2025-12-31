/**
 * Human-in-the-Loop UI
 *
 * Formats confirmation requests for Claude Code users,
 * showing recommendations with reasoning and alternatives.
 */

import { AgentType } from '../orchestrator/types.js';
import { ValidationError } from '../errors/index.js';

/**
 * Alternative agent option
 */
export interface AgentAlternative {
  agent: AgentType;
  confidence: number;
  reason: string;
}

/**
 * Confirmation request for human-in-the-loop
 */
export interface ConfirmationRequest {
  taskDescription: string;
  recommendedAgent: AgentType;
  confidence: number;
  reasoning: string[];
  alternatives: AgentAlternative[];
}

/**
 * User's response to confirmation request
 */
export interface ConfirmationResponse {
  accepted: boolean;
  selectedAgent?: AgentType;
  wasOverridden: boolean;
}

/**
 * Human-in-the-Loop UI Formatter
 *
 * Formats smart routing decisions as clear,
 * human-readable confirmation prompts.
 */
export class HumanInLoopUI {
  /**
   * Format confirmation request for user
   *
   * Returns formatted text with:
   * - Recommended agent + confidence
   * - Reasoning (bullet points)
   * - Alternatives (numbered list)
   * - Clear prompt [y/n/1-3]
   */
  formatConfirmationRequest(request: ConfirmationRequest): string {
    // Validate required fields
    if (!request.taskDescription || !request.taskDescription.trim()) {
      throw new ValidationError(
        'Invalid confirmation request: taskDescription is required',
        {
          component: 'HumanInLoopUI',
          method: 'formatConfirmationRequest',
          providedValue: request.taskDescription,
          requiredField: 'taskDescription',
        }
      );
    }
    if (!request.recommendedAgent) {
      throw new ValidationError(
        'Invalid confirmation request: recommendedAgent is required',
        {
          component: 'HumanInLoopUI',
          method: 'formatConfirmationRequest',
          providedValue: request.recommendedAgent,
          requiredField: 'recommendedAgent',
        }
      );
    }

    // Safe defaults for optional arrays
    const reasoning = request.reasoning || [];
    const alternatives = request.alternatives || [];

    const lines: string[] = [];

    // Header
    lines.push('═══════════════════════════════════════════════════');
    lines.push('🤖 Smart Agent Router - Recommendation');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');

    // Task
    lines.push(`📋 Task: ${request.taskDescription}`);
    lines.push('');

    // Recommendation
    const confidencePercent = Math.round(request.confidence * 100);
    lines.push(`✨ Recommended Agent: ${request.recommendedAgent} (${confidencePercent}% confidence)`);
    lines.push('');

    // Reasoning
    lines.push('💡 Reasoning:');
    reasoning.forEach(reason => {
      // Filter empty reasons
      if (reason && reason.trim()) {
        lines.push(`   • ${reason}`);
      }
    });
    lines.push('');

    // Alternatives (if any)
    if (alternatives.length > 0) {
      lines.push('🔄 Alternative Agents:');
      alternatives.forEach((alt, index) => {
        const altConfidence = Math.round(alt.confidence * 100);
        lines.push(`   ${index + 1}. ${alt.agent} (${altConfidence}%) - ${alt.reason}`);
      });
      lines.push('');
    }

    // Prompt
    if (alternatives.length > 0) {
      const maxIndex = alternatives.length;
      lines.push(`❓ Proceed with ${request.recommendedAgent}? [y/n/1-${maxIndex}]`);
      lines.push(`   y = Accept recommendation`);
      lines.push(`   n = Reject`);
      lines.push(`   1-${maxIndex} = Choose alternative agent`);
    } else {
      lines.push(`❓ Proceed with ${request.recommendedAgent}? [y/n]`);
      lines.push(`   y = Accept recommendation`);
      lines.push(`   n = Reject`);
    }

    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Parse user's response
   *
   * Accepts:
   * - 'y' or 'yes' → accept recommendation
   * - 'n' or 'no' → reject
   * - '1', '2', '3' → select alternative by index
   */
  parseUserResponse(
    input: string,
    request: ConfirmationRequest
  ): ConfirmationResponse {
    const trimmed = input.trim().toLowerCase();

    // Accept recommendation
    if (trimmed === 'y' || trimmed === 'yes') {
      return {
        accepted: true,
        selectedAgent: request.recommendedAgent,
        wasOverridden: false,
      };
    }

    // Reject
    if (trimmed === 'n' || trimmed === 'no') {
      return {
        accepted: false,
        wasOverridden: false,
      };
    }

    // Select alternative by number
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= request.alternatives.length) {
      const selectedAlt = request.alternatives[num - 1];
      return {
        accepted: true,
        selectedAgent: selectedAlt.agent,
        wasOverridden: true,
      };
    }

    // Invalid input
    return {
      accepted: false,
      wasOverridden: false,
    };
  }
}
