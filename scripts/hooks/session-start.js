#!/usr/bin/env node

/**
 * SessionStart Hook - Claude Code Event-Driven Hooks
 *
 * Triggered at the start of each Claude Code session.
 *
 * Functionality:
 * - Checks MeMesh MCP server availability
 * - Reads recommendations from last session
 * - Displays suggested skills to load
 * - Shows warnings (quota, slow tools, etc.)
 * - Initializes current session state
 */

import { initA2ACollaboration } from './a2a-collaboration-hook.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(process.env.HOME, '.claude', 'state');
const CCB_HEARTBEAT_FILE = path.join(STATE_DIR, 'ccb-heartbeat.json');
const MCP_SETTINGS_FILE = path.join(process.env.HOME, '.claude', 'mcp_settings.json');

// Ensure state directory exists
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');
const SESSION_CONTEXT_FILE = path.join(STATE_DIR, 'session-context.json');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');

// MeMesh Knowledge Graph path
const MEMESH_DB_PATH = path.join(process.env.HOME, '.claude-code-buddy', 'knowledge-graph.db');
const RECALL_DAYS = 7; // Recall key points from last 7 days

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
 * Check MeMesh MCP Server availability
 * Returns: { configured: boolean, running: boolean, lastHeartbeat: string|null }
 */
function checkCCBAvailability() {
  const result = {
    configured: false,
    running: false,
    lastHeartbeat: null,
    serverPath: null
  };

  // Check if MeMesh is configured in MCP settings (also checks legacy names)
  try {
    if (fs.existsSync(MCP_SETTINGS_FILE)) {
      const mcpSettings = JSON.parse(fs.readFileSync(MCP_SETTINGS_FILE, 'utf-8'));

      // Check for MeMesh and legacy names (backward compatibility)
      const ccbNames = [
        'memesh',                           // New primary name
        '@pcircle/memesh',                  // New NPM package name
        '@pcircle/claude-code-buddy-mcp',  // Legacy package name
        'claude-code-buddy',                // Legacy name
        'ccb'                               // Legacy abbreviation
      ];

      for (const name of ccbNames) {
        if (mcpSettings.mcpServers && mcpSettings.mcpServers[name]) {
          result.configured = true;
          result.serverPath = mcpSettings.mcpServers[name].args?.[0] || 'configured';
          break;
        }
      }
    }
  } catch (error) {
    // Ignore parse errors
  }

  // Check heartbeat file (MeMesh writes this when running)
  try {
    if (fs.existsSync(CCB_HEARTBEAT_FILE)) {
      const heartbeat = JSON.parse(fs.readFileSync(CCB_HEARTBEAT_FILE, 'utf-8'));
      result.lastHeartbeat = heartbeat.timestamp;

      // Consider running if heartbeat is less than 5 minutes old
      const heartbeatTime = new Date(heartbeat.timestamp).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - heartbeatTime < fiveMinutes) {
        result.running = true;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return result;
}

/**
 * Display MeMesh status and reminder
 */
function displayCCBStatus(ccbStatus) {
  console.log('═'.repeat(60));
  console.log('  🤖 MeMesh Status');
  console.log('═'.repeat(60));

  if (!ccbStatus.configured) {
    console.log('');
    console.log('  ⚠️  MeMesh MCP Server is NOT configured!');
    console.log('');
    console.log('  MeMesh provides memory management and knowledge graph tools.');
    console.log('  To configure MeMesh, add it to ~/.claude/mcp_settings.json');
    console.log('');
    console.log('  Available MeMesh tools when connected:');
    console.log('    • memesh-remember / buddy-remember: Query past knowledge');
    console.log('    • memesh-do / buddy-do: Execute common operations');
    console.log('    • create-entities: Store new knowledge to graph');
    console.log('    • get-session-health: Check memory status');
    console.log('');
  } else if (!ccbStatus.running) {
    console.log('');
    console.log('  ℹ️  MeMesh is configured but status unknown');
    console.log(`  Path: ${ccbStatus.serverPath}`);
    console.log('');
    console.log('  📝 REMINDER: Use MeMesh tools for memory management:');
    console.log('');
    console.log('  Before starting work:');
    console.log('    memesh-remember "relevant topic" - Query past experiences');
    console.log('');
    console.log('  After completing work:');
    console.log('    create-entities - Store new learnings');
    console.log('    buddy-record-mistake - Record errors for future reference');
    console.log('');
    console.log('  💡 If MeMesh tools fail, check MCP server status.');
    console.log('');
  } else {
    console.log('');
    console.log('  ✅ MeMesh MCP Server is running');
    console.log(`  Last heartbeat: ${ccbStatus.lastHeartbeat}`);
    console.log('');
    console.log('  📋 Session Start Checklist:');
    console.log('    ☐ memesh-remember - Query relevant past knowledge');
    console.log('    ☐ get-session-health - Check memory status');
    console.log('');
    console.log('  📋 Session End Checklist:');
    console.log('    ☐ create-entities - Store new learnings');
    console.log('    ☐ buddy-record-mistake - Record any errors');
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log('');
}

/**
 * Recall recent session key points from MeMesh
 * Returns the most recent session's key points (within RECALL_DAYS)
 */
function recallRecentKeyPoints() {
  try {
    // Check if MeMesh DB exists
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      return null;
    }

    // Get the most recent session_keypoint entity (preferring session_end type)
    const query = `
      SELECT e.id, e.name, e.metadata, e.created_at
      FROM entities e
      WHERE e.type = 'session_keypoint'
        AND e.created_at > datetime('now', '-${RECALL_DAYS} days')
      ORDER BY e.created_at DESC
      LIMIT 1
    `.replace(/\n/g, ' ');

    const entityResult = execFileSync('sqlite3', [
      '-separator', '|',
      MEMESH_DB_PATH,
      query
    ], { encoding: 'utf-8', timeout: 5000 }).trim();

    if (!entityResult) {
      return null;
    }

    const [entityId, entityName, metadata, createdAt] = entityResult.split('|');

    // Get observations for this entity
    const obsQuery = `
      SELECT content FROM observations
      WHERE entity_id = ${entityId}
      ORDER BY created_at ASC
    `.replace(/\n/g, ' ');

    const obsResult = execFileSync('sqlite3', [
      MEMESH_DB_PATH,
      obsQuery
    ], { encoding: 'utf-8', timeout: 5000 }).trim();

    const keyPoints = obsResult ? obsResult.split('\n').filter(Boolean) : [];

    // Parse metadata
    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(metadata || '{}');
    } catch {
      // Ignore parse errors
    }

    return {
      entityName,
      createdAt,
      metadata: parsedMetadata,
      keyPoints
    };
  } catch (error) {
    // Silent fail - log error
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'),
      `[${new Date().toISOString()}] recallRecentKeyPoints error: ${error.message}\n`);
    return null;
  }
}

/**
 * Display recalled key points from last session
 */
function displayRecalledMemory(recalledData) {
  console.log('═'.repeat(60));
  console.log('  🧠 MeMesh Memory Recall');
  console.log('═'.repeat(60));

  if (!recalledData || !recalledData.keyPoints || recalledData.keyPoints.length === 0) {
    console.log('');
    console.log('  ℹ️  No recent memories found (last 7 days)');
    console.log('  💡 Memories will be auto-saved when this session ends');
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    return;
  }

  console.log('');

  // Display timestamp
  const savedTime = new Date(recalledData.createdAt);
  const timeAgo = getTimeAgo(savedTime);
  console.log(`  🕐 Saved: ${timeAgo}`);

  // Display metadata if available
  if (recalledData.metadata) {
    const meta = recalledData.metadata;
    if (meta.duration) {
      console.log(`  ⏱️  Last session duration: ${meta.duration}`);
    }
    if (meta.toolCount) {
      console.log(`  🛠️  Tools used: ${meta.toolCount}`);
    }
  }

  console.log('');
  console.log('  📋 Key Points:');

  // Display key points with formatting
  recalledData.keyPoints.forEach(point => {
    // Parse and format key points
    if (point.startsWith('[SESSION]')) {
      console.log(`    📊 ${point.replace('[SESSION] ', '')}`);
    } else if (point.startsWith('[WORK]')) {
      console.log(`    📁 ${point.replace('[WORK] ', '')}`);
    } else if (point.startsWith('[COMMIT]')) {
      console.log(`    ✅ ${point.replace('[COMMIT] ', '')}`);
    } else if (point.startsWith('[ISSUE]') || point.startsWith('[PROBLEM]')) {
      console.log(`    ⚠️  ${point.replace(/\[(ISSUE|PROBLEM)\] /, '')}`);
    } else if (point.startsWith('[LEARN]')) {
      console.log(`    💡 ${point.replace('[LEARN] ', '')}`);
    } else if (point.startsWith('[TASK]')) {
      console.log(`    📝 ${point.replace('[TASK] ', '')}`);
    } else if (point.startsWith('[DECISION]')) {
      console.log(`    🎯 ${point.replace('[DECISION] ', '')}`);
    } else if (point.startsWith('[PATTERN]')) {
      console.log(`    🔄 ${point.replace('[PATTERN] ', '')}`);
    } else if (point.startsWith('[SCOPE]') || point.startsWith('[FOCUS]')) {
      console.log(`    🎯 ${point.replace(/\[(SCOPE|FOCUS)\] /, '')}`);
    } else if (point.startsWith('[NOTE]')) {
      console.log(`    📌 ${point.replace('[NOTE] ', '')}`);
    } else {
      console.log(`    • ${point}`);
    }
  });

  console.log('');
  console.log('═'.repeat(60));
  console.log('');
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Main SessionStart logic
 */
function sessionStart() {
  console.log('\n🚀 Smart-Agents Session Started\n');
  // A2A Collaboration
  const agentIdentity = initA2ACollaboration();


  // Check MeMesh availability first
  const ccbStatus = checkCCBAvailability();
  displayCCBStatus(ccbStatus);

  // Auto-recall last session's key points from MeMesh
  const recalledMemory = recallRecentKeyPoints();
  displayRecalledMemory(recalledMemory);

  // Read recommendations from last session
  const recommendations = readJSONFile(RECOMMENDATIONS_FILE, {
    recommendedSkills: [],
    detectedPatterns: [],
    warnings: [],
    lastUpdated: null
  });

  // Read session context
  const sessionContext = readJSONFile(SESSION_CONTEXT_FILE, {
    tokenQuota: {
      used: 0,
      limit: 200000
    },
    learnedPatterns: [],
    lastSessionDate: null
  });

  // Display recommendations
  if (recommendations.recommendedSkills && recommendations.recommendedSkills.length > 0) {
    console.log('📚 根據上次工作模式，建議載入以下 skills：');
    recommendations.recommendedSkills.forEach(skill => {
      const priority = skill.priority === 'high' ? '🔴' : skill.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priority} ${skill.name} - ${skill.reason}`);
    });
    console.log('');
  }

  // Display detected patterns
  if (recommendations.detectedPatterns && recommendations.detectedPatterns.length > 0) {
    console.log('✨ 檢測到的模式：');
    recommendations.detectedPatterns.slice(0, 3).forEach(pattern => {
      console.log(`  • ${pattern.description}`);
      if (pattern.suggestion) {
        console.log(`    💡 ${pattern.suggestion}`);
      }
    });
    console.log('');
  }

  // Display warnings
  if (recommendations.warnings && recommendations.warnings.length > 0) {
    console.log('⚠️  注意事項：');
    recommendations.warnings.forEach(warning => {
      console.log(`  • ${warning}`);
    });
    console.log('');
  }

  // Display quota info
  const quotaPercentage = (sessionContext.tokenQuota.used / sessionContext.tokenQuota.limit * 100).toFixed(1);
  if (quotaPercentage > 80) {
    console.log(`🔴 配額使用：${quotaPercentage}% (請注意使用量)\n`);
  } else if (quotaPercentage > 50) {
    console.log(`🟡 配額使用：${quotaPercentage}%\n`);
  }

  // Initialize current session
  const currentSession = {
    startTime: new Date().toISOString(),
    toolCalls: [],
    patterns: [],
    ccbStatus: ccbStatus
  };

  if (writeJSONFile(CURRENT_SESSION_FILE, currentSession)) {
    console.log('✅ Session 已初始化，開始工作吧！\n');
  } else {
    console.log('⚠️ Session 初始化失敗，但可以繼續工作\n');
  }
}

// Execute
try {
  sessionStart();
} catch (error) {
  console.error('❌ SessionStart hook error:', error.message);
  process.exit(1);
}
