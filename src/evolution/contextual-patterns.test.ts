import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { PatternContext, ContextualPattern } from './types.js';
import { SQLiteStore } from './storage/SQLiteStore.js';
import { LearningManager } from './LearningManager.js';
import { PerformanceTracker } from './PerformanceTracker.js';

describe('Contextual Patterns', () => {
  describe('PatternContext type definition', () => {
    it('should define PatternContext with optional fields', () => {
      const context: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'medium',
        config_keys: ['database', 'timeout'],
        metadata: { team: 'analytics' },
      };

      expect(context.agent_type).toBe('data-analyst');
      expect(context.task_type).toBe('sql_query');
      expect(context.complexity).toBe('medium');
      expect(context.config_keys).toEqual(['database', 'timeout']);
      expect(context.metadata).toEqual({ team: 'analytics' });
    });

    it('should allow partial PatternContext', () => {
      const minimalContext: PatternContext = {
        agent_type: 'general',
      };

      expect(minimalContext.agent_type).toBe('general');
      expect(minimalContext.task_type).toBeUndefined();
      expect(minimalContext.complexity).toBeUndefined();
    });
  });

  describe('ContextualPattern type definition', () => {
    it('should define ContextualPattern with context field', () => {
      const pattern: ContextualPattern = {
        id: 'test-pattern-1',
        type: 'success',
        description: 'Use parameterized queries for SQL',
        confidence: 0.85,
        observations: 10,
        success_rate: 0.9,
        avg_execution_time: 150,
        last_seen: new Date().toISOString(),
        context: {
          agent_type: 'data-analyst',
          task_type: 'sql_query',
          complexity: 'medium',
        },
      };

      expect(pattern.context.agent_type).toBe('data-analyst');
      expect(pattern.context.task_type).toBe('sql_query');
      expect(pattern.context.complexity).toBe('medium');
    });
  });

  describe('SQLiteStore - Contextual Pattern Storage', () => {
    let store: SQLiteStore;

    beforeEach(async () => {
      store = new SQLiteStore({ dbPath: ':memory:' });
      await store.initialize();
    });

    afterEach(async () => {
      await store.close();
    });

    it('should store contextual pattern with context metadata', async () => {
      const pattern: ContextualPattern = {
        id: 'contextual-test-1',
        type: 'success',
        description: 'Optimize JOIN order for large datasets',
        confidence: 0.88,
        observations: 15,
        success_rate: 0.92,
        avg_execution_time: 200,
        last_seen: new Date().toISOString(),
        context: {
          agent_type: 'data-analyst',
          task_type: 'sql_optimization',
          complexity: 'high',
          config_keys: ['max_rows', 'timeout'],
          metadata: { database_type: 'postgresql' },
        },
      };

      // Store the contextual pattern
      await store.storeContextualPattern(pattern);

      // Verify storage by querying
      const patterns = await store.queryPatternsByContext({
        agent_type: 'data-analyst',
      });
      expect(patterns.length).toBeGreaterThan(0);

      const stored = patterns.find(p => p.id === 'contextual-test-1');
      expect(stored).toBeDefined();
      expect(stored?.context).toBeDefined();
      expect(stored?.context?.agent_type).toBe('data-analyst');
      expect(stored?.context?.task_type).toBe('sql_optimization');
      expect(stored?.context?.complexity).toBe('high');
      expect(stored?.context?.config_keys).toEqual(['max_rows', 'timeout']);
      expect(stored?.context?.metadata).toEqual({ database_type: 'postgresql' });
    });

    it('should query patterns by context', async () => {
      // Store multiple contextual patterns
      const patterns: ContextualPattern[] = [
        {
          id: 'pattern-1',
          type: 'success',
          description: 'Pattern 1',
          confidence: 0.9,
          observations: 10,
          success_rate: 0.95,
          avg_execution_time: 100,
          last_seen: new Date().toISOString(),
          context: {
            agent_type: 'data-analyst',
            task_type: 'sql_query',
            complexity: 'low',
          },
        },
        {
          id: 'pattern-2',
          type: 'success',
          description: 'Pattern 2',
          confidence: 0.85,
          observations: 20,
          success_rate: 0.9,
          avg_execution_time: 150,
          last_seen: new Date().toISOString(),
          context: {
            agent_type: 'data-analyst',
            task_type: 'sql_optimization',
            complexity: 'high',
          },
        },
        {
          id: 'pattern-3',
          type: 'success',
          description: 'Pattern 3',
          confidence: 0.8,
          observations: 15,
          success_rate: 0.88,
          avg_execution_time: 120,
          last_seen: new Date().toISOString(),
          context: {
            agent_type: 'frontend-developer',
            task_type: 'component_optimization',
            complexity: 'medium',
          },
        },
      ];

      for (const pattern of patterns) {
        await store.storeContextualPattern(pattern);
      }

      // Query by agent_type
      const dataAnalystPatterns = await store.queryPatternsByContext({
        agent_type: 'data-analyst',
      });
      expect(dataAnalystPatterns.length).toBe(2);
      expect(dataAnalystPatterns.every(p => p.context?.agent_type === 'data-analyst')).toBe(true);

      // Query by task_type
      const sqlQueryPatterns = await store.queryPatternsByContext({
        task_type: 'sql_query',
      });
      expect(sqlQueryPatterns.length).toBe(1);
      expect(sqlQueryPatterns[0].context?.task_type).toBe('sql_query');

      // Query by complexity
      const highComplexityPatterns = await store.queryPatternsByContext({
        complexity: 'high',
      });
      expect(highComplexityPatterns.length).toBe(1);
      expect(highComplexityPatterns[0].context?.complexity).toBe('high');

      // Query by multiple criteria
      const specificPatterns = await store.queryPatternsByContext({
        agent_type: 'data-analyst',
        task_type: 'sql_optimization',
        complexity: 'high',
      });
      expect(specificPatterns.length).toBe(1);
      expect(specificPatterns[0].id).toBe('pattern-2');
    });

    it('should return empty array for non-matching context', async () => {

      const pattern: ContextualPattern = {
        id: 'pattern-1',
        type: 'success',
        description: 'Test pattern',
        confidence: 0.9,
        observations: 10,
        success_rate: 0.95,
        avg_execution_time: 100,
        last_seen: new Date().toISOString(),
        context: {
          agent_type: 'data-analyst',
          task_type: 'sql_query',
        },
      };

      await store.storeContextualPattern(pattern);

      const results = await store.queryPatternsByContext({
        agent_type: 'backend-developer',
      });

      expect(results).toEqual([]);
    });
  });
});
