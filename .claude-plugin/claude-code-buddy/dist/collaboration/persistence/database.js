import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class CollaborationDatabase {
    db = null;
    dbPath;
    schemaPath;
    constructor(dbPath = './data/collaboration.db') {
        this.dbPath = dbPath;
        this.schemaPath = join(__dirname, 'schema.sql');
        const dataDir = dirname(this.dbPath);
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }
    }
    async initialize() {
        try {
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database,
            });
            await this.db.exec('PRAGMA foreign_keys = ON');
            await this.db.exec('PRAGMA journal_mode = WAL');
            const schema = readFileSync(this.schemaPath, 'utf-8');
            await this.db.exec(schema);
            logger.info('Database initialized successfully', { path: this.dbPath });
        }
        catch (error) {
            logger.error('Failed to initialize database', { error: error.message });
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }
    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
            logger.info('Database connection closed');
        }
    }
    async createTeam(team) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            await this.db.run('INSERT INTO teams (id, name, description) VALUES (?, ?, ?)', team.id, team.name, team.description || null);
            const created = await this.getTeam(team.id);
            if (!created)
                throw new Error('Failed to retrieve created team');
            logger.info('Team created', { teamId: team.id, name: team.name });
            return created;
        }
        catch (error) {
            logger.error('Failed to create team', { error: error.message, team });
            throw error;
        }
    }
    async getTeam(teamId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const team = await this.db.get('SELECT * FROM teams WHERE id = ?', teamId);
        if (!team)
            return null;
        const members = await this.db.all('SELECT * FROM team_members WHERE team_id = ?', teamId);
        return {
            id: team.id,
            name: team.name,
            description: team.description,
            created_at: new Date(team.created_at),
            updated_at: new Date(team.updated_at),
            members: members.map((m) => ({
                id: m.id,
                team_id: m.team_id,
                agent_id: m.agent_id,
                agent_type: m.agent_type,
                agent_name: m.agent_name,
                capabilities: JSON.parse(m.capabilities),
                config: m.config ? JSON.parse(m.config) : undefined,
                added_at: new Date(m.added_at),
            })),
        };
    }
    async listTeams() {
        if (!this.db)
            throw new Error('Database not initialized');
        const teams = await this.db.all('SELECT * FROM teams ORDER BY created_at DESC');
        const teamsWithMembers = [];
        for (const team of teams) {
            const fullTeam = await this.getTeam(team.id);
            if (fullTeam) {
                teamsWithMembers.push(fullTeam);
            }
        }
        return teamsWithMembers;
    }
    async addTeamMember(member) {
        if (!this.db)
            throw new Error('Database not initialized');
        await this.db.run(`INSERT INTO team_members (team_id, agent_id, agent_type, agent_name, capabilities, config)
       VALUES (?, ?, ?, ?, ?, ?)`, member.team_id, member.agent_id, member.agent_type, member.agent_name, JSON.stringify(member.capabilities), member.config ? JSON.stringify(member.config) : null);
        await this.db.run('UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', member.team_id);
        logger.info('Team member added', { teamId: member.team_id, agent: member.agent_name });
    }
    async removeTeamMember(teamId, agentName) {
        if (!this.db)
            throw new Error('Database not initialized');
        await this.db.run('DELETE FROM team_members WHERE team_id = ? AND agent_name = ?', teamId, agentName);
        await this.db.run('UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', teamId);
        logger.info('Team member removed', { teamId, agent: agentName });
    }
    async createSession(session) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            await this.db.run('INSERT INTO sessions (id, team_id, task, status) VALUES (?, ?, ?, ?)', session.id, session.team_id, session.task, session.status);
            const created = await this.getSession(session.id);
            if (!created)
                throw new Error('Failed to retrieve created session');
            logger.info('Session created', { sessionId: session.id, teamId: session.team_id });
            return created;
        }
        catch (error) {
            logger.error('Failed to create session', { error: error.message, session });
            throw error;
        }
    }
    async updateSessionStatus(sessionId, status) {
        if (!this.db)
            throw new Error('Database not initialized');
        const completedAt = (status === 'completed' || status === 'failed')
            ? new Date().toISOString()
            : null;
        await this.db.run('UPDATE sessions SET status = ?, completed_at = ? WHERE id = ?', status, completedAt, sessionId);
        logger.info('Session status updated', { sessionId, status });
    }
    async getSession(sessionId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const session = await this.db.get('SELECT * FROM sessions WHERE id = ?', sessionId);
        if (!session)
            return null;
        const results = await this.db.all('SELECT * FROM session_results WHERE session_id = ? ORDER BY created_at', sessionId);
        return {
            id: session.id,
            team_id: session.team_id,
            task: session.task,
            status: session.status,
            created_at: new Date(session.created_at),
            completed_at: session.completed_at ? new Date(session.completed_at) : undefined,
            results: results.map((r) => ({
                id: r.id,
                session_id: r.session_id,
                agent_name: r.agent_name,
                result_type: r.result_type,
                content: r.content,
                metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
                created_at: new Date(r.created_at),
            })),
        };
    }
    async addSessionResult(result) {
        if (!this.db)
            throw new Error('Database not initialized');
        await this.db.run(`INSERT INTO session_results (session_id, agent_name, result_type, content, metadata)
       VALUES (?, ?, ?, ?, ?)`, result.session_id, result.agent_name, result.result_type, result.content, result.metadata ? JSON.stringify(result.metadata) : null);
        logger.info('Session result added', {
            sessionId: result.session_id,
            agent: result.agent_name,
            type: result.result_type
        });
    }
    async listRecentSessions(limit = 10) {
        if (!this.db)
            throw new Error('Database not initialized');
        const sessions = await this.db.all('SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?', limit);
        const sessionsWithResults = [];
        for (const session of sessions) {
            const fullSession = await this.getSession(session.id);
            if (fullSession) {
                sessionsWithResults.push(fullSession);
            }
        }
        return sessionsWithResults;
    }
    async searchSessions(query) {
        if (!this.db)
            throw new Error('Database not initialized');
        const results = await this.db.all(`SELECT rowid FROM sessions_fts WHERE task MATCH ? ORDER BY rank`, query);
        const sessions = [];
        for (const result of results) {
            const session = await this.db.get('SELECT id FROM sessions WHERE rowid = ?', result.rowid);
            if (session) {
                const fullSession = await this.getSession(session.id);
                if (fullSession) {
                    sessions.push(fullSession);
                }
            }
        }
        return sessions;
    }
    async getTeamSessions(teamId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const sessions = await this.db.all('SELECT * FROM sessions WHERE team_id = ? ORDER BY created_at DESC', teamId);
        const sessionsWithResults = [];
        for (const session of sessions) {
            const fullSession = await this.getSession(session.id);
            if (fullSession) {
                sessionsWithResults.push(fullSession);
            }
        }
        return sessionsWithResults;
    }
}
//# sourceMappingURL=database.js.map