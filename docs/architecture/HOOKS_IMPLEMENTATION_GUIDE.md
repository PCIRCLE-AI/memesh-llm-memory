# Hooks Implementation Guide [DEPRECATED]

> ⚠️ **DEPRECATION NOTICE**
> This hooks implementation has been **removed** as of 2025-12-30.
> The Claude Code hooks system (`session-start.js`, `post-tool-use.js`, `stop.js`) is no longer part of claude-code-buddy.
> This document is kept for historical reference only.

## Overview

This document provides detailed technical implementation guidance for the Claude Code Hooks system that **was previously used** in the claude-code-buddy project. This is a developer-focused guide for understanding the **deprecated** hooks system.

## Architecture

### Hook Types

The system implements three hooks that operate at different stages of a Claude Code session:

1. **SessionStart Hook** - Initialization and recommendation display
2. **PostToolUse Hook** - Silent observation and pattern detection
3. **Stop Hook** - Analysis, recommendation generation, and cleanup

### Design Principles

- **Non-blocking**: Hooks never interrupt the main Claude Code session
- **Graceful degradation**: Errors in hooks don't crash the session
- **State persistence**: All state stored in JSON files for cross-session learning
- **Observation mode**: PostToolUse runs silently without console output
- **Recommendation mode**: User manually invokes skills based on detected patterns

---

## SessionStart Hook

**File**: `~/.claude/hooks/session-start.js`

### Purpose

Display recommendations from the previous session and initialize current session state.

### Implementation Details

#### 1. File Structure

```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const STATE_DIR = path.join(process.env.HOME, '.claude', 'state');
const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');
const SESSION_CONTEXT_FILE = path.join(STATE_DIR, 'session-context.json');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');

async function main() {
  try {
    // 1. Read recommendations from last session
    const recommendations = readRecommendations();

    // 2. Display recommendations to user
    displayRecommendations(recommendations);

    // 3. Initialize current session state
    initializeSession();

  } catch (error) {
    console.error('⚠️ SessionStart hook encountered an error (non-blocking):', error.message);
  }
}

main();
```

#### 2. Reading Recommendations

```javascript
function readRecommendations() {
  // Check if recommendations file exists
  if (!fs.existsSync(RECOMMENDATIONS_FILE)) {
    console.log('📋 First time using, welcome!\n');
    return null;
  }

  // Read and parse recommendations
  const data = fs.readFileSync(RECOMMENDATIONS_FILE, 'utf-8');
  return JSON.parse(data);
}
```

#### 3. Displaying Recommendations

```javascript
function displayRecommendations(recommendations) {
  if (!recommendations) return;

  console.log('📚 Based on last session patterns, recommended skills to load:');

  // Display recommended skills
  if (recommendations.recommendedSkills && recommendations.recommendedSkills.length > 0) {
    recommendations.recommendedSkills.forEach(skill => {
      const icon = skill.priority === 'high' ? '🔴' : '🟡';
      console.log(`  ${icon} ${skill.name} (${skill.reason})`);
    });
    console.log('');
  }

  // Display detected patterns
  if (recommendations.detectedPatterns && recommendations.detectedPatterns.length > 0) {
    console.log('✅ Detected good patterns:');
    recommendations.detectedPatterns.forEach(pattern => {
      console.log(`  - ${pattern.description}`);
    });
    console.log('');
  }

  // Display warnings
  if (recommendations.warnings && recommendations.warnings.length > 0) {
    console.log('⚠️ Attention:');
    recommendations.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
    console.log('');
  }

  console.log('✅ Session initialized, let\'s start working!\n');
}
```

#### 4. Initializing Session

```javascript
function initializeSession() {
  // Ensure state directory exists
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  // Initialize current session state
  const sessionState = {
    startTime: new Date().toISOString(),
    toolCalls: [],
    patterns: []
  };

  fs.writeFileSync(
    CURRENT_SESSION_FILE,
    JSON.stringify(sessionState, null, 2),
    'utf-8'
  );
}
```

### Error Handling

- **Missing state directory**: Creates it automatically
- **Missing recommendations file**: Treats as first session, displays welcome message
- **Corrupt JSON**: Logs error, continues with empty state
- **All errors are non-blocking**: Session always starts successfully

---

## PostToolUse Hook

**File**: `~/.claude/hooks/post-tool-use.js`

### Purpose

Silent observer that detects patterns and anomalies during tool execution.

### Implementation Details

#### 1. File Structure

```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const STATE_DIR = path.join(process.env.HOME, '.claude', 'state');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');
const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');

// Timeout for stdin read (3 seconds)
const STDIN_TIMEOUT = 3000;

async function main() {
  try {
    // 1. Read tool execution data from stdin
    const toolData = await readStdin();

    // 2. Detect patterns
    const patterns = detectPatterns(toolData);

    // 3. Detect anomalies
    const anomalies = detectAnomalies(toolData);

    // 4. Update current session state
    updateCurrentSession(toolData, patterns, anomalies);

    // 5. Update recommendations incrementally
    updateRecommendations(patterns, anomalies);

  } catch (error) {
    // Silent failure - don't interrupt user workflow
    // Could log to a debug file if needed
  }
}

main();
```

#### 2. Reading Stdin with Timeout

```javascript
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    // Set timeout
    const timeout = setTimeout(() => {
      reject(new Error('Stdin read timeout'));
    }, STDIN_TIMEOUT);

    // Read from stdin
    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON from stdin'));
      }
    });
  });
}
```

#### 3. Pattern Detection

```javascript
function detectPatterns(toolData) {
  const patterns = [];

  // Pattern 1: READ_BEFORE_EDIT
  if (toolData.toolName === 'Edit') {
    const session = readCurrentSession();
    const recentReads = session.toolCalls
      .slice(-5)
      .filter(call => call.toolName === 'Read');

    const matchingRead = recentReads.find(read =>
      read.arguments?.file_path === toolData.arguments?.file_path
    );

    if (matchingRead) {
      patterns.push({
        type: 'READ_BEFORE_EDIT',
        description: 'Correctly read file before editing',
        severity: 'info'
      });
    } else {
      patterns.push({
        type: 'EDIT_WITHOUT_READ',
        description: 'Edited file without reading first (violation)',
        severity: 'warning'
      });
    }
  }

  // Pattern 2: Git workflow
  if (['Bash'].includes(toolData.toolName)) {
    const command = toolData.arguments?.command || '';
    if (command.includes('git commit') || command.includes('git push')) {
      patterns.push({
        type: 'GIT_WORKFLOW',
        description: 'Git operation detected',
        severity: 'info'
      });
    }
  }

  // Pattern 3: Frontend work
  if (toolData.arguments?.file_path) {
    const filePath = toolData.arguments.file_path;
    if (filePath.includes('/frontend/') ||
        filePath.endsWith('.tsx') ||
        filePath.endsWith('.jsx') ||
        filePath.endsWith('.css')) {
      patterns.push({
        type: 'FRONTEND_WORK',
        description: 'Frontend file modification',
        severity: 'info'
      });
    }
  }

  // Pattern 4: Search pattern (multiple Grep/Glob)
  if (['Grep', 'Glob'].includes(toolData.toolName)) {
    const session = readCurrentSession();
    const recentSearches = session.toolCalls
      .slice(-10)
      .filter(call => ['Grep', 'Glob'].includes(call.toolName));

    if (recentSearches.length >= 3) {
      patterns.push({
        type: 'INTENSIVE_SEARCH',
        description: 'Multiple search operations (exploring codebase)',
        severity: 'info'
      });
    }
  }

  return patterns;
}
```

#### 4. Anomaly Detection

```javascript
function detectAnomalies(toolData) {
  const anomalies = [];

  // Anomaly 1: Slow execution (> 5 seconds)
  if (toolData.duration > 5000) {
    anomalies.push({
      type: 'SLOW_EXECUTION',
      description: `Tool ${toolData.toolName} took ${toolData.duration}ms (>5s)`,
      severity: 'warning',
      toolName: toolData.toolName,
      duration: toolData.duration
    });
  }

  // Anomaly 2: High token usage (> 10,000 tokens)
  if (toolData.tokensUsed && toolData.tokensUsed > 10000) {
    anomalies.push({
      type: 'HIGH_TOKEN_USAGE',
      description: `Tool ${toolData.toolName} used ${toolData.tokensUsed} tokens (>10K)`,
      severity: 'warning',
      toolName: toolData.toolName,
      tokensUsed: toolData.tokensUsed
    });
  }

  // Anomaly 3: Execution failure
  if (toolData.success === false) {
    anomalies.push({
      type: 'EXECUTION_FAILURE',
      description: `Tool ${toolData.toolName} failed`,
      severity: 'error',
      toolName: toolData.toolName
    });
  }

  // Anomaly 4: Quota warning (check session context)
  const sessionContext = readSessionContext();
  if (sessionContext && sessionContext.tokenQuota) {
    const usagePercent = (sessionContext.tokenQuota.used / sessionContext.tokenQuota.limit) * 100;
    if (usagePercent > 80) {
      anomalies.push({
        type: 'QUOTA_WARNING',
        description: `Token quota at ${usagePercent.toFixed(1)}% (>80%)`,
        severity: 'warning',
        usagePercent
      });
    }
  }

  return anomalies;
}
```

#### 5. Updating Current Session

```javascript
function updateCurrentSession(toolData, patterns, anomalies) {
  const session = readCurrentSession();

  // Append tool call
  session.toolCalls.push({
    timestamp: new Date().toISOString(),
    toolName: toolData.toolName,
    duration: toolData.duration,
    success: toolData.success,
    tokenUsage: toolData.tokensUsed || 0,
    arguments: toolData.arguments
  });

  // Append patterns
  if (patterns.length > 0) {
    session.patterns.push(...patterns);
  }

  // Save updated session
  fs.writeFileSync(
    CURRENT_SESSION_FILE,
    JSON.stringify(session, null, 2),
    'utf-8'
  );
}
```

#### 6. Updating Recommendations

```javascript
function updateRecommendations(patterns, anomalies) {
  let recommendations = {};

  // Read existing recommendations
  if (fs.existsSync(RECOMMENDATIONS_FILE)) {
    const data = fs.readFileSync(RECOMMENDATIONS_FILE, 'utf-8');
    recommendations = JSON.parse(data);
  } else {
    recommendations = {
      recommendedSkills: [],
      detectedPatterns: [],
      warnings: [],
      lastUpdated: null
    };
  }

  // Add new patterns (dedup by description)
  patterns.forEach(pattern => {
    const exists = recommendations.detectedPatterns.some(p =>
      p.description === pattern.description
    );
    if (!exists && pattern.severity === 'info') {
      recommendations.detectedPatterns.push({
        description: pattern.description,
        suggestion: getPatternSuggestion(pattern.type),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add warnings from anomalies
  anomalies.forEach(anomaly => {
    if (anomaly.severity === 'warning' || anomaly.severity === 'error') {
      const warningText = anomaly.description;
      if (!recommendations.warnings.includes(warningText)) {
        recommendations.warnings.push(warningText);
      }
    }
  });

  // Update timestamp
  recommendations.lastUpdated = new Date().toISOString();

  // Save recommendations
  fs.writeFileSync(
    RECOMMENDATIONS_FILE,
    JSON.stringify(recommendations, null, 2),
    'utf-8'
  );
}

function getPatternSuggestion(patternType) {
  const suggestions = {
    'READ_BEFORE_EDIT': 'Continue maintaining READ_BEFORE_EDIT best practice',
    'GIT_WORKFLOW': 'Consider loading devops-git-workflows skill',
    'FRONTEND_WORK': 'Consider loading frontend-design skill',
    'INTENSIVE_SEARCH': 'Consider using @smart-router for analysis when exploring code'
  };
  return suggestions[patternType] || '';
}
```

### Error Handling

- **Stdin timeout**: Silently fail, don't block session
- **Invalid JSON**: Silently fail, log to debug file (optional)
- **File I/O errors**: Graceful degradation
- **All errors are silent**: Never interrupt user workflow

---

## Stop Hook

**File**: `~/.claude/hooks/stop.js`

### Purpose

Analyze session patterns, generate recommendations, save state, and clean up.

### Implementation Details

#### 1. Main Flow

```javascript
async function main() {
  try {
    console.log('\n📊 Analyzing session...\n');

    // 1. Load session state
    const sessionState = loadSessionState();

    // 2. Analyze tool patterns
    const patterns = analyzeToolPatterns(sessionState);

    // 3. Generate session summary
    const summary = generateSessionSummary(sessionState, patterns);

    // 4. Display summary to user
    displaySessionSummary(summary);

    // 5. Save recommendations for next session
    saveRecommendations(patterns, sessionState);

    // 6. Update session context
    updateSessionContext(sessionState);

    // 7. Archive current session
    archiveSession(sessionState);

    // 8. Cleanup background processes
    cleanupProcesses();

    console.log('\n✅ Session ended. See you next time!\n');

  } catch (error) {
    console.error('⚠️ Stop hook encountered an error (non-blocking):', error.message);
  }
}
```

#### 2. Pattern Analysis

```javascript
function analyzeToolPatterns(sessionState) {
  const patterns = {
    readBeforeEdit: 0,
    editWithoutRead: 0,
    gitOperations: 0,
    frontendWork: 0,
    searchOperations: 0,
    slowTools: [],
    failedTools: []
  };

  // Analyze patterns from tool calls
  sessionState.toolCalls.forEach((call, index) => {
    // Check READ_BEFORE_EDIT pattern
    if (call.toolName === 'Edit') {
      const recentReads = sessionState.toolCalls
        .slice(Math.max(0, index - 5), index)
        .filter(c => c.toolName === 'Read');

      const matchingRead = recentReads.find(read =>
        read.arguments?.file_path === call.arguments?.file_path
      );

      if (matchingRead) {
        patterns.readBeforeEdit++;
      } else {
        patterns.editWithoutRead++;
      }
    }

    // Check Git operations
    if (call.toolName === 'Bash') {
      const command = call.arguments?.command || '';
      if (command.includes('git ')) {
        patterns.gitOperations++;
      }
    }

    // Check frontend work
    const filePath = call.arguments?.file_path || '';
    if (filePath.includes('/frontend/') ||
        filePath.endsWith('.tsx') ||
        filePath.endsWith('.jsx')) {
      patterns.frontendWork++;
    }

    // Check search operations
    if (['Grep', 'Glob'].includes(call.toolName)) {
      patterns.searchOperations++;
    }

    // Check slow tools
    if (call.duration > 5000) {
      patterns.slowTools.push({
        toolName: call.toolName,
        duration: call.duration,
        timestamp: call.timestamp
      });
    }

    // Check failed tools
    if (call.success === false) {
      patterns.failedTools.push({
        toolName: call.toolName,
        timestamp: call.timestamp
      });
    }
  });

  return patterns;
}
```

#### 3. Generating Recommendations

```javascript
function saveRecommendations(patterns, sessionState) {
  const recommendations = {
    recommendedSkills: [],
    detectedPatterns: [],
    warnings: [],
    lastUpdated: new Date().toISOString()
  };

  // Recommend skills based on patterns
  if (patterns.gitOperations >= 5) {
    recommendations.recommendedSkills.push({
      name: 'devops-git-workflows',
      reason: `Last session: ${patterns.gitOperations} Git operations`,
      priority: 'high'
    });
  }

  if (patterns.frontendWork >= 3) {
    recommendations.recommendedSkills.push({
      name: 'frontend-design',
      reason: `Last session: modified ${patterns.frontendWork} frontend files`,
      priority: 'high'
    });
  }

  // Add detected good patterns
  if (patterns.readBeforeEdit > 0) {
    recommendations.detectedPatterns.push({
      description: `${patterns.readBeforeEdit} times correctly Read before Edit`,
      suggestion: 'Continue maintaining READ_BEFORE_EDIT best practice',
      timestamp: new Date().toISOString()
    });
  }

  // Add warnings
  if (patterns.editWithoutRead > 0) {
    recommendations.warnings.push(
      `${patterns.editWithoutRead} times Edit without Read first (recommended to improve)`
    );
  }

  if (patterns.slowTools.length > 0) {
    recommendations.warnings.push(
      `${patterns.slowTools.length} tools took more than 5 seconds to execute`
    );
  }

  if (patterns.failedTools.length > 0) {
    recommendations.warnings.push(
      `${patterns.failedTools.length} tools failed execution`
    );
  }

  // Save to file
  fs.writeFileSync(
    RECOMMENDATIONS_FILE,
    JSON.stringify(recommendations, null, 2),
    'utf-8'
  );
}
```

---

## State File Specifications

### 1. current-session.json

**Purpose**: Track active session state

**Schema**:
```typescript
interface CurrentSession {
  startTime: string;  // ISO 8601 timestamp
  toolCalls: ToolCall[];
  patterns: Pattern[];
}

interface ToolCall {
  timestamp: string;
  toolName: string;
  duration: number;  // milliseconds
  success: boolean;
  tokenUsage: number;
  arguments: Record<string, any>;
}

interface Pattern {
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}
```

**Example**:
```json
{
  "startTime": "2025-12-30T10:00:00.000Z",
  "toolCalls": [
    {
      "timestamp": "2025-12-30T10:05:00.000Z",
      "toolName": "Read",
      "duration": 145,
      "success": true,
      "tokenUsage": 3200,
      "arguments": {
        "file_path": "/path/to/file.ts"
      }
    },
    {
      "timestamp": "2025-12-30T10:06:30.000Z",
      "toolName": "Edit",
      "duration": 523,
      "success": true,
      "tokenUsage": 1800,
      "arguments": {
        "file_path": "/path/to/file.ts",
        "old_string": "const x = 1;",
        "new_string": "const x = 2;"
      }
    }
  ],
  "patterns": [
    {
      "type": "READ_BEFORE_EDIT",
      "description": "Correctly read file before editing",
      "severity": "info"
    }
  ]
}
```

### 2. recommendations.json

**Purpose**: Store recommendations for next session

**Schema**:
```typescript
interface Recommendations {
  recommendedSkills: RecommendedSkill[];
  detectedPatterns: DetectedPattern[];
  warnings: string[];
  lastUpdated: string;  // ISO 8601 timestamp
}

interface RecommendedSkill {
  name: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface DetectedPattern {
  description: string;
  suggestion: string;
  timestamp: string;
}
```

**Example**:
```json
{
  "recommendedSkills": [
    {
      "name": "devops-git-workflows",
      "reason": "Last session: 8 Git operations",
      "priority": "high"
    },
    {
      "name": "frontend-design",
      "reason": "Last session: modified 5 frontend files",
      "priority": "high"
    }
  ],
  "detectedPatterns": [
    {
      "description": "12 times correctly Read before Edit",
      "suggestion": "Continue maintaining READ_BEFORE_EDIT best practice",
      "timestamp": "2025-12-30T11:00:00.000Z"
    }
  ],
  "warnings": [
    "2 tools took more than 5 seconds to execute",
    "Token quota usage 85%"
  ],
  "lastUpdated": "2025-12-30T11:00:00.000Z"
}
```

### 3. session-context.json

**Purpose**: Track quota and cross-session context

**Schema**:
```typescript
interface SessionContext {
  tokenQuota: {
    used: number;
    limit: number;
  };
  learnedPatterns: LearnedPattern[];
  lastSessionDate: string;
}

interface LearnedPattern {
  type: string;
  description: string;
  severity: string;
}
```

**Example**:
```json
{
  "tokenQuota": {
    "used": 45230,
    "limit": 200000
  },
  "learnedPatterns": [
    {
      "type": "READ_BEFORE_EDIT",
      "description": "Multiple Read before Edit is correct behavior",
      "severity": "info"
    }
  ],
  "lastSessionDate": "2025-12-30T11:00:00.000Z"
}
```

---

## Testing

### Unit Tests

#### Test SessionStart Hook

```bash
# Create mock recommendations file
cat > ~/.claude/state/recommendations.json << 'EOF'
{
  "recommendedSkills": [
    {
      "name": "devops-git-workflows",
      "reason": "Last execution: 8 Git operations",
      "priority": "high"
    }
  ],
  "detectedPatterns": [
    {
      "description": "Multiple Read before Edit - correct behavior",
      "suggestion": "Continue maintaining",
      "timestamp": "2025-12-30T10:00:00Z"
    }
  ],
  "warnings": [
    "2 tools took more than 5 seconds to execute"
  ],
  "lastUpdated": "2025-12-30T10:00:00Z"
}
EOF

# Run session-start hook
node ~/.claude/hooks/session-start.js

# Verify current-session.json was created
cat ~/.claude/state/current-session.json
```

#### Test PostToolUse Hook

```bash
# Create mock tool data
echo '{
  "toolName": "Read",
  "duration": 145,
  "success": true,
  "tokensUsed": 3200,
  "arguments": {
    "file_path": "/path/to/file.ts"
  }
}' | node ~/.claude/hooks/post-tool-use.js

# Verify current-session.json was updated
cat ~/.claude/state/current-session.json | jq '.toolCalls | length'
```

#### Test Stop Hook

```bash
# Create mock session data
cat > ~/.claude/state/current-session.json << 'EOF'
{
  "startTime": "2025-12-30T10:00:00.000Z",
  "toolCalls": [
    {"toolName": "Read", "duration": 100, "success": true, "arguments": {"file_path": "/file.ts"}},
    {"toolName": "Edit", "duration": 200, "success": true, "arguments": {"file_path": "/file.ts"}},
    {"toolName": "Bash", "duration": 500, "success": true, "arguments": {"command": "git commit -m 'test'"}}
  ],
  "patterns": []
}
EOF

# Run stop hook
node ~/.claude/hooks/stop.js

# Verify recommendations.json was created/updated
cat ~/.claude/state/recommendations.json | jq .
```

### Integration Test

**End-to-End Session Flow**:

```bash
# 1. Clean state
rm -rf ~/.claude/state/*.json

# 2. Start session
node ~/.claude/hooks/session-start.js
# Should display: "📋 First time using, welcome!"

# 3. Simulate tool executions
echo '{"toolName":"Read","duration":100,"success":true,"tokensUsed":2000,"arguments":{"file_path":"/test.ts"}}' | \
  node ~/.claude/hooks/post-tool-use.js

echo '{"toolName":"Edit","duration":200,"success":true,"tokensUsed":1500,"arguments":{"file_path":"/test.ts"}}' | \
  node ~/.claude/hooks/post-tool-use.js

echo '{"toolName":"Bash","duration":300,"success":true,"tokensUsed":500,"arguments":{"command":"git commit"}}' | \
  node ~/.claude/hooks/post-tool-use.js

# 4. End session
node ~/.claude/hooks/stop.js

# 5. Verify state files
ls -la ~/.claude/state/
cat ~/.claude/state/recommendations.json | jq .

# 6. Start new session
node ~/.claude/hooks/session-start.js
# Should display recommendations from previous session
```

---

## Troubleshooting

### Common Issues

#### 1. Hooks Not Executing

**Symptoms**: Hooks don't run when expected

**Diagnosis**:
```bash
# Check hook configuration
cat ~/.claude/settings.local.json | jq '.hooks'

# Verify hook files exist and are executable
ls -la ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.js
```

**Solution**:
- Ensure hooks are registered in `settings.local.json`
- Make sure hook files have execute permissions
- Check hook paths are absolute

#### 2. State Files Corrupt

**Symptoms**: Hooks fail with JSON parse errors

**Diagnosis**:
```bash
# Validate JSON files
jq . ~/.claude/state/current-session.json
jq . ~/.claude/state/recommendations.json
jq . ~/.claude/state/session-context.json
```

**Solution**:
```bash
# Backup corrupt files
mv ~/.claude/state/current-session.json ~/.claude/state/current-session.json.bak

# Delete and let hooks recreate
rm ~/.claude/state/*.json
```

#### 3. Recommendations Not Showing

**Symptoms**: SessionStart doesn't display recommendations

**Diagnosis**:
```bash
# Check if recommendations file exists
ls -la ~/.claude/state/recommendations.json

# Check file contents
cat ~/.claude/state/recommendations.json | jq .

# Check SessionStart console output
node ~/.claude/hooks/session-start.js
```

**Solution**:
- Verify recommendations.json format matches schema
- Ensure SessionStart hook is executing (check logs)
- Run Stop hook manually to generate recommendations

#### 4. PostToolUse Missing Patterns

**Symptoms**: Patterns not being detected

**Diagnosis**:
```bash
# Enable debug mode (modify post-tool-use.js)
# Add console.log statements to pattern detection logic

# Test pattern detection manually
echo '{"toolName":"Edit","arguments":{"file_path":"/test.ts"},"duration":100,"success":true}' | \
  node ~/.claude/hooks/post-tool-use.js

# Check current-session.json
cat ~/.claude/state/current-session.json | jq '.patterns'
```

**Solution**:
- Verify tool data format matches expected schema
- Check pattern detection logic
- Ensure lookback window is sufficient (5-10 recent tools)

---

## Extension Guide

### Adding New Pattern Detection

**Example**: Detect API endpoint modifications

```javascript
// In post-tool-use.js, add to detectPatterns()

// Pattern: API endpoint work
if (toolData.arguments?.file_path) {
  const filePath = toolData.arguments.file_path;
  if (filePath.includes('/api/') ||
      filePath.includes('/routes/') ||
      filePath.includes('/controllers/')) {
    patterns.push({
      type: 'API_ENDPOINT_WORK',
      description: 'API endpoint modification detected',
      severity: 'info'
    });
  }
}

// In stop.js, add to saveRecommendations()

if (patterns.apiEndpointWork >= 3) {
  recommendations.recommendedSkills.push({
    name: 'system-thinking-examples',
    reason: `Last session: modified ${patterns.apiEndpointWork} API endpoints`,
    priority: 'high'
  });
}
```

### Adding New Anomaly Detection

**Example**: Detect excessive retries

```javascript
// In post-tool-use.js, add to detectAnomalies()

// Check for retry pattern
const session = readCurrentSession();
const recentSameToolCalls = session.toolCalls
  .slice(-5)
  .filter(call =>
    call.toolName === toolData.toolName &&
    call.success === false
  );

if (recentSameToolCalls.length >= 3) {
  anomalies.push({
    type: 'EXCESSIVE_RETRIES',
    description: `Tool ${toolData.toolName} failed 3+ times in a row`,
    severity: 'error',
    toolName: toolData.toolName,
    retryCount: recentSameToolCalls.length
  });
}
```

### Adding New Skill Recommendations

**Example**: Recommend testing-guide skill

```javascript
// In stop.js, modify saveRecommendations()

// Count test file modifications
let testFileModifications = 0;
sessionState.toolCalls.forEach(call => {
  const filePath = call.arguments?.file_path || '';
  if (filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('__tests__/')) {
    testFileModifications++;
  }
});

if (testFileModifications >= 2) {
  recommendations.recommendedSkills.push({
    name: 'testing-guide',
    reason: `Last session: modified ${testFileModifications} test files`,
    priority: 'medium'
  });
}
```

---

## Performance Considerations

### File I/O Optimization

- **Batch writes**: Update state files once per tool execution
- **Minimize reads**: Cache session state in memory within a hook run
- **Async I/O**: Use async file operations where possible
- **Size limits**: Archive old sessions to keep files small

### Memory Management

- **Limit toolCalls array**: Keep last 100-200 tool calls only
- **Prune old patterns**: Remove patterns older than 7 days
- **Clear archived sessions**: Delete sessions older than 30 days

### Execution Time

- **Target**: Each hook should complete in < 500ms
- **SessionStart**: Simple read + display (< 100ms)
- **PostToolUse**: Pattern detection (< 200ms)
- **Stop**: Analysis + save (< 500ms)

---

## Security Considerations

### Input Validation

- **Sanitize stdin data**: Validate JSON schema before processing
- **Path validation**: Ensure file paths are within allowed directories
- **Command injection**: Don't execute user-provided commands

### File Permissions

```bash
# State directory should be user-only
chmod 700 ~/.claude/state/

# State files should be user read/write only
chmod 600 ~/.claude/state/*.json

# Hook scripts should be user-executable only
chmod 700 ~/.claude/hooks/*.js
```

### Sensitive Data

- **Never log tool arguments**: May contain sensitive data
- **Sanitize file paths**: Remove user-specific paths before saving
- **Don't save tool results**: Results may contain secrets

---

## Debugging

### Enable Debug Logging

Create debug log file:

```javascript
// Add to each hook
const DEBUG = process.env.CLAUDE_HOOKS_DEBUG === 'true';
const DEBUG_LOG = path.join(STATE_DIR, 'hooks-debug.log');

function debugLog(message) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DEBUG_LOG, `[${timestamp}] ${message}\n`);
  }
}

// Use throughout code
debugLog('SessionStart: Loading recommendations...');
debugLog(`PostToolUse: Detected ${patterns.length} patterns`);
```

Enable debug mode:

```bash
export CLAUDE_HOOKS_DEBUG=true
```

### View Debug Logs

```bash
tail -f ~/.claude/state/hooks-debug.log
```

---

## References

- **MCP Integration**: `/Users/ktseng/Developer/Projects/claude-code-buddy/docs/MCP_INTEGRATION.md` (replaces hooks-based integration)
- **Hooks README**: `~/.claude/hooks/README.md`
- **Smart-Router Skill**: `~/.claude/skills/smart-router/skill.md`
- **Smart-Orchestrator Skill**: `~/.claude/skills/smart-orchestrator/skill.md`

---

**Version**: 1.0.0
**Last Updated**: 2025-12-30
**Status**: Implemented
