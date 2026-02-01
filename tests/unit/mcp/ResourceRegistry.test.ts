// tests/unit/mcp/ResourceRegistry.test.ts
import { describe, it, expect } from 'vitest';
import { ResourceRegistry } from '../../../src/mcp/resources/ResourceRegistry';

describe('ResourceRegistry', () => {
  it('should register and retrieve resource handler', async () => {
    const registry = new ResourceRegistry();

    const handler = async (params: { agentType: string }) => ({
      uri: `ccb://agent/${params.agentType}/status`,
      mimeType: 'application/json',
      text: JSON.stringify({ status: 'active' })
    });

    registry.register('ccb://agent/{agentType}/status', handler);

    const result = await registry.handle('ccb://agent/code-reviewer/status');
    expect(result.mimeType).toBe('application/json');
    expect(JSON.parse(result.text)).toEqual({ status: 'active' });
  });

  it('should throw error for unknown URI', async () => {
    const registry = new ResourceRegistry();
    await expect(
      registry.handle('ccb://unknown/resource')
    ).rejects.toThrow('No handler found');
  });

  it('should register and retrieve resource templates', () => {
    const registry = new ResourceRegistry();

    const template1 = {
      uriTemplate: 'ccb://agent/{agentType}/status',
      name: 'Agent Status',
      description: 'Get status of a specific agent',
      mimeType: 'application/json'
    };

    const template2 = {
      uriTemplate: 'ccb://task/{taskId}/logs',
      name: 'Task Logs',
      description: 'Get execution logs for a task',
      mimeType: 'text/plain'
    };

    registry.registerTemplate(template1);
    registry.registerTemplate(template2);

    const templates = registry.getTemplates();
    expect(templates).toHaveLength(2);
    expect(templates[0]).toEqual(template1);
    expect(templates[1]).toEqual(template2);
  });

  it('should return empty array when no templates registered', () => {
    const registry = new ResourceRegistry();
    const templates = registry.getTemplates();
    expect(templates).toEqual([]);
  });

  it('should return defensive copy of templates to prevent mutation', () => {
    const registry = new ResourceRegistry();

    const template = {
      uriTemplate: 'ccb://agent/{agentType}/status',
      name: 'Agent Status',
      description: 'Get status of a specific agent',
      mimeType: 'application/json'
    };

    registry.registerTemplate(template);

    const templates1 = registry.getTemplates();
    const templates2 = registry.getTemplates();

    // Should return different array instances
    expect(templates1).not.toBe(templates2);

    // Mutating returned array should not affect registry
    templates1.push({
      uriTemplate: 'ccb://malicious',
      name: 'Malicious',
      description: 'Should not be added',
      mimeType: 'text/plain'
    });

    const templates3 = registry.getTemplates();
    expect(templates3).toHaveLength(1);  // Should still be 1, not 2
  });
});
