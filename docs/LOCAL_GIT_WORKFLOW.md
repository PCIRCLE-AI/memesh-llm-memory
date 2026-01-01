# Local Git Workflow

## 🎯 Core Philosophy

**GitHub is NOT Required** - Claude Code Buddy can operate entirely locally, using only local Git for version control and code management.

## 📊 GitHub vs Local Git Comparison

| Feature | Local Git (Local Only) | GitHub (Remote) |
|---------|----------------------|-----------------|
| **Version Control** | ✅ Full Support | ✅ Full Support |
| **Code Backup** | ⚠️ Local Only | ✅ Cloud Backup |
| **Collaboration** | ❌ Not Supported | ✅ Full Support |
| **Code Sharing** | ❌ Inconvenient | ✅ Public/Private Sharing |
| **CI/CD** | ❌ Not Available | ✅ GitHub Actions |
| **Learning Curve** | ✅ Lower | ⚠️ Higher |
| **Requires Internet** | ❌ No | ✅ Yes |
| **Requires Account** | ❌ No | ✅ GitHub Account Required |
| **Best For** | Personal Projects, Learning | Team Collaboration, Open Source |

## 🏠 Local Git Workflow (Recommended for Non-Technical Users)

### Basic Concepts

```
Your Project Folder (Working Directory)
    ↓
Local Git Repository (Local Repository)
    ↓
Version History (Commit History)

NOT Required:
❌ GitHub Account
❌ SSH Keys
❌ Remote Repository
❌ Push/Pull
❌ Internet Connection
```

### Simplified Workflow

```bash
# 1. Initialize project (one-time setup)
cd /path/to/your/project
git init

# 2. Configure basic information (one-time setup)
git config user.name "Your Name"
git config user.email "your@email.com"

# 3. Daily workflow
# Write code → Save version → Continue working

# Save current version
git add .
git commit -m "Complete login feature"

# View version history
git log --oneline

# Go back to previous version
git checkout <commit-id>

# Create new branch to test feature
git checkout -b new-feature

# Merge after completion
git checkout main
git merge new-feature
```

## 🎨 Claude Code Buddy Local Workflow

### Option A: Pure Local (No GitHub)

```
User Project
├── .git/                    # Local Git repository
├── src/                     # Source code
├── docs/                    # Documentation
└── .claude-code-buddy/      # Claude Code Buddy config
    ├── knowledge-graph/     # Local knowledge graph
    ├── workflows/           # Local workflows
    └── backups/             # Local backups

All data stays local, never uploaded to cloud
```

**Advantages**:
- ✅ Simple, no need to learn GitHub
- ✅ No internet required
- ✅ Complete privacy control
- ✅ Suitable for personal projects and learning

**Disadvantages**:
- ⚠️ Computer failure = data loss (requires manual backup)
- ⚠️ No multi-user collaboration
- ⚠️ Cannot access from other computers

### Option B: Local + Optional GitHub

```
User Project
├── .git/                    # Local Git
├── src/
├── docs/
└── .claude-code-buddy/
    └── config.json
        {
          "git": {
            "mode": "local",        # Default local mode
            "autoBackup": false,    # Don't auto-backup to GitHub
            "github": {
              "enabled": false      # GitHub features disabled
            }
          }
        }

# Users can enable GitHub anytime (optional)
{
  "git": {
    "mode": "hybrid",             # Local + GitHub
    "autoBackup": true,           # Auto-backup to GitHub
    "github": {
      "enabled": true,
      "repo": "username/project"
    }
  }
}
```

**Advantages**:
- ✅ Simple by default (local mode)
- ✅ Can upgrade to GitHub when needed
- ✅ Progressive learning path
- ✅ High flexibility

## 🛡️ Local Backup Strategy (Without GitHub)

How to protect your code without GitHub?

### Strategy 1: Automatic Local Backup

```bash
# Claude Code Buddy can automatically execute
#!/bin/bash
# .claude-code-buddy/scripts/local-backup.sh

BACKUP_DIR="$HOME/.claude-code-buddy-backups/$(basename $(pwd))"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Copy entire project (including .git)
cp -r . "$BACKUP_DIR/$TIMESTAMP"

# Keep only last 10 backups
ls -t "$BACKUP_DIR" | tail -n +11 | xargs -I {} rm -rf "$BACKUP_DIR/{}"

echo "✅ Backup created: $BACKUP_DIR/$TIMESTAMP"
```

### Strategy 2: External Drive Backup

```bash
# Backup to external drive
rsync -av --exclude=node_modules \
  /path/to/project \
  /Volumes/ExternalDrive/Backups/
```

### Strategy 3: iCloud/Dropbox Sync

```bash
# Place project in cloud sync folder
~/Library/Mobile Documents/com~apple~CloudDocs/Projects/my-project/

# Git still works normally, files auto-sync
```

## 🎓 User-Friendly Git Commands for Non-Technical Users

### Simplified Commands (Claude Code Buddy provides)

```bash
# ❌ Technical commands (intimidating)
git add .
git commit -m "feat: implement authentication module with JWT tokens"
git push origin feature/auth-system

# ✅ Friendly commands (easy to understand)
save-work "Complete login feature"
# → Claude Code Buddy automatically executes git add + commit

list-versions
# → Claude Code Buddy shows version history (formatted)

go-back-to "yesterday afternoon version"
# → Claude Code Buddy finds corresponding commit and checkout

backup-now
# → Claude Code Buddy executes local backup

show-changes
# → Claude Code Buddy shows differences from last version (visualized)
```

### Claude Code Buddy CLI Wrapper

```typescript
// src/cli/friendly-git-commands.ts

export class FriendlyGitCommands {
  /**
   * Save current work
   */
  async saveWork(description: string): Promise<void> {
    // Internally executes git add + commit
    await execAsync('git add .');
    await execAsync(`git commit -m "${description}"`);

    // Auto local backup
    if (this.config.autoLocalBackup) {
      await this.createLocalBackup();
    }

    console.log('✅ Work saved');
    console.log('📝 Description:', description);
    console.log('🕐 Time:', new Date().toLocaleString());
  }

  /**
   * List version history
   */
  async listVersions(limit: number = 10): Promise<void> {
    const result = await execAsync(`git log --oneline -${limit}`);

    console.log('📚 Recent versions:\n');
    const commits = result.stdout.split('\n');

    commits.forEach((commit, index) => {
      const [hash, ...messageParts] = commit.split(' ');
      const message = messageParts.join(' ');
      console.log(`${index + 1}. ${message}`);
      console.log(`   (Version ID: ${hash})\n`);
    });
  }

  /**
   * Go back to previous version
   */
  async goBackTo(identifier: string): Promise<void> {
    // User can use version number, description, or relative time
    let commitHash: string;

    if (identifier.includes('yesterday')) {
      // Find yesterday's commit
      commitHash = await this.findCommitByTime('yesterday');
    } else if (identifier.includes('version')) {
      // Find by version number
      commitHash = await this.findCommitByNumber(parseInt(identifier));
    } else {
      // Use hash directly
      commitHash = identifier;
    }

    await execAsync(`git checkout ${commitHash}`);
    console.log('✅ Returned to that version');
  }

  /**
   * Create local backup
   */
  private async createLocalBackup(): Promise<void> {
    const backupDir = path.join(
      os.homedir(),
      '.claude-code-buddy-backups',
      path.basename(process.cwd())
    );

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = path.join(backupDir, timestamp);

    await fs.mkdir(backupDir, { recursive: true });
    await execAsync(`cp -r . ${backupPath}`);

    // Keep only last 10 backups
    const backups = await fs.readdir(backupDir);
    const sortedBackups = backups.sort().reverse();

    for (const backup of sortedBackups.slice(10)) {
      await fs.rm(path.join(backupDir, backup), { recursive: true });
    }
  }

  /**
   * Show changes
   */
  async showChanges(): Promise<void> {
    const result = await execAsync('git diff HEAD~1');

    console.log('📊 Differences from last version:\n');

    // Simplified diff display
    const lines = result.stdout.split('\n');
    const changes = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[]
    };

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        changes.added.push(line.slice(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        changes.removed.push(line.slice(1));
      }
    }

    console.log(`✅ Added ${changes.added.length} lines`);
    console.log(`❌ Removed ${changes.removed.length} lines`);
  }
}
```

## 📱 Visual Git Interface (Future)

For users who don't want to use command line at all:

```
Claude Code Buddy GUI (Electron App)

┌─────────────────────────────────────────┐
│  📁 My Project                          │
├─────────────────────────────────────────┤
│  Current Branch: main                   │
│                                          │
│  Recent Versions:                       │
│  ┌────────────────────────────────────┐ │
│  │ 1. Complete login feature (2h ago) │ │
│  │ 2. Fix password validation bug     │ │
│  │    (yesterday)                      │ │
│  │ 3. Add registration page (3d ago)  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Actions:                                │
│  [💾 Save Current Work] [⏮️ Go Back]    │
│  [📊 View Changes]      [💿 Create Backup]│
│                                          │
│  Unsaved Changes:                        │
│  ✏️ src/login.ts                        │
│  ✏️ src/auth.ts                         │
│                                          │
│  Description: ___________________        │
│                [Save Version] Button     │
└─────────────────────────────────────────┘
```

## 🎯 Recommended Default Configuration

### Personal Users (Learning, Personal Projects)

```json
{
  "git": {
    "mode": "local-only",
    "autoCommit": false,
    "autoBackup": true,
    "backupInterval": "daily",
    "backupLocation": "~/.claude-code-buddy-backups",
    "github": {
      "enabled": false
    }
  },
  "ui": {
    "simplifiedCommands": true,
    "visualDiff": true,
    "autoSuggestions": true
  }
}
```

### Professional Users (Team Collaboration, Open Source)

```json
{
  "git": {
    "mode": "hybrid",
    "autoCommit": false,
    "autoBackup": true,
    "backupInterval": "hourly",
    "github": {
      "enabled": true,
      "repo": "username/project",
      "autoPush": false
    }
  },
  "ui": {
    "simplifiedCommands": false,
    "showRawGitCommands": true
  }
}
```

## 🚀 Implementation Suggestions

### Phase 1: Local-First (Immediate Implementation)

1. ✅ Use local Git by default
2. ✅ Don't require GitHub
3. ✅ Provide friendly Git command wrappers
4. ✅ Auto local backup

### Phase 2: Progressive Complexity (Future)

1. ⬜ Detect user proficiency level
2. ⬜ Show different interfaces based on proficiency
3. ⬜ Beginner mode: Show only simplified commands
4. ⬜ Expert mode: Show raw Git commands

### Phase 3: Optional GitHub (Future)

1. ⬜ "Upgrade to GitHub" guided flow
2. ⬜ Auto-create GitHub repo
3. ⬜ Auto-configure remote
4. ⬜ Simplify push/pull operations

## 💡 Key Insights

### For Non-Technical Users

**They DON'T need to know**:
- ❌ Git internal workings
- ❌ Technical concepts like Commit, Branch, Merge
- ❌ Remote, Push, Pull
- ❌ What GitHub is

**They ONLY need to know**:
- ✅ "Save version" records current state
- ✅ "Go back to previous version" restores old code
- ✅ "View changes" shows what was modified
- ✅ "Create backup" protects their work

### Analogy: Like a File System

```
Git Version Control    ≈    File Management

Save version          ≈    Save file
Go to previous version ≈   Open old version of file
View history          ≈    View file modification date
Create branch         ≈    Copy folder for testing
```

## 📚 User Documentation Example

### Beginner's Guide

```markdown
# How to Save Your Work

## 1. Save Current Version

When you complete a feature, use:

​```bash
save-work "Completed login feature"
​```

It's as simple as saving a document!

## 2. View Version History

Want to see what you did before?

​```bash
list-versions
​```

Shows:
1. Complete login feature (2 hours ago)
2. Fix password bug (yesterday)
3. Add registration page (3 days ago)

## 3. Go Back to Previous Version

Found a problem with new code? Go back to old version:

​```bash
go-back-to "yesterday's version"
​```

That's it!
```

## 🔒 Data Security

### Data Protection with Local Git

```bash
# 1. Regular auto-backup (Claude Code Buddy executes automatically)
0 */4 * * * ~/.claude-code-buddy/scripts/local-backup.sh

# 2. External drive backup (weekly)
rsync -av ~/Projects /Volumes/Backup/

# 3. Cloud sync (optional)
# Place in iCloud/Dropbox folder, auto-syncs

# 4. Time Machine (macOS)
# System automatically backs up entire computer
```

## ✅ Conclusion

**GitHub is NOT required!**

Claude Code Buddy should:
1. ✅ Use local Git by default
2. ✅ Provide friendly command interface
3. ✅ Auto local backup
4. ✅ GitHub as optional feature
5. ✅ Progressive learning path

This allows:
- Lower learning barrier
- Protect user privacy
- Suitable for personal projects
- Can upgrade to GitHub when needed
