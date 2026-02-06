/**
 * SessionMemoryWatcher
 *
 * Monitors Claude Code's native session memory files (summary.md) for
 * creation and modification. Uses chokidar for efficient filesystem
 * watching with macOS FSEvents support.
 *
 * Session memory files are located at:
 *   ~/.claude/projects/{sanitized-path}/{session-id}/session-memory/summary.md
 *
 * Features:
 * - Per-file debouncing (Claude may perform multiple rapid edits)
 * - Content hash deduplication (skip if file content unchanged)
 * - Fault-tolerant (file read or callback errors do not crash the watcher)
 * - Change type detection (created vs. updated)
 */

import chokidar, { type FSWatcher } from 'chokidar';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { logger } from '../../utils/logger.js';
import type { SessionMemoryEvent } from './types.js';

// ─── Configuration ───────────────────────────────────────────────────

interface WatcherConfig {
  /** Directory to watch (default: ~/.claude/projects/) */
  projectsDir: string;
  /** Debounce delay in ms (default: 2000 -- Claude may do multiple edits) */
  debounceMs?: number;
  /** Callback when a session memory is created or updated */
  onMemoryUpdate: (event: SessionMemoryEvent) => Promise<void>;
}

/** Default debounce delay in milliseconds */
const DEFAULT_DEBOUNCE_MS = 2000;

// ─── Watcher Class ───────────────────────────────────────────────────

export class SessionMemoryWatcher {
  private watcher: FSWatcher | null = null;
  private processedHashes = new Map<string, string>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private changeTypes = new Map<string, 'created' | 'updated'>();
  private stopped = false;
  private config: Required<Pick<WatcherConfig, 'debounceMs'>> & WatcherConfig;

  constructor(config: WatcherConfig) {
    this.config = {
      ...config,
      debounceMs: config.debounceMs ?? DEFAULT_DEBOUNCE_MS,
    };
  }

  /**
   * Start watching for session memory file changes.
   * If already watching, closes the existing watcher first.
   */
  async start(): Promise<void> {
    // Close existing watcher if running
    if (this.watcher) {
      await this.stop();
    }

    this.stopped = false;

    const watchPattern = `${this.config.projectsDir}/**/session-memory/summary.md`;

    logger.info('SessionMemoryWatcher starting', {
      pattern: watchPattern,
      debounceMs: this.config.debounceMs,
    });

    this.watcher = chokidar.watch(watchPattern, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 200,
      },
    });

    // Listen for new files
    this.watcher.on('add', (filePath: string) => {
      this.handleFileChange(filePath, 'created');
    });

    // Listen for modifications
    this.watcher.on('change', (filePath: string) => {
      this.handleFileChange(filePath, 'updated');
    });

    // Log errors but do not crash
    this.watcher.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('SessionMemoryWatcher chokidar error', {
        error: message,
      });
    });
  }

  /**
   * Stop watching and clean up all resources.
   */
  async stop(): Promise<void> {
    this.stopped = true;

    // Clear all pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.changeTypes.clear();
    this.processedHashes.clear();

    // Close the chokidar watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    logger.info('SessionMemoryWatcher stopped');
  }

  /**
   * Parse a file path to extract session info.
   *
   * Expected path structure:
   *   {projectsDir}/{sanitizedPath}/{sessionId}/session-memory/summary.md
   *
   * @param filePath - Absolute path to the summary.md file
   * @returns Parsed session info
   */
  parseFilePath(filePath: string): { sessionId: string; sanitizedPath: string } {
    // Normalize projectsDir: remove trailing slashes for consistent prefix stripping
    const normalizedProjectsDir = this.config.projectsDir.replace(/\/+$/, '');

    if (!filePath.startsWith(normalizedProjectsDir + '/')) {
      throw new Error(`File path does not start with projectsDir: ${filePath}`);
    }

    // Strip prefix to get: "{sanitizedPath}/{sessionId}/session-memory/summary.md"
    const remainder = filePath.slice(normalizedProjectsDir.length + 1);
    const segments = remainder.split('/');

    // Expect at least: sanitizedPath / sessionId / session-memory / summary.md
    if (segments.length < 4 || segments[segments.length - 2] !== 'session-memory') {
      throw new Error(`Invalid session memory path structure: ${filePath}`);
    }

    const sanitizedPath = segments[0];
    const sessionMemoryIdx = segments.lastIndexOf('session-memory');
    const sessionId = segments[sessionMemoryIdx - 1];

    return { sessionId, sanitizedPath };
  }

  /**
   * Convert a sanitized path back to a filesystem path.
   *
   * Claude Code sanitizes paths by replacing '/' with '-'.
   * Desanitization: remove leading '-', replace remaining '-' with '/'.
   *
   * Note: This is imperfect for paths containing hyphens (e.g., my-project),
   * but matches Claude Code's behavior.
   *
   * @param sanitized - The sanitized path (e.g., '-Users-ktseng')
   * @returns The filesystem path (e.g., '/Users/ktseng')
   */
  desanitizePath(sanitized: string): string {
    // Remove leading hyphen and replace remaining hyphens with slashes
    const withoutLeading = sanitized.startsWith('-')
      ? sanitized.slice(1)
      : sanitized;
    return '/' + withoutLeading.replace(/-/g, '/');
  }

  /**
   * Handle a file change event with debouncing.
   * Multiple rapid changes to the same file will be collapsed into a single callback.
   */
  private handleFileChange(
    filePath: string,
    changeType: 'created' | 'updated',
  ): void {
    // Track the change type (first event for this debounce window wins)
    if (!this.changeTypes.has(filePath)) {
      this.changeTypes.set(filePath, changeType);
    }

    // Clear any existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set a new debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      const resolvedChangeType = this.changeTypes.get(filePath) ?? 'updated';
      this.changeTypes.delete(filePath);
      void this.processFile(filePath, resolvedChangeType);
    }, this.config.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process a file after the debounce period.
   * Reads the file, checks for content hash dedup, and emits the event.
   */
  private async processFile(
    filePath: string,
    changeType: 'created' | 'updated',
  ): Promise<void> {
    // Guard against post-stop execution from in-flight timers
    if (this.stopped) return;

    try {
      // Read file content
      const content = await readFile(filePath, 'utf-8');

      // Compute content hash for deduplication
      const hash = createHash('sha256').update(content).digest('hex');

      // Check if content has changed since last processing
      const previousHash = this.processedHashes.get(filePath);
      if (previousHash === hash) {
        logger.debug('SessionMemoryWatcher: skipping unchanged file', {
          filePath,
        });
        return;
      }

      // Update the stored hash
      this.processedHashes.set(filePath, hash);

      // Parse file path to extract session info
      const { sessionId, sanitizedPath } = this.parseFilePath(filePath);
      const projectPath = this.desanitizePath(sanitizedPath);

      // Build the event
      const event: SessionMemoryEvent = {
        sessionId,
        projectPath,
        sanitizedPath,
        summaryPath: filePath,
        content,
        timestamp: new Date(),
        changeType,
      };

      // Invoke the callback
      await this.config.onMemoryUpdate(event);

      logger.info('SessionMemoryWatcher: processed session memory', {
        sessionId,
        changeType,
        filePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('SessionMemoryWatcher: error processing file', {
        filePath,
        error: message,
      });
    }
  }

  /**
   * Whether the watcher is currently active.
   */
  get isWatching(): boolean {
    return this.watcher !== null && !this.watcher.closed;
  }
}
