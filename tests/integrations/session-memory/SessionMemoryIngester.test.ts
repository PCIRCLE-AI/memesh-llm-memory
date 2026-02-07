import { createHash } from 'crypto';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SessionMemoryIngester } from '../../../src/integrations/session-memory/SessionMemoryIngester.js';
import type { KnowledgeGraph } from '../../../src/knowledge-graph/index.js';
import type { Entity, Relation } from '../../../src/knowledge-graph/types.js';
import type {
  ParsedSessionMemory,
  SessionMemoryEvent,
  IngestionResult,
} from '../../../src/integrations/session-memory/types.js';
import { AUTO_TAGS } from '../../../src/integrations/session-memory/types.js';

/**
 * Helper to compute content hash the same way the ingester does.
 */
function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// ─── Test Helpers ────────────────────────────────────────────────────

/**
 * Create a mock KnowledgeGraph with all methods stubbed.
 * Uses vi.fn() so tests can inspect calls and override behavior.
 */
function createMockKnowledgeGraph(): {
  createEntity: Mock;
  createRelation: Mock;
  getEntity: Mock;
  searchEntities: Mock;
  transaction: Mock;
} {
  const mock = {
    createEntity: vi.fn((entity: Entity) => entity.name),
    createRelation: vi.fn(),
    getEntity: vi.fn(() => null),
    searchEntities: vi.fn(() => []),
    transaction: vi.fn((fn: () => unknown) => fn()),
  };
  return mock;
}

/**
 * Create a minimal ParsedSessionMemory for testing.
 * Override specific fields as needed.
 */
function createParsedMemory(
  overrides: Partial<ParsedSessionMemory> = {},
): ParsedSessionMemory {
  return {
    title: 'Test Session Title',
    currentState: null,
    taskSpec: null,
    filesAndFunctions: [],
    workflow: [],
    errorsAndCorrections: [],
    codebaseDoc: null,
    learnings: [],
    worklog: [],
    rawSections: new Map(),
    ...overrides,
  };
}

/**
 * Create a minimal SessionMemoryEvent for testing.
 */
function createEvent(
  overrides: Partial<SessionMemoryEvent> = {},
): SessionMemoryEvent {
  return {
    sessionId: 'abc12345-6789-0def-ghij-klmnopqrstuv',
    projectPath: '/Users/dev/my-project',
    sanitizedPath: '-Users-dev-my-project',
    summaryPath: '/home/.claude/projects/-Users-dev-my-project/abc12345/session-memory/summary.md',
    content: '# Test content',
    timestamp: new Date('2025-01-15T10:00:00Z'),
    changeType: 'created',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('SessionMemoryIngester', () => {
  let mockKG: ReturnType<typeof createMockKnowledgeGraph>;
  let ingester: SessionMemoryIngester;

  beforeEach(() => {
    mockKG = createMockKnowledgeGraph();
    ingester = new SessionMemoryIngester(
      mockKG as unknown as KnowledgeGraph,
    );
  });

  // ─── 1. Basic ingestion ──────────────────────────────────────────

  describe('basic ingestion', () => {
    it('should ingest a fully parsed session memory and return IngestionResult', async () => {
      const parsed = createParsedMemory({
        title: 'Implement auth module',
        errorsAndCorrections: [
          { error: 'Missing JWT secret', correction: 'Added env var JWT_SECRET' },
        ],
        learnings: [
          { content: 'Always validate token expiry', type: 'positive' },
        ],
        filesAndFunctions: [
          { path: 'src/auth/jwt.ts', description: 'JWT token handling' },
        ],
        workflow: [
          { command: 'npm test', description: 'Run test suite' },
        ],
      });
      const event = createEvent();

      const result = await ingester.ingest(parsed, event);

      expect(result.sessionId).toBe(event.sessionId);
      expect(result.entitiesCreated).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      // Session + 1 error + 1 learning + 1 file + 1 workflow = 5 entities
      expect(mockKG.createEntity).toHaveBeenCalledTimes(5);
    });
  });

  // ─── 2. Session entity creation ──────────────────────────────────

  describe('session entity creation', () => {
    it('should create a session_snapshot entity with title, project, and timestamp', async () => {
      const parsed = createParsedMemory({ title: 'Deploy to production' });
      const event = createEvent({
        sessionId: 'deadbeef-1234-5678-9abc-def012345678',
        projectPath: '/Users/dev/my-app',
        timestamp: new Date('2025-06-01T14:30:00Z'),
      });

      await ingester.ingest(parsed, event);

      // First createEntity call should be the session entity
      const sessionCall = mockKG.createEntity.mock.calls[0][0] as Entity;
      expect(sessionCall.name).toBe('session:deadbeef');
      expect(sessionCall.entityType).toBe('session_snapshot');
      expect(sessionCall.observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Deploy to production'),
        ]),
      );
      expect(sessionCall.metadata).toEqual(
        expect.objectContaining({
          sessionId: 'deadbeef-1234-5678-9abc-def012345678',
          projectPath: '/Users/dev/my-app',
          sourceType: 'claude-native-session-memory',
        }),
      );
    });
  });

  // ─── 3. ErrorCorrection -> lesson_learned mapping ────────────────

  describe('error to lesson_learned mapping', () => {
    it('should create a lesson_learned entity for each ErrorCorrection', async () => {
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          {
            error: 'TypeScript strict null checks failed',
            correction: 'Added null guards to all optional params',
            failedApproach: 'Tried using non-null assertion',
          },
          {
            error: 'Build timeout on CI',
            correction: 'Increased timeout to 60s',
          },
        ],
      });
      const event = createEvent();

      await ingester.ingest(parsed, event);

      // Session entity + 2 lesson entities = 3 calls
      const lessonCalls = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .filter((e) => e.entityType === 'lesson_learned');

      expect(lessonCalls).toHaveLength(2);

      // First lesson should have error, correction, AND failedApproach
      expect(lessonCalls[0].observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('TypeScript strict null checks failed'),
          expect.stringContaining('Added null guards'),
          expect.stringContaining('non-null assertion'),
        ]),
      );

      // Second lesson should have error and correction only
      expect(lessonCalls[1].observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Build timeout on CI'),
          expect.stringContaining('Increased timeout'),
        ]),
      );

      // Name should be slugified
      expect(lessonCalls[0].name).toMatch(/^lesson:/);
    });
  });

  // ─── 4. Learning classification mapping ──────────────────────────

  describe('learning classification mapping', () => {
    it('should map negative learning to prevention_rule entity', async () => {
      const parsed = createParsedMemory({
        learnings: [
          { content: 'Never use dynamic code execution in production', type: 'negative' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const learningCalls = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .filter((e) => e.entityType === 'prevention_rule');

      expect(learningCalls).toHaveLength(1);
      expect(learningCalls[0].observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('dynamic code execution'),
        ]),
      );
    });

    it('should map positive learning to best_practice entity', async () => {
      const parsed = createParsedMemory({
        learnings: [
          { content: 'Use dependency injection for testability', type: 'positive' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const learningCalls = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .filter((e) => e.entityType === 'best_practice');

      expect(learningCalls).toHaveLength(1);
      expect(learningCalls[0].observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('dependency injection'),
        ]),
      );
    });

    it('should map neutral learning to best_practice entity', async () => {
      const parsed = createParsedMemory({
        learnings: [
          { content: 'Project uses ESM modules with .js extension', type: 'neutral' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const learningCalls = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .filter((e) => e.entityType === 'best_practice');

      expect(learningCalls).toHaveLength(1);
    });
  });

  // ─── 5. File references -> feature entities ──────────────────────

  describe('file references to feature entities', () => {
    it('should create a feature entity for each FileReference', async () => {
      const parsed = createParsedMemory({
        filesAndFunctions: [
          { path: 'src/auth/jwt.ts', description: 'JWT token verification' },
          { path: 'src/db/migrations/001.sql', description: 'Initial schema' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const fileCalls = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .filter((e) => e.entityType === 'feature');

      expect(fileCalls).toHaveLength(2);

      // Name should use colons for path separators
      expect(fileCalls[0].name).toBe('file:src:auth:jwt.ts');
      expect(fileCalls[1].name).toBe('file:src:db:migrations:001.sql');

      // Observations include path and description
      expect(fileCalls[0].observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('src/auth/jwt.ts'),
          expect.stringContaining('JWT token verification'),
        ]),
      );
    });
  });

  // ─── 6. Workflow -> decision entity ──────────────────────────────

  describe('workflow to decision entity', () => {
    it('should aggregate workflow steps into a single decision entity', async () => {
      const parsed = createParsedMemory({
        workflow: [
          { command: 'npm install', description: 'Install deps' },
          { command: 'npm run build', description: 'Build project' },
          { command: 'npm test', description: 'Run tests' },
        ],
      });
      const event = createEvent({ sessionId: 'abcdef12-3456-7890-abcd-ef1234567890' });

      await ingester.ingest(parsed, event);

      const workflowCalls = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .filter((e) => e.entityType === 'decision');

      expect(workflowCalls).toHaveLength(1);
      expect(workflowCalls[0].name).toBe('workflow:session:abcdef12');

      // All workflow steps should be in observations
      expect(workflowCalls[0].observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('npm install'),
          expect.stringContaining('npm run build'),
          expect.stringContaining('npm test'),
        ]),
      );
    });
  });

  // ─── 7. Relation creation ───────────────────────────────────────

  describe('relation creation', () => {
    it('should create relations from session entity to child entities', async () => {
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          { error: 'Import error', correction: 'Fixed path' },
        ],
        learnings: [
          { content: 'Check imports carefully', type: 'positive' },
        ],
        filesAndFunctions: [
          { path: 'src/index.ts', description: 'Entry point' },
        ],
      });
      const event = createEvent();

      await ingester.ingest(parsed, event);

      // 3 child entities = 3 relations
      expect(mockKG.createRelation).toHaveBeenCalledTimes(3);

      // All relations should be FROM the session entity
      const relationCalls = mockKG.createRelation.mock.calls.map(
        (c) => c[0] as Relation,
      );

      const sessionName = `session:${event.sessionId.substring(0, 8)}`;
      for (const rel of relationCalls) {
        expect(rel.from).toBe(sessionName);
      }

      // Verify relation types
      const relTypes = relationCalls.map((r) => r.relationType);
      expect(relTypes).toContain('caused_by');       // lesson
      expect(relTypes).toContain('follows_pattern');  // learning
      expect(relTypes).toContain('depends_on');       // file
    });

    it('should create relation for workflow entity', async () => {
      const parsed = createParsedMemory({
        workflow: [
          { command: 'npm test', description: 'Run tests' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const relationCalls = mockKG.createRelation.mock.calls.map(
        (c) => c[0] as Relation,
      );
      expect(relationCalls).toHaveLength(1);
      expect(relationCalls[0].relationType).toBe('enabled_by');
    });
  });

  // ─── 8. Deduplication - content hash ─────────────────────────────

  describe('deduplication via content hash', () => {
    it('should skip entity creation when content hash matches existing', async () => {
      const parsed = createParsedMemory({
        learnings: [
          { content: 'Use strict mode', type: 'positive' },
        ],
      });
      const event = createEvent();

      // First ingestion: createEntity returns name normally
      await ingester.ingest(parsed, event);
      const firstCallCount = mockKG.createEntity.mock.calls.length;

      // Second ingestion: simulate KG returning existing entity name
      // (content_hash deduplication happens inside KG.createEntity)
      // The ingester should detect that the returned name matches
      // and count it as "skipped" rather than "created"
      mockKG.createEntity.mockClear();
      mockKG.createRelation.mockClear();

      // Simulate getEntity returning existing entity for dedup check.
      // Use the same hash computation as the ingester: contentHash('learning:Use strict mode')
      const expectedHash = computeHash('learning:Use strict mode');
      mockKG.getEntity.mockImplementation((name: string) => {
        if (name.startsWith('learning:')) {
          return {
            name,
            entityType: 'best_practice',
            observations: ['Use strict mode'],
            tags: [AUTO_TAGS.SOURCE, AUTO_TAGS.AUTO_INGESTED],
            contentHash: expectedHash,
          };
        }
        return null;
      });

      const result = await ingester.ingest(parsed, event);

      // Learning entity should be skipped (session entity still created)
      expect(result.entitiesSkipped).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 9. Deduplication - same name entity (append observations) ──

  describe('deduplication via same name entity', () => {
    it('should update existing entity with new observations when name matches', async () => {
      const parsed = createParsedMemory({
        filesAndFunctions: [
          { path: 'src/index.ts', description: 'Updated entry point with new exports' },
        ],
      });
      const event = createEvent();

      // Simulate getEntity finding existing entity with same name
      mockKG.getEntity.mockImplementation((name: string) => {
        if (name === 'file:src:index.ts') {
          return {
            name: 'file:src:index.ts',
            entityType: 'feature',
            observations: ['src/index.ts', 'Original entry point'],
            tags: [AUTO_TAGS.SOURCE, AUTO_TAGS.AUTO_INGESTED],
          };
        }
        return null;
      });

      const result = await ingester.ingest(parsed, event);

      // The file entity should be counted as updated (not created)
      expect(result.entitiesUpdated).toBeGreaterThanOrEqual(1);

      // createEntity should still be called (upsert behavior)
      const fileCall = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .find((e) => e.name === 'file:src:index.ts');

      expect(fileCall).toBeDefined();
      // New observations should include BOTH old and new
      expect(fileCall!.observations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Updated entry point'),
        ]),
      );
    });
  });

  // ─── 10. Auto-tagging ───────────────────────────────────────────

  describe('auto-tagging', () => {
    it('should add source:native-session-memory and auto-ingested tags to all entities', async () => {
      const parsed = createParsedMemory({
        learnings: [
          { content: 'Tag test learning', type: 'neutral' },
        ],
        filesAndFunctions: [
          { path: 'src/app.ts', description: 'App entry' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const allEntities = mockKG.createEntity.mock.calls.map(
        (c) => c[0] as Entity,
      );

      for (const entity of allEntities) {
        expect(entity.tags).toEqual(
          expect.arrayContaining([
            AUTO_TAGS.SOURCE,
            AUTO_TAGS.AUTO_INGESTED,
          ]),
        );
      }
    });
  });

  // ─── 11. Metadata ──────────────────────────────────────────────

  describe('metadata', () => {
    it('should include sessionId and sourceType in metadata for all entities', async () => {
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          { error: 'Test error', correction: 'Test fix' },
        ],
      });
      const event = createEvent({
        sessionId: 'meta-test-session-id-1234567890abcdef',
      });

      await ingester.ingest(parsed, event);

      const allEntities = mockKG.createEntity.mock.calls.map(
        (c) => c[0] as Entity,
      );

      for (const entity of allEntities) {
        expect(entity.metadata).toEqual(
          expect.objectContaining({
            sessionId: 'meta-test-session-id-1234567890abcdef',
            sourceType: 'claude-native-session-memory',
          }),
        );
      }
    });
  });

  // ─── 12. Empty parsed memory ───────────────────────────────────

  describe('empty parsed memory', () => {
    it('should create only the session entity when all sections are empty', async () => {
      const parsed = createParsedMemory({
        title: 'Empty Session',
        currentState: null,
        taskSpec: null,
        filesAndFunctions: [],
        workflow: [],
        errorsAndCorrections: [],
        learnings: [],
        worklog: [],
      });

      const result = await ingester.ingest(parsed, createEvent());

      // Only the session entity should be created
      expect(mockKG.createEntity).toHaveBeenCalledTimes(1);

      const sessionEntity = mockKG.createEntity.mock.calls[0][0] as Entity;
      expect(sessionEntity.entityType).toBe('session_snapshot');
      expect(sessionEntity.name).toMatch(/^session:/);

      // No relations should be created (no child entities)
      expect(mockKG.createRelation).not.toHaveBeenCalled();

      // Result should reflect only 1 entity created
      expect(result.entitiesCreated).toBe(1);
      expect(result.relationsCreated).toBe(0);
    });
  });

  // ─── 13. Error handling ────────────────────────────────────────

  describe('error handling', () => {
    it('should capture errors in result.errors and continue ingestion', async () => {
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          { error: 'First error', correction: 'First fix' },
          { error: 'Second error', correction: 'Second fix' },
        ],
        learnings: [
          { content: 'A good practice', type: 'positive' },
        ],
      });

      // Make the first lesson creation fail, but others succeed
      let callCount = 0;
      mockKG.createEntity.mockImplementation((entity: Entity) => {
        callCount++;
        // Fail on the second call (first lesson entity)
        if (callCount === 2) {
          throw new Error('Database write failed');
        }
        return entity.name;
      });

      const result = await ingester.ingest(parsed, createEvent());

      // Should have at least one error
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].message).toContain('Database write failed');

      // Should still create the third and fourth entities
      // (session=1, fail=2, second lesson=3, learning=4)
      expect(mockKG.createEntity).toHaveBeenCalledTimes(4);
    });

    it('should not fail entirely when createRelation throws', async () => {
      const parsed = createParsedMemory({
        learnings: [
          { content: 'Relation test', type: 'positive' },
        ],
      });

      mockKG.createRelation.mockImplementation(() => {
        throw new Error('Relation creation failed');
      });

      const result = await ingester.ingest(parsed, createEvent());

      // Should have error for the failed relation
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some((e) => e.message.includes('Relation creation failed'))).toBe(true);

      // Entities should still be created
      expect(result.entitiesCreated).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 14. IngestionResult accuracy ──────────────────────────────

  describe('IngestionResult accuracy', () => {
    it('should accurately count created, updated, skipped, and relations', async () => {
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          { error: 'Bug A', correction: 'Fix A' },
        ],
        learnings: [
          { content: 'Practice B', type: 'positive' },
        ],
        filesAndFunctions: [
          { path: 'src/foo.ts', description: 'Foo module' },
        ],
        workflow: [
          { command: 'npm test', description: 'Test' },
        ],
      });
      const event = createEvent();

      const result = await ingester.ingest(parsed, event);

      // 5 entities: session + lesson + learning + file + workflow
      expect(result.entitiesCreated).toBe(5);
      expect(result.entitiesUpdated).toBe(0);
      expect(result.entitiesSkipped).toBe(0);
      // 4 relations: session->lesson, session->learning, session->file, session->workflow
      expect(result.relationsCreated).toBe(4);
      expect(result.errors).toHaveLength(0);
      expect(result.sessionId).toBe(event.sessionId);
    });

    it('should count errors separately from successful operations', async () => {
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          { error: 'Bug 1', correction: 'Fix 1' },
          { error: 'Bug 2', correction: 'Fix 2' },
        ],
      });

      // Fail on the second lesson entity (third call overall)
      let callIdx = 0;
      mockKG.createEntity.mockImplementation((entity: Entity) => {
        callIdx++;
        if (callIdx === 3) {
          throw new Error('DB error');
        }
        return entity.name;
      });

      const result = await ingester.ingest(parsed, createEvent());

      // session(1) + lesson1(2) + lesson2_fail(3) = 2 created, 1 error
      expect(result.entitiesCreated).toBe(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  // ─── Slugify edge cases ────────────────────────────────────────

  describe('entity naming and slugification', () => {
    it('should slugify entity names: lowercase, hyphens for spaces, alphanumeric only', async () => {
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          {
            error: 'TypeScript Strict Mode: Cannot assign to readonly!',
            correction: 'Used spread operator',
          },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const lessonEntity = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .find((e) => e.entityType === 'lesson_learned');

      expect(lessonEntity).toBeDefined();
      // Should be lowercase, spaces->hyphens, special chars removed
      expect(lessonEntity!.name).toMatch(/^lesson:[a-z0-9-]+$/);
      // Should not exceed 60+prefix chars
      expect(lessonEntity!.name.length).toBeLessThanOrEqual(60 + 'lesson:'.length);
    });

    it('should truncate slugified names to 60 characters', async () => {
      const longError = 'A'.repeat(100) + ' very long error message that exceeds the limit';
      const parsed = createParsedMemory({
        errorsAndCorrections: [
          { error: longError, correction: 'Fix' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const lessonEntity = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .find((e) => e.entityType === 'lesson_learned');

      expect(lessonEntity).toBeDefined();
      // "lesson:" prefix + max 60 chars slug
      const slugPart = lessonEntity!.name.replace(/^lesson:/, '');
      expect(slugPart.length).toBeLessThanOrEqual(60);
    });

    it('should use session ID first 8 chars for session entity name', async () => {
      const event = createEvent({
        sessionId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
      });

      await ingester.ingest(createParsedMemory(), event);

      const sessionEntity = mockKG.createEntity.mock.calls[0][0] as Entity;
      expect(sessionEntity.name).toBe('session:12345678');
    });

    it('should replace path separators with colons for file entities', async () => {
      const parsed = createParsedMemory({
        filesAndFunctions: [
          { path: '/absolute/path/to/file.ts', description: 'Absolute path' },
        ],
      });

      await ingester.ingest(parsed, createEvent());

      const fileEntity = mockKG.createEntity.mock.calls
        .map((c) => c[0] as Entity)
        .find((e) => e.entityType === 'feature');

      expect(fileEntity).toBeDefined();
      // Leading slash should be handled (trimmed or converted)
      expect(fileEntity!.name).toMatch(/^file:/);
      expect(fileEntity!.name).not.toContain('/');
    });
  });
});
