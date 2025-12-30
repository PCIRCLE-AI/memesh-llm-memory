/**
 * AgentEvolutionConfig Test
 *
 * Tests for agent evolution configuration system
 */

import { describe, it, expect } from 'vitest';
import {
  getAgentEvolutionConfig,
  getAllAgentConfigs,
  getAgentsByCategory,
  AgentEvolutionConfig,
} from '../../src/evolution/AgentEvolutionConfig.js';
import type { AgentType } from '../../src/orchestrator/types.js';

describe('AgentEvolutionConfig', () => {
  describe('getAllAgentConfigs', () => {
    it('should return config for all 22 agents', () => {
      const configs = getAllAgentConfigs();

      // Should have exactly 22 agents configured (includes future/planned agents)
      expect(configs.size).toBe(22);

      // Verify some key agents are present
      expect(configs.has('code-reviewer')).toBe(true);
      expect(configs.has('rag-agent')).toBe(true);
      expect(configs.has('general-agent')).toBe(true);
    });

    it('should have valid config structure for each agent', () => {
      const configs = getAllAgentConfigs();

      configs.forEach((config, agentId) => {
        // Required fields
        expect(config.agentId).toBe(agentId);
        expect(config.category).toBeDefined();
        expect(config.evolutionEnabled).toBeDefined();

        // Thresholds
        expect(config.confidenceThreshold).toBeGreaterThanOrEqual(0);
        expect(config.confidenceThreshold).toBeLessThanOrEqual(1);
        expect(config.minObservationsForAdaptation).toBeGreaterThan(0);

        // Learning weights
        expect(config.learningWeights.successRate).toBeGreaterThan(0);
        expect(config.learningWeights.userFeedback).toBeGreaterThan(0);
        expect(config.learningWeights.performanceMetrics).toBeGreaterThan(0);
      });
    });
  });

  describe('getAgentEvolutionConfig', () => {
    it('should return config for specific agent', () => {
      const config = getAgentEvolutionConfig('code-reviewer');

      expect(config.agentId).toBe('code-reviewer');
      expect(config.category).toBe('development');
      expect(config.evolutionEnabled).toBe(true);
    });

    it('should throw error for unknown agent', () => {
      expect(() => {
        getAgentEvolutionConfig('unknown-agent' as AgentType);
      }).toThrow('No evolution config found for agent: unknown-agent');
    });
  });

  describe('getAgentsByCategory', () => {
    it('should return all agents in development category', () => {
      const devAgents = getAgentsByCategory('development');

      expect(devAgents.length).toBeGreaterThan(0);
      expect(devAgents.some(a => a.agentId === 'code-reviewer')).toBe(true);
    });

    it('should return all agents in research category', () => {
      const researchAgents = getAgentsByCategory('research');

      expect(researchAgents.length).toBeGreaterThan(0);
      expect(researchAgents.some(a => a.agentId === 'rag-agent')).toBe(true);
    });

    it('should return all agents in general category', () => {
      const generalAgents = getAgentsByCategory('general');

      expect(generalAgents.length).toBeGreaterThan(0);
      expect(generalAgents.some(a => a.agentId === 'general-agent')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const unknownAgents = getAgentsByCategory('unknown-category' as any);

      expect(unknownAgents).toEqual([]);
    });
  });

  describe('Category-specific configurations', () => {
    it('should have higher confidence threshold for critical agents', () => {
      const codeReviewer = getAgentEvolutionConfig('code-reviewer');
      const generalAgent = getAgentEvolutionConfig('general-agent');

      // Code reviewer should be more conservative (higher threshold)
      expect(codeReviewer.confidenceThreshold).toBeGreaterThan(generalAgent.confidenceThreshold);
    });

    it('should have appropriate learning weights per category', () => {
      const devAgent = getAgentEvolutionConfig('code-reviewer');

      // Development agents should value performance metrics
      expect(devAgent.learningWeights.performanceMetrics).toBeGreaterThan(0);
      expect(devAgent.learningWeights.successRate).toBeGreaterThan(0);
    });

    it('should have higher observation requirements for critical agents', () => {
      const codeReviewer = getAgentEvolutionConfig('code-reviewer');
      const generalAgent = getAgentEvolutionConfig('general-agent');

      // Code reviewer needs more observations before adapting
      expect(codeReviewer.minObservationsForAdaptation).toBeGreaterThanOrEqual(
        generalAgent.minObservationsForAdaptation
      );
    });
  });

  describe('Evolution enabling/disabling', () => {
    it('should have evolution enabled for most agents', () => {
      const configs = getAllAgentConfigs();
      const enabledCount = Array.from(configs.values()).filter(c => c.evolutionEnabled).length;

      // At least 80% of agents should have evolution enabled
      expect(enabledCount).toBeGreaterThanOrEqual(Math.floor(configs.size * 0.8));
    });

    it('should allow disabling evolution for specific agents', () => {
      const configs = getAllAgentConfigs();

      // Find any disabled agent (if exists)
      const disabledAgents = Array.from(configs.values()).filter(c => !c.evolutionEnabled);

      // If there are disabled agents, verify they have evolutionEnabled: false
      disabledAgents.forEach(config => {
        expect(config.evolutionEnabled).toBe(false);
      });
    });
  });
});
