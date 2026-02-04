#!/usr/bin/env node

/**
 * PostToolUse Hook - Claude Code Event-Driven Hooks
 *
 * Triggered after each tool execution in Claude Code.
 *
 * Functionality (Silent Observer):
 * - Reads tool execution data from stdin
 * - Detects patterns (READ_BEFORE_EDIT, Git workflows, Frontend work, Search patterns)
 * - Detects anomalies (slow execution, high tokens, failures, quota warnings)
 * - Updates recommendations.json incrementally
 * - Updates current-session.json
 * - Runs silently (no console output - non-intrusive)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(process.env.HOME, '.claude', 'state');

const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');
const SESSION_CONTEXT_FILE = path.join(STATE_DIR, 'session-context.json');

// Thresholds
const SLOW_EXECUTION_THRESHOLD = 5000; // 5 seconds
const HIGH_TOKEN_THRESHOLD = 10000;     // 10K tokens
const QUOTA_WARNING_THRESHOLD = 0.8;    // 80%
const TOKEN_SAVE_THRESHOLD = 250_000; // Save key points every 250K tokens

// MeMesh Knowledge Graph path
const MEMESH_DB_PATH = path.join(process.env.HOME, '.claude-code-buddy', 'knowledge-graph.db');

/**
 * Read JSON file with error handling
 */
function readJSONFile(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Silent fail - write to error log instead of console
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
      `[${new Date().toISOString()}] Read error ${path.basename(filePath)}: ${error.message}\n`);
  }
  return defaultValue;
}

/**
 * Write JSON file with error handling
 */
function writeJSONFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
      `[${new Date().toISOString()}] Write error ${path.basename(filePath)}: ${error.message}\n`);
    return false;
  }
}

/**
 * Read stdin with timeout protection
 */
function readStdin(timeout = 3000) {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => {
      reject(new Error('Stdin read timeout'));
    }, timeout);

    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });

    process.stdin.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Pattern Detection Logic
 */
class PatternDetector {
  constructor() {
    this.recentTools = []; // Keep last 10 tool calls
  }

  addToolCall(toolData) {
    this.recentTools.push({
      toolName: toolData.toolName,
      args: toolData.arguments,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10
    if (this.recentTools.length > 10) {
      this.recentTools.shift();
    }
  }

  detectPatterns(currentTool) {
    const patterns = [];

    // Safety check - ensure currentTool has required properties
    if (!currentTool || !currentTool.toolName) {
      return patterns;
    }

    const toolArgs = currentTool.arguments || {};

    // Pattern 1: READ_BEFORE_EDIT
    if (currentTool.toolName === 'Edit') {
      const filePath = toolArgs.file_path;
      if (filePath) {
        const recentReads = this.recentTools.filter(t =>
          t.toolName === 'Read' && t.args?.file_path === filePath
        );
        if (recentReads.length > 0) {
          patterns.push({
            type: 'READ_BEFORE_EDIT',
            description: '先 Read 再 Edit - 正確行為',
            severity: 'info'
          });
        } else {
          patterns.push({
            type: 'EDIT_WITHOUT_READ',
            description: `Edit ${path.basename(filePath)} 前未 Read`,
            severity: 'warning'
          });
        }
      }
    }

    // Pattern 2: Git Workflow
    const gitTools = ['git add', 'git commit', 'git push', 'git branch', 'git checkout'];
    if (currentTool.toolName === 'Bash' && toolArgs.command) {
      const cmd = toolArgs.command;
      if (gitTools.some(gitCmd => cmd.includes(gitCmd))) {
        const recentGitOps = this.recentTools.filter(t =>
          t.toolName === 'Bash' && gitTools.some(gc => t.args?.command?.includes(gc))
        ).length;

        if (recentGitOps >= 2) {
          patterns.push({
            type: 'GIT_WORKFLOW',
            description: `檢測到 Git 工作流程（${recentGitOps + 1} 次操作）`,
            severity: 'info',
            suggestion: '建議載入 devops-git-workflows skill'
          });
        }
      }
    }

    // Pattern 3: Frontend Work
    const frontendExtensions = ['.tsx', '.jsx', '.vue', '.svelte', '.css', '.scss'];
    if (['Edit', 'Write', 'Read'].includes(currentTool.toolName)) {
      const filePath = toolArgs.file_path;
      if (filePath && frontendExtensions.some(ext => filePath.endsWith(ext))) {
        const recentFrontendOps = this.recentTools.filter(t =>
          ['Edit', 'Write', 'Read'].includes(t.toolName) &&
          frontendExtensions.some(ext => t.args?.file_path?.endsWith(ext))
        ).length;

        if (recentFrontendOps >= 2) {
          patterns.push({
            type: 'FRONTEND_WORK',
            description: `檢測到前端工作（${recentFrontendOps + 1} 個前端檔案）`,
            severity: 'info',
            suggestion: '建議載入 frontend-design skill'
          });
        }
      }
    }

    // Pattern 4: Intensive Search
    if (['Grep', 'Glob'].includes(currentTool.toolName)) {
      const recentSearches = this.recentTools.filter(t =>
        ['Grep', 'Glob'].includes(t.toolName)
      ).length;

      if (recentSearches >= 3) {
        patterns.push({
          type: 'INTENSIVE_SEARCH',
          description: `多次搜尋操作（${recentSearches + 1} 次）`,
          severity: 'info'
        });
      }
    }

    return patterns;
  }
}

/**
 * Anomaly Detection Logic
 */
function detectAnomalies(toolData, sessionContext) {
  const anomalies = [];

  // Anomaly 1: Slow Execution
  if (toolData.duration && toolData.duration > SLOW_EXECUTION_THRESHOLD) {
    anomalies.push({
      type: 'SLOW_EXECUTION',
      description: `${toolData.toolName} 執行時間 ${(toolData.duration / 1000).toFixed(1)}s（慢速）`,
      severity: 'warning'
    });
  }

  // Anomaly 2: High Token Usage
  if (toolData.tokensUsed && toolData.tokensUsed > HIGH_TOKEN_THRESHOLD) {
    anomalies.push({
      type: 'HIGH_TOKENS',
      description: `${toolData.toolName} 使用 ${toolData.tokensUsed} tokens（高用量）`,
      severity: 'warning'
    });
  }

  // Anomaly 3: Execution Failure
  if (toolData.success === false) {
    anomalies.push({
      type: 'EXECUTION_FAILURE',
      description: `${toolData.toolName} 執行失敗`,
      severity: 'error'
    });
  }

  // Anomaly 4: Quota Warning
  if (sessionContext.tokenQuota) {
    const quotaUsed = sessionContext.tokenQuota.used + (toolData.tokensUsed || 0);
    const quotaPercentage = quotaUsed / sessionContext.tokenQuota.limit;

    if (quotaPercentage > QUOTA_WARNING_THRESHOLD) {
      anomalies.push({
        type: 'QUOTA_WARNING',
        description: `Token 配額使用 ${(quotaPercentage * 100).toFixed(1)}%`,
        severity: 'warning'
      });
    }
  }

  return anomalies;
}

/**
 * Update recommendations incrementally
 */
function updateRecommendations(patterns, anomalies) {
  const recommendations = readJSONFile(RECOMMENDATIONS_FILE, {
    recommendedSkills: [],
    detectedPatterns: [],
    warnings: [],
    lastUpdated: null
  });

  // Add new skills based on patterns
  patterns.forEach(pattern => {
    if (pattern.suggestion && pattern.suggestion.includes('skill')) {
      const skillMatch = pattern.suggestion.match(/載入\s+(.+?)\s+skill/);
      if (skillMatch) {
        const skillName = skillMatch[1];
        const existing = recommendations.recommendedSkills.find(s => s.name === skillName);
        if (!existing) {
          recommendations.recommendedSkills.push({
            name: skillName,
            reason: pattern.description,
            priority: 'medium'
          });
        }
      }
    }
  });

  // Add detected patterns (keep last 10) - only if valid
  patterns.forEach(pattern => {
    // Skip patterns with undefined or empty descriptions
    if (!pattern || !pattern.description) {
      return;
    }
    recommendations.detectedPatterns.unshift({
      description: pattern.description,
      suggestion: pattern.suggestion || '',
      timestamp: new Date().toISOString()
    });
  });
  recommendations.detectedPatterns = recommendations.detectedPatterns.slice(0, 10);

  // Add warnings from anomalies (keep last 5)
  anomalies.filter(a => a.severity === 'warning' || a.severity === 'error').forEach(anomaly => {
    recommendations.warnings.unshift(anomaly.description);
  });
  recommendations.warnings = recommendations.warnings.slice(0, 5);

  recommendations.lastUpdated = new Date().toISOString();

  writeJSONFile(RECOMMENDATIONS_FILE, recommendations);
}

/**
 * Update current session
 */
function updateCurrentSession(toolData, patterns, anomalies) {
  const currentSession = readJSONFile(CURRENT_SESSION_FILE, {
    startTime: new Date().toISOString(),
    toolCalls: [],
    patterns: []
  });

  // Add tool call record (including arguments for pattern detection)
  currentSession.toolCalls.push({
    timestamp: new Date().toISOString(),
    toolName: toolData.toolName,
    arguments: toolData.arguments, // IMPORTANT: Save arguments for pattern detection
    duration: toolData.duration,
    success: toolData.success,
    tokenUsage: toolData.tokensUsed
  });

  // Add patterns
  patterns.forEach(pattern => {
    const existing = currentSession.patterns.find(p => p.type === pattern.type);
    if (!existing) {
      currentSession.patterns.push({
        type: pattern.type,
        count: 1,
        firstDetected: new Date().toISOString()
      });
    } else {
      existing.count++;
    }
  });

  writeJSONFile(CURRENT_SESSION_FILE, currentSession);
}

/**
 * Update session context (quota tracking)
 */
function updateSessionContext(toolData) {
  const sessionContext = readJSONFile(SESSION_CONTEXT_FILE, {
    tokenQuota: {
      used: 0,
      limit: 200000
    },
    learnedPatterns: [],
    lastSessionDate: null
  });

  // Update token usage
  if (toolData.tokensUsed) {
    sessionContext.tokenQuota.used += toolData.tokensUsed;
  }

  sessionContext.lastSessionDate = new Date().toISOString();

  writeJSONFile(SESSION_CONTEXT_FILE, sessionContext);

  return sessionContext;
}

/**
 * Execute SQLite query with parameterized values (SQL injection safe)
 */
function sqliteQuery(dbPath, query, params = []) {
  try {
    let finalQuery = query;

    // Replace ? placeholders with escaped values
    if (params.length > 0) {
      let paramIndex = 0;
      finalQuery = query.replace(/\?/g, () => {
        if (paramIndex < params.length) {
          const val = params[paramIndex++];
          if (val === null || val === undefined) return 'NULL';
          return `'${String(val).replace(/'/g, "''")}'`;
        }
        return '?';
      });
    }

    const result = execFileSync('sqlite3', [dbPath, finalQuery], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim();
  } catch {
    return '';
  }
}

/**
 * Save conversation key points to MeMesh knowledge graph
 * Triggered when cumulative tokens reach TOKEN_SAVE_THRESHOLD
 */
async function saveConversationKeyPoints(sessionState, sessionContext) {
  try {
    // Check if MeMesh DB exists
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
        `[${new Date().toISOString()}] MeMesh DB not found: ${MEMESH_DB_PATH}\n`);
      return false;
    }

    // Extract key points from session
    const keyPoints = extractKeyPoints(sessionState);
    if (keyPoints.length === 0) {
      return false;
    }

    const now = new Date().toISOString();
    const entityName = `session_keypoints_${Date.now()}`;

    // Create entity for this checkpoint
    const insertEntity = `INSERT INTO entities (name, type, created_at, metadata)
      VALUES (?, 'session_keypoint', ?, ?)`;

    const metadata = JSON.stringify({
      tokensSaved: sessionContext.tokenQuota?.used || 0,
      toolCount: sessionState.toolCalls?.length || 0,
      saveReason: 'token_threshold'
    });

    sqliteQuery(MEMESH_DB_PATH, insertEntity, [entityName, now, metadata]);

    // Get the entity ID
    const entityIdResult = execFileSync('sqlite3', [
      MEMESH_DB_PATH,
      `SELECT id FROM entities WHERE name = '${entityName.replace(/'/g, "''")}'`
    ], { encoding: 'utf-8', timeout: 5000 }).trim();

    const entityId = parseInt(entityIdResult, 10);
    if (isNaN(entityId)) {
      return false;
    }

    // Add observations for each key point
    for (const point of keyPoints) {
      const insertObs = 'INSERT INTO observations (entity_id, content, created_at) VALUES (?, ?, ?)';
      sqliteQuery(MEMESH_DB_PATH, insertObs, [entityId, point, now]);
    }

    // Add tags for easier retrieval
    const tags = ['auto_saved', 'token_trigger', new Date().toISOString().split('T')[0]];
    for (const tag of tags) {
      const insertTag = 'INSERT INTO tags (entity_id, tag) VALUES (?, ?)';
      sqliteQuery(MEMESH_DB_PATH, insertTag, [entityId, tag]);
    }

    // Log success
    fs.appendFileSync(path.join(STATE_DIR, 'memory-saves.log'),
      `[${now}] 🧠 MeMesh: Saved ${keyPoints.length} key points (tokens: ${sessionContext.tokenQuota?.used})\n`);

    return true;
  } catch (error) {
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
      `[${new Date().toISOString()}] saveConversationKeyPoints error: ${error.message}\n`);
    return false;
  }
}

/**
 * Extract key points from session state
 * Focus on: completed tasks, problems encountered, decisions made, lessons learned
 */
function extractKeyPoints(sessionState) {
  const keyPoints = [];

  if (!sessionState || !sessionState.toolCalls || sessionState.toolCalls.length === 0) {
    return keyPoints;
  }

  // 1. Identify completed file operations (likely tasks)
  const fileOps = {};
  sessionState.toolCalls.forEach(tc => {
    if (['Edit', 'Write'].includes(tc.toolName) && tc.arguments?.file_path) {
      const filePath = tc.arguments.file_path;
      fileOps[filePath] = (fileOps[filePath] || 0) + 1;
    }
  });

  const modifiedFiles = Object.keys(fileOps);
  if (modifiedFiles.length > 0) {
    const summary = modifiedFiles.length > 5
      ? `${modifiedFiles.slice(0, 5).map(f => path.basename(f)).join(', ')} (+${modifiedFiles.length - 5} more)`
      : modifiedFiles.map(f => path.basename(f)).join(', ');
    keyPoints.push(`[TASK] Modified files: ${summary}`);
  }

  // 2. Identify failures (problems)
  const failures = sessionState.toolCalls.filter(tc => tc.success === false);
  if (failures.length > 0) {
    const failedTools = [...new Set(failures.map(f => f.toolName))];
    keyPoints.push(`[PROBLEM] ${failures.length} tool failures: ${failedTools.join(', ')}`);
  }

  // 3. Git operations (decisions/commits)
  const gitCommits = sessionState.toolCalls.filter(tc =>
    tc.toolName === 'Bash' && tc.arguments?.command?.includes('git commit')
  );
  if (gitCommits.length > 0) {
    keyPoints.push(`[DECISION] Made ${gitCommits.length} git commit(s)`);
  }

  // 4. Detected patterns from session
  if (sessionState.patterns && sessionState.patterns.length > 0) {
    const patternSummary = sessionState.patterns
      .filter(p => p.count > 2)
      .map(p => `${p.type}(${p.count})`)
      .join(', ');
    if (patternSummary) {
      keyPoints.push(`[PATTERN] Recurring patterns: ${patternSummary}`);
    }
  }

  // 5. Work scope indicator
  const toolCounts = {};
  sessionState.toolCalls.forEach(tc => {
    toolCounts[tc.toolName] = (toolCounts[tc.toolName] || 0) + 1;
  });
  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tool, count]) => `${tool}:${count}`)
    .join(', ');
  keyPoints.push(`[SCOPE] Tool usage: ${topTools}, total: ${sessionState.toolCalls.length}`);

  return keyPoints;
}

/**
 * Check if token threshold reached and save key points
 */
async function checkAndSaveKeyPoints(sessionState, sessionContext) {
  try {
    // Get last save token count from session context
    const lastSaveTokens = sessionContext.lastSaveTokens || 0;
    const currentTokens = sessionContext.tokenQuota?.used || 0;
    const tokensSinceLastSave = currentTokens - lastSaveTokens;

    // Check if threshold reached
    if (tokensSinceLastSave >= TOKEN_SAVE_THRESHOLD) {
      const saved = await saveConversationKeyPoints(sessionState, sessionContext);

      if (saved) {
        // Update lastSaveTokens in session context
        sessionContext.lastSaveTokens = currentTokens;
        writeJSONFile(SESSION_CONTEXT_FILE, sessionContext);
      }

      return saved;
    }

    return false;
  } catch (error) {
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
      `[${new Date().toISOString()}] checkAndSaveKeyPoints error: ${error.message}\n`);
    return false;
  }
}

/**
 * Integrate with Smart-Agents Development Butler (if installed)
 */
async function integrateWithButler(toolData) {
  try {
    const smartAgentsPath = path.join(process.env.HOME, 'Developer', 'Projects', 'smart-agents');
    const hookIntegrationPath = path.join(smartAgentsPath, 'dist', 'core', 'HookIntegration.js');

    // Check if Smart-Agents is installed
    if (!fs.existsSync(hookIntegrationPath)) {
      return; // Smart-agents not installed, skip
    }

    // Dynamically import HookIntegration
    const { HookIntegration } = await import(hookIntegrationPath);
    const { CheckpointDetector } = await import(path.join(smartAgentsPath, 'dist', 'core', 'CheckpointDetector.js'));
    const { DevelopmentButler } = await import(path.join(smartAgentsPath, 'dist', 'agents', 'DevelopmentButler.js'));
    const { MCPToolInterface } = await import(path.join(smartAgentsPath, 'dist', 'core', 'MCPToolInterface.js'));

    // Initialize butler components
    const toolInterface = new MCPToolInterface();
    const checkpointDetector = new CheckpointDetector();
    const butler = new DevelopmentButler(checkpointDetector, toolInterface);
    const integration = new HookIntegration(checkpointDetector, butler);

    // Process tool use
    await integration.processToolUse(toolData);
  } catch (error) {
    // Silent fail - log error without disrupting hook execution
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
      `[${new Date().toISOString()}] Butler integration error: ${error.message}\n`);
  }
}

/**
 * Normalize tool data from Claude Code format
 * Claude sends: tool_name, tool_input, etc. (snake_case)
 * We expect: toolName, arguments, etc. (camelCase)
 */
function normalizeToolData(raw) {
  return {
    toolName: raw.tool_name || raw.toolName || 'unknown',
    arguments: raw.tool_input || raw.arguments || {},
    duration: raw.duration_ms || raw.duration || 0,
    success: raw.success !== false, // default to true
    tokensUsed: raw.tokens_used || raw.tokensUsed || 0,
    // Preserve original data
    _raw: raw
  };
}

/**
 * Main PostToolUse logic
 */
async function postToolUse() {
  try {
    // Read stdin with timeout
    const input = await readStdin(3000);

    if (!input || input.trim() === '') {
      // No input - exit silently
      process.exit(0);
    }

    // Parse and normalize tool data
    const rawData = JSON.parse(input);
    const toolData = normalizeToolData(rawData);

    // Initialize pattern detector
    const detector = new PatternDetector();

    // Load recent tools from current session
    const currentSession = readJSONFile(CURRENT_SESSION_FILE, { toolCalls: [] });
    currentSession.toolCalls.slice(-10).forEach(tc => {
      detector.addToolCall({
        toolName: tc.toolName,
        arguments: tc.arguments || {}
      });
    });

    // Add current tool
    detector.addToolCall(toolData);

    // Detect patterns
    const patterns = detector.detectPatterns(toolData);

    // Update session context (for quota tracking)
    const sessionContext = updateSessionContext(toolData);

    // Detect anomalies
    const anomalies = detectAnomalies(toolData, sessionContext);

    // Update recommendations incrementally
    if (patterns.length > 0 || anomalies.length > 0) {
      updateRecommendations(patterns, anomalies);
    }

    // Update current session
    updateCurrentSession(toolData, patterns, anomalies);

    // Integrate with Smart-Agents Development Butler (if installed)
    await integrateWithButler(toolData);

    // Check token threshold and save key points if needed
    await checkAndSaveKeyPoints(currentSession, sessionContext);

    // Silent exit - no console output
    process.exit(0);
  } catch (error) {
    // Log error silently
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
      `[${new Date().toISOString()}] PostToolUse error: ${error.message}\n`);
    process.exit(1);
  }
}

// Execute
postToolUse();
