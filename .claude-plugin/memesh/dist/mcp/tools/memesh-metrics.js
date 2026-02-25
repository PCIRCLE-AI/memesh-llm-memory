import { z } from 'zod';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { getDataPath } from '../../utils/PathResolver.js';
export const MemeshMetricsInputSchema = z.object({
    section: z
        .enum(['all', 'session', 'routing', 'memory'])
        .optional()
        .default('all')
        .describe('Which metrics section to return'),
});
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || os.homedir();
const HOOK_STATE_DIR = path.join(HOME_DIR, '.claude', 'state');
const CURRENT_SESSION_FILE = path.join(HOOK_STATE_DIR, 'current-session.json');
const LAST_SESSION_CACHE = path.join(HOOK_STATE_DIR, 'last-session-summary.json');
const MEMESH_DIR = path.join(HOME_DIR, '.memesh');
const ROUTING_CONFIG_FILE = path.join(MEMESH_DIR, 'routing-config.json');
const ROUTING_AUDIT_LOG = path.join(MEMESH_DIR, 'routing-audit.log');
function readJSONSafe(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    }
    catch (error) {
        logger.warn(`[Metrics] Failed to read ${path.basename(filePath)}`, {
            error: error instanceof Error ? error.message : String(error),
        });
    }
    return null;
}
const MAX_AUDIT_LOG_BYTES = 256 * 1024;
function getRecentAuditEntries(maxLines) {
    let fd;
    try {
        fd = fs.openSync(ROUTING_AUDIT_LOG, 'r');
        const stat = fs.fstatSync(fd);
        let content;
        if (stat.size > MAX_AUDIT_LOG_BYTES) {
            const buffer = Buffer.alloc(MAX_AUDIT_LOG_BYTES);
            fs.readSync(fd, buffer, 0, MAX_AUDIT_LOG_BYTES, stat.size - MAX_AUDIT_LOG_BYTES);
            content = buffer.toString('utf-8');
        }
        else {
            const buffer = Buffer.alloc(stat.size);
            fs.readSync(fd, buffer, 0, stat.size, 0);
            content = buffer.toString('utf-8');
        }
        const lines = content.trim().split('\n').filter(Boolean);
        return lines.slice(-maxLines);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return [];
        }
        logger.warn('[Metrics] Failed to read audit log', {
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
    finally {
        if (fd !== undefined) {
            try {
                fs.closeSync(fd);
            }
            catch { }
        }
    }
}
export async function handleMemeshMetrics(input) {
    try {
        const result = {};
        const section = input.section;
        if (section === 'all' || section === 'session') {
            const session = readJSONSafe(CURRENT_SESSION_FILE);
            const lastSession = readJSONSafe(LAST_SESSION_CACHE);
            result.session = {
                current: session
                    ? {
                        startTime: session.startTime,
                        modifiedFiles: session.modifiedFiles?.length ?? 0,
                        testedFiles: session.testedFiles?.length ?? 0,
                        codeReviewDone: session.codeReviewDone ?? false,
                        toolUseCounts: session.toolUseCounts ?? {},
                        patterns: session.patterns ?? [],
                    }
                    : null,
                lastSessionCached: !!lastSession,
            };
        }
        if (section === 'all' || section === 'routing') {
            const config = readJSONSafe(ROUTING_CONFIG_FILE);
            const recentAudit = getRecentAuditEntries(20);
            result.routing = {
                configLoaded: !!config,
                modelRules: config
                    ? config.modelRouting?.rules?.length ?? 0
                    : 0,
                backgroundRules: config
                    ? config.backgroundRules?.length ?? 0
                    : 0,
                planningEnforcement: config
                    ? config.planningEnforcement?.enabled ?? false
                    : false,
                dryRunGate: config
                    ? config.dryRunGate?.enabled ?? false
                    : false,
                recentAuditEntries: recentAudit,
            };
        }
        if (section === 'all' || section === 'memory') {
            const dbPath = getDataPath('knowledge-graph.db');
            const dbExists = fs.existsSync(dbPath);
            let dbSizeKB = 0;
            if (dbExists) {
                try {
                    const stat = fs.statSync(dbPath);
                    dbSizeKB = Math.round(stat.size / 1024);
                }
                catch {
                }
            }
            result.memory = {
                knowledgeGraphExists: dbExists,
                dbSizeKB,
            };
        }
        const lines = ['MeMesh Metrics', ''];
        if (result.session) {
            const s = result.session;
            const current = s.current;
            lines.push('Session:');
            if (current) {
                lines.push(`  Modified files: ${current.modifiedFiles}`);
                lines.push(`  Tested files: ${current.testedFiles}`);
                lines.push(`  Code review done: ${current.codeReviewDone}`);
            }
            else {
                lines.push('  No active session');
            }
            lines.push(`  Last session cached: ${s.lastSessionCached}`);
            lines.push('');
        }
        if (result.routing) {
            const r = result.routing;
            lines.push('Routing:');
            lines.push(`  Config loaded: ${r.configLoaded}`);
            lines.push(`  Model rules: ${r.modelRules}`);
            lines.push(`  Background rules: ${r.backgroundRules}`);
            lines.push(`  Planning enforcement: ${r.planningEnforcement}`);
            lines.push(`  Dry-run gate: ${r.dryRunGate}`);
            const audit = r.recentAuditEntries;
            if (audit.length > 0) {
                lines.push(`  Recent audit (last ${audit.length}):`);
                for (const entry of audit.slice(-5)) {
                    lines.push(`    ${entry}`);
                }
            }
            lines.push('');
        }
        if (result.memory) {
            const m = result.memory;
            lines.push('Memory:');
            lines.push(`  Knowledge graph: ${m.knowledgeGraphExists ? `${m.dbSizeKB} KB` : 'not found'}`);
            lines.push('');
        }
        return {
            content: [
                {
                    type: 'text',
                    text: lines.join('\n'),
                },
            ],
        };
    }
    catch (error) {
        logger.error('memesh-metrics failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Error retrieving metrics: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
}
//# sourceMappingURL=memesh-metrics.js.map