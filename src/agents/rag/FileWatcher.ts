/**
 * File Watcher for RAG Agent
 *
 * Monitors a designated folder for new files and automatically indexes them.
 * Uses platform-specific user-friendly locations like ~/Documents/claude-code-buddy-knowledge/
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { RAGAgent } from './index.js';
import { logger } from '../../utils/logger.js';

export interface FileWatcherOptions {
  /**
   * Custom watch directory (optional)
   * If not specified, uses platform-specific default
   */
  watchDir?: string;

  /**
   * Supported file extensions
   * @default ['.md', '.txt', '.json', '.pdf', '.docx']
   */
  supportedExtensions?: string[];

  /**
   * Batch size for processing multiple files
   * @default 10
   */
  batchSize?: number;

  /**
   * Interval for polling (in milliseconds)
   * @default 5000 (5 seconds)
   */
  pollingInterval?: number;

  /**
   * Callback when files are indexed
   */
  onIndexed?: (files: string[]) => void;

  /**
   * Callback when errors occur
   */
  onError?: (error: Error, file?: string) => void;
}

export class FileWatcher {
  private watchDir: string;
  private supportedExtensions: string[];
  private batchSize: number;
  private pollingInterval: number;
  private onIndexed?: (files: string[]) => void;
  private onError?: (error: Error, file?: string) => void;
  private isWatching = false;
  private intervalId?: NodeJS.Timeout;
  private processedFiles = new Set<string>();
  private ragAgent: RAGAgent;

  constructor(ragAgent: RAGAgent, options: FileWatcherOptions = {}) {
    this.ragAgent = ragAgent;
    this.watchDir = options.watchDir || this.getDefaultWatchDir();
    this.supportedExtensions = options.supportedExtensions || ['.md', '.txt', '.json', '.pdf', '.docx'];
    this.batchSize = options.batchSize || 10;
    this.pollingInterval = options.pollingInterval || 5000;
    this.onIndexed = options.onIndexed;
    this.onError = options.onError;
  }

  /**
   * Get platform-specific default watch directory
   *
   * @returns Path like:
   * - macOS/Linux: ~/Documents/claude-code-buddy-knowledge/
   * - Windows: %USERPROFILE%\Documents\claude-code-buddy-knowledge\
   */
  private getDefaultWatchDir(): string {
    const homeDir = os.homedir();
    const platform = os.platform();

    let docsDir: string;

    if (platform === 'win32') {
      // Windows
      docsDir = path.join(homeDir, 'Documents', 'claude-code-buddy-knowledge');
    } else {
      // macOS, Linux, Unix
      docsDir = path.join(homeDir, 'Documents', 'claude-code-buddy-knowledge');
    }

    return docsDir;
  }

  /**
   * Get the watch directory path
   */
  getWatchDir(): string {
    return this.watchDir;
  }

  /**
   * Sanitize and validate file path to prevent path traversal attacks
   * @param filename - Filename to validate
   * @returns Sanitized absolute path
   * @throws Error if path escapes watch directory
   */
  private sanitizeFilePath(filename: string): string {
    // Remove any path separators at the start (security)
    const cleanFilename = filename.replace(/^[/\\]+/, '');

    // Resolve the full path
    const fullPath = path.resolve(this.watchDir, cleanFilename);
    const normalizedWatchDir = path.resolve(this.watchDir);

    // Security: Ensure the resolved path is within watchDir
    if (!fullPath.startsWith(normalizedWatchDir + path.sep) && fullPath !== normalizedWatchDir) {
      throw new Error(`Path traversal detected: ${filename} escapes watch directory`);
    }

    return fullPath;
  }

  /**
   * Start watching for new files
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      logger.warn('⚠️  File watcher is already running');
      return;
    }

    // Ensure watch directory exists
    await this.ensureWatchDirExists();

    // Load already processed files
    await this.loadProcessedFiles();

    logger.info(`\n📁 File Watcher Started`);
    logger.info(`📂 Watching directory: ${this.watchDir}`);
    logger.info(`📄 Supported extensions: ${this.supportedExtensions.join(', ')}`);
    logger.info(`⏱️  Polling interval: ${this.pollingInterval}ms\n`);

    this.isWatching = true;

    // Start polling
    this.intervalId = setInterval(() => {
      this.scanAndProcess().catch((error) => {
        logger.error('Error in file watcher:', error);
        if (this.onError) {
          this.onError(error);
        }
      });
    }, this.pollingInterval);

    // Immediate scan
    await this.scanAndProcess();
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (!this.isWatching) {
      logger.warn('⚠️  File watcher is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isWatching = false;
    logger.info('\n🛑 File Watcher Stopped\n');
  }

  /**
   * Ensure watch directory exists
   */
  private async ensureWatchDirExists(): Promise<void> {
    try {
      await fs.access(this.watchDir);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(this.watchDir, { recursive: true });
      logger.info(`✅ Created watch directory: ${this.watchDir}`);
    }
  }

  /**
   * Load list of already processed files
   */
  private async loadProcessedFiles(): Promise<void> {
    // Security: Use sanitized path even for known filenames (defense in depth)
    const stateFile = this.sanitizeFilePath('.processed_files.json');

    try {
      const data = await fs.readFile(stateFile, 'utf-8');
      const processed = JSON.parse(data) as string[];
      this.processedFiles = new Set(processed);
      logger.info(`📋 Loaded ${this.processedFiles.size} processed files from state`);
    } catch {
      // State file doesn't exist or is invalid, start fresh
      this.processedFiles = new Set();
    }
  }

  /**
   * Save list of processed files
   */
  private async saveProcessedFiles(): Promise<void> {
    // Security: Use sanitized path even for known filenames (defense in depth)
    const stateFile = this.sanitizeFilePath('.processed_files.json');
    const processed = Array.from(this.processedFiles);

    try {
      await fs.writeFile(stateFile, JSON.stringify(processed, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save processed files state:', error);
    }
  }

  /**
   * Scan directory for new files and process them
   */
  private async scanAndProcess(): Promise<void> {
    try {
      const files = await fs.readdir(this.watchDir);

      // Filter new files with supported extensions
      const newFiles: string[] = [];

      for (const file of files) {
        // Skip state file
        if (file === '.processed_files.json') {
          continue;
        }

        // Security: Validate file path to prevent path traversal
        try {
          const filePath = this.sanitizeFilePath(file);
          const ext = path.extname(file).toLowerCase();

          if (this.supportedExtensions.includes(ext) && !this.processedFiles.has(file)) {
            newFiles.push(file);
          }
        } catch (error) {
          logger.error(`⚠️  Skipping suspicious file: ${file}`, error);
          if (this.onError) {
            this.onError(error as Error, file);
          }
        }
      }

      if (newFiles.length === 0) {
        return; // No new files
      }

      logger.info(`\n🆕 Found ${newFiles.length} new file(s):`);
      newFiles.forEach((file) => logger.info(`   - ${file}`));

      // Process in batches
      for (let i = 0; i < newFiles.length; i += this.batchSize) {
        const batch = newFiles.slice(i, i + this.batchSize);
        await this.processBatch(batch);
      }

      // Save state
      await this.saveProcessedFiles();

      // Callback
      if (this.onIndexed) {
        this.onIndexed(newFiles);
      }

    } catch (error) {
      logger.error('Error scanning directory:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
    }
  }

  /**
   * Process a batch of files
   */
  private async processBatch(files: string[]): Promise<void> {
    logger.info(`\n📥 Processing batch of ${files.length} file(s)...`);

    for (const file of files) {
      try {
        // Security: Validate file path to prevent path traversal
        const filePath = this.sanitizeFilePath(file);

        // Read file content
        const content = await fs.readFile(filePath, 'utf-8');

        // Get file stats for metadata
        const stats = await fs.stat(filePath);

        // Index document
        await this.ragAgent.indexDocument(content, {
          source: file,
          language: 'auto', // Auto-detect or user-specified
          category: 'file-drop',
          tags: [path.extname(file).substring(1)], // Extension without dot
          updatedAt: stats.mtime.toISOString(),
        });

        logger.info(`   ✅ Indexed: ${file}`);

        // Mark as processed
        this.processedFiles.add(file);

      } catch (error) {
        logger.error(`   ❌ Failed to index ${file}:`, error);

        if (this.onError) {
          this.onError(error as Error, file);
        }
      }
    }

    logger.info(`✅ Batch processing complete\n`);
  }

  /**
   * Clear all processed files state
   */
  async clearState(): Promise<void> {
    this.processedFiles.clear();
    await this.saveProcessedFiles();
    logger.info('✅ Cleared processed files state');
  }
}
