#!/usr/bin/env node

/**
 * SessionStart Hook - Claude Code Event-Driven Hooks
 *
 * Triggered at the start of each Claude Code session.
 *
 * Features:
 * - Checks MeMesh MCP server availability
 * - Auto-recalls last session key points from MeMesh
 * - Reads recommendations from last session
 * - Displays suggested skills to load
 * - Shows warnings (quota, slow tools, etc.)
 * - Initializes current session state
 */

import { initA2ACollaboration } from './a2a-collaboration-hook.js';
import {
  HOME_DIR,
  STATE_DIR,
  MEMESH_DB_PATH,
  THRESHOLDS,
  readJSONFile,
  writeJSONFile,
  sqliteQuery,
  getTimeAgo,
  logError,
} from './hook-utils.js';
import fs from 'fs';
import path from 'path';

// ============================================================================
// File Paths
// ============================================================================

const CCB_HEARTBEAT_FILE = path.join(STATE_DIR, 'ccb-heartbeat.json');
const MCP_SETTINGS_FILE = path.join(HOME_DIR, '.claude', 'mcp_settings.json');
const RECOMMENDATIONS_FILE = path.join(STATE_DIR, 'recommendations.json');
const SESSION_CONTEXT_FILE = path.join(STATE_DIR, 'session-context.json');
const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');

// ============================================================================
// MeMesh Status Check
// ============================================================================

/**
 * Check MeMesh MCP Server availability
 * @returns {{ configured: boolean, running: boolean, lastHeartbeat: string|null, serverPath: string|null }}
 */
function checkCCBAvailability() {
  const result = {
    configured: false,
    running: false,
    lastHeartbeat: null,
    serverPath: null,
  };

  // Check if MeMesh is configured in MCP settings
  try {
    if (fs.existsSync(MCP_SETTINGS_FILE)) {
      const mcpSettings = JSON.parse(fs.readFileSync(MCP_SETTINGS_FILE, 'utf-8'));

      // Check for MeMesh and legacy names (backward compatibility)
      const ccbNames = [
        'memesh',
        '@pcircle/memesh',
        '@pcircle/claude-code-buddy-mcp',
        'claude-code-buddy',
        'ccb',
      ];

      for (const name of ccbNames) {
        if (mcpSettings.mcpServers && mcpSettings.mcpServers[name]) {
          result.configured = true;
          result.serverPath = mcpSettings.mcpServers[name].args?.[0] || 'configured';
          break;
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Check heartbeat file (MeMesh writes this when running)
  try {
    if (fs.existsSync(CCB_HEARTBEAT_FILE)) {
      const heartbeat = JSON.parse(fs.readFileSync(CCB_HEARTBEAT_FILE, 'utf-8'));
      result.lastHeartbeat = heartbeat.timestamp;

      const heartbeatTime = new Date(heartbeat.timestamp).getTime();
      const now = Date.now();

      if (now - heartbeatTime < THRESHOLDS.HEARTBEAT_VALIDITY) {
        result.running = true;
      }
    }
  } catch {
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
    console.log('    • buddy-remember: Query past knowledge');
    console.log('    • buddy-do: Execute common operations');
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
    console.log('    buddy-remember "relevant topic" - Query past experiences');
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
    console.log('    ☐ buddy-remember - Query relevant past knowledge');
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

// ============================================================================
// Memory Recall
// ============================================================================

/**
 * Recall recent session key points from MeMesh
 * Uses parameterized queries to prevent SQL injection
 * @returns {{ entityName: string, createdAt: string, metadata: object, keyPoints: string[] } | null}
 */
function recallRecentKeyPoints() {
  try {
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      return null;
    }

    // Calculate cutoff date for recall
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - THRESHOLDS.RECALL_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    // Query for most recent session_keypoint entity using parameterized query
    const query = `
      SELECT id, name, metadata, created_at
      FROM entities
      WHERE type = ? AND created_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `.replace(/\n/g, ' ');

    const entityResult = sqliteQuery(
      MEMESH_DB_PATH,
      query,
      ['session_keypoint', cutoffISO]
    );

    if (!entityResult) {
      return null;
    }

    // Parse result (format: id|name|metadata|created_at)
    const parts = entityResult.split('|');
    if (parts.length < 4) {
      return null;
    }

    const [entityId, entityName, metadata, createdAt] = parts;

    // Query observations using parameterized query
    const obsQuery = 'SELECT content FROM observations WHERE entity_id = ? ORDER BY created_at ASC';
    const obsResult = sqliteQuery(MEMESH_DB_PATH, obsQuery, [entityId]);

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
      keyPoints,
    };
  } catch (error) {
    logError('recallRecentKeyPoints', error);
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
    console.log('  ℹ️  No recent memories found (last 30 days)');
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

// ============================================================================
// Main Session Start Logic
// ============================================================================

function sessionStart() {
  console.log('\n🚀 Smart-Agents Session Started\n');

  // Initialize A2A Collaboration
  initA2ACollaboration();

  // Check MeMesh availability
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
    lastUpdated: null,
  });

  // Read session context
  const sessionContext = readJSONFile(SESSION_CONTEXT_FILE, {
    tokenQuota: { used: 0, limit: 200000 },
    learnedPatterns: [],
    lastSessionDate: null,
  });

  // Display recommendations
  if (recommendations.recommendedSkills?.length > 0) {
    console.log('📚 Recommended skills based on last session:');
    recommendations.recommendedSkills.forEach(skill => {
      const priority = skill.priority === 'high' ? '🔴' : skill.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priority} ${skill.name} - ${skill.reason}`);
    });
    console.log('');
  }

  // Display detected patterns
  if (recommendations.detectedPatterns?.length > 0) {
    console.log('✨ Detected patterns:');
    recommendations.detectedPatterns.slice(0, 3).forEach(pattern => {
      console.log(`  • ${pattern.description}`);
      if (pattern.suggestion) {
        console.log(`    💡 ${pattern.suggestion}`);
      }
    });
    console.log('');
  }

  // Display warnings
  if (recommendations.warnings?.length > 0) {
    console.log('⚠️  Warnings:');
    recommendations.warnings.forEach(warning => {
      console.log(`  • ${warning}`);
    });
    console.log('');
  }

  // Display quota info (guard against division by zero)
  const quotaLimit = sessionContext.tokenQuota?.limit || 1;
  const quotaUsed = sessionContext.tokenQuota?.used || 0;
  const quotaPercentNum = (quotaUsed / quotaLimit) * 100;
  if (quotaPercentNum > 80) {
    console.log(`🔴 Quota usage: ${quotaPercentNum.toFixed(1)}% (please monitor usage)\n`);
  } else if (quotaPercentNum > 50) {
    console.log(`🟡 Quota usage: ${quotaPercentNum.toFixed(1)}%\n`);
  }

  // Initialize current session
  const currentSession = {
    startTime: new Date().toISOString(),
    toolCalls: [],
    patterns: [],
    ccbStatus: ccbStatus,
  };

  if (writeJSONFile(CURRENT_SESSION_FILE, currentSession)) {
    console.log('✅ Session initialized, ready to work!\n');
  } else {
    console.log('⚠️ Session initialization failed, but you can continue working\n');
  }
}

// ============================================================================
// Execute
// ============================================================================

try {
  sessionStart();
} catch (error) {
  console.error('❌ SessionStart hook error:', error.message);
  process.exit(1);
}
