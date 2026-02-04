#!/usr/bin/env node

/**
 * Stop Hook - Claude Code Event-Driven Hooks
 *
 * Triggered when a Claude Code session ends (normal or forced termination).
 *
 * Features:
 * - Analyzes current session's tool patterns and workflows
 * - Generates recommendations for next session
 * - Updates session context (quota, learned patterns)
 * - Saves session key points to MeMesh
 * - Cleans up old key points (>30 days retention)
 * - Displays session summary with patterns and suggestions
 * - Archives current session data
 */

import {
  STATE_DIR,
  MEMESH_DB_PATH,
  THRESHOLDS,
  readJSONFile,
  writeJSONFile,
  sqliteQuery,
  calculateDuration,
  getDateString,
  ensureDir,
  logError,
} from './hook-utils.js';
import fs from 'fs';
import path from 'path';

// ============================================================================
// File Paths
// ============================================================================

const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');
const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');
const SESSION_CONTEXT_FILE = path.join(STATE_DIR, 'session-context.json');
const SESSIONS_ARCHIVE_DIR = path.join(STATE_DIR, 'sessions');

// Ensure archive directory exists
if (!fs.existsSync(SESSIONS_ARCHIVE_DIR)) {
  fs.mkdirSync(SESSIONS_ARCHIVE_DIR, { recursive: true });
}

// ============================================================================
// Pattern Analysis
// ============================================================================

/**
 * Analyze tool patterns from session state
 * @param {Object} sessionState - Current session state
 * @returns {Array} Detected patterns
 */
function analyzeToolPatterns(sessionState) {
  const patterns = [];

  if (!sessionState.toolCalls || sessionState.toolCalls.length === 0) {
    return patterns;
  }

  // Count tool frequency
  const toolFrequency = {};
  sessionState.toolCalls.forEach(tc => {
    toolFrequency[tc.toolName] = (toolFrequency[tc.toolName] || 0) + 1;
  });

  // Find most used tools
  const mostUsedTools = Object.entries(toolFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (mostUsedTools.length > 0) {
    patterns.push({
      type: 'MOST_USED_TOOLS',
      description: mostUsedTools.map(([tool, count]) => `${tool} (${count}x)`).join(', '),
      severity: 'info',
    });
  }

  // Check READ_BEFORE_EDIT compliance
  let editWithoutRead = 0;
  let editWithRead = 0;

  for (let i = 0; i < sessionState.toolCalls.length; i++) {
    const tool = sessionState.toolCalls[i];
    if (tool.toolName === 'Edit') {
      const recentReads = sessionState.toolCalls
        .slice(Math.max(0, i - 5), i)
        .filter(t => t.toolName === 'Read');

      if (recentReads.length > 0) {
        editWithRead++;
      } else {
        editWithoutRead++;
      }
    }
  }

  if (editWithRead + editWithoutRead > 0) {
    const compliance = (editWithRead / (editWithRead + editWithoutRead) * 100).toFixed(0);
    patterns.push({
      type: 'READ_BEFORE_EDIT_COMPLIANCE',
      description: `READ_BEFORE_EDIT compliance: ${compliance}%`,
      severity: compliance >= 80 ? 'info' : 'warning',
      suggestion: compliance < 80 ? 'Read files before editing to avoid errors' : 'Good practice!',
    });
  }

  // Detect Git workflow
  const gitOps = sessionState.toolCalls.filter(tc =>
    tc.toolName === 'Bash' && ['git add', 'git commit', 'git push', 'git branch'].some(cmd =>
      tc.arguments?.command?.includes(cmd)
    )
  );

  if (gitOps.length >= 3) {
    patterns.push({
      type: 'GIT_WORKFLOW',
      description: `Executed ${gitOps.length} Git operations`,
      severity: 'info',
      suggestion: 'Consider loading devops-git-workflows skill next time',
    });
  }

  // Detect frontend work
  const frontendOps = sessionState.toolCalls.filter(tc =>
    ['Edit', 'Write', 'Read'].includes(tc.toolName) &&
    ['.tsx', '.jsx', '.vue', '.css'].some(ext => tc.arguments?.file_path?.endsWith(ext))
  );

  if (frontendOps.length >= 5) {
    patterns.push({
      type: 'FRONTEND_WORK',
      description: `Modified ${frontendOps.length} frontend files`,
      severity: 'info',
      suggestion: 'Consider loading frontend-design skill next time',
    });
  }

  // Detect slow operations
  const slowOps = sessionState.toolCalls.filter(tc => tc.duration && tc.duration > THRESHOLDS.SLOW_EXECUTION);
  if (slowOps.length > 0) {
    patterns.push({
      type: 'SLOW_OPERATIONS',
      description: `${slowOps.length} tools took >5 seconds`,
      severity: 'warning',
      suggestion: 'Consider optimizing these operations or using faster alternatives',
    });
  }

  // Detect failures
  const failures = sessionState.toolCalls.filter(tc => tc.success === false);
  if (failures.length > 0) {
    patterns.push({
      type: 'EXECUTION_FAILURES',
      description: `${failures.length} tool executions failed`,
      severity: 'error',
      suggestion: 'Review and fix failure causes',
    });
  }

  return patterns;
}

// ============================================================================
// Recommendations
// ============================================================================

/**
 * Save recommendations for next session
 * @param {Array} patterns - Detected patterns
 * @param {Object} sessionState - Current session state
 */
function saveRecommendations(patterns, sessionState) {
  const recommendations = readJSONFile(RECOMMENDATIONS_FILE, {
    recommendedSkills: [],
    detectedPatterns: [],
    warnings: [],
    lastUpdated: null,
  });

  // Add skill recommendations based on patterns
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
            priority: pattern.type.includes('GIT') || pattern.type.includes('FRONTEND') ? 'high' : 'medium',
          });
        }
      }
    }
  });

  // Keep only top 5 skills
  recommendations.recommendedSkills = recommendations.recommendedSkills.slice(0, 5);

  // Merge patterns with existing (keep last 10)
  patterns.forEach(pattern => {
    recommendations.detectedPatterns.unshift({
      description: pattern.description,
      suggestion: pattern.suggestion || '',
      timestamp: new Date().toISOString(),
    });
  });
  recommendations.detectedPatterns = recommendations.detectedPatterns.slice(0, 10);

  // Add warnings from error/warning severity patterns
  patterns.filter(p => p.severity === 'warning' || p.severity === 'error').forEach(pattern => {
    if (pattern.suggestion) {
      recommendations.warnings.unshift(pattern.suggestion);
    } else {
      recommendations.warnings.unshift(pattern.description);
    }
  });
  recommendations.warnings = recommendations.warnings.slice(0, 5);

  recommendations.lastUpdated = new Date().toISOString();

  writeJSONFile(RECOMMENDATIONS_FILE, recommendations);
}

// ============================================================================
// Session Context Update
// ============================================================================

/**
 * Update session context (quota, patterns)
 * @param {Object} sessionState - Current session state
 * @returns {Object} Updated session context
 */
function updateSessionContext(sessionState) {
  const sessionContext = readJSONFile(SESSION_CONTEXT_FILE, {
    tokenQuota: { used: 0, limit: 200000 },
    learnedPatterns: [],
    lastSessionDate: null,
  });

  // Calculate total token usage from session
  let totalTokens = 0;
  if (sessionState.toolCalls) {
    sessionState.toolCalls.forEach(tc => {
      if (tc.tokenUsage) {
        totalTokens += tc.tokenUsage;
      }
    });
  }

  // Update quota
  sessionContext.tokenQuota.used = Math.min(
    sessionContext.tokenQuota.used + totalTokens,
    sessionContext.tokenQuota.limit
  );

  // Add learned patterns
  if (sessionState.patterns) {
    sessionState.patterns.forEach(pattern => {
      const existing = sessionContext.learnedPatterns.find(p => p.type === pattern.type);
      if (!existing) {
        sessionContext.learnedPatterns.push({
          type: pattern.type,
          count: pattern.count,
          lastSeen: new Date().toISOString(),
        });
      } else {
        existing.count += pattern.count;
        existing.lastSeen = new Date().toISOString();
      }
    });
  }

  sessionContext.lastSessionDate = new Date().toISOString();

  writeJSONFile(SESSION_CONTEXT_FILE, sessionContext);

  return sessionContext;
}

// ============================================================================
// MeMesh Memory Save
// ============================================================================

/**
 * Extract comprehensive key points from session for end summary
 * @param {Object} sessionState - Current session state
 * @param {Array} patterns - Analyzed patterns
 * @returns {Array<string>} Key points
 */
function extractSessionKeyPoints(sessionState, patterns) {
  const keyPoints = [];

  if (!sessionState) {
    return keyPoints;
  }

  // 1. Session overview
  const duration = calculateDuration(sessionState.startTime);
  const toolCount = sessionState.toolCalls?.length || 0;
  keyPoints.push(`[SESSION] Duration: ${duration}, Tools used: ${toolCount}`);

  // 2. Files modified (task summary)
  if (sessionState.toolCalls) {
    const fileOps = {};
    sessionState.toolCalls.forEach(tc => {
      if (['Edit', 'Write'].includes(tc.toolName) && tc.arguments?.file_path) {
        const filePath = tc.arguments.file_path;
        fileOps[filePath] = (fileOps[filePath] || 0) + 1;
      }
    });

    const modifiedFiles = Object.keys(fileOps);
    if (modifiedFiles.length > 0) {
      // Group by directory
      const dirs = {};
      modifiedFiles.forEach(f => {
        const dir = path.dirname(f);
        if (!dirs[dir]) dirs[dir] = [];
        dirs[dir].push(path.basename(f));
      });

      const summary = Object.entries(dirs)
        .map(([dir, files]) => {
          const shortDir = dir.split('/').slice(-2).join('/');
          return `${shortDir}: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`;
        })
        .slice(0, 3)
        .join(' | ');

      keyPoints.push(`[WORK] ${modifiedFiles.length} files modified: ${summary}`);
    }
  }

  // 3. Git operations (commits = completed work)
  if (sessionState.toolCalls) {
    const gitCommits = sessionState.toolCalls.filter(tc =>
      tc.toolName === 'Bash' && tc.arguments?.command?.includes('git commit')
    );
    if (gitCommits.length > 0) {
      keyPoints.push(`[COMMIT] ${gitCommits.length} commit(s) made`);
    }
  }

  // 4. Problems encountered
  if (sessionState.toolCalls) {
    const failures = sessionState.toolCalls.filter(tc => tc.success === false);
    if (failures.length > 0) {
      const failedTools = [...new Set(failures.map(f => f.toolName))];
      keyPoints.push(`[ISSUE] ${failures.length} failures: ${failedTools.join(', ')}`);
    }
  }

  // 5. Detected patterns (learnings)
  if (patterns && patterns.length > 0) {
    const significantPatterns = patterns
      .filter(p => p.severity === 'warning' || p.severity === 'error' || p.suggestion)
      .slice(0, 3);

    significantPatterns.forEach(p => {
      if (p.suggestion) {
        keyPoints.push(`[LEARN] ${p.description} -> ${p.suggestion}`);
      } else {
        keyPoints.push(`[NOTE] ${p.description}`);
      }
    });
  }

  // 6. Most used tools (work focus)
  if (sessionState.toolCalls && sessionState.toolCalls.length > 5) {
    const toolCounts = {};
    sessionState.toolCalls.forEach(tc => {
      toolCounts[tc.toolName] = (toolCounts[tc.toolName] || 0) + 1;
    });

    const topTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tool, count]) => `${tool}(${count})`)
      .join(', ');

    keyPoints.push(`[FOCUS] Top tools: ${topTools}`);
  }

  return keyPoints;
}

/**
 * Save session key points to MeMesh on session end
 * @param {Object} sessionState - Current session state
 * @param {Array} patterns - Analyzed patterns
 * @returns {boolean} True if saved successfully
 */
function saveSessionKeyPointsOnEnd(sessionState, patterns) {
  try {
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      console.log('🧠 MeMesh: Database not found, skipping memory save');
      return false;
    }

    const keyPoints = extractSessionKeyPoints(sessionState, patterns);
    if (keyPoints.length === 0) {
      return false;
    }

    const now = new Date().toISOString();
    const entityName = `session_end_${Date.now()}`;

    // Calculate session duration
    const startTime = new Date(sessionState.startTime);
    const duration = Math.round((Date.now() - startTime.getTime()) / 1000 / 60);

    const metadata = JSON.stringify({
      duration: `${duration}m`,
      toolCount: sessionState.toolCalls?.length || 0,
      saveReason: 'session_end',
      patternCount: patterns.length,
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
    const today = getDateString();
    const tags = ['session_end', 'auto_saved', today];
    for (const tag of tags) {
      const insertTag = 'INSERT INTO tags (entity_id, tag) VALUES (?, ?)';
      sqliteQuery(MEMESH_DB_PATH, insertTag, [entityId, tag]);
    }

    console.log(`🧠 MeMesh: Saved ${keyPoints.length} key points to memory`);
    return true;
  } catch (error) {
    console.error(`🧠 MeMesh: Failed to save session key points: ${error.message}`);
    return false;
  }
}

/**
 * Clean up old key points (older than retention period)
 */
function cleanupOldKeyPoints() {
  try {
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - THRESHOLDS.RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    // Count old entries using parameterized query
    const countResult = sqliteQuery(
      MEMESH_DB_PATH,
      'SELECT COUNT(*) FROM entities WHERE type = ? AND created_at < ?',
      ['session_keypoint', cutoffISO]
    );

    const oldCount = parseInt(countResult, 10) || 0;

    if (oldCount > 0) {
      // Get IDs of old entities
      const oldIdsResult = sqliteQuery(
        MEMESH_DB_PATH,
        'SELECT id FROM entities WHERE type = ? AND created_at < ?',
        ['session_keypoint', cutoffISO]
      );

      const oldIds = oldIdsResult.split('\n').filter(Boolean);

      // Delete tags for old entities
      for (const id of oldIds) {
        sqliteQuery(MEMESH_DB_PATH, 'DELETE FROM tags WHERE entity_id = ?', [id]);
      }

      // Delete old entities (observations cascade automatically due to FK)
      sqliteQuery(
        MEMESH_DB_PATH,
        'DELETE FROM entities WHERE type = ? AND created_at < ?',
        ['session_keypoint', cutoffISO]
      );

      console.log(`🧠 MeMesh: Cleaned up ${oldCount} expired memories (>${THRESHOLDS.RETENTION_DAYS} days)`);
    }
  } catch (error) {
    console.error(`🧠 MeMesh: Cleanup failed: ${error.message}`);
  }
}

// ============================================================================
// Session Archive
// ============================================================================

/**
 * Archive current session
 * @param {Object} sessionState - Current session state
 */
function archiveSession(sessionState) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveFile = path.join(SESSIONS_ARCHIVE_DIR, `session-${timestamp}.json`);

  writeJSONFile(archiveFile, sessionState);

  // Keep only last N sessions (configurable via THRESHOLDS)
  try {
    // Ensure directory exists before reading
    ensureDir(SESSIONS_ARCHIVE_DIR);

    const sessions = fs.readdirSync(SESSIONS_ARCHIVE_DIR)
      .filter(f => f.startsWith('session-'))
      .sort()
      .reverse();

    const maxSessions = THRESHOLDS.MAX_ARCHIVED_SESSIONS;
    if (sessions.length > maxSessions) {
      sessions.slice(maxSessions).forEach(f => {
        try {
          fs.unlinkSync(path.join(SESSIONS_ARCHIVE_DIR, f));
        } catch (error) {
          logError('archiveSession.unlink', error);
        }
      });
    }
  } catch (error) {
    logError('archiveSession.readdir', error);
  }
}

// ============================================================================
// Display Summary
// ============================================================================

/**
 * Display session summary
 * @param {Object} sessionState - Current session state
 * @param {Array} patterns - Detected patterns
 * @param {Object} sessionContext - Session context
 */
function displaySessionSummary(sessionState, patterns, sessionContext) {
  console.log('\n📊 Session Summary\n');

  // Duration
  const duration = calculateDuration(sessionState.startTime);
  console.log(`⏱️  Duration: ${duration}`);

  // Tool executions
  const totalTools = sessionState.toolCalls?.length || 0;
  const successTools = sessionState.toolCalls?.filter(t => t.success !== false).length || 0;
  const failedTools = totalTools - successTools;

  console.log(`🛠️  Tool executions: ${totalTools} (success: ${successTools}, failed: ${failedTools})`);

  // Detected patterns
  if (patterns.length > 0) {
    console.log('\n✨ Detected patterns:');
    patterns.slice(0, 5).forEach(pattern => {
      const emoji = pattern.severity === 'error' ? '❌' : pattern.severity === 'warning' ? '⚠️' : '✅';
      console.log(`  ${emoji} ${pattern.description}`);
      if (pattern.suggestion) {
        console.log(`     💡 ${pattern.suggestion}`);
      }
    });
  }

  // Recommendations for next session
  const recommendations = readJSONFile(RECOMMENDATIONS_FILE, { recommendedSkills: [] });
  if (recommendations.recommendedSkills?.length > 0) {
    console.log('\n💡 Recommended for next session:');
    recommendations.recommendedSkills.slice(0, 3).forEach(skill => {
      console.log(`  • ${skill.name} (${skill.reason})`);
    });
  }

  // Quota status (guard against division by zero)
  const quotaLimit = sessionContext.tokenQuota?.limit || 1;
  const quotaUsed = sessionContext.tokenQuota?.used || 0;
  const quotaPercentNum = (quotaUsed / quotaLimit) * 100;
  const quotaEmoji = quotaPercentNum > 80 ? '🔴' : quotaPercentNum > 50 ? '🟡' : '🟢';
  console.log(`\n${quotaEmoji} Token quota: ${quotaPercentNum.toFixed(1)}% (${quotaUsed.toLocaleString()} / ${quotaLimit.toLocaleString()})`);

  console.log('\n✅ Session state saved\n');
}

// ============================================================================
// Main Stop Hook Logic
// ============================================================================

function stopHook() {
  console.log('\n🛑 Smart-Agents Session Ending...\n');

  // Read current session state
  const sessionState = readJSONFile(CURRENT_SESSION_FILE, {
    startTime: new Date().toISOString(),
    toolCalls: [],
    patterns: [],
  });

  // Analyze patterns
  const patterns = analyzeToolPatterns(sessionState);

  // Save recommendations for next session
  saveRecommendations(patterns, sessionState);

  // Update session context
  const sessionContext = updateSessionContext(sessionState);

  // Archive session
  archiveSession(sessionState);

  // Save session key points to MeMesh
  saveSessionKeyPointsOnEnd(sessionState, patterns);

  // Clean up old key points (>30 days)
  cleanupOldKeyPoints();

  // Display summary
  displaySessionSummary(sessionState, patterns, sessionContext);

  // Clean up current session file
  try {
    fs.unlinkSync(CURRENT_SESSION_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Execute
// ============================================================================

try {
  stopHook();
} catch (error) {
  console.error('❌ Stop hook error:', error.message);
  process.exit(1);
}
