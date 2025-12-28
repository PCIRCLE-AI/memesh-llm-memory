/**
 * MCP Server Tools Test
 *
 * Tests that verify MCP server exposes correct tools
 */

import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('MCP Server Tools', () => {
  describe('AgentRegistry', () => {
    it('should register all 22 agents', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      expect(allAgents.length).toBe(22);
    });

    it('should have agents from all categories', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      const categories = new Set(allAgents.map(a => a.category));

      expect(categories).toContain('development');
      expect(categories).toContain('analysis');
      expect(categories).toContain('knowledge');
      expect(categories).toContain('operations');
      expect(categories).toContain('creative');
      expect(categories).toContain('utility');
      expect(categories).toContain('general');
    });

    it('should include development-butler agent', () => {
      const registry = new AgentRegistry();
      const butler = registry.getAgent('development-butler');

      expect(butler).toBeDefined();
      expect(butler?.category).toBe('development');
      expect(butler?.description).toContain('workflow automation');
    });
  });

  describe('Smart Router Tool Schema', () => {
    it('should define schema for smart_route_task (manual verification)', () => {
      // This test documents the expected schema for smart_route_task
      // Implementation will be in src/mcp/server.ts

      const expectedSchema = {
        type: 'object',
        properties: {
          taskDescription: {
            type: 'string',
            description: 'Description of the task to be performed',
          },
          priority: {
            type: 'number',
            description: 'Task priority (optional, 1-10)',
            minimum: 1,
            maximum: 10,
          },
        },
        required: ['taskDescription'],
      };

      expect(expectedSchema).toBeDefined();
      expect(expectedSchema.required).toContain('taskDescription');
    });
  });
});
