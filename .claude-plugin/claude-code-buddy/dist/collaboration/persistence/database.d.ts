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
    agent_id: string;
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
export declare class CollaborationDatabase {
    private db;
    private readonly dbPath;
    private readonly schemaPath;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    close(): Promise<void>;
    createTeam(team: Omit<Team, 'created_at' | 'updated_at' | 'members'>): Promise<Team>;
    getTeam(teamId: string): Promise<Team | null>;
    listTeams(): Promise<Team[]>;
    addTeamMember(member: Omit<TeamMember, 'id' | 'added_at'>): Promise<void>;
    removeTeamMember(teamId: string, agentName: string): Promise<void>;
    createSession(session: Omit<Session, 'created_at' | 'completed_at' | 'results'>): Promise<Session>;
    updateSessionStatus(sessionId: string, status: 'running' | 'completed' | 'failed'): Promise<void>;
    getSession(sessionId: string): Promise<Session | null>;
    addSessionResult(result: Omit<SessionResult, 'id' | 'created_at'>): Promise<void>;
    listRecentSessions(limit?: number): Promise<Session[]>;
    searchSessions(query: string): Promise<Session[]>;
    getTeamSessions(teamId: string): Promise<Session[]>;
}
//# sourceMappingURL=database.d.ts.map