import { describe, it, expect } from 'vitest';
import { EntityType, isValidEntityType, getAllEntityTypes } from '../EntityTypes.js';

describe('EntityTypes', () => {
  it('should have all entity type values', () => {
    expect(EntityType.TASK_START).toBe('task_start');
    expect(EntityType.DECISION).toBe('decision');
    expect(EntityType.PROGRESS_MILESTONE).toBe('progress_milestone');
    expect(EntityType.ERROR_RESOLUTION).toBe('error_resolution');
    expect(EntityType.TEST_RESULT).toBe('test_result');
    expect(EntityType.WORKFLOW_CHECKPOINT).toBe('workflow_checkpoint');
    expect(EntityType.CODE_CHANGE).toBe('code_change');
    expect(EntityType.COMMIT).toBe('commit');
    expect(EntityType.PROJECT_SNAPSHOT).toBe('project_snapshot');
  });

  it('should validate entity type strings', () => {
    expect(isValidEntityType('task_start')).toBe(true);
    expect(isValidEntityType('decision')).toBe(true);
    expect(isValidEntityType('invalid_type')).toBe(false);
    expect(isValidEntityType('')).toBe(false);
  });

  it('should return all entity types', () => {
    const allTypes = getAllEntityTypes();
    expect(allTypes).toHaveLength(9);
    expect(allTypes).toContain('task_start');
    expect(allTypes).toContain('decision');
    expect(allTypes).toContain('progress_milestone');
    expect(allTypes).toContain('error_resolution');
  });
});
