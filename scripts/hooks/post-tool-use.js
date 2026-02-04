#!/usr/bin/env node

/**
 * PostToolUse Hook - Claude Code Event-Driven Hooks
 *
 * Triggered after each tool execution in Claude Code.
 *
 * Features (Silent Observer):
 * - Reads tool execution data from stdin
 * - Detects patterns (READ_BEFORE_EDIT, Git workflows, Frontend work, Search patterns)
 * - Detects anomalies (slow execution, high tokens, failures, quota warnings)
 * - Updates recommendations.json incrementally
 * - Updates current-session.json
 * - Auto-saves key points to MeMesh when token threshold reached
 * - Runs silently (no console output - non-intrusive)
 */

import {
  STATE_DIR,
  MEMESH_DB_PATH,
  THRESHOLDS,
  readJSONFile,
  writeJSONFile,
  sqliteQuery,
  readStdin,
  logError,
  logMemorySave,
  getDateString,
} from './hook-utils.js';
import fs from 'fs';
import path from 'path';

// ============================================================================
// File Paths
// ============================================================================

const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');
const SESSION_CONTEXT_FILE = path.join(STATE_DIR, 'session-context.json');

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Pattern Detector - Analyzes tool usage patterns
 */
class PatternDetector {
  constructor() {
    this.recentTools = [];
  }

  /**
   * Add a tool call to the recent tools list
   * @param {Object} toolData - Tool execution data
   */
  addToolCall(toolData) {
    this.recentTools.push({
      toolName: toolData.toolName,
      args: toolData.arguments,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 10 (using slice instead of shift for better performance)
    if (this.recentTools.length > 10) {
      this.recentTools = this.recentTools.slice(-10);
    }
  }

  /**
   * Detect patterns in recent tool usage
   * @param {Object} currentTool - Current tool execution data
   * @returns {Array} Detected patterns
   */
  detectPatterns(currentTool) {
    const patterns = [];

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
            description: 'Read before Edit - correct behavior',
            severity: 'info',
          });
        } else {
          patterns.push({
            type: 'EDIT_WITHOUT_READ',
            description: `Edit ${path.basename(filePath)} without prior Read`,
            severity: 'warning',
          });
        }
      }
    }

    // Pattern 2: Git Workflow
    const gitCommands = ['git add', 'git commit', 'git push', 'git branch', 'git checkout'];
    if (currentTool.toolName === 'Bash' && toolArgs.command) {
      const cmd = toolArgs.command;
      if (gitCommands.some(gitCmd => cmd.includes(gitCmd))) {
        const recentGitOps = this.recentTools.filter(t =>
          t.toolName === 'Bash' && gitCommands.some(gc => t.args?.command?.includes(gc))
        ).length;

        if (recentGitOps >= 2) {
          patterns.push({
            type: 'GIT_WORKFLOW',
            description: `Git workflow detected (${recentGitOps + 1} operations)`,
            severity: 'info',
            suggestion: 'Consider loading devops-git-workflows skill',
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
            description: `Frontend work detected (${recentFrontendOps + 1} files)`,
            severity: 'info',
            suggestion: 'Consider loading frontend-design skill',
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
          description: `Multiple search operations (${recentSearches + 1} times)`,
          severity: 'info',
        });
      }
    }

    return patterns;
  }
}

// ============================================================================
// Anomaly Detection
// ============================================================================

/**
 * Detect anomalies in tool execution
 * @param {Object} toolData - Tool execution data
 * @param {Object} sessionContext - Session context with quota info
 * @returns {Array} Detected anomalies
 */
function detectAnomalies(toolData, sessionContext) {
  const anomalies = [];

  // Anomaly 1: Slow Execution
  if (toolData.duration && toolData.duration > THRESHOLDS.SLOW_EXECUTION) {
    anomalies.push({
      type: 'SLOW_EXECUTION',
      description: `${toolData.toolName} took ${(toolData.duration / 1000).toFixed(1)}s (slow)`,
      severity: 'warning',
    });
  }

  // Anomaly 2: High Token Usage
  if (toolData.tokensUsed && toolData.tokensUsed > THRESHOLDS.HIGH_TOKENS) {
    anomalies.push({
      type: 'HIGH_TOKENS',
      description: `${toolData.toolName} used ${toolData.tokensUsed} tokens (high usage)`,
      severity: 'warning',
    });
  }

  // Anomaly 3: Execution Failure
  if (toolData.success === false) {
    anomalies.push({
      type: 'EXECUTION_FAILURE',
      description: `${toolData.toolName} execution failed`,
      severity: 'error',
    });
  }

  // Anomaly 4: Quota Warning
  if (sessionContext.tokenQuota) {
    const quotaUsed = sessionContext.tokenQuota.used + (toolData.tokensUsed || 0);
    const quotaPercentage = quotaUsed / sessionContext.tokenQuota.limit;

    if (quotaPercentage > THRESHOLDS.QUOTA_WARNING) {
      anomalies.push({
        type: 'QUOTA_WARNING',
        description: `Token quota at ${(quotaPercentage * 100).toFixed(1)}%`,
        severity: 'warning',
      });
    }
  }

  return anomalies;
}

// ============================================================================
// Recommendations Update
// ============================================================================

/**
 * Update recommendations based on detected patterns and anomalies
 * @param {Array} patterns - Detected patterns
 * @param {Array} anomalies - Detected anomalies
 */
function updateRecommendations(patterns, anomalies) {
  const recommendations = readJSONFile(RECOMMENDATIONS_FILE, {
    recommendedSkills: [],
    detectedPatterns: [],
    warnings: [],
    lastUpdated: null,
  });

  // Add new skills based on patterns
  patterns.forEach(pattern => {
    if (pattern.suggestion && pattern.suggestion.includes('skill')) {
      const skillMatch = pattern.suggestion.match(/loading\s+(.+?)\s+skill/);
      if (skillMatch) {
        const skillName = skillMatch[1];
        const existing = recommendations.recommendedSkills.find(s => s.name === skillName);
        if (!existing) {
          recommendations.recommendedSkills.push({
            name: skillName,
            reason: pattern.description,
            priority: 'medium',
          });
        }
      }
    }
  });

  // Add detected patterns (keep last 10)
  patterns.forEach(pattern => {
    if (pattern && pattern.description) {
      recommendations.detectedPatterns.unshift({
        description: pattern.description,
        suggestion: pattern.suggestion || '',
        timestamp: new Date().toISOString(),
      });
    }
  });
  recommendations.detectedPatterns = recommendations.detectedPatterns.slice(0, 10);

  // Add warnings from anomalies (keep last 5)
  anomalies
    .filter(a => a.severity === 'warning' || a.severity === 'error')
    .forEach(anomaly => {
      recommendations.warnings.unshift(anomaly.description);
    });
  recommendations.warnings = recommendations.warnings.slice(0, 5);

  recommendations.lastUpdated = new Date().toISOString();

  writeJSONFile(RECOMMENDATIONS_FILE, recommendations);
}

// ============================================================================
// Session Update
// ============================================================================

/**
 * Update current session with tool call data
 * @param {Object} toolData - Tool execution data
 * @param {Array} patterns - Detected patterns
 * @param {Array} anomalies - Detected anomalies
 */
function updateCurrentSession(toolData, patterns, anomalies) {
  const currentSession = readJSONFile(CURRENT_SESSION_FILE, {
    startTime: new Date().toISOString(),
    toolCalls: [],
    patterns: [],
  });

  // Add tool call record
  currentSession.toolCalls.push({
    timestamp: new Date().toISOString(),
    toolName: toolData.toolName,
    arguments: toolData.arguments,
    duration: toolData.duration,
    success: toolData.success,
    tokenUsage: toolData.tokensUsed,
  });

  // Update pattern counts
  patterns.forEach(pattern => {
    const existing = currentSession.patterns.find(p => p.type === pattern.type);
    if (!existing) {
      currentSession.patterns.push({
        type: pattern.type,
        count: 1,
        firstDetected: new Date().toISOString(),
      });
    } else {
      existing.count++;
    }
  });

  writeJSONFile(CURRENT_SESSION_FILE, currentSession);

  return currentSession;
}

/**
 * Update session context (quota tracking)
 * @param {Object} toolData - Tool execution data
 * @returns {Object} Updated session context
 */
function updateSessionContext(toolData) {
  const sessionContext = readJSONFile(SESSION_CONTEXT_FILE, {
    tokenQuota: { used: 0, limit: 200000 },
    learnedPatterns: [],
    lastSessionDate: null,
    lastSaveTokens: 0,
  });

  // Update token usage
  if (toolData.tokensUsed) {
    sessionContext.tokenQuota.used += toolData.tokensUsed;
  }

  sessionContext.lastSessionDate = new Date().toISOString();

  writeJSONFile(SESSION_CONTEXT_FILE, sessionContext);

  return sessionContext;
}

// ============================================================================
// MeMesh Key Points Auto-Save
// ============================================================================

/**
 * Extract key points from session state
 * @param {Object} sessionState - Current session state
 * @returns {Array<string>} Extracted key points
 */
function extractKeyPoints(sessionState) {
  const keyPoints = [];

  if (!sessionState?.toolCalls?.length) {
    return keyPoints;
  }

  // 1. Identify completed file operations
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

  // 2. Identify failures
  const failures = sessionState.toolCalls.filter(tc => tc.success === false);
  if (failures.length > 0) {
    const failedTools = [...new Set(failures.map(f => f.toolName))];
    keyPoints.push(`[PROBLEM] ${failures.length} tool failures: ${failedTools.join(', ')}`);
  }

  // 3. Git operations
  const gitCommits = sessionState.toolCalls.filter(tc =>
    tc.toolName === 'Bash' && tc.arguments?.command?.includes('git commit')
  );
  if (gitCommits.length > 0) {
    keyPoints.push(`[DECISION] Made ${gitCommits.length} git commit(s)`);
  }

  // 4. Detected patterns
  if (sessionState.patterns?.length > 0) {
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
 * Save conversation key points to MeMesh knowledge graph
 * @param {Object} sessionState - Current session state
 * @param {Object} sessionContext - Session context
 * @returns {boolean} True if saved successfully
 */
function saveConversationKeyPoints(sessionState, sessionContext) {
  try {
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      logError('saveConversationKeyPoints', `MeMesh DB not found: ${MEMESH_DB_PATH}`);
      return false;
    }

    const keyPoints = extractKeyPoints(sessionState);
    if (keyPoints.length === 0) {
      return false;
    }

    const now = new Date().toISOString();
    const entityName = `session_keypoints_${Date.now()}`;

    const metadata = JSON.stringify({
      tokensSaved: sessionContext.tokenQuota?.used || 0,
      toolCount: sessionState.toolCalls?.length || 0,
      saveReason: 'token_threshold',
    });

    // Create entity using parameterized query
    const insertEntity = 'INSERT INTO entities (name, type, created_at, metadata) VALUES (?, ?, ?, ?)';
    sqliteQuery(MEMESH_DB_PATH, insertEntity, [entityName, 'session_keypoint', now, metadata]);

    // Get the entity ID using parameterized query
    const entityIdResult = sqliteQuery(
      MEMESH_DB_PATH,
      'SELECT id FROM entities WHERE name = ?',
      [entityName]
    );

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
    const tags = ['auto_saved', 'token_trigger', getDateString()];
    for (const tag of tags) {
      const insertTag = 'INSERT INTO tags (entity_id, tag) VALUES (?, ?)';
      sqliteQuery(MEMESH_DB_PATH, insertTag, [entityId, tag]);
    }

    logMemorySave(`🧠 MeMesh: Saved ${keyPoints.length} key points (tokens: ${sessionContext.tokenQuota?.used})`);

    return true;
  } catch (error) {
    logError('saveConversationKeyPoints', error);
    return false;
  }
}

/**
 * Check if token threshold reached and save key points
 * @param {Object} sessionState - Current session state
 * @param {Object} sessionContext - Session context
 * @returns {boolean} True if saved
 */
function checkAndSaveKeyPoints(sessionState, sessionContext) {
  try {
    const lastSaveTokens = sessionContext.lastSaveTokens || 0;
    const currentTokens = sessionContext.tokenQuota?.used || 0;
    const tokensSinceLastSave = currentTokens - lastSaveTokens;

    if (tokensSinceLastSave >= THRESHOLDS.TOKEN_SAVE) {
      const saved = saveConversationKeyPoints(sessionState, sessionContext);

      if (saved) {
        sessionContext.lastSaveTokens = currentTokens;
        writeJSONFile(SESSION_CONTEXT_FILE, sessionContext);
      }

      return saved;
    }

    return false;
  } catch (error) {
    logError('checkAndSaveKeyPoints', error);
    return false;
  }
}

// ============================================================================
// Tool Data Normalization
// ============================================================================

/**
 * Normalize tool data from Claude Code format
 * @param {Object} raw - Raw tool data from stdin
 * @returns {Object} Normalized tool data
 */
function normalizeToolData(raw) {
  return {
    toolName: raw.tool_name || raw.toolName || 'unknown',
    arguments: raw.tool_input || raw.arguments || {},
    duration: raw.duration_ms || raw.duration || 0,
    success: raw.success !== false,
    tokensUsed: raw.tokens_used || raw.tokensUsed || 0,
    _raw: raw,
  };
}

// ============================================================================
// Main PostToolUse Logic
// ============================================================================

async function postToolUse() {
  try {
    // Read stdin with timeout
    const input = await readStdin(3000);

    if (!input || input.trim() === '') {
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
        arguments: tc.arguments || {},
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
    const updatedSession = updateCurrentSession(toolData, patterns, anomalies);

    // Check token threshold and save key points if needed
    checkAndSaveKeyPoints(updatedSession, sessionContext);

    // Silent exit
    process.exit(0);
  } catch (error) {
    logError('PostToolUse', error);
    process.exit(1);
  }
}

// ============================================================================
// Execute
// ============================================================================

postToolUse();
