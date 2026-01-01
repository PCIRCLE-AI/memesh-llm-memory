# Database Backup System

Automated and manual backup solution for SQLite databases in Claude Code Buddy.

## Overview

The backup system provides comprehensive protection for your database files with features including:

- **Automatic daily backups** with configurable scheduling
- **Manual backup triggers** via MCP tools
- **Compression** using gzip for space efficiency
- **Integrity verification** ensuring backup reliability
- **Retention policies** (7 daily + 4 weekly + 12 monthly backups by default)
- **Safe restoration** with automatic pre-restore backups

## Supported Databases

The backup system supports all SQLite databases used by Claude Code Buddy:

- `knowledge-graph.db` - Knowledge Graph entities and relations
- `evolution.db` - Agent evolution and learning data
- `collaboration.db` - Multi-agent collaboration state
- Any custom SQLite databases

## Quick Start

### Creating a Manual Backup

```typescript
// Via MCP tool (recommended)
{
  "name": "create_database_backup",
  "arguments": {
    "dbPath": "knowledge-graph.db",  // or "evolution.db", etc.
    "compress": true,
    "verify": true
  }
}
```

```typescript
// Via BackupManager API
import { BackupManager } from './db/BackupManager.js';

const manager = new BackupManager();
const backup = await manager.createBackup('data/knowledge-graph.db');

console.log(`Backup created: ${backup.path}`);
console.log(`Size: ${backup.size} bytes`);
console.log(`Verified: ${backup.verified}`);
```

### Listing Available Backups

```typescript
// Via MCP tool
{
  "name": "list_database_backups",
  "arguments": {
    "dbPath": "knowledge-graph.db"
  }
}
```

```typescript
// Via BackupManager API
const backups = await manager.listBackups('data/knowledge-graph.db');

backups.forEach(backup => {
  console.log(`${backup.timestamp}: ${backup.path} (${backup.size} bytes)`);
});
```

### Restoring from Backup

```typescript
// Via MCP tool
{
  "name": "restore_database_backup",
  "arguments": {
    "backupPath": "data/backups/2025-01-01/knowledge-graph_12-00-00.db.gz",
    "verify": true
  }
}
```

```typescript
// Via BackupManager API
await manager.restoreBackup(
  'data/backups/2025-01-01/knowledge-graph_12-00-00.db.gz',
  'data/knowledge-graph.db'
);
```

⚠️ **Important**: The system automatically creates a backup of the current database before restoring, saved as `database.db.before-restore-TIMESTAMP`.

## Architecture

### Directory Structure

```
data/
├── knowledge-graph.db          # Active databases
├── evolution.db
├── collaboration.db
└── backups/                    # Backup storage
    ├── 2025-01-01/            # Date-based directories
    │   ├── knowledge-graph_08-00-00.db.gz
    │   ├── knowledge-graph_16-30-15.db.gz
    │   └── evolution_08-00-00.db.gz
    ├── 2025-01-02/
    │   └── knowledge-graph_08-00-00.db.gz
    └── 2024-12-25/            # Older backups (subject to retention policy)
        └── knowledge-graph_08-00-00.db.gz
```

### Backup Filename Format

```
{prefix}{database-name}_{timestamp}.db[.gz]

Examples:
- knowledge-graph_12-30-45.db.gz
- manual_evolution_08-00-00.db.gz
- knowledge-graph_16-45-30.db (uncompressed)
```

### Components

#### 1. BackupManager (`src/db/BackupManager.ts`)

Core backup engine providing:

- **Backup Creation**: Uses `VACUUM INTO` for consistent snapshots
- **Compression**: gzip level 9 for maximum space savings
- **Verification**: SHA-256 checksums + SQLite integrity checks
- **Restoration**: Safe restore with pre-restore backups
- **Retention**: Intelligent cleanup based on age and frequency

#### 2. MCP Tools (`src/mcp/tools/database-backup.ts`)

User-facing tools for backup operations:

- `create_database_backup` - Manual backup trigger
- `list_database_backups` - View available backups
- `restore_database_backup` - Restore from backup
- `clean_database_backups` - Apply retention policy
- `get_backup_stats` - View backup statistics

## Features in Detail

### 1. Backup Creation

**Process**:
1. Validate source database exists
2. Create date-based backup directory (`YYYY-MM-DD/`)
3. Use SQLite `VACUUM INTO` for consistent snapshot
4. Compress with gzip (optional, default: enabled)
5. Calculate SHA-256 checksum
6. Verify backup integrity (optional, default: enabled)

**Options**:
```typescript
interface BackupOptions {
  compress?: boolean;      // Default: true
  verify?: boolean;        // Default: true
  backupDir?: string;      // Default: data/backups
  prefix?: string;         // Optional filename prefix
}
```

**Example**:
```typescript
const backup = await manager.createBackup('data/knowledge-graph.db', {
  compress: true,
  verify: true,
  prefix: 'manual_'
});
```

### 2. Compression

**Benefits**:
- ~70-90% size reduction for typical SQLite databases
- Faster network transfers for remote backups
- Lower storage costs

**Trade-offs**:
- Slightly slower backup creation (~10-20%)
- Requires decompression for restoration

**When to disable**:
- Very small databases (< 1MB)
- Extremely fast local storage
- Real-time backup requirements

### 3. Verification

**Integrity Checks**:
1. **File-level**: Verify gzip can decompress
2. **Database-level**: SQLite `PRAGMA integrity_check`
3. **Data-level**: Verify tables can be read
4. **Checksum**: SHA-256 hash validation

**When verification fails**:
- Backup creation is aborted
- Original database remains untouched
- Error is logged with details

### 4. Retention Policies

**Default Policy**:
- Keep **7 daily** backups (last 7 days)
- Keep **4 weekly** backups (one per week for 4 weeks)
- Keep **12 monthly** backups (one per month for 12 months)

**How it works**:
1. Daily backups: Keep all backups from last N days
2. Weekly backups: Keep newest backup per week
3. Monthly backups: Keep newest backup per month
4. Delete all other backups

**Custom retention**:
```typescript
await manager.cleanOldBackups('data/knowledge-graph.db', {
  dailyBackups: 14,      // Keep last 14 days
  weeklyBackups: 8,      // Keep 8 weeks
  monthlyBackups: 24     // Keep 2 years
});
```

**Example retention timeline**:
```
Today (Jan 1, 2025):
  ✅ Keep: Daily backups from Dec 25-Jan 1 (7 days)
  ✅ Keep: Weekly backups from Nov-Dec (4 weeks)
  ✅ Keep: Monthly backups from Jan 2024-Dec 2024 (12 months)
  ❌ Delete: Everything older than 12 months
```

### 5. Safe Restoration

**Pre-restore safety**:
1. Verify backup integrity
2. Backup current database (`.before-restore-TIMESTAMP`)
3. Restore from backup
4. Verify restored database
5. Success or rollback

**Recovery from failed restore**:
```bash
# If restore fails, your current database is safe
# Manually restore from pre-restore backup if needed
cp data/knowledge-graph.db.before-restore-2025-01-01T12-30-45 data/knowledge-graph.db
```

## MCP Tool Reference

### create_database_backup

Create a manual backup of a database.

**Input**:
```typescript
{
  dbPath?: string;        // Default: "knowledge-graph.db"
  compress?: boolean;     // Default: true
  verify?: boolean;       // Default: true
  prefix?: string;        // Optional filename prefix
}
```

**Output**:
```typescript
{
  success: true,
  backup: {
    path: "data/backups/2025-01-01/knowledge-graph_12-30-45.db.gz",
    size: "1.23 MB",
    compressed: true,
    verified: true,
    checksum: "a3f5...",
    timestamp: "01/01/2025, 12:30:45"
  },
  database: "data/knowledge-graph.db"
}
```

### list_database_backups

List all available backups for a database.

**Input**:
```typescript
{
  dbPath?: string;        // Default: "knowledge-graph.db"
}
```

**Output**:
```typescript
{
  database: "data/knowledge-graph.db",
  totalBackups: 15,
  totalSize: "18.45 MB",
  oldestBackup: "12/15/2024, 08:00:00",
  newestBackup: "01/01/2025, 12:30:45",
  backups: [
    {
      path: "data/backups/2025-01-01/knowledge-graph_12-30-45.db.gz",
      size: "1.23 MB",
      compressed: true,
      timestamp: "01/01/2025, 12:30:45"
    },
    // ... more backups
  ]
}
```

### restore_database_backup

Restore database from a backup.

**Input**:
```typescript
{
  backupPath: string;     // Required: Path to backup file
  targetPath?: string;    // Optional: Target database path
  verify?: boolean;       // Default: true
}
```

**Output**:
```typescript
{
  success: true,
  restoredFrom: "data/backups/2025-01-01/knowledge-graph_12-30-45.db.gz",
  restoredTo: "data/knowledge-graph.db",
  verified: true
}
```

### clean_database_backups

Clean old backups based on retention policy.

**Input**:
```typescript
{
  dbPath?: string;          // Default: "knowledge-graph.db"
  dailyBackups?: number;    // Default: 7
  weeklyBackups?: number;   // Default: 4
  monthlyBackups?: number;  // Default: 12
}
```

**Output**:
```typescript
{
  success: true,
  database: "data/knowledge-graph.db",
  deletedBackups: 8,
  retentionPolicy: {
    dailyBackups: 7,
    weeklyBackups: 4,
    monthlyBackups: 12
  }
}
```

### get_backup_stats

Get backup statistics for a database.

**Input**:
```typescript
{
  dbPath?: string;        // Default: "knowledge-graph.db"
}
```

**Output**:
```typescript
{
  database: "data/knowledge-graph.db",
  totalBackups: 15,
  totalSize: "18.45 MB",
  averageSize: "1.23 MB",
  oldestBackup: "12/15/2024, 08:00:00",
  newestBackup: "01/01/2025, 12:30:45"
}
```

## Automatic Backup Scheduling

### Using Cron (Linux/macOS)

Create a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/claude-code-buddy && npm run backup:daily
```

### Using Node.js Scheduler

```typescript
import { BackupManager } from './db/BackupManager.js';
import { CronJob } from 'cron';

const manager = new BackupManager();

// Daily backup at 2 AM
const dailyBackup = new CronJob('0 2 * * *', async () => {
  console.log('Running daily backup...');

  try {
    await manager.createBackup('data/knowledge-graph.db');
    await manager.createBackup('data/evolution.db');

    // Clean old backups
    await manager.cleanOldBackups('data/knowledge-graph.db');
    await manager.cleanOldBackups('data/evolution.db');

    console.log('Daily backup completed');
  } catch (error) {
    console.error('Backup failed:', error);
  }
});

dailyBackup.start();
```

## Best Practices

### 1. Regular Backups

- **Daily**: Automated backups at low-traffic hours (e.g., 2 AM)
- **Before Updates**: Manual backup before major version updates
- **Before Migrations**: Manual backup before schema changes

### 2. Verification

- Always verify backups after creation (enabled by default)
- Periodically test restoration from backups
- Monitor backup logs for failures

### 3. Retention

- Adjust retention policy based on your needs:
  - **High-change databases**: More daily backups (14+ days)
  - **Stable databases**: More monthly backups (24+ months)
- Consider compliance requirements for data retention

### 4. Storage

- Monitor backup directory size
- Consider external/cloud storage for long-term retention
- Ensure backup directory has sufficient space (3-5x database size)

### 5. Security

- Backup files contain sensitive data - protect accordingly
- Consider encryption for backups in shared/cloud storage
- Restrict access to backup directory (chmod 700)

## Troubleshooting

### Backup Creation Fails

**Error**: `Database not found`
- **Solution**: Verify database path is correct and file exists

**Error**: `Backup verification failed`
- **Solution**: Check database integrity with `PRAGMA integrity_check`
- **Solution**: Ensure sufficient disk space for backup

**Error**: `Permission denied`
- **Solution**: Check file permissions on database and backup directory

### Restoration Fails

**Error**: `Backup not found`
- **Solution**: Verify backup path is correct

**Error**: `Backup verification failed`
- **Solution**: Backup file may be corrupted - try another backup

**Error**: `Database is locked`
- **Solution**: Ensure no other processes are accessing the database

### Cleanup Issues

**Backups not being deleted**
- Check retention policy settings
- Verify backup timestamps are correct
- Ensure sufficient permissions to delete files

## Performance

### Backup Speed

Typical performance for different database sizes:

| Database Size | Compressed Backup | Uncompressed Backup |
|--------------|------------------|---------------------|
| 1 MB         | ~100ms           | ~50ms               |
| 10 MB        | ~500ms           | ~200ms              |
| 100 MB       | ~5s              | ~2s                 |
| 1 GB         | ~60s             | ~20s                |

### Storage Efficiency

Compression ratios for typical SQLite databases:

| Database Type      | Compression Ratio | Size Reduction |
|-------------------|------------------|----------------|
| Knowledge Graph    | 80-90%           | 10x smaller    |
| Evolution Data     | 70-85%           | 5-7x smaller   |
| Text-heavy         | 85-95%           | 10-20x smaller |
| Binary-heavy       | 20-50%           | 1.5-2x smaller |

## API Reference

### BackupManager

```typescript
class BackupManager {
  constructor(backupDir?: string);

  // Backup operations
  createBackup(dbPath: string, options?: BackupOptions): Promise<BackupInfo>;
  verifyBackup(backupPath: string, compressed?: boolean): Promise<boolean>;
  listBackups(dbPath: string): Promise<BackupInfo[]>;
  restoreBackup(backupPath: string, targetPath: string, options?: RestoreOptions): Promise<void>;

  // Maintenance
  cleanOldBackups(dbPath: string, policy?: RetentionPolicy): Promise<number>;
  getBackupStats(dbPath: string): Promise<BackupStats>;
}
```

### Interfaces

```typescript
interface BackupOptions {
  compress?: boolean;
  backupDir?: string;
  verify?: boolean;
  prefix?: string;
}

interface BackupInfo {
  timestamp: Date;
  path: string;
  size: number;
  compressed: boolean;
  verified: boolean;
  dbName: string;
  checksum?: string;
}

interface RetentionPolicy {
  dailyBackups: number;
  weeklyBackups: number;
  monthlyBackups?: number;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup: Date | null;
  newestBackup: Date | null;
  averageSize: number;
}
```

## Future Enhancements

### Planned Features

1. **Cloud Backup Integration**
   - AWS S3 upload
   - Google Cloud Storage
   - Azure Blob Storage

2. **Incremental Backups**
   - Only backup changed pages
   - Faster backup creation
   - Lower storage costs

3. **Encrypted Backups**
   - AES-256 encryption
   - Password protection
   - Key management

4. **Backup Monitoring**
   - Email notifications on failure
   - Slack/Discord webhooks
   - Health check endpoints

5. **Advanced Retention**
   - Custom retention rules
   - Tag-based retention
   - Compliance-driven policies

### Contributing

To contribute to the backup system:

1. Read `CONTRIBUTING.md`
2. Check existing issues and PRs
3. Write tests for new features
4. Update documentation
5. Submit PR with clear description

## License

Part of Claude Code Buddy - AGPL-3.0 License

See `LICENSE` file for details.
