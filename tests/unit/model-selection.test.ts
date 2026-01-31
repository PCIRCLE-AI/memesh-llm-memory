/**
 * Model Selection Tests
 *
 * Verifies that all agents use Claude 4.5 models correctly:
 * - selectClaudeModel() returns correct 4.5 models for each complexity
 * - All agents have 4.5 models configured for all complexity levels
 * - No deprecated 3.5 or legacy models are used
 */

import { describe, it, expect } from 'vitest';
import { selectClaudeModel, CLAUDE_MODELS } from '../../src/config/models.js';
import { MODEL_SUGGESTIONS } from '../../src/prompts/templates/PromptTemplates.js';
import type { AgentType } from '../../src/orchestrator/types.js';

describe('Model Selection', () => {
  describe('selectClaudeModel()', () => {
    it('should use Haiku 4.5 for simple complexity', () => {
      const model = selectClaudeModel('simple');
      expect(model).toBe(CLAUDE_MODELS.HAIKU_4_5);
      expect(model).toBe('claude-haiku-4-5-20251015');
    });

    it('should use Sonnet 4.5 for medium complexity', () => {
      const model = selectClaudeModel('medium');
      expect(model).toBe(CLAUDE_MODELS.SONNET_4_5);
      expect(model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should use Opus 4.5 for complex complexity', () => {
      const model = selectClaudeModel('complex');
      expect(model).toBe(CLAUDE_MODELS.OPUS_4_5);
      expect(model).toBe('claude-opus-4-5-20251101');
    });
  });

  describe('Agent Model Suggestions', () => {
    const deprecatedModels = [
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-haiku-20241022',
      'claude-haiku-4-20250514',
    ];

    const validModels = [
      'claude-haiku-4-5-20251015',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-5-20251101',
    ];

    it('should have 4.5 models for all agents at all complexity levels', () => {
      const agentTypes = Object.keys(MODEL_SUGGESTIONS) as AgentType[];

      agentTypes.forEach((agentType) => {
        const suggestion = MODEL_SUGGESTIONS[agentType];

        // Verify all complexity levels use valid 4.5 models
        expect(
          validModels.includes(suggestion.simple),
          `Agent "${agentType}" simple model "${suggestion.simple}" is not a valid 4.5 model`
        ).toBe(true);

        expect(
          validModels.includes(suggestion.medium),
          `Agent "${agentType}" medium model "${suggestion.medium}" is not a valid 4.5 model`
        ).toBe(true);

        expect(
          validModels.includes(suggestion.complex),
          `Agent "${agentType}" complex model "${suggestion.complex}" is not a valid 4.5 model`
        ).toBe(true);
      });
    });

    it('should not use deprecated 3.5 models', () => {
      const agentTypes = Object.keys(MODEL_SUGGESTIONS) as AgentType[];

      agentTypes.forEach((agentType) => {
        const suggestion = MODEL_SUGGESTIONS[agentType];

        // Ensure no deprecated models are used
        expect(
          deprecatedModels.includes(suggestion.simple),
          `Agent "${agentType}" simple model "${suggestion.simple}" is deprecated`
        ).toBe(false);

        expect(
          deprecatedModels.includes(suggestion.medium),
          `Agent "${agentType}" medium model "${suggestion.medium}" is deprecated`
        ).toBe(false);

        expect(
          deprecatedModels.includes(suggestion.complex),
          `Agent "${agentType}" complex model "${suggestion.complex}" is deprecated`
        ).toBe(false);
      });
    });

    it('should use appropriate models for complexity levels', () => {
      const agentTypes = Object.keys(MODEL_SUGGESTIONS) as AgentType[];

      agentTypes.forEach((agentType) => {
        const suggestion = MODEL_SUGGESTIONS[agentType];

        // Simple should be Haiku 4.5 or Sonnet 4.5 (some agents may need Sonnet for simple tasks)
        expect(
          ['claude-haiku-4-5-20251015', 'claude-sonnet-4-5-20250929'].includes(suggestion.simple),
          `Agent "${agentType}" simple model "${suggestion.simple}" should be Haiku 4.5 or Sonnet 4.5`
        ).toBe(true);

        // Medium should be Sonnet 4.5 or Opus 4.5 (except development-butler which uses Haiku for speed)
        const validMediumModels = agentType === 'development-butler'
          ? ['claude-haiku-4-5-20251015', 'claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101']
          : ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101'];

        expect(
          validMediumModels.includes(suggestion.medium),
          `Agent "${agentType}" medium model "${suggestion.medium}" should be ${validMediumModels.join(' or ')}`
        ).toBe(true);

        // Complex can be any 4.5 model, but typically Sonnet or Opus
        expect(
          validModels.includes(suggestion.complex),
          `Agent "${agentType}" complex model "${suggestion.complex}" should be a valid 4.5 model`
        ).toBe(true);
      });
    });
  });
});
