#!/usr/bin/env node

/**
 * Stop Hook - Claude Code Event-Driven Hooks
 *
 * Triggered when a Claude Code session ends (normal or forced termination).
 *
 * Functionality:
 * - Analyzes current session's tool patterns and workflows
 * - Generates recommendations for next session
 * - Updates session context (quota, learned patterns)
 * - Displays session summary with patterns and suggestions
 * - Saves state for next session's SessionStart hook
 * - Backs up current session data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(process.env.HOME, '.claude', 'state');

const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');
const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');
const SESSION_CONTEXT_FILE = path.join(STATE_DIR, 'session-context.json');
const SESSIONS_ARCHIVE_DIR = path.join(STATE_DIR, 'sessions');

// Ensure archive directory exists
if (!fs.existsSync(SESSIONS_ARCHIVE_DIR)) {
  fs.mkdirSync(SESSIONS_ARCHIVE_DIR, { recursive: true });
}

// MeMesh Knowledge Graph path
const MEMESH_DB_PATH = path.join(process.env.HOME, '.claude-code-buddy', 'knowledge-graph.db');
const RETENTION_DAYS = 7; // Keep key points for 7 days

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
    console.error(`⚠️ Error reading ${path.basename(filePath)}: ${error.message}`);
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
    console.error(`⚠️ Error writing ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

/**
 * Calculate session duration
 */
function calculateDuration(startTime) {
  const start = new Date(startTime);
  const end = new Date();
  const durationMs = end - start;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Analyze tool patterns from session state
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
      description: mostUsedTools.map(([tool, count]) => `${tool} (${count}次)`).join(', '),
      severity: 'info'
    });
  }

  // Check READ_BEFORE_EDIT compliance
  let editWithoutRead = 0;
  let editWithRead = 0;

  for (let i = 0; i < sessionState.toolCalls.length; i++) {
    const tool = sessionState.toolCalls[i];
    if (tool.toolName === 'Edit') {
      // Check if there's a Read in last 5 tools
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
      description: `READ_BEFORE_EDIT 遵循率: ${compliance}%`,
      severity: compliance >= 80 ? 'info' : 'warning',
      suggestion: compliance < 80 ? '建議先 Read 檔案再 Edit，避免錯誤' : '良好的最佳實踐！'
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
      description: `執行了 ${gitOps.length} 次 Git 操作`,
      severity: 'info',
      suggestion: '下次建議載入 devops-git-workflows skill'
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
      description: `修改了 ${frontendOps.length} 個前端檔案`,
      severity: 'info',
      suggestion: '下次建議載入 frontend-design skill'
    });
  }

  // Detect slow operations
  const slowOps = sessionState.toolCalls.filter(tc => tc.duration && tc.duration > 5000);
  if (slowOps.length > 0) {
    patterns.push({
      type: 'SLOW_OPERATIONS',
      description: `${slowOps.length} 個工具執行時間超過 5 秒`,
      severity: 'warning',
      suggestion: '考慮優化這些操作或使用更快的替代方案'
    });
  }

  // Detect failures
  const failures = sessionState.toolCalls.filter(tc => tc.success === false);
  if (failures.length > 0) {
    patterns.push({
      type: 'EXECUTION_FAILURES',
      description: `${failures.length} 個工具執行失敗`,
      severity: 'error',
      suggestion: '檢查失敗原因並修正'
    });
  }

  return patterns;
}

/**
 * Save recommendations for next session
 */
function saveRecommendations(patterns, sessionState) {
  const recommendations = readJSONFile(RECOMMENDATIONS_FILE, {
    recommendedSkills: [],
    detectedPatterns: [],
    warnings: [],
    lastUpdated: null
  });

  // Add skill recommendations based on patterns
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
            priority: pattern.type.includes('GIT') || pattern.type.includes('FRONTEND') ? 'high' : 'medium'
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
      timestamp: new Date().toISOString()
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

/**
 * Update session context (quota, patterns)
 */
function updateSessionContext(sessionState) {
  const sessionContext = readJSONFile(SESSION_CONTEXT_FILE, {
    tokenQuota: {
      used: 0,
      limit: 200000
    },
    learnedPatterns: [],
    lastSessionDate: null
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
          lastSeen: new Date().toISOString()
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
 * Save session key points to MeMesh on session end
 */
function saveSessionKeyPointsOnEnd(sessionState, patterns) {
  try {
    // Check if MeMesh DB exists
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      console.log('🧠 MeMesh: Database not found, skipping memory save');
      return false;
    }

    // Extract comprehensive key points
    const keyPoints = extractSessionKeyPoints(sessionState, patterns);
    if (keyPoints.length === 0) {
      return false;
    }

    const now = new Date().toISOString();
    const entityName = `session_end_${Date.now()}`;

    // Calculate session duration
    const startTime = new Date(sessionState.startTime);
    const duration = Math.round((Date.now() - startTime.getTime()) / 1000 / 60); // minutes

    // Create entity for session summary
    const insertEntity = `INSERT INTO entities (name, type, created_at, metadata)
      VALUES (?, 'session_keypoint', ?, ?)`;

    const metadata = JSON.stringify({
      duration: `${duration}m`,
      toolCount: sessionState.toolCalls?.length || 0,
      saveReason: 'session_end',
      patternCount: patterns.length
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
    const today = now.split('T')[0];
    const tags = ['session_end', 'auto_saved', today];
    for (const tag of tags) {
      const insertTag = 'INSERT INTO tags (entity_id, tag) VALUES (?, ?)';
      sqliteQuery(MEMESH_DB_PATH, insertTag, [entityId, tag]);
    }

    console.log(`🧠 MeMesh: Saved ${keyPoints.length} key points to memory`);
    return true;
  } catch (error) {
    console.error(`⚠️  Failed to save session key points: ${error.message}`);
    return false;
  }
}

/**
 * Extract comprehensive key points from session for end summary
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
        keyPoints.push(`[LEARN] ${p.description} → ${p.suggestion}`);
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
 * Clean up old key points (older than RETENTION_DAYS)
 */
function cleanupOldKeyPoints() {
  try {
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    // Delete old session_keypoint entities (cascades to observations and doesn't affect tags due to FK)
    // First, get count of old entries
    const countResult = execFileSync('sqlite3', [
      MEMESH_DB_PATH,
      `SELECT COUNT(*) FROM entities WHERE type = 'session_keypoint' AND created_at < '${cutoffISO}'`
    ], { encoding: 'utf-8', timeout: 5000 }).trim();

    const oldCount = parseInt(countResult, 10) || 0;

    if (oldCount > 0) {
      // Delete old tags first (no FK cascade from tags)
      execFileSync('sqlite3', [
        MEMESH_DB_PATH,
        `DELETE FROM tags WHERE entity_id IN (SELECT id FROM entities WHERE type = 'session_keypoint' AND created_at < '${cutoffISO}')`
      ], { encoding: 'utf-8', timeout: 5000 });

      // Delete old entities (observations cascade automatically)
      execFileSync('sqlite3', [
        MEMESH_DB_PATH,
        `DELETE FROM entities WHERE type = 'session_keypoint' AND created_at < '${cutoffISO}'`
      ], { encoding: 'utf-8', timeout: 5000 });

      console.log(`🧠 MeMesh: Cleaned up ${oldCount} expired memories (>${RETENTION_DAYS} days)`);
    }
  } catch (error) {
    console.error(`⚠️  Cleanup failed: ${error.message}`);
  }
}

/**
 * Archive current session
 */
function archiveSession(sessionState) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveFile = path.join(SESSIONS_ARCHIVE_DIR, `session-${timestamp}.json`);

  writeJSONFile(archiveFile, sessionState);

  // Keep only last 30 sessions
  const sessions = fs.readdirSync(SESSIONS_ARCHIVE_DIR)
    .filter(f => f.startsWith('session-'))
    .sort()
    .reverse();

  if (sessions.length > 30) {
    sessions.slice(30).forEach(f => {
      try {
        fs.unlinkSync(path.join(SESSIONS_ARCHIVE_DIR, f));
      } catch (err) {
        // Ignore errors
      }
    });
  }
}

/**
 * Display session summary
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
    console.log(`\n✨ 檢測到的模式：`);
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
  if (recommendations.recommendedSkills && recommendations.recommendedSkills.length > 0) {
    console.log(`\n💡 建議下次 session 載入：`);
    recommendations.recommendedSkills.slice(0, 3).forEach(skill => {
      console.log(`  • ${skill.name} (${skill.reason})`);
    });
  }

  // Quota status
  const quotaPercentage = (sessionContext.tokenQuota.used / sessionContext.tokenQuota.limit * 100).toFixed(1);
  const quotaEmoji = quotaPercentage > 80 ? '🔴' : quotaPercentage > 50 ? '🟡' : '🟢';
  console.log(`\n${quotaEmoji} Token 配額使用: ${quotaPercentage}% (${sessionContext.tokenQuota.used.toLocaleString()} / ${sessionContext.tokenQuota.limit.toLocaleString()})`);

  console.log('\n✅ Session 狀態已保存\n');
}

/**
 * Main Stop hook logic
 */
function stopHook() {
  console.log('\n🛑 Smart-Agents Session Ending...\n');

  // Read current session state
  const sessionState = readJSONFile(CURRENT_SESSION_FILE, {
    startTime: new Date().toISOString(),
    toolCalls: [],
    patterns: []
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

  // Clean up old key points (>7 days)
  cleanupOldKeyPoints();

  // Display summary
  displaySessionSummary(sessionState, patterns, sessionContext);

  // Clean up current session file
  try {
    fs.unlinkSync(CURRENT_SESSION_FILE);
  } catch (err) {
    // Ignore if file doesn't exist
  }
}

// Execute
try {
  stopHook();
} catch (error) {
  console.error('❌ Stop hook error:', error.message);
  process.exit(1);
}
