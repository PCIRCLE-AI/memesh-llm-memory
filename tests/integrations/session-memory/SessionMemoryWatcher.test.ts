/**
 * SessionMemoryWatcher Test Suite
 *
 * TDD tests for watching Claude Code's native session memory files (summary.md)
 * and emitting SessionMemoryEvent objects on creation/update.
 *
 * All filesystem and chokidar interactions are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { SessionMemoryEvent } from '../../../src/integrations/session-memory/types.js';

// ─── Mocks ───────────────────────────────────────────────────────────

// Mock chokidar: create a fake FSWatcher backed by EventEmitter
class MockFSWatcher extends EventEmitter {
  closed = false;
  async close(): Promise<void> {
    this.closed = true;
    this.removeAllListeners();
  }
}

let mockWatcherInstance: MockFSWatcher;

vi.mock('chokidar', () => {
  return {
    default: {
      watch: vi.fn(() => {
        mockWatcherInstance = new MockFSWatcher();
        return mockWatcherInstance;
      }),
    },
  };
});

// Mock fs/promises: readFile returns controlled content
const mockReadFile = vi.fn<(path: string | URL) => Promise<string>>();
vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(args[0] as string),
}));

// Mock logger to suppress output during tests
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

const PROJECTS_DIR = '/home/user/.claude/projects';

/** Build a valid summary.md path from parts */
function buildSummaryPath(
  sanitizedPath: string,
  sessionId: string,
): string {
  return `${PROJECTS_DIR}/${sanitizedPath}/${sessionId}/session-memory/summary.md`;
}

/** Create a default WatcherConfig for tests */
function createTestConfig(
  overrides: Partial<{
    projectsDir: string;
    debounceMs: number;
    onMemoryUpdate: (event: SessionMemoryEvent) => Promise<void>;
  }> = {},
) {
  return {
    projectsDir: PROJECTS_DIR,
    debounceMs: 100, // Short debounce for fast tests
    onMemoryUpdate: vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('SessionMemoryWatcher', () => {
  // Use fake timers for debounce testing
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  // Lazy import to ensure mocks are registered before module loads
  async function importWatcher() {
    const mod = await import(
      '../../../src/integrations/session-memory/SessionMemoryWatcher.js'
    );
    return mod.SessionMemoryWatcher;
  }

  // ── 1. Construction ──────────────────────────────────────────────

  describe('Construction', () => {
    it('should create a watcher with valid config', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      expect(watcher).toBeDefined();
      expect(watcher.isWatching).toBe(false);
    });

    it('should use default debounceMs when not provided', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      delete (config as Record<string, unknown>)['debounceMs'];
      const watcher = new SessionMemoryWatcher(config);

      expect(watcher).toBeDefined();
    });
  });

  // ── 2. Start/Stop Lifecycle ──────────────────────────────────────

  describe('Start/Stop Lifecycle', () => {
    it('should initialize chokidar watcher on start()', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const chokidar = await import('chokidar');
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      expect(chokidar.default.watch).toHaveBeenCalledWith(
        expect.stringContaining('**/session-memory/summary.md'),
        expect.objectContaining({
          persistent: true,
          ignoreInitial: true,
        }),
      );
      expect(watcher.isWatching).toBe(true);
    });

    it('should close chokidar watcher on stop()', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();
      expect(watcher.isWatching).toBe(true);

      await watcher.stop();
      expect(watcher.isWatching).toBe(false);
      expect(mockWatcherInstance.closed).toBe(true);
    });

    it('should be safe to call stop() without start()', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      // Should not throw
      await watcher.stop();
      expect(watcher.isWatching).toBe(false);
    });

    it('should be safe to call start() multiple times', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const chokidar = await import('chokidar');
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();
      const firstInstance = mockWatcherInstance;

      await watcher.start();
      // Should close the previous watcher and create a new one
      expect(firstInstance.closed).toBe(true);
      expect(chokidar.default.watch).toHaveBeenCalledTimes(2);
      expect(watcher.isWatching).toBe(true);

      await watcher.stop();
    });
  });

  // ── 3. File Path Parsing ─────────────────────────────────────────

  describe('File Path Parsing', () => {
    it('should extract sessionId and sanitizedPath from valid path', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      const filePath = buildSummaryPath('-Users-ktseng', 'abc12345-uuid');
      // Access private method via bracket notation for testing
      const result = (watcher as unknown as Record<string, (p: string) => { sessionId: string; sanitizedPath: string }>)
        .parseFilePath(filePath);

      expect(result.sessionId).toBe('abc12345-uuid');
      expect(result.sanitizedPath).toBe('-Users-ktseng');
    });

    it('should handle complex sanitized paths', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      const filePath = buildSummaryPath(
        '-Users-ktseng-Developer-Projects-my-app',
        'session-001-abcdef',
      );
      const result = (watcher as unknown as Record<string, (p: string) => { sessionId: string; sanitizedPath: string }>)
        .parseFilePath(filePath);

      expect(result.sessionId).toBe('session-001-abcdef');
      expect(result.sanitizedPath).toBe('-Users-ktseng-Developer-Projects-my-app');
    });
  });

  // ── 4. Path Desanitization ───────────────────────────────────────

  describe('Path Desanitization', () => {
    it('should convert sanitized path back to filesystem path', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      const result = (watcher as unknown as Record<string, (p: string) => string>)
        .desanitizePath('-Users-ktseng');

      expect(result).toBe('/Users/ktseng');
    });

    it('should handle deeper paths', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const config = createTestConfig();
      const watcher = new SessionMemoryWatcher(config);

      const result = (watcher as unknown as Record<string, (p: string) => string>)
        .desanitizePath('-Users-ktseng-Developer-Projects');

      expect(result).toBe('/Users/ktseng/Developer/Projects');
    });
  });

  // ── 5. Content Hash Deduplication ────────────────────────────────

  describe('Content Hash Deduplication', () => {
    it('should emit only once for identical content', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'session-aaa');
      const fileContent = '# Session Title\nTest session content';
      mockReadFile.mockResolvedValue(fileContent);

      // First change
      mockWatcherInstance.emit('add', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      // Second change with same content
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      expect(onMemoryUpdate).toHaveBeenCalledTimes(1);

      await watcher.stop();
    });

    it('should emit again when content changes', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'session-bbb');

      // First change
      mockReadFile.mockResolvedValue('Content v1');
      mockWatcherInstance.emit('add', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      // Second change with different content
      mockReadFile.mockResolvedValue('Content v2');
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      expect(onMemoryUpdate).toHaveBeenCalledTimes(2);

      await watcher.stop();
    });
  });

  // ── 6. Debounce ──────────────────────────────────────────────────

  describe('Debounce', () => {
    it('should debounce multiple rapid changes into single callback', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate, debounceMs: 200 });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'session-ccc');
      mockReadFile.mockResolvedValue('Debounced content');

      // Fire 5 rapid changes
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(50);
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(50);
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(50);
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(50);
      mockWatcherInstance.emit('change', filePath);

      // Not enough time yet - should not have fired
      expect(onMemoryUpdate).not.toHaveBeenCalled();

      // Advance past debounce threshold
      await vi.advanceTimersByTimeAsync(250);

      expect(onMemoryUpdate).toHaveBeenCalledTimes(1);

      await watcher.stop();
    });

    it('should debounce per-file independently', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate, debounceMs: 200 });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const file1 = buildSummaryPath('-Users-ktseng', 'session-111');
      const file2 = buildSummaryPath('-Users-ktseng', 'session-222');

      // Different content per file to avoid dedup
      mockReadFile.mockImplementation(async (path: string | URL) => {
        const pathStr = typeof path === 'string' ? path : path.toString();
        if (pathStr.includes('session-111')) return 'File 1 content';
        return 'File 2 content';
      });

      // Fire changes on both files
      mockWatcherInstance.emit('add', file1);
      mockWatcherInstance.emit('add', file2);

      // Advance past debounce
      await vi.advanceTimersByTimeAsync(250);

      // Both should fire
      expect(onMemoryUpdate).toHaveBeenCalledTimes(2);

      await watcher.stop();
    });
  });

  // ── 7. Event Emission ────────────────────────────────────────────

  describe('Event Emission', () => {
    it('should emit correct SessionMemoryEvent structure on add', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'session-event-test');
      const content = '# Session Title\nEvent test content';
      mockReadFile.mockResolvedValue(content);

      mockWatcherInstance.emit('add', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      expect(onMemoryUpdate).toHaveBeenCalledTimes(1);

      const event = onMemoryUpdate.mock.calls[0][0];
      expect(event).toEqual(
        expect.objectContaining({
          sessionId: 'session-event-test',
          sanitizedPath: '-Users-ktseng',
          summaryPath: filePath,
          content,
          changeType: 'created',
        }),
      );
      // projectPath is the desanitized path
      expect(event.projectPath).toBe('/Users/ktseng');
      // timestamp should be a Date
      expect(event.timestamp).toBeInstanceOf(Date);

      await watcher.stop();
    });
  });

  // ── 8. Change Type Detection ─────────────────────────────────────

  describe('Change Type Detection', () => {
    it('should detect "created" for new files (add event)', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'new-session');
      mockReadFile.mockResolvedValue('New file content');

      mockWatcherInstance.emit('add', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      expect(onMemoryUpdate.mock.calls[0][0].changeType).toBe('created');

      await watcher.stop();
    });

    it('should detect "updated" for modified files (change event)', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'existing-session');

      // First emit as add (to set up the content hash)
      mockReadFile.mockResolvedValue('Original content');
      mockWatcherInstance.emit('add', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      // Then emit as change with different content
      mockReadFile.mockResolvedValue('Updated content');
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      expect(onMemoryUpdate).toHaveBeenCalledTimes(2);
      expect(onMemoryUpdate.mock.calls[1][0].changeType).toBe('updated');

      await watcher.stop();
    });
  });

  // ── 9. Error Handling ────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should not crash when readFile fails', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'error-session');
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

      // Should not throw
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      // Callback should NOT have been called
      expect(onMemoryUpdate).not.toHaveBeenCalled();
      // Watcher should still be running
      expect(watcher.isWatching).toBe(true);

      await watcher.stop();
    });

    it('should not crash when onMemoryUpdate callback throws', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockRejectedValue(
        new Error('Callback error'),
      );
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const filePath = buildSummaryPath('-Users-ktseng', 'callback-error-session');
      mockReadFile.mockResolvedValue('Some content');

      // Should not throw
      mockWatcherInstance.emit('change', filePath);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      // Callback was called but threw
      expect(onMemoryUpdate).toHaveBeenCalledTimes(1);
      // Watcher should still be running
      expect(watcher.isWatching).toBe(true);

      await watcher.stop();
    });
  });

  // ── 10. Multiple Files ───────────────────────────────────────────

  describe('Multiple Files', () => {
    it('should track different summary.md files independently', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const file1 = buildSummaryPath('-Users-ktseng', 'session-alpha');
      const file2 = buildSummaryPath('-Users-ktseng', 'session-beta');
      const file3 = buildSummaryPath('-Users-other', 'session-gamma');

      mockReadFile.mockImplementation(async (path: string | URL) => {
        const pathStr = typeof path === 'string' ? path : path.toString();
        if (pathStr.includes('alpha')) return 'Alpha content';
        if (pathStr.includes('beta')) return 'Beta content';
        return 'Gamma content';
      });

      // Trigger all three files
      mockWatcherInstance.emit('add', file1);
      mockWatcherInstance.emit('add', file2);
      mockWatcherInstance.emit('add', file3);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      expect(onMemoryUpdate).toHaveBeenCalledTimes(3);

      // Verify each event has correct sessionId
      const sessionIds = onMemoryUpdate.mock.calls.map(
        (call) => call[0].sessionId,
      );
      expect(sessionIds).toContain('session-alpha');
      expect(sessionIds).toContain('session-beta');
      expect(sessionIds).toContain('session-gamma');

      await watcher.stop();
    });

    it('should dedup per file, not globally', async () => {
      const SessionMemoryWatcher = await importWatcher();
      const onMemoryUpdate = vi.fn<(event: SessionMemoryEvent) => Promise<void>>().mockResolvedValue(undefined);
      const config = createTestConfig({ onMemoryUpdate });
      const watcher = new SessionMemoryWatcher(config);

      await watcher.start();

      const file1 = buildSummaryPath('-Users-ktseng', 'session-x');
      const file2 = buildSummaryPath('-Users-ktseng', 'session-y');

      // Both files have the same content
      mockReadFile.mockResolvedValue('Identical content');

      // Both should still emit because they are different files
      mockWatcherInstance.emit('add', file1);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      mockWatcherInstance.emit('add', file2);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      expect(onMemoryUpdate).toHaveBeenCalledTimes(2);

      // Now re-emit same files with same content - should be deduped per file
      mockWatcherInstance.emit('change', file1);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      mockWatcherInstance.emit('change', file2);
      await vi.advanceTimersByTimeAsync(config.debounceMs + 50);

      // Still only 2 calls total (deduped per file)
      expect(onMemoryUpdate).toHaveBeenCalledTimes(2);

      await watcher.stop();
    });
  });
});
