import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../../utils/logger.js';
export class FileWatcher {
    watchDir;
    supportedExtensions;
    batchSize;
    pollingInterval;
    onIndexed;
    onError;
    isWatching = false;
    intervalId;
    processedFiles = new Set();
    ragAgent;
    constructor(ragAgent, options = {}) {
        this.ragAgent = ragAgent;
        this.watchDir = options.watchDir || this.getDefaultWatchDir();
        this.supportedExtensions = options.supportedExtensions || ['.md', '.txt', '.json', '.pdf', '.docx'];
        this.batchSize = options.batchSize || 10;
        this.pollingInterval = options.pollingInterval || 5000;
        this.onIndexed = options.onIndexed;
        this.onError = options.onError;
    }
    getDefaultWatchDir() {
        const homeDir = os.homedir();
        const platform = os.platform();
        let docsDir;
        if (platform === 'win32') {
            docsDir = path.join(homeDir, 'Documents', 'claude-code-buddy-knowledge');
        }
        else {
            docsDir = path.join(homeDir, 'Documents', 'claude-code-buddy-knowledge');
        }
        return docsDir;
    }
    getWatchDir() {
        return this.watchDir;
    }
    sanitizeFilePath(filename) {
        const cleanFilename = filename.replace(/^[/\\]+/, '');
        const fullPath = path.resolve(this.watchDir, cleanFilename);
        const normalizedWatchDir = path.resolve(this.watchDir);
        if (!fullPath.startsWith(normalizedWatchDir + path.sep) && fullPath !== normalizedWatchDir) {
            throw new Error(`Path traversal detected: ${filename} escapes watch directory`);
        }
        return fullPath;
    }
    async start() {
        if (this.isWatching) {
            logger.warn('⚠️  File watcher is already running');
            return;
        }
        await this.ensureWatchDirExists();
        await this.loadProcessedFiles();
        logger.info(`\n📁 File Watcher Started`);
        logger.info(`📂 Watching directory: ${this.watchDir}`);
        logger.info(`📄 Supported extensions: ${this.supportedExtensions.join(', ')}`);
        logger.info(`⏱️  Polling interval: ${this.pollingInterval}ms\n`);
        this.isWatching = true;
        this.intervalId = setInterval(() => {
            this.scanAndProcess().catch((error) => {
                logger.error('Error in file watcher:', error);
                if (this.onError) {
                    this.onError(error);
                }
            });
        }, this.pollingInterval);
        await this.scanAndProcess();
    }
    stop() {
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
    async ensureWatchDirExists() {
        try {
            await fs.access(this.watchDir);
        }
        catch {
            await fs.mkdir(this.watchDir, { recursive: true });
            logger.info(`✅ Created watch directory: ${this.watchDir}`);
        }
    }
    async loadProcessedFiles() {
        const stateFile = this.sanitizeFilePath('.processed_files.json');
        try {
            const data = await fs.readFile(stateFile, 'utf-8');
            const processed = JSON.parse(data);
            this.processedFiles = new Set(processed);
            logger.info(`📋 Loaded ${this.processedFiles.size} processed files from state`);
        }
        catch {
            this.processedFiles = new Set();
        }
    }
    async saveProcessedFiles() {
        const stateFile = this.sanitizeFilePath('.processed_files.json');
        const processed = Array.from(this.processedFiles);
        try {
            await fs.writeFile(stateFile, JSON.stringify(processed, null, 2), 'utf-8');
        }
        catch (error) {
            logger.error('Failed to save processed files state:', error);
        }
    }
    async scanAndProcess() {
        try {
            const files = await fs.readdir(this.watchDir);
            const newFiles = [];
            for (const file of files) {
                if (file === '.processed_files.json') {
                    continue;
                }
                try {
                    const filePath = this.sanitizeFilePath(file);
                    const ext = path.extname(file).toLowerCase();
                    if (this.supportedExtensions.includes(ext) && !this.processedFiles.has(file)) {
                        newFiles.push(file);
                    }
                }
                catch (error) {
                    logger.error(`⚠️  Skipping suspicious file: ${file}`, error);
                    if (this.onError) {
                        this.onError(error, file);
                    }
                }
            }
            if (newFiles.length === 0) {
                return;
            }
            logger.info(`\n🆕 Found ${newFiles.length} new file(s):`);
            newFiles.forEach((file) => logger.info(`   - ${file}`));
            for (let i = 0; i < newFiles.length; i += this.batchSize) {
                const batch = newFiles.slice(i, i + this.batchSize);
                await this.processBatch(batch);
            }
            await this.saveProcessedFiles();
            if (this.onIndexed) {
                this.onIndexed(newFiles);
            }
        }
        catch (error) {
            logger.error('Error scanning directory:', error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }
    async processBatch(files) {
        logger.info(`\n📥 Processing batch of ${files.length} file(s)...`);
        for (const file of files) {
            try {
                const filePath = this.sanitizeFilePath(file);
                const content = await fs.readFile(filePath, 'utf-8');
                const stats = await fs.stat(filePath);
                await this.ragAgent.indexDocument(content, {
                    source: file,
                    language: 'auto',
                    category: 'file-drop',
                    tags: [path.extname(file).substring(1)],
                    updatedAt: stats.mtime.toISOString(),
                });
                logger.info(`   ✅ Indexed: ${file}`);
                this.processedFiles.add(file);
            }
            catch (error) {
                logger.error(`   ❌ Failed to index ${file}:`, error);
                if (this.onError) {
                    this.onError(error, file);
                }
            }
        }
        logger.info(`✅ Batch processing complete\n`);
    }
    async clearState() {
        this.processedFiles.clear();
        await this.saveProcessedFiles();
        logger.info('✅ Cleared processed files state');
    }
}
//# sourceMappingURL=FileWatcher.js.map