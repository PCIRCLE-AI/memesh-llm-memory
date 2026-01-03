/**
 * MCP Server Tools Test
 *
 * Tests that verify MCP server exposes correct tools
 */

import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('MCP Server Tools', () => {
  describe('AgentRegistry', () => {
    it('should register all 36 agents', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      expect(allAgents.length).toBe(36); // 9 real + 26 enhanced + 1 optional
    });

    it('should have agents from all categories', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      const categories = new Set(allAgents.map(a => a.category));

      expect(categories).toContain('development');
      expect(categories).toContain('analysis');
      expect(categories).toContain('operations');
      expect(categories).toContain('creative');
      expect(categories).toContain('management');
      expect(categories).toContain('engineering');
    });

    it('should include development-butler agent', () => {
      const registry = new AgentRegistry();
      const butler = registry.getAgent('development-butler');

      expect(butler).toBeDefined();
      expect(butler?.category).toBe('development');
      expect(butler?.description).toContain('workflow automation');
    });
  });
});
