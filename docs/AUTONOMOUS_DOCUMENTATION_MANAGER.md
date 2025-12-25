# Autonomous Documentation Manager (ADM)

## 🎯 Vision

**"Smart-agents automatically maintains clean, organized documentation for every project - no manual intervention needed."**

## 🚀 Core Concept

The Autonomous Documentation Manager (ADM) is a background service that:
- ✅ Continuously monitors project documentation
- ✅ Detects and fixes issues automatically
- ✅ Maintains optimal folder structure
- ✅ Works across all projects (not just smart-agents)
- ✅ Learns project-specific patterns
- ✅ Runs silently in the background

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│           Documentation Manager Service              │
├─────────────────────────────────────────────────────┤
│  1. File System Watcher                             │
│     - Monitor .md files                             │
│     - Detect new/modified/deleted docs              │
│     - Track file moves                              │
│                                                      │
│  2. Issue Detector                                  │
│     - Duplicate detection                           │
│     - Orphaned files                                │
│     - Missing critical docs                         │
│     - Outdated content                              │
│     - Broken links                                  │
│                                                      │
│  3. Auto-Fixer                                      │
│     - Move misplaced files                          │
│     - Consolidate duplicates                        │
│     - Update cross-references                       │
│     - Generate missing READMEs                      │
│                                                      │
│  4. Structure Enforcer                              │
│     - Maintain canonical structure                  │
│     - Enforce naming conventions                    │
│     - Create missing directories                    │
│                                                      │
│  5. Quality Checker                                 │
│     - Check markdown syntax                         │
│     - Validate code blocks                          │
│     - Ensure completeness                           │
│     - Verify examples                               │
│                                                      │
│  6. Knowledge Graph Integration                     │
│     - Record documentation decisions                │
│     - Learn project patterns                        │
│     - Track documentation health metrics            │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Autonomous Operations

### 1. Continuous Monitoring

**What It Does**:
- Watches `**/*.md` files in project
- Detects changes within 1 second
- Queues issues for auto-fixing
- Runs checks every 5 minutes (configurable)

**Implementation**:
```typescript
import chokidar from 'chokidar';

export class DocumentationWatcher {
  private watcher: chokidar.FSWatcher;

  start(projectRoot: string) {
    this.watcher = chokidar.watch('**/*.md', {
      cwd: projectRoot,
      ignored: ['node_modules/**', '.git/**', 'dist/**'],
      persistent: true,
      ignoreInitial: false,
    });

    this.watcher
      .on('add', path => this.handleFileAdded(path))
      .on('change', path => this.handleFileChanged(path))
      .on('unlink', path => this.handleFileDeleted(path));
  }

  private async handleFileAdded(path: string) {
    // Check if file is in correct location
    const suggestedLocation = this.getSuggestedLocation(path);

    if (path !== suggestedLocation) {
      await this.autoMove(path, suggestedLocation);
      console.log(`📁 Moved ${path} → ${suggestedLocation}`);
    }
  }
}
```

---

### 2. Issue Detection

**Automatic Checks**:

#### A. Duplicate Detection
```typescript
interface DuplicateIssue {
  type: 'duplicate';
  files: string[];
  similarity: number;  // 0-1
  suggestedAction: 'merge' | 'archive' | 'keep-both';
}

// Example detection
const duplicates = await detector.findDuplicates();
// Result:
// {
//   type: 'duplicate',
//   files: ['docs/API.md', 'API_REFERENCE.md', 'docs/api/README.md'],
//   similarity: 0.87,
//   suggestedAction: 'merge'
// }
```

**Auto-Fix**:
- Merge into canonical location: `docs/api/API_REFERENCE.md`
- Archive old versions to `docs/archive/`
- Update all cross-references
- Log action to Knowledge Graph

#### B. Orphaned Files
```typescript
interface OrphanedIssue {
  type: 'orphaned';
  file: string;
  reason: 'no-backlinks' | 'wrong-location' | 'outdated';
  suggestedLocation?: string;
  suggestedArchive?: boolean;
}

// Example
// File: random-notes.md in project root
// Auto-Fix: Move to docs/project/random-notes.md
//           or archive if older than 30 days
```

#### C. Missing Critical Docs
```typescript
interface MissingDocIssue {
  type: 'missing';
  expectedFile: string;
  importance: 'critical' | 'important' | 'nice-to-have';
  autoGenerate: boolean;
}

// Critical docs that should exist:
const CRITICAL_DOCS = [
  'README.md',
  'docs/README.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'docs/architecture/README.md',
  'docs/api/README.md',
];

// Auto-Fix: Generate from template if missing
```

#### D. Broken Links
```typescript
interface BrokenLinkIssue {
  type: 'broken-link';
  file: string;
  line: number;
  brokenLink: string;
  suggestedFix?: string;
}

// Example:
// File: docs/guide.md
// Link: [API Docs](../api/OLD_API.md)
// Auto-Fix: Update to [API Docs](../api/API_REFERENCE.md)
```

---

### 3. Canonical Structure Enforcement

**Default Structure** (learned from project patterns):
```
{project-root}/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
│
├── docs/
│   ├── README.md (navigation hub)
│   ├── architecture/
│   │   ├── README.md
│   │   └── *.md
│   ├── design/
│   │   ├── README.md
│   │   └── *.md
│   ├── implementation/
│   │   ├── README.md
│   │   └── *.md
│   ├── guides/
│   │   ├── README.md
│   │   └── *.md
│   ├── api/
│   │   ├── README.md
│   │   └── *.md
│   ├── project/
│   │   ├── README.md
│   │   └── *.md (meeting notes, decisions, etc.)
│   └── archive/
│       ├── README.md
│       └── *.md (historical docs)
│
└── examples/
    ├── README.md
    └── */
```

**Auto-Enforcement**:
- New `.md` file in root? → Suggest moving to appropriate `docs/` subdirectory
- File named `architecture.md`? → Move to `docs/architecture/`
- Multiple design docs in root? → Consolidate to `docs/design/`

---

### 4. Auto-Fix Actions

**Safe Auto-Fixes** (executed automatically):
1. ✅ Move misplaced files to correct location
2. ✅ Create missing README.md files
3. ✅ Update broken links (if new location is known)
4. ✅ Generate missing directory structure
5. ✅ Fix markdown syntax errors
6. ✅ Update navigation links in READMEs
7. ✅ Archive files older than 90 days (if orphaned)

**Requires Approval** (notify user):
1. ⚠️ Merge duplicate files (>85% similarity)
2. ⚠️ Delete files (ask first, default to archive)
3. ⚠️ Major structure reorganization (>10 files)
4. ⚠️ Update critical docs (README.md, CONTRIBUTING.md)

**Implementation**:
```typescript
export class AutoFixer {
  async applyFix(issue: DocumentationIssue): Promise<FixResult> {
    // Check if auto-fix is safe
    if (this.isSafeToAutoFix(issue)) {
      return await this.executeAutoFix(issue);
    } else {
      // Queue for user approval
      await this.requestUserApproval(issue);
      return { status: 'pending-approval', issue };
    }
  }

  private isSafeToAutoFix(issue: DocumentationIssue): boolean {
    const SAFE_ACTIONS = [
      'move-to-correct-location',
      'create-missing-readme',
      'fix-broken-link',
      'fix-markdown-syntax',
    ];

    return SAFE_ACTIONS.includes(issue.suggestedAction);
  }
}
```

---

### 5. Learning & Adaptation

**Knowledge Graph Integration**:
```typescript
// Record documentation decisions
await knowledgeGraph.recordDecision({
  type: 'documentation-organization',
  decision: 'Moved API docs to docs/api/',
  rationale: 'Canonical structure enforcement',
  files: ['old-api.md', 'docs/api/API_REFERENCE.md'],
  timestamp: new Date(),
});

// Learn project patterns
const patterns = await knowledgeGraph.query({
  type: 'documentation-pattern',
  project: currentProject,
});

// Adapt structure to learned patterns
if (patterns.prefers['flat-structure']) {
  // This project prefers fewer nested directories
  this.config.maxNestingDepth = 2;
}
```

**Project-Specific Rules**:
```json
{
  "project": "smart-agents",
  "documentationRules": {
    "structure": "canonical",
    "maxNestingDepth": 3,
    "archiveAfterDays": 90,
    "autoFixEnabled": true,
    "requireApprovalFor": [
      "merge-duplicates",
      "delete-files",
      "major-reorganization"
    ],
    "customLocations": {
      "meeting-notes": "docs/project/meetings/",
      "rfcs": "docs/project/rfcs/",
      "decisions": "docs/project/decisions/"
    }
  }
}
```

---

## 🔄 Background Service

### Running Modes

**1. Daemon Mode** (default)
```bash
# Start documentation manager as background service
smart-agents docs daemon start

# Status
smart-agents docs daemon status
# Output:
# ✅ Documentation Manager running
# 📊 Monitored projects: 3
# 🔍 Issues detected: 7
# 🔧 Auto-fixes applied: 5
# ⏳ Pending approval: 2

# Stop
smart-agents docs daemon stop
```

**2. Watch Mode** (interactive)
```bash
# Run in foreground with live updates
smart-agents docs watch

# Output:
# 📁 Watching documentation...
#
# 12:34:56 ℹ️  New file detected: random-notes.md
# 12:34:56 🔧 Auto-fix: Moving to docs/project/random-notes.md
# 12:34:57 ✅ File moved successfully
#
# 12:35:23 ⚠️  Duplicate detected:
#          - docs/API.md
#          - API_REFERENCE.md
#          Suggest: Merge into docs/api/API_REFERENCE.md
#          Approve? [Y/n]: _
```

**3. Manual Scan** (on-demand)
```bash
# Run checks once
smart-agents docs check

# Output:
# 🔍 Scanning documentation...
#
# Issues Found:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔴 3 duplicates detected
# 🟡 5 orphaned files
# 🟢 2 broken links (auto-fixed)
# ℹ️  1 missing critical doc (auto-generated)
#
# Auto-fixes applied: 3
# Require approval: 3
#
# Run 'smart-agents docs fix' to apply pending fixes
```

---

## 📋 Configuration

### Global Config (`~/.smart-agents/docs-config.json`)
```json
{
  "enabled": true,
  "daemonMode": true,
  "checkIntervalMinutes": 5,
  "autoFixEnabled": true,
  "safeMode": true,
  "notifications": {
    "enabled": true,
    "frequency": "daily",
    "channels": ["terminal", "log"]
  },
  "monitoring": {
    "watchPatterns": ["**/*.md", "**/*.mdx"],
    "ignorePatterns": [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**"
    ]
  },
  "autoFix": {
    "moveMisplacedFiles": true,
    "createMissingREADMEs": true,
    "fixBrokenLinks": true,
    "fixMarkdownSyntax": true,
    "archiveOrphanedFiles": true,
    "archiveAfterDays": 90
  },
  "approvalRequired": [
    "merge-duplicates",
    "delete-files",
    "major-reorganization"
  ],
  "structureTemplate": "canonical"
}
```

### Project Config (`{project}/.smart-agents/docs.json`)
```json
{
  "customStructure": {
    "docs/rfcs/": "RFC documents",
    "docs/project/decisions/": "Architecture decision records"
  },
  "rules": {
    "maxNestingDepth": 3,
    "requireNavigationREADME": true,
    "enforceNamingConvention": "kebab-case"
  },
  "excludePaths": [
    "legacy-docs/",
    "vendor/"
  ]
}
```

---

## 🎯 User Interface

### Dashboard

```bash
$ smart-agents docs dashboard

╔════════════════════════════════════════════════════════╗
║         DOCUMENTATION HEALTH DASHBOARD                ║
╠════════════════════════════════════════════════════════╣
║ Status: ✅ Healthy                                     ║
║ Score:  92/100                                        ║
╠════════════════════════════════════════════════════════╣
║ Structure:        ✅ 95% compliant                    ║
║ Completeness:     ✅ 88% (2 missing docs)             ║
║ Link Health:      ✅ 100% (all links valid)           ║
║ Freshness:        ⚠️  75% (5 docs >90 days old)      ║
╠════════════════════════════════════════════════════════╣
║ Recent Activity:                                      ║
║   12:34 - Auto-moved 1 file                          ║
║   12:35 - Created missing README                     ║
║   12:40 - Fixed 2 broken links                       ║
╠════════════════════════════════════════════════════════╣
║ Pending Actions:                                      ║
║   ⚠️  3 duplicates need review                       ║
║   ⚠️  2 files pending archive                        ║
║                                                       ║
║   [Review & Approve]  [Dismiss All]                  ║
╚════════════════════════════════════════════════════════╝
```

---

## 🚀 Implementation Phases

### Phase 1: Core Monitoring (Week 1)
- [ ] File system watcher (chokidar)
- [ ] Basic issue detection (duplicates, orphans)
- [ ] Safe auto-fixes (move files, create READMEs)
- [ ] Configuration system

### Phase 2: Auto-Fixing (Week 2)
- [ ] Duplicate consolidation
- [ ] Link checker & updater
- [ ] Markdown syntax validator
- [ ] Archive management

### Phase 3: Intelligence (Week 3)
- [ ] Knowledge Graph integration
- [ ] Pattern learning
- [ ] Project-specific adaptation
- [ ] Quality scoring

### Phase 4: Background Service (Week 4)
- [ ] Daemon mode
- [ ] Watch mode
- [ ] Dashboard UI
- [ ] Notifications

### Phase 5: Multi-Project Support (Week 5)
- [ ] Global project registry
- [ ] Cross-project patterns
- [ ] Unified dashboard
- [ ] Batch operations

---

## 📊 Success Metrics

### Documentation Health Score

```typescript
export interface HealthScore {
  overall: number;        // 0-100
  breakdown: {
    structure: number;    // Adherence to canonical structure
    completeness: number; // Critical docs present
    linkHealth: number;   // No broken links
    freshness: number;    // Docs updated recently
    quality: number;      // Markdown quality, code validity
  };
}

// Score calculation
function calculateHealthScore(project: Project): HealthScore {
  const structure = checkStructureCompliance(project);  // 0-100
  const completeness = checkCompleteness(project);      // 0-100
  const linkHealth = checkLinks(project);               // 0-100
  const freshness = checkFreshness(project);            // 0-100
  const quality = checkQuality(project);                // 0-100

  return {
    overall: Math.round(
      structure * 0.25 +
      completeness * 0.30 +
      linkHealth * 0.20 +
      freshness * 0.10 +
      quality * 0.15
    ),
    breakdown: {
      structure,
      completeness,
      linkHealth,
      freshness,
      quality,
    }
  };
}
```

**Target Scores**:
- ✅ Excellent: 90-100
- 🟢 Good: 75-89
- 🟡 Fair: 60-74
- 🔴 Poor: <60

---

## 🔗 Integration with Smart-Agents

### Orchestrator Integration

```typescript
export class Orchestrator {
  private docManager: DocumentationManager;

  async executeTask(task: Task): Promise<TaskExecutionResult> {
    const result = await this.actuallyExecuteTask(task);

    // After task completion, check documentation
    if (this.shouldCheckDocs(task)) {
      await this.docManager.checkProject(task.projectRoot);
    }

    return result;
  }

  private shouldCheckDocs(task: Task): boolean {
    // Check after tasks that might affect docs
    return [
      'feature-implementation',
      'api-change',
      'refactoring',
      'documentation-update',
    ].includes(task.type);
  }
}
```

### Agent Hooks

```typescript
// After any agent completes work
export class AgentHooks {
  async afterCompletion(agent: Agent, result: AgentResult) {
    // If agent modified code, check if docs need update
    if (result.filesModified.some(f => f.endsWith('.ts'))) {
      await documentationManager.suggestDocUpdates(
        result.filesModified
      );
    }

    // Auto-generate API docs if needed
    if (result.type === 'api-implementation') {
      await documentationManager.generateAPIDocs(result);
    }
  }
}
```

---

## 🎓 Examples

### Example 1: Auto-Organizing New Docs

```bash
# User creates a new doc
$ touch new-feature-spec.md

# ADM detects and auto-organizes
[ADM] 📁 New documentation detected: new-feature-spec.md
[ADM] 🔍 Analyzing content...
[ADM] 💡 Detected type: Feature Specification
[ADM] 🔧 Auto-moving to: docs/project/feature-specs/new-feature-spec.md
[ADM] ✅ File moved
[ADM] 📝 Updated docs/project/README.md navigation
```

### Example 2: Duplicate Consolidation

```bash
# ADM detects duplicates
[ADM] ⚠️  Duplicate documentation detected:
      - API.md (root)
      - docs/OLD_API.md
      - docs/api/API_REFERENCE.md

      Similarity: 89%

[ADM] 💡 Suggested action:
      1. Merge into: docs/api/API_REFERENCE.md
      2. Archive: API.md → docs/archive/API_2025-12-26.md
      3. Archive: docs/OLD_API.md → docs/archive/OLD_API.md

      Approve? [Y/n]: y

[ADM] 🔧 Merging duplicates...
[ADM] ✅ Merged into docs/api/API_REFERENCE.md
[ADM] 📦 Archived 2 old versions
[ADM] 🔗 Updated 7 cross-references
```

### Example 3: Missing Doc Detection

```bash
# ADM detects missing critical doc
[ADM] 🔴 Critical documentation missing: CONTRIBUTING.md

[ADM] 🤖 Auto-generating from template...

[ADM] ✅ Generated CONTRIBUTING.md

[ADM] 📝 Please review and customize:
      - Contribution guidelines
      - Code of conduct
      - Development setup
      - Testing requirements

      Edit now? [Y/n]: _
```

---

## 🔐 Security & Privacy

**Safe Operations**:
- ✅ Never modifies file content (only moves/renames)
- ✅ Always uses `git mv` (preserves history)
- ✅ Creates backups before destructive operations
- ✅ Logs all actions to audit trail
- ✅ Requires approval for risky operations

**Privacy**:
- ✅ All processing happens locally
- ✅ No documentation sent to external services
- ✅ Knowledge Graph stays on user's machine
- ✅ Opt-in telemetry only (disabled by default)

---

## 📈 Expected Benefits

### For Users
- ✅ **Zero manual organization** - Documentation stays clean automatically
- ✅ **Never lose docs** - Everything in proper place, always findable
- ✅ **Always up-to-date** - Broken links fixed, missing docs generated
- ✅ **Cross-project consistency** - Same structure everywhere

### For Projects
- ✅ **Higher documentation quality** - Automated quality checks
- ✅ **Better discoverability** - Canonical structure, navigation
- ✅ **Reduced maintenance burden** - Auto-fixes common issues
- ✅ **Historical preservation** - Archive keeps old versions

### For Teams
- ✅ **Onboarding faster** - New members find docs easily
- ✅ **Collaboration smoother** - Consistent documentation patterns
- ✅ **Knowledge retained** - Documentation health tracked over time

---

## 🎯 Integration with V2.0 Upgrade Plan

**Where It Fits**:
- **Phase 3: Integration** (Week 5-6)
  - Build core ADM system
  - Integrate with Orchestrator
  - Add Knowledge Graph connection

- **Phase 4: Intelligence** (Week 7-8)
  - Add pattern learning
  - Multi-project support
  - Dashboard UI

**Priority**: P1 (High - foundational feature for worry-free UX)

**Dependencies**:
- Knowledge Graph (already implemented)
- Background Task Queue (Phase 2)
- File System Utilities (cross-platform)

---

**This system ensures that documentation never becomes a burden again. Smart-agents takes full responsibility for keeping your projects clean, organized, and well-documented! 🚀**
