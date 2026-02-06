/**
 * SessionMemoryPipeline Test Suite
 *
 * TDD tests for the pipeline orchestrator that wires together
 * SessionMemoryWatcher, SessionMemoryParser, SessionMemoryIngester,
 * and SessionContextInjector into a cohesive processing pipeline.
 *
 * All sub-modules are mocked to isolate orchestration logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionMemoryEvent, ParsedSessionMemory, IngestionResult } from '../../../src/integrations/session-memory/types.js';
import type { InjectionContext } from '../../../src/integrations/session-memory/SessionContextInjector.js';

// ─── Mocks ───────────────────────────────────────────────────────────

// Use vi.hoisted() so mock references are available inside vi.mock factories
// (vitest hoists vi.mock calls to the top of the file, before const declarations)
const {
  mockWatcherStart,
  mockWatcherStop,
  mockParse,
  mockIngest,
  mockGenerateContext,
  captured,
} = vi.hoisted(() => ({
  mockWatcherStart: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  mockWatcherStop: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  mockParse: vi.fn(),
  mockIngest: vi.fn(),
  mockGenerateContext: vi.fn(),
  captured: {
    onMemoryUpdate: null as ((event: SessionMemoryEvent) => Promise<void>) | null,
    projectsDir: undefined as string | undefined,
    debounceMs: undefined as number | undefined,
  },
}));

// Mock logger to suppress output and allow spy assertions
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/integrations/session-memory/SessionMemoryWatcher.js', () => ({
  SessionMemoryWatcher: vi.fn().mockImplementation(function (this: any, config: {
    projectsDir: string;
    debounceMs?: number;
    onMemoryUpdate: (event: SessionMemoryEvent) => Promise<void>;
  }) {
    captured.onMemoryUpdate = config.onMemoryUpdate;
    captured.projectsDir = config.projectsDir;
    captured.debounceMs = config.debounceMs;
    this.start = mockWatcherStart;
    this.stop = mockWatcherStop;
    this.isWatching = false;
  }),
}));

vi.mock('../../../src/integrations/session-memory/SessionMemoryParser.js', () => ({
  SessionMemoryParser: vi.fn().mockImplementation(function (this: any) {
    this.parse = mockParse;
  }),
}));

vi.mock('../../../src/integrations/session-memory/SessionMemoryIngester.js', () => ({
  SessionMemoryIngester: vi.fn().mockImplementation(function (this: any) {
    this.ingest = mockIngest;
  }),
}));

vi.mock('../../../src/integrations/session-memory/SessionContextInjector.js', () => ({
  SessionContextInjector: vi.fn().mockImplementation(function (this: any) {
    this.generateContext = mockGenerateContext;
  }),
}));

// Import after mocks are defined (hoisted by vitest)
import { SessionMemoryPipeline } from '../../../src/integrations/session-memory/SessionMemoryPipeline.js';
import { logger } from '../../../src/utils/logger.js';

// ─── Test Helpers ────────────────────────────────────────────────────

function createMockKnowledgeGraph() {
  return {
    createEntity: vi.fn(),
    createRelation: vi.fn(),
    getEntity: vi.fn(() => null),
    searchEntities: vi.fn(() => []),
    transaction: vi.fn((fn: () => unknown) => fn()),
  };
}

function createEvent(overrides: Partial<SessionMemoryEvent> = {}): SessionMemoryEvent {
  return {
    sessionId: 'abc12345-6789-0def-ghij-klmnopqrstuv',
    projectPath: '/Users/dev/my-project',
    sanitizedPath: '-Users-dev-my-project',
    summaryPath: '/home/.claude/projects/-Users-dev-my-project/abc12345/session-memory/summary.md',
    content: '# Session Title\n\n# Current State\nWorking on feature X',
    timestamp: new Date('2025-01-15T10:00:00Z'),
    changeType: 'created',
    ...overrides,
  };
}

function createParsedMemory(overrides: Partial<ParsedSessionMemory> = {}): ParsedSessionMemory {
  return {
    title: 'Test Session Title',
    currentState: 'Working on feature X',
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

// ─── Test Suite ──────────────────────────────────────────────────────

describe('SessionMemoryPipeline', () => {
  let mockKG: ReturnType<typeof createMockKnowledgeGraph>;

  beforeEach(() => {
    vi.clearAllMocks();
    captured.onMemoryUpdate = null;
    captured.projectsDir = undefined;
    captured.debounceMs = undefined;

    mockKG = createMockKnowledgeGraph();
  });

  // ─── Construction ───────────────────────────────────────────────

  describe('construction', () => {
    it('should create pipeline with default config (projectsDir defaults to ~/.claude/projects)', () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      expect(pipeline).toBeDefined();
      expect(pipeline.isRunning).toBe(false);
      // The watcher should receive the default projectsDir
      const os = require('os');
      const path = require('path');
      const expectedDir = path.join(os.homedir(), '.claude', 'projects');
      expect(captured.projectsDir).toBe(expectedDir);
    });

    it('should create pipeline with custom config', () => {
      const customDir = '/custom/projects/dir';
      const pipeline = new SessionMemoryPipeline(mockKG as any, {
        projectsDir: customDir,
        debounceMs: 5000,
      });

      expect(pipeline).toBeDefined();
      expect(captured.projectsDir).toBe(customDir);
      expect(captured.debounceMs).toBe(5000);
    });
  });

  // ─── start() / stop() lifecycle ─────────────────────────────────

  describe('start()', () => {
    it('should call watcher.start() and set isRunning to true', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      expect(pipeline.isRunning).toBe(false);
      await pipeline.start();

      expect(mockWatcherStart).toHaveBeenCalledTimes(1);
      expect(pipeline.isRunning).toBe(true);
    });

    it('should be idempotent (second start is a no-op)', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      await pipeline.start();
      await pipeline.start();

      // Watcher.start() should only be called once
      expect(mockWatcherStart).toHaveBeenCalledTimes(1);
      expect(pipeline.isRunning).toBe(true);
    });
  });

  describe('stop()', () => {
    it('should call watcher.stop() and set isRunning to false', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      await pipeline.start();
      expect(pipeline.isRunning).toBe(true);

      await pipeline.stop();

      expect(mockWatcherStop).toHaveBeenCalledTimes(1);
      expect(pipeline.isRunning).toBe(false);
    });

    it('should be idempotent (second stop is a no-op)', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      await pipeline.start();
      await pipeline.stop();
      await pipeline.stop();

      // Watcher.stop() should only be called once
      expect(mockWatcherStop).toHaveBeenCalledTimes(1);
      expect(pipeline.isRunning).toBe(false);
    });

    it('should be a no-op if pipeline was never started', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      await pipeline.stop();

      expect(mockWatcherStop).not.toHaveBeenCalled();
      expect(pipeline.isRunning).toBe(false);
    });
  });

  // ─── isRunning state tracking ───────────────────────────────────

  describe('isRunning state tracking', () => {
    it('should track the full lifecycle: false -> start -> true -> stop -> false', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      expect(pipeline.isRunning).toBe(false);

      await pipeline.start();
      expect(pipeline.isRunning).toBe(true);

      await pipeline.stop();
      expect(pipeline.isRunning).toBe(false);
    });
  });

  // ─── End-to-end: handleMemoryUpdate pipeline ───────────────────

  describe('handleMemoryUpdate (end-to-end pipeline)', () => {
    it('should parse event content and ingest the result', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      const event = createEvent();
      const parsed = createParsedMemory();
      const ingestionResult: IngestionResult = {
        entitiesCreated: 3,
        entitiesUpdated: 0,
        entitiesSkipped: 0,
        relationsCreated: 2,
        sessionId: event.sessionId,
        errors: [],
      };

      mockParse.mockReturnValue(parsed);
      mockIngest.mockResolvedValue(ingestionResult);

      // Trigger the pipeline callback captured during construction
      expect(captured.onMemoryUpdate).not.toBeNull();
      await captured.onMemoryUpdate!(event);

      // Parser should receive the raw content from the event
      expect(mockParse).toHaveBeenCalledTimes(1);
      expect(mockParse).toHaveBeenCalledWith(event.content);

      // Ingester should receive the parsed result and the event
      expect(mockIngest).toHaveBeenCalledTimes(1);
      expect(mockIngest).toHaveBeenCalledWith(parsed, event);

      // Logger should record success
      expect(logger.info).toHaveBeenCalledWith(
        'SessionMemoryPipeline: ingested session memory',
        expect.objectContaining({
          sessionId: event.sessionId,
          changeType: event.changeType,
        }),
      );
    });

    it('should handle updated change type correctly', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      const event = createEvent({ changeType: 'updated' });
      const parsed = createParsedMemory();
      const ingestionResult: IngestionResult = {
        entitiesCreated: 0,
        entitiesUpdated: 2,
        entitiesSkipped: 1,
        relationsCreated: 0,
        sessionId: event.sessionId,
        errors: [],
      };

      mockParse.mockReturnValue(parsed);
      mockIngest.mockResolvedValue(ingestionResult);

      await captured.onMemoryUpdate!(event);

      expect(logger.info).toHaveBeenCalledWith(
        'SessionMemoryPipeline: ingested session memory',
        expect.objectContaining({
          sessionId: event.sessionId,
          changeType: 'updated',
        }),
      );
    });
  });

  // ─── Error handling ─────────────────────────────────────────────

  describe('error handling', () => {
    it('should catch and log parser errors without crashing', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      const event = createEvent();
      mockParse.mockImplementation(() => {
        throw new Error('Parser exploded');
      });

      // Should NOT throw
      await expect(captured.onMemoryUpdate!(event)).resolves.toBeUndefined();

      // Logger should record the error
      expect(logger.error).toHaveBeenCalledWith(
        'SessionMemoryPipeline: failed to process memory update',
        expect.objectContaining({
          sessionId: event.sessionId,
          error: 'Parser exploded',
        }),
      );

      // Ingester should NOT have been called
      expect(mockIngest).not.toHaveBeenCalled();
    });

    it('should catch and log ingester errors without crashing', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      const event = createEvent();
      const parsed = createParsedMemory();

      mockParse.mockReturnValue(parsed);
      mockIngest.mockRejectedValue(new Error('Ingester failed'));

      // Should NOT throw
      await expect(captured.onMemoryUpdate!(event)).resolves.toBeUndefined();

      // Logger should record the error
      expect(logger.error).toHaveBeenCalledWith(
        'SessionMemoryPipeline: failed to process memory update',
        expect.objectContaining({
          sessionId: event.sessionId,
          error: 'Ingester failed',
        }),
      );
    });

    it('should handle non-Error thrown values gracefully', async () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      const event = createEvent();
      mockParse.mockImplementation(() => {
        throw 'string error';
      });

      await expect(captured.onMemoryUpdate!(event)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'SessionMemoryPipeline: failed to process memory update',
        expect.objectContaining({
          sessionId: event.sessionId,
          error: 'string error',
        }),
      );
    });
  });

  // ─── generateContext delegation ─────────────────────────────────

  describe('generateContext()', () => {
    it('should delegate to injector.generateContext() with no arguments', () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      mockGenerateContext.mockReturnValue('## Context Block');

      const result = pipeline.generateContext();

      expect(mockGenerateContext).toHaveBeenCalledTimes(1);
      expect(mockGenerateContext).toHaveBeenCalledWith(undefined);
      expect(result).toBe('## Context Block');
    });

    it('should delegate to injector.generateContext() with injection context', () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      const ctx: InjectionContext = {
        projectPath: '/Users/dev/my-project',
        gitBranch: 'feature/session-memory',
      };

      mockGenerateContext.mockReturnValue('## Branch Context');

      const result = pipeline.generateContext(ctx);

      expect(mockGenerateContext).toHaveBeenCalledTimes(1);
      expect(mockGenerateContext).toHaveBeenCalledWith(ctx);
      expect(result).toBe('## Branch Context');
    });

    it('should return empty string when injector returns empty', () => {
      const pipeline = new SessionMemoryPipeline(mockKG as any);

      mockGenerateContext.mockReturnValue('');

      const result = pipeline.generateContext();

      expect(result).toBe('');
    });
  });
});
