/**
 * Integration tests for create-entities tool with MemoryAutoTagger
 * Validates auto-tagging functionality with real project context
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEntitiesTool } from '../create-entities';
import type { KnowledgeGraph } from '../../../knowledge-graph/index.js';

describe('create-entities Integration Tests', () => {
  let mockKnowledgeGraph: Partial<KnowledgeGraph>;

  beforeEach(() => {
    // Create partial KnowledgeGraph mock
    // Mocking createEntity and createEntitiesBatch which are used by the tool
    const createEntityMock = vi.fn().mockReturnValue('entity-name');
    mockKnowledgeGraph = {
      createEntity: createEntityMock,
      createEntitiesBatch: vi.fn().mockImplementation((entities: any[]) => {
        return entities.map((entity: any) => {
          try {
            createEntityMock(entity);
            return { name: entity.name, success: true };
          } catch (error: any) {
            return { name: entity.name, success: false, error: error.message };
          }
        });
      }),
    };
  });

  it('should create entity with auto-generated scope tag', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Test Decision',
            entityType: 'decision',
            observations: ['Made a technical decision'],
          },
        ],
      },
      mockKnowledgeGraph as KnowledgeGraph // Safe: only uses createEntity
    );

    const callArgs = (mockKnowledgeGraph.createEntity as any).mock.calls[0][0];
    const tags = callArgs.tags;

    // Should contain scope tag with project name (exact string format)
    const scopeTag = tags.find((t: string) => t.startsWith('scope:'));
    expect(scopeTag).toBeDefined();
    expect(scopeTag).toBe('scope:project');
  });

  it('should merge user tags with auto-generated tags', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Feature Implementation',
            entityType: 'feature',
            observations: ['Implemented new feature'],
            tags: ['important', 'frontend'],
          },
        ],
      },
      mockKnowledgeGraph as KnowledgeGraph // Safe: only uses createEntity
    );

    const callArgs = (mockKnowledgeGraph.createEntity as any).mock.calls[0][0];
    const tags = callArgs.tags;

    // User tags should be preserved
    expect(tags).toContain('important');
    expect(tags).toContain('frontend');

    // Should also have auto-generated scope tag
    const scopeTag = tags.find((t: string) => t.startsWith('scope:'));
    expect(scopeTag).toBeDefined();
  });

  it('should handle entities with no user-provided tags', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Bug Fix Report',
            entityType: 'bug_fix',
            observations: ['Fixed critical bug'],
            // No tags provided
          },
        ],
      },
      mockKnowledgeGraph as KnowledgeGraph // Safe: only uses createEntity
    );

    const callArgs = (mockKnowledgeGraph.createEntity as any).mock.calls[0][0];
    const tags = callArgs.tags;

    // Should still have auto-generated tags
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);

    // Should have scope tag
    const scopeTag = tags.find((t: string) => t.startsWith('scope:'));
    expect(scopeTag).toBeDefined();
  });

  it('should create entity with correct structure', async () => {
    await createEntitiesTool.handler(
      {
        entities: [
          {
            name: 'Structured Entity',
            entityType: 'lesson_learned',
            observations: [
              'First observation',
              'Second observation',
            ],
            tags: ['learning'],
            metadata: { severity: 'high' },
          },
        ],
      },
      mockKnowledgeGraph as KnowledgeGraph // Safe: only uses createEntity
    );

    const callArgs = (mockKnowledgeGraph.createEntity as any).mock.calls[0][0];

    // Verify all fields are passed correctly
    expect(callArgs.name).toBe('Structured Entity');
    expect(callArgs.entityType).toBe('lesson_learned');
    expect(callArgs.observations).toEqual([
      'First observation',
      'Second observation',
    ]);
    expect(callArgs.metadata).toEqual({ severity: 'high' });
    expect(Array.isArray(callArgs.tags)).toBe(true);
    expect(callArgs.tags).toContain('learning');
  });
});
