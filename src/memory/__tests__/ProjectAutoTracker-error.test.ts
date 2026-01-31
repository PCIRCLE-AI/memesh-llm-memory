import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectAutoTracker } from '../ProjectAutoTracker.js';
import type { MCPToolInterface } from '../../core/MCPToolInterface.js';

describe('ProjectAutoTracker - Error Recording', () => {
  let tracker: ProjectAutoTracker;
  let mockMCP: MCPToolInterface;
  let createEntitiesSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createEntitiesSpy = vi.fn().mockResolvedValue(undefined);
    mockMCP = {
      memory: {
        createEntities: createEntitiesSpy,
      },
    } as unknown as MCPToolInterface;

    tracker = new ProjectAutoTracker(mockMCP);
  });

  it('should record error with all fields', async () => {
    await tracker.recordError({
      error_type: 'TypeScript Error',
      error_message: 'Type "string" is not assignable to type "number"',
      context: 'Refactoring user ID from string to number',
      root_cause: 'Database migration incomplete',
      resolution: 'Complete migration, update types',
      prevention: 'Run type check before migration',
    });

    expect(createEntitiesSpy).toHaveBeenCalledWith({
      entities: expect.arrayContaining([
        expect.objectContaining({
          entityType: 'error_resolution',
          name: expect.stringMatching(/^Error Resolution: TypeScript Error/),
          observations: expect.arrayContaining([
            expect.stringMatching(/^ERROR TYPE:/),
            expect.stringMatching(/^MESSAGE:/),
            expect.stringMatching(/^CONTEXT:/),
            expect.stringMatching(/^ROOT CAUSE:/),
            expect.stringMatching(/^RESOLUTION:/),
            expect.stringMatching(/^PREVENTION:/),
          ]),
        }),
      ]),
    });
  });

  it('should record error with minimal fields', async () => {
    await tracker.recordError({
      error_type: 'Build Error',
      error_message: 'Module not found',
      context: 'Running npm run build',
      resolution: 'Installed missing dependency',
    });

    expect(createEntitiesSpy).toHaveBeenCalledWith({
      entities: expect.arrayContaining([
        expect.objectContaining({
          entityType: 'error_resolution',
          name: expect.stringMatching(/^Error Resolution: Build Error/),
        }),
      ]),
    });
  });
});
