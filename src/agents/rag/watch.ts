/**
 * RAG File Watcher - Startup Script
 *
 * Automatically indexes files dropped into the watch folder.
 *
 * Usage:
 *   npm run rag:watch
 *   tsx src/agents/rag/watch.ts
 */

import { RAGAgent } from './index.js';
import { FileWatcher } from './FileWatcher.js';
import { logger } from '../../utils/logger.js';

async function main() {
  logger.info('🚀 Starting RAG File Watcher...\n');

  // Initialize RAG Agent
  const rag = new RAGAgent();

  try {
    await rag.initialize();
  } catch (error) {
    logger.error('❌ Failed to initialize RAG Agent:', error);
    process.exit(1);
  }

  // Check if RAG is enabled
  if (!rag.isRAGEnabled()) {
    logger.info('⚠️  RAG features are not enabled.\n');
    logger.info('Would you like to enable RAG features now?');

    try {
      const enabled = await rag.enableRAG(); // Interactive prompt

      if (!enabled) {
        logger.info('\n❌ RAG features must be enabled to use File Watcher.');
        logger.info('Please provide OpenAI API key and try again.\n');
        process.exit(1);
      }
    } catch (error) {
      logger.error('❌ Failed to enable RAG:', error);
      process.exit(1);
    }
  }

  // Create File Watcher
  const watcher = new FileWatcher(rag, {
    onIndexed: (files) => {
      logger.info(`\n✨ Successfully indexed ${files.length} file(s)`);
    },
    onError: (error, file) => {
      logger.error(`\n❌ Error indexing ${file || 'unknown file'}:`, error.message);
    },
  });

  // Display watch directory
  logger.info(`\n📍 Watch Directory Location:`);
  logger.info(`   ${watcher.getWatchDir()}\n`);
  logger.info(`💡 Tip: Drop your files (.md, .txt, .json, .pdf, .docx) into this folder`);
  logger.info(`        and they will be automatically indexed!\n`);

  // Start watching
  await watcher.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('\n\n🛑 Shutting down...');
    watcher.stop();
    rag.close().then(() => {
      logger.info('✅ RAG Agent closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    logger.info('\n\n🛑 Shutting down...');
    watcher.stop();
    rag.close().then(() => {
      logger.info('✅ RAG Agent closed');
      process.exit(0);
    });
  });

  logger.info('📡 File Watcher is running... (Press Ctrl+C to stop)\n');
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
