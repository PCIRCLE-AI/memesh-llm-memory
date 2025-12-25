# System Tool Detection & Suggestion

**Feature**: #9 in V2.0 Roadmap
**Status**: Design Complete, Ready for Implementation (Week 9)
**Priority**: P2
**Complexity**: Low-Medium

---

## 🎯 Vision

**Smart-agents automatically detects installed system tools and suggests installations when needed, providing a worry-free development experience across all platforms.**

---

## 💡 User Problem

### Current Pain Points

1. **Missing Tools**: User tries to run a task, gets "command not found" error
2. **Manual Installation**: User has to manually figure out what to install
3. **Platform Differences**: Different install commands for Windows/macOS/Linux
4. **Discovery**: User doesn't know what tools are available/useful

### Desired Experience

```
User: "Deploy this app to Docker"

Smart-agents:
  ✓ Git installed (v2.39.0)
  ✓ Docker installed (v24.0.2)
  ✗ Docker Compose not found

  → Suggestion: Install Docker Compose
     macOS: brew install docker-compose
     Linux: sudo apt install docker-compose
     Windows: choco install docker-compose

  Install now? [Y/n]
```

---

## 🏗️ Architecture

### Core Components

```typescript
┌─────────────────────────────────────────────────┐
│           ToolDetectionOrchestrator             │
│  (Coordinates detection & suggestion flow)      │
└──────────────┬──────────────────────────────────┘
               │
      ┌────────┼────────┐
      │        │        │
      ▼        ▼        ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐
│  Tool   │ │   Task   │ │Installation │
│Detector │ │  Mapper  │ │  Suggester  │
└─────────┘ └──────────┘ └─────────────┘
      │           │              │
      └───────────┴──────────────┘
                  │
          ┌───────▼───────┐
          │   SQLite DB   │
          │ (Tool Cache)  │
          └───────────────┘
```

### 1. ToolDetector

**Purpose**: Check which tools are installed on the system

**Implementation**:

```typescript
interface ToolInfo {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  lastChecked: Date;
}

export class ToolDetector {
  private cache: Map<string, ToolInfo> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async detectTool(toolName: string): Promise<ToolInfo> {
    // Check cache first
    const cached = this.getCached(toolName);
    if (cached) return cached;

    // Detect tool
    const info = await this.performDetection(toolName);

    // Cache result
    this.cache.set(toolName, info);

    return info;
  }

  private async performDetection(toolName: string): Promise<ToolInfo> {
    try {
      // Try 'which' on Unix, 'where' on Windows
      const command = process.platform === 'win32' ? 'where' : 'which';
      const result = await execAsync(`${command} ${toolName}`);

      if (result.stdout.trim()) {
        // Tool found, get version
        const version = await this.getVersion(toolName);
        return {
          name: toolName,
          installed: true,
          version,
          path: result.stdout.trim().split('\n')[0],
          lastChecked: new Date(),
        };
      }
    } catch (error) {
      // Tool not found
    }

    return {
      name: toolName,
      installed: false,
      lastChecked: new Date(),
    };
  }

  private async getVersion(toolName: string): Promise<string | undefined> {
    const versionCommands: Record<string, string> = {
      git: 'git --version',
      docker: 'docker --version',
      node: 'node --version',
      npm: 'npm --version',
      python: 'python --version',
      python3: 'python3 --version',
      brew: 'brew --version',
      // ... more tools
    };

    try {
      const cmd = versionCommands[toolName];
      if (!cmd) return undefined;

      const result = await execAsync(cmd);
      return this.parseVersion(result.stdout);
    } catch {
      return undefined;
    }
  }

  private parseVersion(output: string): string {
    // Extract version from output (e.g., "git version 2.39.0" → "2.39.0")
    const match = output.match(/\d+\.\d+(\.\d+)?/);
    return match ? match[0] : output.trim();
  }

  // Batch detection for multiple tools
  async detectTools(toolNames: string[]): Promise<Map<string, ToolInfo>> {
    const results = new Map<string, ToolInfo>();

    await Promise.all(
      toolNames.map(async (name) => {
        const info = await this.detectTool(name);
        results.set(name, info);
      })
    );

    return results;
  }
}
```

---

### 2. TaskToToolMapper

**Purpose**: Map tasks to required tools

**Implementation**:

```typescript
interface TaskToolRequirement {
  task: string;
  required: string[];      // Must have
  recommended: string[];   // Nice to have
  optional: string[];      // For advanced features
}

export class TaskToToolMapper {
  private mappings: Map<string, TaskToolRequirement> = new Map();

  constructor() {
    this.initializeMappings();
  }

  private initializeMappings() {
    // Git operations
    this.mappings.set('git_commit', {
      task: 'git_commit',
      required: ['git'],
      recommended: ['gh'], // GitHub CLI
      optional: ['git-lfs'],
    });

    // Docker operations
    this.mappings.set('docker_deploy', {
      task: 'docker_deploy',
      required: ['docker'],
      recommended: ['docker-compose'],
      optional: [],
    });

    // Node.js development
    this.mappings.set('node_development', {
      task: 'node_development',
      required: ['node', 'npm'],
      recommended: ['pnpm', 'yarn'],
      optional: ['nvm'],
    });

    // Python development
    this.mappings.set('python_development', {
      task: 'python_development',
      required: ['python3', 'pip3'],
      recommended: ['venv', 'poetry'],
      optional: ['pyenv', 'conda'],
    });

    // Frontend development
    this.mappings.set('frontend_build', {
      task: 'frontend_build',
      required: ['node', 'npm'],
      recommended: ['typescript', 'webpack', 'vite'],
      optional: ['babel', 'eslint', 'prettier'],
    });

    // Database operations
    this.mappings.set('database_operations', {
      task: 'database_operations',
      required: [],
      recommended: ['postgresql', 'mysql', 'sqlite3'],
      optional: ['redis', 'mongodb'],
    });

    // Cloud deployment
    this.mappings.set('cloud_deploy', {
      task: 'cloud_deploy',
      required: [],
      recommended: ['kubectl', 'aws', 'gcloud', 'az'],
      optional: ['terraform', 'helm'],
    });
  }

  getRequiredTools(taskType: string): string[] {
    const mapping = this.mappings.get(taskType);
    return mapping ? mapping.required : [];
  }

  getRecommendedTools(taskType: string): string[] {
    const mapping = this.mappings.get(taskType);
    return mapping ? mapping.recommended : [];
  }

  getAllTools(taskType: string): TaskToolRequirement | undefined {
    return this.mappings.get(taskType);
  }

  // Smart inference from task description
  inferTaskType(taskDescription: string): string[] {
    const keywords = taskDescription.toLowerCase();
    const taskTypes: string[] = [];

    if (keywords.includes('git') || keywords.includes('commit') || keywords.includes('push')) {
      taskTypes.push('git_commit');
    }
    if (keywords.includes('docker') || keywords.includes('container')) {
      taskTypes.push('docker_deploy');
    }
    if (keywords.includes('node') || keywords.includes('npm') || keywords.includes('javascript')) {
      taskTypes.push('node_development');
    }
    if (keywords.includes('python') || keywords.includes('pip')) {
      taskTypes.push('python_development');
    }
    if (keywords.includes('frontend') || keywords.includes('react') || keywords.includes('vue')) {
      taskTypes.push('frontend_build');
    }
    if (keywords.includes('database') || keywords.includes('sql') || keywords.includes('postgres')) {
      taskTypes.push('database_operations');
    }
    if (keywords.includes('deploy') || keywords.includes('kubernetes') || keywords.includes('aws')) {
      taskTypes.push('cloud_deploy');
    }

    return taskTypes;
  }
}
```

---

### 3. InstallationSuggester

**Purpose**: Provide platform-specific installation commands

**Implementation**:

```typescript
interface PackageManager {
  name: string;
  checkCommand: string;
  installCommand: (pkg: string) => string;
  searchCommand: (pkg: string) => string;
}

interface InstallSuggestion {
  tool: string;
  platform: string;
  packageManager: string;
  command: string;
  description: string;
}

export class InstallationSuggester {
  private packageManagers: Map<string, PackageManager[]> = new Map();

  constructor() {
    this.initializePackageManagers();
  }

  private initializePackageManagers() {
    // macOS
    this.packageManagers.set('darwin', [
      {
        name: 'Homebrew',
        checkCommand: 'which brew',
        installCommand: (pkg) => `brew install ${pkg}`,
        searchCommand: (pkg) => `brew search ${pkg}`,
      },
      {
        name: 'MacPorts',
        checkCommand: 'which port',
        installCommand: (pkg) => `sudo port install ${pkg}`,
        searchCommand: (pkg) => `port search ${pkg}`,
      },
    ]);

    // Linux
    this.packageManagers.set('linux', [
      {
        name: 'apt',
        checkCommand: 'which apt',
        installCommand: (pkg) => `sudo apt install ${pkg}`,
        searchCommand: (pkg) => `apt search ${pkg}`,
      },
      {
        name: 'yum',
        checkCommand: 'which yum',
        installCommand: (pkg) => `sudo yum install ${pkg}`,
        searchCommand: (pkg) => `yum search ${pkg}`,
      },
      {
        name: 'dnf',
        checkCommand: 'which dnf',
        installCommand: (pkg) => `sudo dnf install ${pkg}`,
        searchCommand: (pkg) => `dnf search ${pkg}`,
      },
      {
        name: 'pacman',
        checkCommand: 'which pacman',
        installCommand: (pkg) => `sudo pacman -S ${pkg}`,
        searchCommand: (pkg) => `pacman -Ss ${pkg}`,
      },
    ]);

    // Windows
    this.packageManagers.set('win32', [
      {
        name: 'Chocolatey',
        checkCommand: 'where choco',
        installCommand: (pkg) => `choco install ${pkg}`,
        searchCommand: (pkg) => `choco search ${pkg}`,
      },
      {
        name: 'Winget',
        checkCommand: 'where winget',
        installCommand: (pkg) => `winget install ${pkg}`,
        searchCommand: (pkg) => `winget search ${pkg}`,
      },
      {
        name: 'Scoop',
        checkCommand: 'where scoop',
        installCommand: (pkg) => `scoop install ${pkg}`,
        searchCommand: (pkg) => `scoop search ${pkg}`,
      },
    ]);
  }

  async detectPackageManager(platform: string): Promise<PackageManager | null> {
    const managers = this.packageManagers.get(platform);
    if (!managers) return null;

    for (const manager of managers) {
      try {
        await execAsync(manager.checkCommand);
        return manager; // First found package manager
      } catch {
        continue;
      }
    }

    return null;
  }

  async suggestInstallation(toolName: string): Promise<InstallSuggestion[]> {
    const platform = process.platform;
    const suggestions: InstallSuggestion[] = [];

    const managers = this.packageManagers.get(platform);
    if (!managers) return suggestions;

    // Map tool names to package names
    const packageName = this.getPackageName(toolName, platform);

    for (const manager of managers) {
      suggestions.push({
        tool: toolName,
        platform,
        packageManager: manager.name,
        command: manager.installCommand(packageName),
        description: `Install ${toolName} using ${manager.name}`,
      });
    }

    return suggestions;
  }

  private getPackageName(toolName: string, platform: string): string {
    // Some tools have different package names on different platforms
    const packageMappings: Record<string, Record<string, string>> = {
      'docker-compose': {
        'darwin': 'docker-compose',
        'linux': 'docker-compose',
        'win32': 'docker-compose',
      },
      'python3': {
        'darwin': 'python',
        'linux': 'python3',
        'win32': 'python',
      },
      // ... more mappings
    };

    return packageMappings[toolName]?.[platform] || toolName;
  }
}
```

---

### 4. ToolDetectionOrchestrator

**Purpose**: Coordinate the entire flow

**Implementation**:

```typescript
export class ToolDetectionOrchestrator {
  private detector: ToolDetector;
  private mapper: TaskToToolMapper;
  private suggester: InstallationSuggester;

  constructor() {
    this.detector = new ToolDetector();
    this.mapper = new TaskToToolMapper();
    this.suggester = new InstallationSuggester();
  }

  async checkToolsForTask(taskDescription: string): Promise<ToolCheckResult> {
    // 1. Infer task type from description
    const taskTypes = this.mapper.inferTaskType(taskDescription);

    // 2. Get required and recommended tools
    const allRequired = new Set<string>();
    const allRecommended = new Set<string>();

    taskTypes.forEach((taskType) => {
      const tools = this.mapper.getAllTools(taskType);
      if (tools) {
        tools.required.forEach((t) => allRequired.add(t));
        tools.recommended.forEach((t) => allRecommended.add(t));
      }
    });

    // 3. Detect tools
    const requiredTools = await this.detector.detectTools(Array.from(allRequired));
    const recommendedTools = await this.detector.detectTools(Array.from(allRecommended));

    // 4. Find missing tools
    const missingRequired: string[] = [];
    const missingRecommended: string[] = [];

    requiredTools.forEach((info, name) => {
      if (!info.installed) missingRequired.push(name);
    });

    recommendedTools.forEach((info, name) => {
      if (!info.installed) missingRecommended.push(name);
    });

    // 5. Generate suggestions
    const suggestions: InstallSuggestion[] = [];

    for (const tool of missingRequired) {
      const toolSuggestions = await this.suggester.suggestInstallation(tool);
      suggestions.push(...toolSuggestions);
    }

    for (const tool of missingRecommended) {
      const toolSuggestions = await this.suggester.suggestInstallation(tool);
      suggestions.push(...toolSuggestions);
    }

    return {
      requiredTools: Array.from(requiredTools.values()),
      recommendedTools: Array.from(recommendedTools.values()),
      missingRequired,
      missingRecommended,
      suggestions,
    };
  }

  // Generate user-friendly terminal output
  formatCheckResult(result: ToolCheckResult): string {
    let output = '\n📦 Tool Check Results\n\n';

    // Required tools
    output += '🔴 Required Tools:\n';
    result.requiredTools.forEach((tool) => {
      const status = tool.installed ? '✓' : '✗';
      const version = tool.version ? ` (${tool.version})` : '';
      output += `  ${status} ${tool.name}${version}\n`;
    });

    // Recommended tools
    if (result.recommendedTools.length > 0) {
      output += '\n🟡 Recommended Tools:\n';
      result.recommendedTools.forEach((tool) => {
        const status = tool.installed ? '✓' : '✗';
        const version = tool.version ? ` (${tool.version})` : '';
        output += `  ${status} ${tool.name}${version}\n`;
      });
    }

    // Suggestions
    if (result.missingRequired.length > 0 || result.missingRecommended.length > 0) {
      output += '\n💡 Installation Suggestions:\n';

      // Group by package manager
      const grouped = new Map<string, InstallSuggestion[]>();
      result.suggestions.forEach((s) => {
        const key = s.packageManager;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(s);
      });

      grouped.forEach((suggestions, manager) => {
        output += `\n  Using ${manager}:\n`;
        suggestions.forEach((s) => {
          output += `    ${s.command}\n`;
        });
      });
    }

    return output;
  }
}

interface ToolCheckResult {
  requiredTools: ToolInfo[];
  recommendedTools: ToolInfo[];
  missingRequired: string[];
  missingRecommended: string[];
  suggestions: InstallSuggestion[];
}
```

---

## 🎨 Terminal UI Integration

**Display in Dashboard**:

```
┌─────────────────────────────────────────────────┐
│ 📦 System Tools                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ ✓ git (v2.39.0)                                │
│ ✓ docker (v24.0.2)                             │
│ ✓ node (v20.11.0)                              │
│ ✓ npm (v10.2.4)                                │
│ ✗ docker-compose (not found)                   │
│ ✗ kubectl (not found)                          │
│                                                 │
│ 💡 Install missing tools:                      │
│    brew install docker-compose kubectl         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📊 Storage (SQLite)

**Schema**:

```sql
CREATE TABLE tool_detection_cache (
  tool_name TEXT PRIMARY KEY,
  installed BOOLEAN,
  version TEXT,
  path TEXT,
  last_checked DATETIME,
  platform TEXT
);

CREATE TABLE package_managers (
  id INTEGER PRIMARY KEY,
  platform TEXT,
  manager_name TEXT,
  installed BOOLEAN,
  last_checked DATETIME
);
```

---

## 🔄 Workflow Example

### Scenario 1: Deploy Docker Container

```
User: "Deploy this app to Docker"

Smart-agents:
  📦 Checking required tools...

  🔴 Required:
    ✓ docker (v24.0.2)
    ✗ docker-compose (not found)

  🟡 Recommended:
    ✓ git (v2.39.0)

  💡 Suggestion:
    brew install docker-compose

  Install now? [Y/n] y

  Installing docker-compose...
  ✓ docker-compose installed successfully (v2.24.0)

  Proceeding with deployment...
```

### Scenario 2: Python Development

```
User: "Run pytest on this Python project"

Smart-agents:
  📦 Checking required tools...

  🔴 Required:
    ✓ python3 (v3.11.0)
    ✗ pytest (not found)

  💡 Suggestion:
    pip3 install pytest

  Install now? [Y/n]
```

---

## 🎯 Success Metrics

- **Detection Accuracy**: >95% correct tool detection
- **Install Success Rate**: >90% successful installations
- **Time Saved**: Average 5-10 minutes per missing tool
- **User Satisfaction**: >85% report improved experience

---

## 🚀 Implementation Plan (Week 9)

### Day 1-2: Core Detection
- [x] ToolDetector class
- [x] Version parsing
- [x] Caching system

### Day 3: Task Mapping
- [ ] TaskToToolMapper
- [ ] Task inference
- [ ] Tool mappings database

### Day 4: Installation Suggestions
- [ ] InstallationSuggester
- [ ] Package manager detection
- [ ] Platform-specific commands

### Day 5: Orchestration & UI
- [ ] ToolDetectionOrchestrator
- [ ] Terminal UI integration
- [ ] Interactive installation

### Day 6-7: Testing & Polish
- [ ] Cross-platform testing
- [ ] Error handling
- [ ] Documentation

---

## 📋 Dependencies

- **Node.js**: Built-in `child_process` for command execution
- **SQLite**: Tool detection cache
- **Ink**: Terminal UI display
- **Cross-platform**: Works on Windows/macOS/Linux

---

## 🎓 Future Enhancements

1. **Auto-Update Detection**: Detect outdated tools, suggest updates
2. **Custom Tool Profiles**: Users can define their own tool requirements
3. **Project-Specific Tools**: Detect tools from package.json, requirements.txt
4. **Installation Verification**: Verify tool works after installation
5. **Conflict Detection**: Warn about incompatible tool versions

---

**This feature completes the "worry-free development experience" vision by eliminating the friction of missing system tools.**
