/**
 * Collaboration Database
 *
 * SQLite persistence layer for Agent teams and Collaboration sessions
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  members: TeamMember[];
}

export interface TeamMember {
  id?: number;
  team_id: string;
  agent_type: string;
  agent_name: string;
  capabilities: string[];
  config?: Record<string, any>;
  added_at?: Date;
}

export interface Session {
  id: string;
  team_id: string;
  task: string;
  status: 'running' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
  results?: SessionResult[];
}

export interface SessionResult {
  id?: number;
  session_id: string;
  agent_name: string;
  result_type: string;
  content: string;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export class CollaborationDatabase {
  private db: Database | null = null;
  private readonly dbPath: string;
  private readonly schemaPath: string;

  constructor(dbPath: string = './data/collaboration.db') {
    this.dbPath = dbPath;
    this.schemaPath = join(__dirname, 'schema.sql');

    // Ensure data directory exists
    const dataDir = dirname(this.dbPath);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');

      // Enable WAL mode for better concurrency
      await this.db.exec('PRAGMA journal_mode = WAL');

      // Apply schema
      const schema = readFileSync(this.schemaPath, 'utf-8');
      await this.db.exec(schema);

      logger.info('Database initialized successfully', { path: this.dbPath });
    } catch (error: any) {
      logger.error('Failed to initialize database', { error: error.message });
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  // =================================================================
  // Team Operations
  // =================================================================

  async createTeam(team: Omit<Team, 'created_at' | 'updated_at' | 'members'>): Promise<Team> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.run(
        'INSERT INTO teams (id, name, description) VALUES (?, ?, ?)',
        team.id,
        team.name,
        team.description || null
      );

      const created = await this.getTeam(team.id);
      if (!created) throw new Error('Failed to retrieve created team');

      logger.info('Team created', { teamId: team.id, name: team.name });
      return created;
    } catch (error: any) {
      logger.error('Failed to create team', { error: error.message, team });
      throw error;
    }
  }

  async getTeam(teamId: string): Promise<Team | null> {
    if (!this.db) throw new Error('Database not initialized');

    const team = await this.db.get(
      'SELECT * FROM teams WHERE id = ?',
      teamId
    );

    if (!team) return null;

    // Load team members
    const members = await this.db.all(
      'SELECT * FROM team_members WHERE team_id = ?',
      teamId
    );

    // Parse JSON fields and convert dates
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      created_at: new Date(team.created_at),
      updated_at: new Date(team.updated_at),
      members: members.map((m: any) => ({
        id: m.id,
        team_id: m.team_id,
        agent_type: m.agent_type,
        agent_name: m.agent_name,
        capabilities: JSON.parse(m.capabilities),
        config: m.config ? JSON.parse(m.config) : undefined,
        added_at: new Date(m.added_at),
      })),
    };
  }

  async listTeams(): Promise<Team[]> {
    if (!this.db) throw new Error('Database not initialized');

    const teams = await this.db.all('SELECT * FROM teams ORDER BY created_at DESC');

    // Load members for each team
    const teamsWithMembers: Team[] = [];
    for (const team of teams) {
      const fullTeam = await this.getTeam(team.id);
      if (fullTeam) {
        teamsWithMembers.push(fullTeam);
      }
    }

    return teamsWithMembers;
  }

  async addTeamMember(member: Omit<TeamMember, 'id' | 'added_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO team_members (team_id, agent_type, agent_name, capabilities, config)
       VALUES (?, ?, ?, ?, ?)`,
      member.team_id,
      member.agent_type,
      member.agent_name,
      JSON.stringify(member.capabilities),
      member.config ? JSON.stringify(member.config) : null
    );

    // Update team updated_at
    await this.db.run(
      'UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      member.team_id
    );

    logger.info('Team member added', { teamId: member.team_id, agent: member.agent_name });
  }

  async removeTeamMember(teamId: string, agentName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      'DELETE FROM team_members WHERE team_id = ? AND agent_name = ?',
      teamId,
      agentName
    );

    // Update team updated_at
    await this.db.run(
      'UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      teamId
    );

    logger.info('Team member removed', { teamId, agent: agentName });
  }

  // =================================================================
  // Session Operations
  // =================================================================

  async createSession(session: Omit<Session, 'created_at' | 'completed_at' | 'results'>): Promise<Session> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.run(
        'INSERT INTO sessions (id, team_id, task, status) VALUES (?, ?, ?, ?)',
        session.id,
        session.team_id,
        session.task,
        session.status
      );

      const created = await this.getSession(session.id);
      if (!created) throw new Error('Failed to retrieve created session');

      logger.info('Session created', { sessionId: session.id, teamId: session.team_id });
      return created;
    } catch (error: any) {
      logger.error('Failed to create session', { error: error.message, session });
      throw error;
    }
  }

  async updateSessionStatus(
    sessionId: string,
    status: 'running' | 'completed' | 'failed'
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const completedAt = (status === 'completed' || status === 'failed')
      ? new Date().toISOString()
      : null;

    await this.db.run(
      'UPDATE sessions SET status = ?, completed_at = ? WHERE id = ?',
      status,
      completedAt,
      sessionId
    );

    logger.info('Session status updated', { sessionId, status });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    if (!this.db) throw new Error('Database not initialized');

    const session = await this.db.get(
      'SELECT * FROM sessions WHERE id = ?',
      sessionId
    );

    if (!session) return null;

    // Load session results
    const results = await this.db.all(
      'SELECT * FROM session_results WHERE session_id = ? ORDER BY created_at',
      sessionId
    );

    return {
      id: session.id,
      team_id: session.team_id,
      task: session.task,
      status: session.status,
      created_at: new Date(session.created_at),
      completed_at: session.completed_at ? new Date(session.completed_at) : undefined,
      results: results.map((r: any) => ({
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

  async addSessionResult(result: Omit<SessionResult, 'id' | 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO session_results (session_id, agent_name, result_type, content, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      result.session_id,
      result.agent_name,
      result.result_type,
      result.content,
      result.metadata ? JSON.stringify(result.metadata) : null
    );

    logger.info('Session result added', {
      sessionId: result.session_id,
      agent: result.agent_name,
      type: result.result_type
    });
  }

  async listRecentSessions(limit: number = 10): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.all(
      'SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?',
      limit
    );

    const sessionsWithResults: Session[] = [];
    for (const session of sessions) {
      const fullSession = await this.getSession(session.id);
      if (fullSession) {
        sessionsWithResults.push(fullSession);
      }
    }

    return sessionsWithResults;
  }

  async searchSessions(query: string): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Use FTS5 for full-text search
    const results = await this.db.all(
      `SELECT rowid FROM sessions_fts WHERE task MATCH ? ORDER BY rank`,
      query
    );

    const sessions: Session[] = [];
    for (const result of results) {
      // Get session by rowid
      const session = await this.db.get(
        'SELECT id FROM sessions WHERE rowid = ?',
        result.rowid
      );
      if (session) {
        const fullSession = await this.getSession(session.id);
        if (fullSession) {
          sessions.push(fullSession);
        }
      }
    }

    return sessions;
  }

  async getTeamSessions(teamId: string): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.all(
      'SELECT * FROM sessions WHERE team_id = ? ORDER BY created_at DESC',
      teamId
    );

    const sessionsWithResults: Session[] = [];
    for (const session of sessions) {
      const fullSession = await this.getSession(session.id);
      if (fullSession) {
        sessionsWithResults.push(fullSession);
      }
    }

    return sessionsWithResults;
  }
}
