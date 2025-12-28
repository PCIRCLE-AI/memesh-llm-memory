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

async function main() {
  console.log('🚀 Starting RAG File Watcher...\n');

  // Initialize RAG Agent
  const rag = new RAGAgent();

  try {
    await rag.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize RAG Agent:', error);
    process.exit(1);
  }

  // Check if RAG is enabled
  if (!rag.isRAGEnabled()) {
    console.log('⚠️  RAG features are not enabled.\n');
    console.log('Would you like to enable RAG features now?');

    try {
      const enabled = await rag.enableRAG(); // Interactive prompt

      if (!enabled) {
        console.log('\n❌ RAG features must be enabled to use File Watcher.');
        console.log('Please provide OpenAI API key and try again.\n');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to enable RAG:', error);
      process.exit(1);
    }
  }

  // Create File Watcher
  const watcher = new FileWatcher(rag, {
    onIndexed: (files) => {
      console.log(`\n✨ Successfully indexed ${files.length} file(s)`);
    },
    onError: (error, file) => {
      console.error(`\n❌ Error indexing ${file || 'unknown file'}:`, error.message);
    },
  });

  // Display watch directory
  console.log(`\n📍 Watch Directory Location:`);
  console.log(`   ${watcher.getWatchDir()}\n`);
  console.log(`💡 Tip: Drop your files (.md, .txt, .json, .pdf, .docx) into this folder`);
  console.log(`        and they will be automatically indexed!\n`);

  // Start watching
  await watcher.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    watcher.stop();
    rag.close().then(() => {
      console.log('✅ RAG Agent closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down...');
    watcher.stop();
    rag.close().then(() => {
      console.log('✅ RAG Agent closed');
      process.exit(0);
    });
  });

  console.log('📡 File Watcher is running... (Press Ctrl+C to stop)\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
