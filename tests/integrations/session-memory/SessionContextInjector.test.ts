import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SessionContextInjector } from '../../../src/integrations/session-memory/SessionContextInjector.js';
import type { Entity, EntityType } from '../../../src/knowledge-graph/types.js';
import { AUTO_TAGS } from '../../../src/integrations/session-memory/types.js';

// ─── Test Helpers ────────────────────────────────────────────────────

/**
 * Create a mock KnowledgeGraph with methods needed by SessionContextInjector.
 */
function createMockKnowledgeGraph(): {
  searchEntities: Mock;
  getEntity: Mock;
} {
  return {
    searchEntities: vi.fn(() => []),
    getEntity: vi.fn(() => null),
  };
}

/**
 * Create a realistic Entity for testing.
 * Mimics entities ingested from native session memory via SessionMemoryIngester.
 */
function createEntity(
  overrides: Partial<Entity> & { name: string; entityType: EntityType },
): Entity {
  return {
    id: Math.floor(Math.random() * 10000),
    observations: [],
    tags: [AUTO_TAGS.SOURCE, AUTO_TAGS.AUTO_INGESTED],
    metadata: {},
    createdAt: new Date('2025-02-01T10:00:00Z'),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('SessionContextInjector', () => {
  let mockKG: ReturnType<typeof createMockKnowledgeGraph>;
  let injector: SessionContextInjector;

  beforeEach(() => {
    mockKG = createMockKnowledgeGraph();
    injector = new SessionContextInjector(
      mockKG as never,
      { maxItemsPerSection: 5, maxOutputChars: 4000 },
    );
  });

  // ── 1. Empty knowledge graph ──────────────────────────────────────

  describe('empty knowledge graph', () => {
    it('returns empty string when no relevant entities exist', () => {
      mockKG.searchEntities.mockReturnValue([]);

      const result = injector.generateContext();

      expect(result).toBe('');
    });

    it('returns empty string when context is provided but no entities', () => {
      mockKG.searchEntities.mockReturnValue([]);

      const result = injector.generateContext({
        projectPath: '/some/project',
        gitBranch: 'feature/test',
      });

      expect(result).toBe('');
    });
  });

  // ── 2. Lessons injection ──────────────────────────────────────────

  describe('lessons injection', () => {
    it('finds lesson_learned entities with source tag and formats them', () => {
      const lessons: Entity[] = [
        createEntity({
          name: 'lesson-sqlite-migration',
          entityType: 'lesson_learned',
          observations: [
            'Error: ALTER TABLE failed for SQLite',
            'Correction: Check PRAGMA table_info before adding columns',
            'source_session: abc123',
          ],
        }),
        createEntity({
          name: 'lesson-async-cleanup',
          entityType: 'lesson_learned',
          observations: [
            'Error: Race condition in cleanup',
            'Correction: Use cleanupInProgress flag to guard concurrent ops',
          ],
        }),
      ];

      // Return lessons for lesson_learned query, empty for everything else
      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return lessons;
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Past Lessons');
      expect(result).toContain('ALTER TABLE failed for SQLite');
      expect(result).toContain('Race condition in cleanup');
    });

    it('queries with correct entityType and tag for lessons', () => {
      mockKG.searchEntities.mockReturnValue([]);

      injector.generateContext();

      // Verify at least one call was made for lesson_learned with source tag
      const lessonCall = mockKG.searchEntities.mock.calls.find(
        (call: [{ entityType?: EntityType; tag?: string }]) =>
          call[0].entityType === 'lesson_learned' && call[0].tag === AUTO_TAGS.SOURCE,
      );
      expect(lessonCall).toBeDefined();
    });
  });

  // ── 3. Best practices injection ───────────────────────────────────

  describe('best practices injection', () => {
    it('finds best_practice entities and formats them', () => {
      const practices: Entity[] = [
        createEntity({
          name: 'practice-use-content-hash',
          entityType: 'best_practice',
          observations: [
            'Use content hash for database-level deduplication in KnowledgeGraph',
          ],
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'best_practice' && query.tag === AUTO_TAGS.SOURCE) {
          return practices;
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Best Practices');
      expect(result).toContain('content hash for database-level deduplication');
    });
  });

  // ── 4. Prevention rules injection ─────────────────────────────────

  describe('prevention rules injection', () => {
    it('finds prevention_rule entities and formats them with warning emphasis', () => {
      const rules: Entity[] = [
        createEntity({
          name: 'prevent-force-push-main',
          entityType: 'prevention_rule',
          observations: [
            'NEVER force push to main branch - can destroy production history',
          ],
        }),
        createEntity({
          name: 'prevent-console-log-prod',
          entityType: 'prevention_rule',
          observations: [
            'Do not leave console.log in production code',
          ],
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'prevention_rule' && query.tag === AUTO_TAGS.SOURCE) {
          return rules;
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Prevention Rules');
      expect(result).toContain('force push to main branch');
      expect(result).toContain('console.log in production');
    });
  });

  // ── 5. Decisions injection with git branch ────────────────────────

  describe('decisions injection', () => {
    it('finds decision entities relevant to current git branch', () => {
      const decisions: Entity[] = [
        createEntity({
          name: 'decision-session-memory-schema',
          entityType: 'decision',
          observations: [
            'Use FTS5 for full-text search in session memory integration',
            'branch: feature/session-memory-integration',
          ],
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string; namePattern?: string }) => {
        if (query.entityType === 'decision' && query.namePattern) {
          return decisions;
        }
        return [];
      });

      const result = injector.generateContext({
        gitBranch: 'feature/session-memory-integration',
      });

      expect(result).toContain('Relevant Decisions');
      expect(result).toContain('FTS5 for full-text search');
    });

    it('also queries general decisions when no git branch provided', () => {
      const decisions: Entity[] = [
        createEntity({
          name: 'decision-use-sqlite',
          entityType: 'decision',
          observations: [
            'Use SQLite over PostgreSQL for portability',
          ],
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'decision' && query.tag === AUTO_TAGS.SOURCE) {
          return decisions;
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Relevant Decisions');
      expect(result).toContain('SQLite over PostgreSQL');
    });
  });

  // ── 6. Recent sessions ────────────────────────────────────────────

  describe('recent sessions', () => {
    it('finds recent session_snapshot entities and shows titles', () => {
      const sessions: Entity[] = [
        createEntity({
          name: 'session-snapshot-abc123',
          entityType: 'session_snapshot',
          observations: [
            'title: Implement SessionMemoryParser with TDD',
            'status: completed',
          ],
          createdAt: new Date('2025-02-05T10:00:00Z'),
        }),
        createEntity({
          name: 'session-snapshot-def456',
          entityType: 'session_snapshot',
          observations: [
            'title: Fix KnowledgeGraph FTS5 index migration',
            'status: completed',
          ],
          createdAt: new Date('2025-02-04T10:00:00Z'),
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'session_snapshot' && query.tag === AUTO_TAGS.SOURCE) {
          return sessions;
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Recent Sessions');
      expect(result).toContain('Implement SessionMemoryParser with TDD');
      expect(result).toContain('Fix KnowledgeGraph FTS5 index migration');
    });
  });

  // ── 7. Output format ──────────────────────────────────────────────

  describe('output format', () => {
    it('produces well-formatted text with banner and section headers', () => {
      // Provide at least one entity so output is non-empty
      const lessons: Entity[] = [
        createEntity({
          name: 'lesson-test-format',
          entityType: 'lesson_learned',
          observations: ['Test formatting observation'],
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return lessons;
        }
        return [];
      });

      const result = injector.generateContext();

      // Check banner markers
      expect(result).toContain('MeMesh Enhanced Context');
      expect(result).toContain('Knowledge Graph');

      // Check section delimiter lines exist (double horizontal lines)
      const lines = result.split('\n');
      const delimiterLines = lines.filter((l) => l.includes('═'));
      expect(delimiterLines.length).toBeGreaterThanOrEqual(2);
    });

    it('does not include empty sections', () => {
      // Only lessons exist, other sections should be absent
      const lessons: Entity[] = [
        createEntity({
          name: 'lesson-only',
          entityType: 'lesson_learned',
          observations: ['Only lessons exist'],
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return lessons;
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Past Lessons');
      expect(result).not.toContain('Prevention Rules');
      expect(result).not.toContain('Best Practices');
      expect(result).not.toContain('Recent Sessions');
    });
  });

  // ── 8. Limit control ──────────────────────────────────────────────

  describe('limit control', () => {
    it('respects maxItemsPerSection parameter (default 5)', () => {
      // Create 10 lessons
      const manyLessons: Entity[] = Array.from({ length: 10 }, (_, i) =>
        createEntity({
          name: `lesson-${i}`,
          entityType: 'lesson_learned',
          observations: [`Lesson number ${i}`],
        }),
      );

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return manyLessons;
        }
        return [];
      });

      const result = injector.generateContext();

      // Count bullet items in the lessons section
      // Each entity produces a "- " line item
      const lessonLines = result
        .split('\n')
        .filter((line) => line.trim().startsWith('- '));

      // Default maxItemsPerSection = 5
      expect(lessonLines.length).toBeLessThanOrEqual(5);
    });

    it('passes limit to searchEntities query', () => {
      const customInjector = new SessionContextInjector(
        mockKG as never,
        { maxItemsPerSection: 3 },
      );

      mockKG.searchEntities.mockReturnValue([]);

      customInjector.generateContext();

      // Verify limit passed to searchEntities
      for (const call of mockKG.searchEntities.mock.calls) {
        const query = call[0] as { limit?: number };
        expect(query.limit).toBeLessThanOrEqual(3);
      }
    });
  });

  // ── 9. Git branch context ─────────────────────────────────────────

  describe('git branch context', () => {
    it('searches for branch-relevant decisions when gitBranch is provided', () => {
      mockKG.searchEntities.mockReturnValue([]);

      injector.generateContext({
        gitBranch: 'feature/auth-refactor',
      });

      // Should have a call with namePattern containing the branch terms
      // Note: dashes are converted to spaces for better FTS5 tokenization
      const branchCall = mockKG.searchEntities.mock.calls.find(
        (call: [{ namePattern?: string; entityType?: EntityType }]) =>
          call[0].entityType === 'decision' && call[0].namePattern !== undefined,
      );
      expect(branchCall).toBeDefined();
      if (branchCall) {
        const pattern = (branchCall[0] as { namePattern: string }).namePattern;
        expect(pattern).toContain('auth');
        expect(pattern).toContain('refactor');
      }
    });

    it('includes branch name in search term for better FTS5 matching', () => {
      mockKG.searchEntities.mockReturnValue([]);

      injector.generateContext({
        gitBranch: 'feature/session-memory-integration',
      });

      const branchCall = mockKG.searchEntities.mock.calls.find(
        (call: [{ namePattern?: string; entityType?: EntityType }]) =>
          call[0].entityType === 'decision' && call[0].namePattern !== undefined,
      );
      expect(branchCall).toBeDefined();
      if (branchCall) {
        const pattern = (branchCall[0] as { namePattern: string }).namePattern;
        // Dashes converted to spaces for FTS5 tokenization
        expect(pattern).toContain('session');
        expect(pattern).toContain('memory');
        expect(pattern).toContain('integration');
      }
    });
  });

  // ── 10. Tag filtering ─────────────────────────────────────────────

  describe('tag filtering', () => {
    it('only queries entities tagged with source:native-session-memory', () => {
      mockKG.searchEntities.mockReturnValue([]);

      injector.generateContext();

      // Every searchEntities call (except possibly branch-specific decision searches)
      // should include tag = AUTO_TAGS.SOURCE
      const calls = mockKG.searchEntities.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      for (const call of calls) {
        const query = call[0] as { tag?: string; namePattern?: string };
        // Branch-specific decision queries use namePattern instead of tag,
        // but standard queries must include the tag filter
        if (!query.namePattern) {
          expect(query.tag).toBe(AUTO_TAGS.SOURCE);
        }
      }
    });
  });

  // ── 11. Error handling ────────────────────────────────────────────

  describe('error handling', () => {
    it('returns empty string gracefully when KG query throws', () => {
      mockKG.searchEntities.mockImplementation(() => {
        throw new Error('Database locked');
      });

      const result = injector.generateContext();

      expect(result).toBe('');
    });

    it('returns empty string when searchEntities returns undefined', () => {
      mockKG.searchEntities.mockReturnValue(undefined);

      const result = injector.generateContext();

      expect(result).toBe('');
    });

    it('does not throw even when entity has malformed observations', () => {
      const badEntity = createEntity({
        name: 'bad-entity',
        entityType: 'lesson_learned',
        observations: [], // Empty observations
      });

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return [badEntity];
        }
        return [];
      });

      // Should not throw
      const result = injector.generateContext();
      expect(typeof result).toBe('string');
    });
  });

  // ── 12. Token budget (maxOutputChars) ─────────────────────────────

  describe('token budget', () => {
    it('truncates output to maxOutputChars', () => {
      const smallInjector = new SessionContextInjector(
        mockKG as never,
        { maxOutputChars: 200, maxItemsPerSection: 50 },
      );

      // Create many entities with long observations
      const manyLessons: Entity[] = Array.from({ length: 20 }, (_, i) =>
        createEntity({
          name: `lesson-long-${i}`,
          entityType: 'lesson_learned',
          observations: [
            `This is a very long lesson learned observation number ${i} that contains a lot of text to test the output character limit truncation behavior of the SessionContextInjector`,
          ],
        }),
      );

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return manyLessons;
        }
        return [];
      });

      const result = smallInjector.generateContext();

      // Output should be truncated around 200 chars (with some tolerance for closing banner)
      expect(result.length).toBeLessThanOrEqual(300);
    });

    it('defaults maxOutputChars to 4000 when not specified', () => {
      const defaultInjector = new SessionContextInjector(mockKG as never);

      // Create enough entities to potentially exceed default limit
      const manyEntities: Entity[] = Array.from({ length: 50 }, (_, i) =>
        createEntity({
          name: `lesson-default-${i}`,
          entityType: 'lesson_learned',
          observations: [
            `Observation ${i}: This is a fairly long observation text used to test the default character limit behavior.`,
          ],
        }),
      );

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return manyEntities;
        }
        return [];
      });

      const result = defaultInjector.generateContext();

      // Default limit is 4000 chars, with tolerance for closing banner
      expect(result.length).toBeLessThanOrEqual(4200);
    });
  });

  // ── Combined output ───────────────────────────────────────────────

  describe('combined output with multiple sections', () => {
    it('includes all populated sections in order', () => {
      const lessons: Entity[] = [
        createEntity({
          name: 'lesson-1',
          entityType: 'lesson_learned',
          observations: ['Error: Missed import\nCorrection: Always check imports'],
        }),
      ];

      const practices: Entity[] = [
        createEntity({
          name: 'practice-1',
          entityType: 'best_practice',
          observations: ['Always run tests before committing'],
        }),
      ];

      const rules: Entity[] = [
        createEntity({
          name: 'rule-1',
          entityType: 'prevention_rule',
          observations: ['Never commit secrets to version control'],
        }),
      ];

      const sessions: Entity[] = [
        createEntity({
          name: 'session-1',
          entityType: 'session_snapshot',
          observations: ['title: Setup CI/CD pipeline'],
        }),
      ];

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.tag !== AUTO_TAGS.SOURCE) return [];
        switch (query.entityType) {
          case 'lesson_learned':
            return lessons;
          case 'best_practice':
            return practices;
          case 'prevention_rule':
            return rules;
          case 'session_snapshot':
            return sessions;
          case 'decision':
            return [];
          default:
            return [];
        }
      });

      const result = injector.generateContext();

      // All sections present
      expect(result).toContain('Past Lessons');
      expect(result).toContain('Best Practices');
      expect(result).toContain('Prevention Rules');
      expect(result).toContain('Recent Sessions');

      // Verify ordering: Lessons before Practices before Sessions
      const lessonsIdx = result.indexOf('Past Lessons');
      const rulesIdx = result.indexOf('Prevention Rules');
      const practicesIdx = result.indexOf('Best Practices');
      const sessionsIdx = result.indexOf('Recent Sessions');

      expect(lessonsIdx).toBeLessThan(rulesIdx);
      expect(rulesIdx).toBeLessThan(practicesIdx);
      expect(practicesIdx).toBeLessThan(sessionsIdx);
    });
  });

  // ── Entity observation extraction ─────────────────────────────────

  describe('entity observation extraction', () => {
    it('extracts first meaningful observation from entity', () => {
      const entity = createEntity({
        name: 'lesson-extract-test',
        entityType: 'lesson_learned',
        observations: [
          'source_session: abc123',  // metadata-like - should be skipped
          'Error: Forgot to handle null case in user lookup',
        ],
      });

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return [entity];
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Forgot to handle null case');
    });

    it('truncates individual items to ~200 chars', () => {
      const longObservation = 'A'.repeat(500);
      const entity = createEntity({
        name: 'lesson-long-obs',
        entityType: 'lesson_learned',
        observations: [longObservation],
      });

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'lesson_learned' && query.tag === AUTO_TAGS.SOURCE) {
          return [entity];
        }
        return [];
      });

      const result = injector.generateContext();

      // Should not contain the full 500 char string
      expect(result).not.toContain(longObservation);
      // But should contain a truncated version with ellipsis
      expect(result).toContain('...');
    });

    it('extracts title from session_snapshot observations', () => {
      const session = createEntity({
        name: 'session-title-test',
        entityType: 'session_snapshot',
        observations: [
          'title: Build Authentication Module',
          'status: in-progress',
          'files: src/auth/index.ts',
        ],
      });

      mockKG.searchEntities.mockImplementation((query: { entityType?: EntityType; tag?: string }) => {
        if (query.entityType === 'session_snapshot' && query.tag === AUTO_TAGS.SOURCE) {
          return [session];
        }
        return [];
      });

      const result = injector.generateContext();

      expect(result).toContain('Build Authentication Module');
    });
  });
});
