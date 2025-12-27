# Smart-Agents MCP Session Orchestrator

## Overview

An MCP server that acts as a meta-orchestrator for Claude Code sessions, providing:
- Periodic CLAUDE.md re-injection to prevent rule forgetting
- Automatic memory updates for session continuity
- Session state tracking and recovery
- Proactive guideline enforcement

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│         Claude Code Session (Client)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Claude Agent (Sonnet 4.5)                        │  │
│  │  - Receives periodic CLAUDE.md injections         │  │
│  │  - Auto-updates MCP Memory                        │  │
│  │  - Session state monitoring                       │  │
│  └───────────┬─────────────────────────────┬─────────┘  │
│              │ MCP Protocol                │            │
└──────────────┼─────────────────────────────┼────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────────┐  ┌──────────────────────┐
│  Session Orchestrator MCP    │  │   MCP Memory Server  │
│                              │  │                      │
│  ├─ Session Monitor          │  │  ├─ Knowledge Graph  │
│  │  - Track session duration│  │  │  - Store lessons   │
│  │  - Monitor tool usage    │  │  │  - Query history   │
│  │  - Detect violations     │  │  └─ Session States   │
│  │                          │  │                      │
│  ├─ Periodic Tasks          │  └──────────────────────┘
│  │  - CLAUDE.md injection   │
│  │  - Memory updates        │           ▲
│  │  - Guideline reminders   │           │
│  │                          │           │
│  ├─ Context Management      │           │
│  │  - Load guides           │           │
│  │  - Inject templates      │           │
│  │  - Track loaded modules  │           │
│  │                          ├───────────┘
│  └─ Violation Tracking      │  Memory sync
│     - Log violations        │
│     - Suggest corrections   │
│     - Update CLAUDE.md      │
│                              │
└──────────────────────────────┘
```

## MCP Server Specification

### Server Metadata

```json
{
  "name": "smart-agents-orchestrator",
  "version": "1.0.0",
  "description": "Session orchestration and guideline enforcement for Claude Code",
  "capabilities": {
    "tools": true,
    "resources": true,
    "prompts": true,
    "sampling": false
  }
}
```

### Tools

#### 1. `session_start`
**Purpose**: Initialize session monitoring and load initial context

```typescript
interface SessionStartInput {
  projectPath: string;
  sessionId?: string;  // Auto-generated if not provided
  config?: {
    claudeMdInterval?: number;  // Minutes, default 60
    memoryInterval?: number;    // Minutes, default 30
    autoLoadGuides?: boolean;   // Default true
    strictMode?: boolean;       // Enforce violations, default false
  };
}

interface SessionStartOutput {
  sessionId: string;
  startTime: string;
  config: SessionConfig;
  loadedGuides: string[];
  initialContext: {
    claudeMdDigest: string;     // MD5 of CLAUDE.md
    projectType: string;        // Detected from package.json/files
    activeSkills: string[];     // Available skills
  };
}
```

**Implementation**:
```typescript
async function session_start(input: SessionStartInput): Promise<SessionStartOutput> {
  const sessionId = input.sessionId || generateSessionId();

  // 1. Load CLAUDE.md and compute digest
  const claudeMd = await fs.readFile('~/.claude/CLAUDE.md', 'utf-8');
  const digest = md5(claudeMd);

  // 2. Detect project type
  const projectType = await detectProjectType(input.projectPath);

  // 3. Auto-load relevant guides
  const guides = input.config?.autoLoadGuides
    ? await loadRelevantGuides(projectType, input.projectPath)
    : [];

  // 4. Start background monitors
  startPeriodicTasks(sessionId, input.config);

  // 5. Record session start in MCP Memory
  await mcpMemory.create({
    type: 'session_start',
    sessionId,
    timestamp: new Date().toISOString(),
    projectPath: input.projectPath,
    projectType
  });

  return {
    sessionId,
    startTime: new Date().toISOString(),
    config: mergeConfig(DEFAULT_CONFIG, input.config),
    loadedGuides: guides.map(g => g.name),
    initialContext: {
      claudeMdDigest: digest,
      projectType,
      activeSkills: await listSkills()
    }
  };
}
```

#### 2. `inject_claudemd`
**Purpose**: Manually trigger CLAUDE.md re-injection or get scheduled injection status

```typescript
interface InjectClaudeMdInput {
  sessionId: string;
  force?: boolean;  // Force injection even if not scheduled
  sections?: string[];  // Only inject specific sections
}

interface InjectClaudeMdOutput {
  injected: boolean;
  timestamp: string;
  sections: string[];
  sizeBytes: number;
  timeSinceLastInjection: number;  // Minutes
}
```

**Implementation**:
```typescript
async function inject_claudemd(input: InjectClaudeMdInput): Promise<InjectClaudeMdOutput> {
  const session = getSession(input.sessionId);
  const lastInjection = session.lastClaudeMdInjection;
  const now = new Date();

  // Check if injection needed
  const timeSince = (now.getTime() - lastInjection.getTime()) / 60000;
  const shouldInject = input.force || timeSince >= session.config.claudeMdInterval;

  if (!shouldInject) {
    return {
      injected: false,
      timestamp: now.toISOString(),
      sections: [],
      sizeBytes: 0,
      timeSinceLastInjection: timeSince
    };
  }

  // Load CLAUDE.md
  const claudeMd = await fs.readFile('~/.claude/CLAUDE.md', 'utf-8');

  // Extract sections if specified
  const content = input.sections
    ? extractSections(claudeMd, input.sections)
    : claudeMd;

  // Inject via special resource that Claude Code monitors
  await injectContext(input.sessionId, {
    type: 'claudemd',
    content,
    priority: 'high',
    persistent: false  // Re-inject periodically
  });

  // Update session state
  session.lastClaudeMdInjection = now;
  await saveSession(session);

  return {
    injected: true,
    timestamp: now.toISOString(),
    sections: input.sections || ['all'],
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
    timeSinceLastInjection: timeSince
  };
}
```

#### 3. `update_memory`
**Purpose**: Trigger memory update with current session state

```typescript
interface UpdateMemoryInput {
  sessionId: string;
  includeContext?: boolean;  // Include loaded files/context
  tags?: string[];
}

interface UpdateMemoryOutput {
  success: boolean;
  entitiesCreated: number;
  relationsCreated: number;
  timestamp: string;
  summary: {
    toolsUsed: string[];
    filesModified: string[];
    decisionsMade: number;
    violationsDetected: number;
  };
}
```

**Implementation**:
```typescript
async function update_memory(input: UpdateMemoryInput): Promise<UpdateMemoryOutput> {
  const session = getSession(input.sessionId);

  // Capture current session state
  const state = {
    toolsUsed: session.toolCallLog.map(t => t.toolName),
    filesModified: session.fileModifications,
    decisions: session.decisions,
    violations: session.violations
  };

  // Create entities in Knowledge Graph
  const entities = [];

  // 1. Session progress entity
  entities.push({
    name: `Session ${input.sessionId} Progress ${new Date().toISOString()}`,
    entityType: 'session_progress',
    observations: [
      `Tools used: ${state.toolsUsed.join(', ')}`,
      `Files modified: ${state.filesModified.length}`,
      `Decisions made: ${state.decisions.length}`,
      `Violations detected: ${state.violations.length}`
    ]
  });

  // 2. Important decisions
  for (const decision of state.decisions) {
    entities.push({
      name: `Decision: ${decision.title}`,
      entityType: 'decision',
      observations: [
        `Reason: ${decision.reason}`,
        `Alternatives considered: ${decision.alternatives.join(', ')}`,
        `Outcome: ${decision.outcome || 'pending'}`
      ]
    });
  }

  // 3. Violations (for learning)
  for (const violation of state.violations) {
    entities.push({
      name: `Violation: ${violation.rule} at ${violation.timestamp}`,
      entityType: 'violation',
      observations: [
        `Rule violated: ${violation.rule}`,
        `What happened: ${violation.description}`,
        `How to prevent: ${violation.prevention}`
      ]
    });
  }

  // Create entities via MCP Memory
  const result = await mcpMemory.createEntities({ entities });

  // Create relations
  const relations = [];
  for (const entity of result.entities) {
    if (entity.entityType !== 'session_progress') {
      relations.push({
        from: entities[0].name,  // Session progress
        to: entity.name,
        relationType: 'occurred_during'
      });
    }
  }

  if (relations.length > 0) {
    await mcpMemory.createRelations({ relations });
  }

  // Update session timestamp
  session.lastMemoryUpdate = new Date();
  await saveSession(session);

  return {
    success: true,
    entitiesCreated: entities.length,
    relationsCreated: relations.length,
    timestamp: new Date().toISOString(),
    summary: {
      toolsUsed: [...new Set(state.toolsUsed)],
      filesModified: state.filesModified,
      decisionsMade: state.decisions.length,
      violationsDetected: state.violations.length
    }
  };
}
```

#### 4. `check_compliance`
**Purpose**: Check if session is following CLAUDE.md guidelines

```typescript
interface CheckComplianceInput {
  sessionId: string;
  rules?: string[];  // Specific rules to check, or all if not specified
}

interface CheckComplianceOutput {
  compliant: boolean;
  score: number;  // 0-100
  violations: Array<{
    rule: string;
    severity: 'critical' | 'major' | 'minor';
    description: string;
    suggestion: string;
  }>;
  recommendations: string[];
}
```

#### 5. `load_guide`
**Purpose**: Load a specific guide module from ~/.claude/guides/

```typescript
interface LoadGuideInput {
  sessionId: string;
  guideName: string;  // e.g., 'system-thinking-examples'
}

interface LoadGuideOutput {
  loaded: boolean;
  guidePath: string;
  sizeBytes: number;
  sections: string[];
}
```

#### 6. `session_end`
**Purpose**: Clean up session and generate final report

```typescript
interface SessionEndInput {
  sessionId: string;
  saveReport?: boolean;
}

interface SessionEndOutput {
  sessionId: string;
  duration: number;  // Minutes
  summary: {
    toolCalls: number;
    filesModified: number;
    testsRun: number;
    violations: number;
    memoryUpdates: number;
  };
  reportPath?: string;
}
```

### Resources

#### 1. `claudemd://current`
**Purpose**: Current CLAUDE.md content

```typescript
{
  uri: "claudemd://current",
  name: "Current CLAUDE.md",
  description: "Latest version of Claude Code guidelines",
  mimeType: "text/markdown"
}
```

#### 2. `guides://list`
**Purpose**: List all available guides

```typescript
{
  uri: "guides://list",
  name: "Available Guides",
  description: "List of all guides in ~/.claude/guides/",
  mimeType: "application/json"
}
```

#### 3. `session://{sessionId}/state`
**Purpose**: Current session state

```typescript
{
  uri: "session://abc123/state",
  name: "Session State",
  description: "Current state of session abc123",
  mimeType: "application/json"
}
```

### Prompts

#### 1. `session-start-reminder`
**Purpose**: Remind Claude about session start checklist

```typescript
{
  name: "session-start-reminder",
  description: "Session start checklist from CLAUDE.md",
  arguments: [
    {
      name: "projectType",
      description: "Type of project (frontend/backend/fullstack)",
      required: false
    }
  ]
}
```

**Template**:
```
⚡ Session Start Checklist ⚡

Based on your CLAUDE.md, you must:

1. Report previous session progress
2. Check CLAUDE.md file size and modules
3. Check MCP Memory health
4. Ask user for clarification if uncertain
5. Get explicit approval before starting work

{{#if projectType}}
Detected project type: {{projectType}}

Relevant guides:
{{#each guides}}
- {{this}}
{{/each}}
{{/if}}

Proceed with checklist execution.
```

#### 2. `violation-reminder`
**Purpose**: Remind about a specific rule violation

```typescript
{
  name: "violation-reminder",
  description: "Remind about a violated rule",
  arguments: [
    {
      name: "rule",
      description: "The rule that was violated",
      required: true
    },
    {
      name: "context",
      description: "Context of the violation",
      required: true
    }
  ]
}
```

## Implementation Plan

### Phase 1: Core Session Monitoring (Week 1)
- [x] MCP server scaffold (TypeScript + MCP SDK)
- [ ] `session_start` tool implementation
- [ ] `session_end` tool implementation
- [ ] Basic session state tracking
- [ ] File system integration for CLAUDE.md

### Phase 2: Periodic Tasks (Week 2)
- [ ] Background task scheduler
- [ ] `inject_claudemd` implementation with intervals
- [ ] `update_memory` implementation with intervals
- [ ] Integration with MCP Memory server
- [ ] Knowledge Graph entity creation

### Phase 3: Compliance Checking (Week 3)
- [ ] CLAUDE.md rule parser
- [ ] `check_compliance` implementation
- [ ] Violation detection heuristics
- [ ] Recommendation engine

### Phase 4: Advanced Features (Week 4)
- [ ] `load_guide` auto-loading based on context
- [ ] Resource providers (claudemd://, guides://, session://)
- [ ] Prompt templates
- [ ] Session recovery from crashes

### Phase 5: Testing & Documentation (Week 5)
- [ ] Unit tests (Vitest)
- [ ] Integration tests with Claude Code
- [ ] User documentation
- [ ] Example configurations

## Configuration

### ~/.claude/config.json

```json
{
  "mcpServers": {
    "smart-agents-orchestrator": {
      "command": "node",
      "args": [
        "/path/to/smart-agents/dist/mcp-session-orchestrator/index.js"
      ],
      "env": {
        "CLAUDEMD_PATH": "~/.claude/CLAUDE.md",
        "CLAUDEMD_INTERVAL": "60",
        "MEMORY_INTERVAL": "30",
        "GUIDES_PATH": "~/.claude/guides",
        "AUTO_LOAD_GUIDES": "true",
        "STRICT_MODE": "false",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Session-specific config

```json
{
  "sessionId": "abc123",
  "projectPath": "/Users/ktseng/Developer/Projects/smart-agents",
  "config": {
    "claudeMdInterval": 60,
    "memoryInterval": 30,
    "autoLoadGuides": true,
    "strictMode": false,
    "monitorTools": [
      "Edit",
      "Write",
      "Bash"
    ],
    "trackDecisions": true,
    "autoCheckCompliance": true
  }
}
```

## Usage Examples

### 1. Starting a Session

```typescript
// Claude Code internally calls this when session starts
await mcp.tools.call('session_start', {
  projectPath: '/Users/ktseng/Developer/Projects/smart-agents',
  config: {
    claudeMdInterval: 60,
    memoryInterval: 30,
    autoLoadGuides: true
  }
});

// Output:
// {
//   "sessionId": "20251227-213945-abc123",
//   "startTime": "2025-12-27T21:39:45Z",
//   "loadedGuides": ["system-thinking-examples", "devops-git-workflows"],
//   "initialContext": {
//     "projectType": "fullstack-typescript",
//     "activeSkills": ["brainstorming", "systematic-debugging", ...]
//   }
// }
```

### 2. Automatic CLAUDE.md Injection

```typescript
// Runs automatically every 60 minutes
// Or manually triggered:
await mcp.tools.call('inject_claudemd', {
  sessionId: "20251227-213945-abc123",
  sections: ["Anti-Hallucination Protocol", "Fix All Issues"]
});

// Claude receives context injection:
// "📋 Reminder: Anti-Hallucination Protocol
//  - NO CLAIMS WITHOUT EVIDENCE
//  - NO ASSUMPTIONS
//  - VERIFY EVERYTHING
//  ..."
```

### 3. Automatic Memory Updates

```typescript
// Runs automatically every 30 minutes
// Records session progress to Knowledge Graph
await mcp.tools.call('update_memory', {
  sessionId: "20251227-213945-abc123",
  tags: ["session-progress", "refactoring"]
});

// Creates entities:
// - Session Progress
// - Important Decisions
// - Violations (for learning)
```

### 4. Compliance Checking

```typescript
// Check if following guidelines
const compliance = await mcp.tools.call('check_compliance', {
  sessionId: "20251227-213945-abc123"
});

// Output:
// {
//   "compliant": false,
//   "score": 75,
//   "violations": [
//     {
//       "rule": "Read Before Edit",
//       "severity": "major",
//       "description": "Attempted to edit file without reading it first",
//       "suggestion": "Use Read tool before Edit tool"
//     }
//   ],
//   "recommendations": [
//     "Consider using systematic-debugging skill",
//     "Update memory with current progress"
//   ]
// }
```

## Benefits

1. **Prevents Rule Forgetting**: Periodic CLAUDE.md injection keeps guidelines fresh
2. **Session Continuity**: Automatic memory updates prevent context loss
3. **Proactive Guidance**: Compliance checking catches violations early
4. **Reduced Manual Overhead**: No more manual reminder to update memory
5. **Better Learning**: Violations tracked and analyzed for improvement
6. **Smart Context Loading**: Auto-loads relevant guides based on project type

## Security Considerations

1. **File System Access**: Limited to ~/.claude/ directory
2. **MCP Memory Access**: Uses existing MCP Memory server with access control
3. **Session Isolation**: Each session has unique ID and isolated state
4. **No Code Execution**: Only reads files and updates memory, no arbitrary code execution

## Future Enhancements

1. **AI-Powered Violation Detection**: Use LLM to analyze tool call patterns and detect subtle violations
2. **Session Recovery**: Auto-recover from crashes using last memory state
3. **Multi-Session Coordination**: Share learnings across parallel sessions
4. **Custom Rule Plugins**: Allow users to add custom compliance rules
5. **Performance Metrics**: Track how well guidelines improve over time
