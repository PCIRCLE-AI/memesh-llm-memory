import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

export const MemeshMetricsInputSchema = z.object({
  section: z
    .enum(['all', 'session', 'routing', 'memory'])
    .optional()
    .default('all')
    .describe('Which metrics section to return'),
});

export type ValidatedMemeshMetricsInput = z.infer<typeof MemeshMetricsInputSchema>;

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '/tmp';

// Session data is written by hooks to ~/.claude/state/
const HOOK_STATE_DIR = path.join(HOME_DIR, '.claude', 'state');
const CURRENT_SESSION_FILE = path.join(HOOK_STATE_DIR, 'current-session.json');
const LAST_SESSION_CACHE = path.join(HOOK_STATE_DIR, 'last-session-summary.json');

// Routing config and audit log are written by pre-tool-use.js to ~/.memesh/
const MEMESH_DIR = path.join(HOME_DIR, '.memesh');
const ROUTING_CONFIG_FILE = path.join(MEMESH_DIR, 'routing-config.json');
const ROUTING_AUDIT_LOG = path.join(MEMESH_DIR, 'routing-audit.log');

function readJSONSafe(filePath: string): Record<string, unknown> | null {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // Non-critical
  }
  return null;
}

function getRecentAuditEntries(maxLines: number): string[] {
  try {
    if (!fs.existsSync(ROUTING_AUDIT_LOG)) return [];
    const content = fs.readFileSync(ROUTING_AUDIT_LOG, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

/**
 * memesh-metrics MCP tool — expose session and routing metrics
 *
 * Returns structured data about current session state,
 * routing configuration, and recent audit log entries.
 */
export async function handleMemeshMetrics(
  input: ValidatedMemeshMetricsInput
): Promise<CallToolResult> {
  try {
    const result: Record<string, unknown> = {};
    const section = input.section;

    // Session metrics
    if (section === 'all' || section === 'session') {
      const session = readJSONSafe(CURRENT_SESSION_FILE);
      const lastSession = readJSONSafe(LAST_SESSION_CACHE);

      result.session = {
        current: session
          ? {
              startTime: session.startTime,
              modifiedFiles: (session.modifiedFiles as string[] | undefined)?.length ?? 0,
              testedFiles: (session.testedFiles as string[] | undefined)?.length ?? 0,
              codeReviewDone: session.codeReviewDone ?? false,
              toolUseCounts: session.toolUseCounts ?? {},
              patterns: session.patterns ?? [],
            }
          : null,
        lastSessionCached: !!lastSession,
      };
    }

    // Routing metrics
    if (section === 'all' || section === 'routing') {
      const config = readJSONSafe(ROUTING_CONFIG_FILE);
      const recentAudit = getRecentAuditEntries(20);

      result.routing = {
        configLoaded: !!config,
        modelRules: config
          ? ((config.modelRouting as Record<string, unknown>)?.rules as unknown[] | undefined)?.length ?? 0
          : 0,
        backgroundRules: config
          ? (config.backgroundRules as unknown[] | undefined)?.length ?? 0
          : 0,
        planningEnforcement: config
          ? (config.planningEnforcement as Record<string, unknown>)?.enabled ?? false
          : false,
        dryRunGate: config
          ? (config.dryRunGate as Record<string, unknown>)?.enabled ?? false
          : false,
        recentAuditEntries: recentAudit,
      };
    }

    // Memory metrics
    if (section === 'all' || section === 'memory') {
      const dbPath = path.join(MEMESH_DIR, 'knowledge-graph.db');
      const dbExists = fs.existsSync(dbPath);

      let dbSizeKB = 0;
      if (dbExists) {
        try {
          const stat = fs.statSync(dbPath);
          dbSizeKB = Math.round(stat.size / 1024);
        } catch {
          // Non-critical — stat failure doesn't affect other metrics
        }
      }

      result.memory = {
        knowledgeGraphExists: dbExists,
        dbSizeKB,
      };
    }

    const lines: string[] = ['MeMesh Metrics', ''];

    if (result.session) {
      const s = result.session as Record<string, unknown>;
      const current = s.current as Record<string, unknown> | null;
      lines.push('Session:');
      if (current) {
        lines.push(`  Modified files: ${current.modifiedFiles}`);
        lines.push(`  Tested files: ${current.testedFiles}`);
        lines.push(`  Code review done: ${current.codeReviewDone}`);
      } else {
        lines.push('  No active session');
      }
      lines.push(`  Last session cached: ${s.lastSessionCached}`);
      lines.push('');
    }

    if (result.routing) {
      const r = result.routing as Record<string, unknown>;
      lines.push('Routing:');
      lines.push(`  Config loaded: ${r.configLoaded}`);
      lines.push(`  Model rules: ${r.modelRules}`);
      lines.push(`  Background rules: ${r.backgroundRules}`);
      lines.push(`  Planning enforcement: ${r.planningEnforcement}`);
      lines.push(`  Dry-run gate: ${r.dryRunGate}`);
      const audit = r.recentAuditEntries as string[];
      if (audit.length > 0) {
        lines.push(`  Recent audit (last ${audit.length}):`);
        for (const entry of audit.slice(-5)) {
          lines.push(`    ${entry}`);
        }
      }
      lines.push('');
    }

    if (result.memory) {
      const m = result.memory as Record<string, unknown>;
      lines.push('Memory:');
      lines.push(`  Knowledge graph: ${m.knowledgeGraphExists ? `${m.dbSizeKB} KB` : 'not found'}`);
      lines.push('');
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: lines.join('\n'),
        },
      ],
    };
  } catch (error) {
    logger.error('memesh-metrics failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error retrieving metrics: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
