#!/usr/bin/env node

/**
 * PostCommit Hook - Auto-save commit context to MeMesh Knowledge Graph
 *
 * Registered as a PostToolUse hook. Detects git commit commands and
 * saves the commit details (message, files changed, diff summary)
 * to the MeMesh knowledge graph for future recall.
 *
 * This runs silently — no console output to avoid interrupting workflow.
 */

import {
  MEMESH_DB_PATH,
  readStdin,
  sqliteBatchEntity,
  getDateString,
  logError,
  logMemorySave,
} from './hook-utils.js';
import fs from 'fs';
import { execFileSync } from 'child_process';

// ============================================================================
// Git Commit Detection
// ============================================================================

/**
 * Check if a Bash tool call is a git commit
 * @param {Object} toolData - Normalized tool data
 * @returns {boolean}
 */
function isGitCommit(toolData) {
  if (toolData.toolName !== 'Bash') return false;
  if (!toolData.success) return false;

  const cmd = toolData.arguments?.command || '';
  return /git\s+commit\s/.test(cmd) && !cmd.includes('--amend');
}

// ============================================================================
// Git Info Extraction
// ============================================================================

/**
 * Extract latest commit details using git CLI
 * @returns {{ hash: string, subject: string, body: string, filesChanged: string[], diffStat: string } | null}
 */
function getLatestCommitInfo() {
  try {
    // Get commit hash and message
    const logOutput = execFileSync('git', [
      'log', '-1',
      '--format=%H%n%s%n%b',
    ], { encoding: 'utf-8', timeout: 5000 }).trim();

    const lines = logOutput.split('\n');
    const hash = lines[0] || '';
    const subject = lines[1] || '';
    const body = lines.slice(2).join('\n').trim();

    // Get files changed
    const diffNameOnly = execFileSync('git', [
      'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD',
    ], { encoding: 'utf-8', timeout: 5000 }).trim();

    const filesChanged = diffNameOnly ? diffNameOnly.split('\n').filter(Boolean) : [];

    // Get diff stat (compact summary)
    const diffStat = execFileSync('git', [
      'diff-tree', '--no-commit-id', '--stat', 'HEAD',
    ], { encoding: 'utf-8', timeout: 5000 }).trim();

    return { hash, subject, body, filesChanged, diffStat };
  } catch (error) {
    logError('getLatestCommitInfo', error);
    return null;
  }
}

// ============================================================================
// MeMesh KG Save
// ============================================================================

/**
 * Save commit context to MeMesh knowledge graph.
 * Uses sqliteBatchEntity for performance (3 spawns instead of 8+).
 * @param {Object} commitInfo - Commit details
 * @returns {boolean} True if saved
 */
function saveCommitToKG(commitInfo) {
  try {
    if (!fs.existsSync(MEMESH_DB_PATH)) {
      return false;
    }

    const { hash, subject, body, filesChanged, diffStat } = commitInfo;
    const shortHash = hash.substring(0, 7);
    const entityName = `Commit ${shortHash}: ${subject}`;

    // Build observations
    const observations = [];
    observations.push(`Commit: ${shortHash} - ${subject}`);

    if (body) {
      observations.push(`Details: ${body.substring(0, 200)}`);
    }

    if (filesChanged.length > 0) {
      const fileList = filesChanged.length <= 10
        ? filesChanged.join(', ')
        : `${filesChanged.slice(0, 10).join(', ')} (+${filesChanged.length - 10} more)`;
      observations.push(`Files changed (${filesChanged.length}): ${fileList}`);
    }

    // Group files by directory for context
    if (filesChanged.length > 0) {
      const dirs = {};
      filesChanged.forEach(f => {
        const dir = f.split('/').slice(0, 2).join('/');
        dirs[dir] = (dirs[dir] || 0) + 1;
      });
      const areaSummary = Object.entries(dirs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dir, count]) => `${dir} (${count})`)
        .join(', ');
      observations.push(`Areas: ${areaSummary}`);
    }

    if (diffStat) {
      const statLines = diffStat.split('\n');
      const summaryLine = statLines[statLines.length - 1]?.trim();
      if (summaryLine) {
        observations.push(`Stats: ${summaryLine}`);
      }
    }

    // Batch: entity + observations + tags in 2 process spawns (was 8+)
    const metadata = JSON.stringify({
      hash: shortHash,
      fullHash: hash,
      filesCount: filesChanged.length,
      source: 'post-commit-hook',
    });

    const tags = ['commit', 'auto-tracked', `date:${getDateString()}`, 'scope:project'];

    const entityId = sqliteBatchEntity(
      MEMESH_DB_PATH,
      { name: entityName, type: 'commit', metadata },
      observations,
      tags
    );

    if (entityId === null) return false;

    logMemorySave(`Commit saved: ${shortHash} - ${subject} (${filesChanged.length} files)`);
    return true;
  } catch (error) {
    logError('saveCommitToKG', error);
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================

async function postCommit() {
  try {
    const input = await readStdin(3000);
    if (!input || input.trim() === '') {
      process.exit(0);
    }

    const rawData = JSON.parse(input);
    const toolData = {
      toolName: rawData.tool_name || rawData.toolName || 'unknown',
      arguments: rawData.tool_input || rawData.arguments || {},
      success: rawData.success !== false,
    };

    // Only act on successful git commits
    if (!isGitCommit(toolData)) {
      process.exit(0);
    }

    // Extract commit info and save
    const commitInfo = getLatestCommitInfo();
    if (commitInfo) {
      saveCommitToKG(commitInfo);
    }

    process.exit(0);
  } catch (error) {
    logError('PostCommit', error);
    process.exit(1);
  }
}

postCommit();
