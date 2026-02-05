import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { expandHome } from '../utils/paths.js';
const CCB_DATA_DIR = expandHome('~/.claude-code-buddy');
const KG_DB_PATH = path.join(CCB_DATA_DIR, 'knowledge-graph.db');
const AGENT_REGISTRY_PATH = path.join(CCB_DATA_DIR, 'a2a-registry.db');
const STATE_DIR = expandHome('~/.claude/state');
const AGENT_IDENTITY_FILE = path.join(STATE_DIR, 'agent-identity.json');
const NAME_POOL = [
    'Alpha',
    'Beta',
    'Gamma',
    'Delta',
    'Epsilon',
    'Zeta',
    'Eta',
    'Theta',
    'Iota',
    'Kappa',
    'Lambda',
    'Mu',
    'Nu',
    'Xi',
    'Omicron',
    'Pi',
    'Rho',
    'Sigma',
    'Tau',
    'Upsilon',
];
function sqliteQuery(dbPath, query, params) {
    const result = sqliteQueryWithStatus(dbPath, query, params);
    return result.output;
}
function escapeSqlValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return 'NULL';
        }
        return String(value);
    }
    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }
    const strValue = String(value);
    if (strValue.includes('\x00')) {
        throw new Error('SQL parameter contains null byte - potential injection attack');
    }
    const escaped = strValue.replace(/'/g, "''");
    return `'${escaped}'`;
}
function sqliteQueryWithStatus(dbPath, query, params) {
    try {
        const args = ['-separator', '|', dbPath];
        let finalQuery = query;
        if (params && params.length > 0) {
            const escapedParams = params.map(escapeSqlValue);
            let paramIndex = 0;
            finalQuery = query.replace(/\?/g, () => {
                if (paramIndex < escapedParams.length) {
                    return escapedParams[paramIndex++];
                }
                return '?';
            });
        }
        const result = execFileSync('sqlite3', [...args, finalQuery], {
            encoding: 'utf-8',
            timeout: 5000,
        });
        return {
            output: result.trim(),
            success: true,
        };
    }
    catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        return {
            output: '',
            success: false,
            error,
        };
    }
}
function readJSON(filePath, defaultValue = null) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch {
    }
    return defaultValue;
}
function writeJSON(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    }
    catch {
        return false;
    }
}
function _getUsedNames() {
    if (!fs.existsSync(KG_DB_PATH))
        return [];
    const query = "SELECT name FROM entities WHERE type='session_identity' AND name LIKE 'Online Agent:%'";
    const result = sqliteQuery(KG_DB_PATH, query);
    if (!result)
        return [];
    return result
        .split('\n')
        .map((line) => line.replace('Online Agent: ', '').replace(/ \(.*\)$/, '').trim())
        .filter(Boolean);
}
function getOnlineAgents() {
    if (!fs.existsSync(AGENT_REGISTRY_PATH))
        return [];
    const query = "SELECT agent_id FROM agents WHERE status='active' ORDER BY last_heartbeat DESC LIMIT 10";
    const result = sqliteQuery(AGENT_REGISTRY_PATH, query);
    return result ? result.split('\n').filter(Boolean) : [];
}
function generateUniqueFallbackName() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `Agent-${timestamp}-${random}`;
}
function tryClaimName(entityName, now) {
    const atomicInsertQuery = `
    INSERT INTO entities (name, type, created_at)
    SELECT ?, 'session_identity', ?
    WHERE NOT EXISTS (SELECT 1 FROM entities WHERE name = ?);
    SELECT changes();
  `;
    const result = sqliteQueryWithStatus(KG_DB_PATH, atomicInsertQuery, [entityName, now, entityName]);
    if (!result.success) {
        return false;
    }
    const changesCount = parseInt(result.output, 10);
    return changesCount === 1;
}
function pickAvailableName() {
    if (!fs.existsSync(KG_DB_PATH)) {
        return NAME_POOL[0];
    }
    const now = new Date().toISOString();
    for (const name of NAME_POOL) {
        const entityName = `Online Agent: ${name}`;
        if (tryClaimName(entityName, now)) {
            return name;
        }
    }
    for (let attempt = 0; attempt < 10; attempt++) {
        const fallbackName = generateUniqueFallbackName();
        const entityName = `Online Agent: ${fallbackName}`;
        if (tryClaimName(entityName, now)) {
            return fallbackName;
        }
    }
    const ultimateFallback = `Agent-${Date.now().toString(36)}-${process.pid}`;
    const entityName = `Online Agent: ${ultimateFallback}`;
    tryClaimName(entityName, now);
    return ultimateFallback;
}
function generateAgentId() {
    const hostname = os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now().toString(36);
    return `${hostname}-${timestamp}`;
}
function registerToKnowledgeGraph(identity) {
    if (!fs.existsSync(KG_DB_PATH))
        return false;
    const entityName = `Online Agent: ${identity.name}`;
    const now = new Date().toISOString();
    try {
        sqliteQuery(KG_DB_PATH, 'INSERT OR IGNORE INTO entities (name, type, created_at) VALUES (?, ?, ?)', [entityName, 'session_identity', now]);
        const entityId = sqliteQuery(KG_DB_PATH, 'SELECT id FROM entities WHERE name = ?', [
            entityName,
        ]);
        if (entityId && /^\d+$/.test(entityId)) {
            const observations = [
                `Agent ID: ${identity.agentId}`,
                `Name: ${identity.name}`,
                `Status: ONLINE`,
                `Specialization: ${identity.specialization}`,
                `Checked in: ${now}`,
            ];
            for (const obs of observations) {
                sqliteQuery(KG_DB_PATH, 'INSERT INTO observations (entity_id, content, created_at) VALUES (?, ?, ?)', [entityId, obs, now]);
            }
        }
        return true;
    }
    catch {
        return false;
    }
}
function loadIdentity() {
    return readJSON(AGENT_IDENTITY_FILE);
}
function saveIdentity(identity) {
    return writeJSON(AGENT_IDENTITY_FILE, identity);
}
export function agentCheckIn() {
    const existingIdentity = loadIdentity();
    if (existingIdentity?.sessionStart) {
        const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
        if (sessionAge < 60 * 60 * 1000) {
            return existingIdentity;
        }
    }
    const name = pickAvailableName();
    const agentId = generateAgentId();
    const identity = {
        name,
        agentId,
        specialization: 'General (awaiting assignment)',
        sessionStart: new Date().toISOString(),
        status: 'ONLINE',
    };
    saveIdentity(identity);
    registerToKnowledgeGraph(identity);
    return identity;
}
export function checkPendingTasks(agentId) {
    const taskDbPath = path.join(CCB_DATA_DIR, 'a2a-tasks.db');
    if (!fs.existsSync(taskDbPath))
        return [];
    const baseQuery = 'SELECT id, description, state, created_at as createdAt, sender_id as senderId FROM tasks WHERE state=\'SUBMITTED\'';
    const query = agentId
        ? `${baseQuery} AND assigned_agent_id=${escapeSqlValue(agentId)} ORDER BY created_at DESC LIMIT 10`
        : `${baseQuery} ORDER BY created_at DESC LIMIT 10`;
    try {
        const result = execFileSync('sqlite3', ['-json', taskDbPath, query], { encoding: 'utf-8', timeout: 5000 });
        if (!result.trim())
            return [];
        const parsed = JSON.parse(result);
        return parsed.map((row) => ({
            id: String(row.id),
            description: row.description || '',
            state: row.state,
            createdAt: row.createdAt || '',
            senderId: row.senderId || '',
        }));
    }
    catch {
        const fallbackQuery = "SELECT id, description, state, created_at, sender_id FROM tasks WHERE state='SUBMITTED' ORDER BY created_at DESC LIMIT 10";
        const result = sqliteQuery(taskDbPath, fallbackQuery);
        if (!result)
            return [];
        return result
            .split('\n')
            .filter(Boolean)
            .map((line) => {
            const parts = line.split('|');
            const id = parts[0] || '';
            const senderId = parts[parts.length - 1] || '';
            const createdAt = parts[parts.length - 2] || '';
            const state = parts[parts.length - 3] || '';
            const description = parts.slice(1, -3).join('|');
            return {
                id,
                description,
                state: state,
                createdAt,
                senderId,
            };
        });
    }
}
export function getLatestCommitHash() {
    try {
        const result = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            encoding: 'utf-8',
            timeout: 5000,
        });
        return result.trim();
    }
    catch {
        return null;
    }
}
export function getLatestCommitMessage() {
    try {
        const result = execFileSync('git', ['log', '-1', '--pretty=%s'], {
            encoding: 'utf-8',
            timeout: 5000,
        });
        return result.trim();
    }
    catch {
        return null;
    }
}
export function formatTaskCompletionReport(taskId, commitHash, commitMessage) {
    return {
        taskId,
        status: 'COMPLETED',
        result: `Task completed!\nCommit: ${commitHash}\nMessage: ${commitMessage}`,
        completedAt: new Date().toISOString(),
    };
}
function displayCheckInBroadcast(identity, onlineAgents, pendingTasks) {
    console.log('');
    console.log('='.repeat(60));
    console.log('  A2A Collaboration System');
    console.log('='.repeat(60));
    console.log('');
    console.log(`  BROADCAST: ${identity.name} is now online!`);
    console.log('');
    console.log(`     Name: ${identity.name}`);
    console.log(`     Agent ID: ${identity.agentId}`);
    console.log(`     Specialization: ${identity.specialization}`);
    console.log(`     Checked in: ${new Date().toLocaleString()}`);
    console.log('');
    const otherAgents = onlineAgents.filter((a) => a !== identity.agentId);
    if (otherAgents.length > 0) {
        console.log('  Other online agents:');
        otherAgents.slice(0, 5).forEach((agent) => {
            console.log(`     - ${agent}`);
        });
        console.log('');
    }
    if (pendingTasks.length > 0) {
        console.log('  Pending tasks for you:');
        pendingTasks.slice(0, 3).forEach((task, i) => {
            console.log(`     ${i + 1}. [${task.state}] ${task.description?.slice(0, 50)}...`);
            console.log(`        From: ${task.senderId} | ID: ${task.id}`);
        });
        console.log('');
        console.log('  Use a2a-list-tasks to see all tasks');
        console.log('');
    }
    console.log('  Available A2A Actions:');
    console.log('');
    console.log('     Assign specialization:');
    console.log(`        "${identity.name}, you handle frontend" or "${identity.name}, you handle backend API"`);
    console.log('');
    console.log('     Send task to another agent:');
    console.log('        a2a-send-task targetAgentId="<agent>" taskDescription="..."');
    console.log('');
    console.log('     Check your tasks:');
    console.log('        a2a-list-tasks');
    console.log('');
    console.log('     Report task completion:');
    console.log('        a2a-report-result taskId="<id>" result="Done! Commit: xxx" success=true');
    console.log('');
    console.log('='.repeat(60));
    console.log('');
}
function displayAlreadyCheckedIn(identity) {
    console.log('');
    console.log(`  Already checked in as ${identity.name}`);
    console.log(`     Specialization: ${identity.specialization}`);
    console.log('');
}
export function initA2ACollaboration() {
    const existingIdentity = loadIdentity();
    if (existingIdentity?.sessionStart) {
        const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
        if (sessionAge < 60 * 60 * 1000) {
            displayAlreadyCheckedIn(existingIdentity);
            return existingIdentity;
        }
    }
    const identity = agentCheckIn();
    const onlineAgents = getOnlineAgents();
    const pendingTasks = checkPendingTasks(identity.agentId);
    displayCheckInBroadcast(identity, onlineAgents, pendingTasks);
    return identity;
}
export function updateSpecialization(newSpecialization) {
    const identity = loadIdentity();
    if (!identity) {
        console.log('  No identity found. Please check in first.');
        return null;
    }
    identity.specialization = newSpecialization;
    identity.updatedAt = new Date().toISOString();
    saveIdentity(identity);
    console.log('');
    console.log(`  Specialization updated!`);
    console.log(`     Name: ${identity.name}`);
    console.log(`     New Specialization: ${newSpecialization}`);
    console.log('');
    return identity;
}
export function getCurrentIdentity() {
    return loadIdentity();
}
//# sourceMappingURL=a2a-collaboration.js.map