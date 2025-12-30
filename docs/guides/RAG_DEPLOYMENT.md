# RAG Agent Deployment Guide

This document explains how to deploy the Advanced RAG Agent (using Vectra local vector database).

## Table of Contents

- [System Requirements](#system-requirements)
- [Local Development Deployment](#local-development-deployment)
- [Production Environment Deployment](#production-environment-deployment)
- [Performance Tuning](#performance-tuning)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 10 GB available space
- **Node.js**: >= 18.0.0

### Recommended Configuration

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 50+ GB SSD (for vector data storage)
- **Network**: Stable network connection (OpenAI API)

### Software Dependencies

```bash
# Node.js and npm
node --version  # >= 18.0.0
npm --version   # >= 9.0.0
```

**That's it!** Vectra is a pure Node.js implementation, no Docker, Python, or other dependencies needed.

## Local Development Deployment

### 1. Environment Setup

```bash
# Clone project
cd /Users/ktseng/Developer/Projects/smart-agents

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### 2. Configure OpenAI API Key

RAG Agent uses OpenAI Embeddings API (stable and reliable)

#### Method 1: Pre-configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
# OpenAI Embeddings API
OPENAI_API_KEY=sk-xxxxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional, default value
```

**Cost Reference**:
- text-embedding-3-small: $0.02 / 1M tokens (~62,500 pages of text)
- text-embedding-3-large: $0.13 / 1M tokens (higher quality)

#### Method 2: Interactive Setup on First Use

If the API key is not pre-configured, you'll be prompted to enter it on first use:

```typescript
const rag = new RAGAgent();
await rag.initialize();

// The system will display RAG feature description and prompt for API key
```

#### Method 3: Enable in Code

```typescript
const rag = new RAGAgent();
await rag.initialize(); // RAG feature disabled

// Enable later
await rag.enableRAG('sk-xxxxx'); // Provide API key
// or
await rag.enableRAG(); // Interactive prompt
```

### 3. Run RAG Agent

```bash
# Run demo (will automatically create data/vectorstore/ directory)
npm run rag

# Or run directly
tsx src/agents/rag/demo.ts
```

Vector data will be automatically stored in the `data/vectorstore/` directory, no manual creation needed.

### 3a. Using File Drop Feature (Optional)

**File Drop Feature** allows you to easily build a knowledge base by simply dropping files into a designated folder, and RAG Agent will automatically index them.

#### 📂 File Drop Folder Location (Platform Friendly)

```bash
# macOS / Linux
~/Documents/smart-agents-knowledge/

# Windows
%USERPROFILE%\Documents\smart-agents-knowledge\
```

**Why use the Documents folder?**
- ✅ Familiar location for users (cross-platform standard)
- ✅ Easy to access and manage
- ✅ Doesn't mix with project code
- ✅ Can share knowledge base across projects

#### Start File Watcher

```bash
# Start File Watcher (automatically creates folder)
npm run rag:watch

# Example output:
📁 File Watcher Started
📂 Watching directory: /Users/your-username/Documents/smart-agents-knowledge
📄 Supported extensions: .md, .txt, .json, .pdf, .docx
⏱️  Polling interval: 5000ms (scan every 5 seconds)

💡 Tip: Drop your files into this folder and they will be automatically indexed!

📡 File Watcher is running... (Press Ctrl+C to stop)
```

#### Usage Workflow

1. **Start File Watcher**:
   ```bash
   npm run rag:watch
   ```

2. **Drop Files**:
   - Drop your documents, notes, code files into `~/Documents/smart-agents-knowledge/`
   - Supported formats: `.md`, `.txt`, `.json`, `.pdf`, `.docx`

3. **Automatic Indexing**:
   - File Watcher scans the folder every 5 seconds
   - Automatically detects and indexes new files
   - Displays indexing progress and statistics

4. **Immediately Available**:
   - All 13 agents can immediately search this knowledge
   - Uses semantic search to find the most relevant information

#### Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| Markdown | `.md` | Notes, documents |
| Text files | `.txt` | Plain text content |
| JSON | `.json` | Structured data |
| PDF | `.pdf` | PDF documents (requires additional processing)|
| Word | `.docx` | Word documents (requires additional processing)|

**Note**: PDF and .docx files require additional text extraction processing. For best results, use Markdown or plain text formats.

#### Example: Build Project Knowledge Base

```bash
# 1. Start File Watcher
npm run rag:watch

# 2. In another terminal, drop files into the folder
cp ~/Downloads/project-docs/*.md ~/Documents/smart-agents-knowledge/
cp ~/Downloads/api-specs/*.json ~/Documents/smart-agents-knowledge/

# 3. File Watcher will automatically index
# Output:
🆕 Found 5 new file(s):
   - api-v1-spec.json
   - database-schema.md
   - deployment-guide.md
   - security-guidelines.md
   - troubleshooting.md

📥 Processing batch of 5 file(s)...
   ✅ Indexed: api-v1-spec.json
   ✅ Indexed: database-schema.md
   ✅ Indexed: deployment-guide.md
   ✅ Indexed: security-guidelines.md
   ✅ Indexed: troubleshooting.md
✅ Batch processing complete

✨ Successfully indexed 5 file(s)

# 4. All agents can now search this knowledge
```

#### Advanced Configuration (Optional)

If you need to customize monitoring behavior, you can directly use the `FileWatcher` API:

```typescript
import { RAGAgent } from './agents/rag/index.js';
import { FileWatcher } from './agents/rag/FileWatcher.js';

const rag = new RAGAgent();
await rag.initialize();

const watcher = new FileWatcher(rag, {
  watchDir: '/custom/path/to/watch',           // Custom monitoring folder
  supportedExtensions: ['.md', '.txt'],        // Custom supported formats
  batchSize: 20,                               // Batch size
  pollingInterval: 10000,                      // Scan interval (milliseconds)
  onIndexed: (files) => {
    console.log(`Indexed ${files.length} files`);
  },
  onError: (error, file) => {
    console.error(`Error indexing ${file}:`, error);
  },
});

await watcher.start();
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run RAG tests
npm test -- src/agents/rag/rag.test.ts

# Generate coverage report
npm run test:coverage
```

## Production Environment Deployment

### 1. Security Configuration

#### API Key Management

```bash
# Use environment variables (don't write to .env file)
export OPENAI_API_KEY=sk-xxxxx

# Or use secrets management
# - AWS Secrets Manager
# - HashiCorp Vault
# - Kubernetes Secrets
```

#### File System Permissions

```bash
# Ensure application has permission to write to data directory
mkdir -p data/vectorstore
chmod 750 data/vectorstore

# Set appropriate owner
chown -R app_user:app_group data/
```

### 2. Data Persistence

#### Backup Strategy

```bash
# Regular backup of vector data (simple tar is sufficient)
tar -czf backups/vectorstore-$(date +%Y%m%d).tar.gz data/vectorstore/

# Restore data
tar -xzf backups/vectorstore-YYYYMMDD.tar.gz
```

#### Version Control

```bash
# .gitignore should include (already configured)
data/vectorstore/
```

### 3. Process Manager Configuration

#### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "rag-agent" -- run rag

# Save configuration
pm2 save

# Setup startup on boot
pm2 startup
```

#### PM2 Ecosystem Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rag-agent',
    script: 'npm',
    args: 'run rag',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    }
  }]
};
```

### 4. Monitoring Setup

#### Health Check

```typescript
// health-check.ts
import { RAGAgent } from './agents/rag/index.js';

async function healthCheck() {
  const rag = new RAGAgent();
  await rag.initialize();

  const stats = await rag.getStats();
  const isHealthy = stats.totalDocuments >= 0; // Basic check

  await rag.close();
  return isHealthy;
}

healthCheck()
  .then(healthy => process.exit(healthy ? 0 : 1))
  .catch(() => process.exit(1));
```

```bash
# Cron health check (hourly)
0 * * * * cd /path/to/smart-agents && tsx health-check.ts || alert
```

#### Log Management

```bash
# Application logs
tail -f logs/rag-agent.log

# Error logs
grep "ERROR" logs/rag-agent.log | tail -20

# Log rotation (using logrotate)
cat > /etc/logrotate.d/rag-agent <<EOF
/path/to/smart-agents/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
}
EOF
```

## Performance Tuning

### 1. Embedding Batch Processing

```typescript
// ✅ Recommended: Large batches
await rag.indexDocuments(docs, {
  batchSize: 100,
  maxConcurrent: 5,
});

// ❌ Avoid: Small batches
await rag.indexDocuments(docs, {
  batchSize: 10,
  maxConcurrent: 1,
});
```

### 2. File System Optimization

```bash
# Use SSD for vector data storage
# Ensure data/vectorstore/ is on fast storage device

# Check disk I/O performance
sudo iotop

# Optimize file system (ext4)
sudo tune2fs -O dir_index /dev/sdX
```

### 3. Caching Strategy

```typescript
// Enable reranker cache
const results = await rag.searchWithRerank(query, {
  rerankAlgorithm: 'reciprocal-rank',
  useCache: true,  // Enabled by default
});
```

### 4. Cost Optimization

```typescript
// Use small model (suitable for most scenarios)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  // $0.02/1M tokens

// Only use large model when high precision is needed
OPENAI_EMBEDDING_MODEL=text-embedding-3-large  // $0.13/1M tokens
```

### 5. Memory Management

```typescript
// For large document sets, use streaming
async function indexLargeDataset(docs: DocumentInput[]) {
  const chunkSize = 1000;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    await rag.indexDocuments(chunk, {
      batchSize: 100,
      maxConcurrent: 5,
    });

    console.log(`Indexed ${i + chunk.length}/${docs.length} documents`);

    // Release memory
    if (global.gc) global.gc();
  }
}
```

## Monitoring and Maintenance

### 1. Cost Monitoring

```typescript
// Regular cost checking
const stats = await rag.getStats();
console.log(`Current cost: $${stats.embeddingStats.totalCost.toFixed(4)}`);

// Setup cost alerts
const MONTHLY_BUDGET_USD = 50;
if (stats.embeddingStats.totalCost > MONTHLY_BUDGET_USD * 0.8) {
  console.warn('⚠️ 80% of monthly budget reached!');
  // Send alert (email, Slack, etc.)
}
```

### 2. Performance Monitoring

```typescript
// Track search latency
const startTime = Date.now();
const results = await rag.search(query);
const latency = Date.now() - startTime;

console.log(`Search latency: ${latency}ms`);

// Log to monitoring system (Prometheus, DataDog, etc.)
```

### 3. Regular Maintenance

```bash
# Weekly backup
0 0 * * 0 /path/to/backup-vectorstore.sh

# Monthly cleanup of old data (if needed)
0 0 1 * * /path/to/cleanup-old-data.sh

# Daily health check
0 */6 * * * tsx /path/to/health-check.ts || alert
```

### 4. Data Integrity Check

```typescript
// Regularly check vector data integrity
import { LocalIndex } from 'vectra';

async function checkIntegrity() {
  const index = new LocalIndex('data/vectorstore');

  if (!(await index.isIndexCreated())) {
    console.error('❌ Index not found!');
    return false;
  }

  console.log('✅ Index integrity OK');
  return true;
}
```

## Troubleshooting

### Issue 1: Vector Database Initialization Failed

**Symptoms**: `VectorStore initialization failed`

**Solutions**:

```bash
# 1. Check directory permissions
ls -la data/vectorstore/

# 2. Ensure directory exists and is writable
mkdir -p data/vectorstore
chmod 750 data/vectorstore

# 3. Check disk space
df -h

# 4. If data is corrupted, delete and rebuild
rm -rf data/vectorstore/
# Rerun application, it will automatically create new index
```

### Issue 2: Embedding API Rate Limit

**Symptoms**: `Rate limit exceeded`

**Solutions**:

```typescript
// Reduce concurrent requests
await rag.indexDocuments(docs, {
  batchSize: 50,     // Reduced from 100 to 50
  maxConcurrent: 2,  // Reduced from 5 to 2
});

// Add retry logic
async function indexWithRetry(docs, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await rag.indexDocuments(docs);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(2000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### Issue 3: Out of Memory

**Symptoms**: `JavaScript heap out of memory`

**Solutions**:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run rag
```

```typescript
// Reduce batch size
await rag.indexDocuments(docs, {
  batchSize: 20,  // Reduce memory usage
});

// Use streaming for large document sets
// See "Performance Tuning -> Memory Management" section
```

### Issue 4: Inaccurate Search Results

**Symptoms**: Poor search result relevance

**Solutions**:

```typescript
// 1. Use hybrid search
const results = await rag.hybridSearch(query, {
  semanticWeight: 0.7,
  keywordWeight: 0.3,
});

// 2. Adjust topK and reranking
const results = await rag.searchWithRerank(query, {
  topK: 20,  // Get more results first
  rerankAlgorithm: 'reciprocal-rank',
});

// 3. Upgrade to large model
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

### Issue 5: Insufficient Disk Space

**Symptoms**: `ENOSPC: no space left on device`

**Solutions**:

```bash
# Check disk usage
du -sh data/vectorstore/

# Clean old vector data (caution!)
await rag.clearAll();

# Or delete specific documents
const oldDocIds = [...];  // Get old document IDs
await rag.deleteDocuments(oldDocIds);

# Compress data directory (backup)
tar -czf vectorstore-backup.tar.gz data/vectorstore/
```

### Issue 6: File Permission Error

**Symptoms**: `EACCES: permission denied`

**Solutions**:

```bash
# Fix owner
chown -R $USER:$USER data/vectorstore/

# Fix permissions
chmod -R 750 data/vectorstore/
```

## Deployment Checklist

Complete RAG Agent deployment workflow:

- [ ] ✅ Environment preparation (Node.js >= 18)
- [ ] ✅ Install dependencies (`npm install`)
- [ ] ✅ Configure OpenAI API Key
- [ ] ✅ Set data directory permissions
- [ ] ✅ Run test verification (`npm test`)
- [ ] ✅ Configure Process Manager (PM2)
- [ ] ✅ Setup backup scripts
- [ ] ✅ Configure monitoring and alerts
- [ ] ✅ Setup log rotation
- [ ] ✅ Execute health checks

## Technical Architecture

### Vectra Vector Database

Smart-Agents RAG uses Vectra as the vector database:

| Feature | Description |
|---------|-------------|
| **Deployment** | Zero configuration, just npm install |
| **Dependencies** | Pure Node.js, zero additional dependencies |
| **Data Storage** | Local files (data/vectorstore/) |
| **Backup** | Simple tar compression |
| **Performance** | < 100ms (local file access) |
| **Maintenance** | Zero maintenance cost |
| **Infrastructure Cost** | $0 |

**Why choose Vectra**: Simple, fast, zero maintenance cost.

### OpenAI Embeddings API

Advantages of using OpenAI Embeddings API:

- ✅ **Stable and Reliable** - Officially maintained API, high stability
- ✅ **Simple Integration** - Official SDK with complete support
- ✅ **High Quality** - text-embedding-3-small/large models excellent quality
- ✅ **Cost-Effective** - $0.02 / 1M tokens, approximately 62,500 pages of text
- ✅ **No Maintenance** - Cloud service, no self-deployment needed

## Production Environment Recommendations

### Small Deployment (< 100K documents)
- Use single-machine Vectra deployment
- PM2 process management
- Regular backups to S3/NAS

### Medium Deployment (100K - 1M documents)
- Use SSD storage
- Increase Node.js memory limits
- Implement sharding strategy (multiple Vectra indexes)

### Large Deployment (> 1M documents)
- Consider distributed vector databases (Qdrant, Weaviate)
- Implement caching layer (Redis)
- Use CDN for query acceleration

## Summary

Vectra deployment advantages:

✅ **Zero Configuration** - npm install and you're ready
✅ **Zero Maintenance** - No Docker container management
✅ **Fast** - Local file access, < 100ms latency
✅ **Simple Backup** - tar compression is all you need
✅ **Low Cost** - No additional infrastructure costs

If you have questions, refer to the [Troubleshooting](#troubleshooting) section or submit an Issue.
