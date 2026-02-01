/**
 * Tests for create-entities MCP tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEntitiesTool } from '../create-entities';

describe('createEntitiesTool', () => {
  let mockKnowledgeGraph: any;

  beforeEach(() => {
    mockKnowledgeGraph = {
      createEntity: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should define create-entities tool metadata', () => {
    expect(createEntitiesTool.name).toBe('create-entities');
    expect(createEntitiesTool.description).toContain('Knowledge Graph');
    expect(createEntitiesTool.inputSchema).toBeDefined();
  });

  it('should have correct inputSchema properties', () => {
    const { properties, required } = createEntitiesTool.inputSchema;
    expect(properties.entities).toBeDefined();
    expect(required).toContain('entities');
  });

  it('should create entities with auto-generated tags', async () => {
    const result = await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'OAuth Integration Feature',
            entityType: 'feature',
            observations: ['Implemented OAuth 2.0 authentication'],
            tags: ['security'],
          },
        ],
      },
      mockKnowledgeGraph
    );

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toBe('OAuth Integration Feature');
    expect(result.count).toBe(1);
    expect(mockKnowledgeGraph.createEntity).toHaveBeenCalledOnce();

    // Verify that tags were passed to createEntity
    const callArgs = mockKnowledgeGraph.createEntity.mock.calls[0][0];
    expect(callArgs.tags).toBeDefined();
    expect(Array.isArray(callArgs.tags)).toBe(true);
    // Should contain the user-provided tag and auto-generated tags
    expect(callArgs.tags).toContain('security');
  });

  it('should merge user-provided tags with auto-generated tags', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Bug Fix: Memory Leak',
            entityType: 'bug_fix',
            observations: ['Fixed memory leak in event listener cleanup'],
            tags: ['performance', 'critical'],
          },
        ],
      },
      mockKnowledgeGraph
    );

    const callArgs = mockKnowledgeGraph.createEntity.mock.calls[0][0];
    const tags = callArgs.tags;

    // Should contain user-provided tags
    expect(tags).toContain('performance');
    expect(tags).toContain('critical');

    // Should contain scope tag (auto-generated)
    const scopeTags = tags.filter((t: string) => t.startsWith('scope:'));
    expect(scopeTags.length).toBeGreaterThan(0);
  });

  it('should handle entities without user-provided tags', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Architecture Decision',
            entityType: 'decision',
            observations: ['Decided to use TypeScript for type safety'],
          },
        ],
      },
      mockKnowledgeGraph
    );

    const callArgs = mockKnowledgeGraph.createEntity.mock.calls[0][0];
    expect(callArgs.tags).toBeDefined();
    expect(Array.isArray(callArgs.tags)).toBe(true);
    // Even without user tags, should have auto-generated tags
    expect(callArgs.tags.length).toBeGreaterThan(0);
  });

  it('should create multiple entities and handle each separately', async () => {
    const result = await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Feature 1',
            entityType: 'feature',
            observations: ['First feature'],
            tags: ['ui'],
          },
          {
            name: 'Feature 2',
            entityType: 'feature',
            observations: ['Second feature'],
            tags: ['backend'],
          },
        ],
      },
      mockKnowledgeGraph
    );

    expect(result.created).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(mockKnowledgeGraph.createEntity).toHaveBeenCalledTimes(2);
  });

  it('should handle errors when creating entities', async () => {
    const error = new Error('Database error');
    mockKnowledgeGraph.createEntity.mockRejectedValueOnce(error);

    const result = await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Failed Entity',
            entityType: 'decision',
            observations: ['This will fail'],
          },
        ],
      },
      mockKnowledgeGraph
    );

    expect(result.created).toHaveLength(0);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].name).toBe('Failed Entity');
    expect(result.errors?.[0].error).toBe('Database error');
  });

  it('should handle multiple entities with some failures', async () => {
    mockKnowledgeGraph.createEntity
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Creation failed'))
      .mockResolvedValueOnce(undefined);

    const result = await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Entity 1',
            entityType: 'feature',
            observations: ['Success'],
          },
          {
            name: 'Entity 2',
            entityType: 'bug_fix',
            observations: ['Will fail'],
          },
          {
            name: 'Entity 3',
            entityType: 'decision',
            observations: ['Success'],
          },
        ],
      },
      mockKnowledgeGraph
    );

    expect(result.created).toHaveLength(2);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    expect(result.count).toBe(2);
  });

  it('should preserve metadata when creating entities', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Entity with Metadata',
            entityType: 'feature',
            observations: ['Test observation'],
            metadata: { version: '1.0', status: 'completed' },
          },
        ],
      },
      mockKnowledgeGraph
    );

    const callArgs = mockKnowledgeGraph.createEntity.mock.calls[0][0];
    expect(callArgs.metadata).toEqual({ version: '1.0', status: 'completed' });
  });

  it('should deduplicate tags', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Entity with Duplicate Tags',
            entityType: 'feature',
            observations: ['Test'],
            tags: ['api', 'API'], // Duplicate with different case
          },
        ],
      },
      mockKnowledgeGraph
    );

    const callArgs = mockKnowledgeGraph.createEntity.mock.calls[0][0];
    const tags = callArgs.tags;

    // Count occurrences of 'api' (case-insensitive)
    const apiTags = tags.filter((t: string) => t === 'api');
    expect(apiTags.length).toBe(1);
  });
});
