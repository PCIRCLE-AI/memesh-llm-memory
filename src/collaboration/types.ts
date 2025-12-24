/**
 * Multi-Agent Collaboration Framework Types
 *
 * Defines interfaces for agents to collaborate on complex tasks
 */

/**
 * Message between agents
 */
export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  timestamp: Date;
  type: 'request' | 'response' | 'broadcast' | 'notification';
  content: {
    task?: string;
    data?: any;
    result?: any;
    error?: string;
  };
  metadata?: {
    priority?: 'low' | 'medium' | 'high';
    requiresResponse?: boolean;
    correlationId?: string;
  };
}

/**
 * Agent capability description
 */
export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  estimatedCost: number;
  estimatedTimeMs: number;
}

/**
 * Collaborative agent interface
 */
export interface CollaborativeAgent {
  id: string;
  name: string;
  type: 'voice' | 'rag' | 'code' | 'research' | 'architecture' | 'custom';
  capabilities: AgentCapability[];
  status: 'idle' | 'busy' | 'error';

  // Agent lifecycle methods
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Message handling
  handleMessage(message: AgentMessage): Promise<AgentMessage>;

  // Capability execution
  execute(capability: string, input: any): Promise<any>;
}

/**
 * Team composition
 */
export interface AgentTeam {
  id: string;
  name: string;
  description: string;
  leader: string; // Agent ID
  members: string[]; // Agent IDs
  capabilities: string[]; // Combined team capabilities
  metadata?: {
    domain?: string;
    expertise?: string[];
    maxConcurrency?: number;
  };
}

/**
 * Collaborative task
 */
export interface CollaborativeTask {
  id: string;
  description: string;
  requiredCapabilities: string[];
  assignedTeam?: string;
  assignedAgents?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  subtasks?: CollaborativeSubTask[];
  context?: any;
  deadline?: Date;
}

/**
 * Subtask within a collaborative task
 */
export interface CollaborativeSubTask {
  id: string;
  parentTaskId: string;
  description: string;
  assignedAgent?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies?: string[]; // Other subtask IDs
  input?: any;
  output?: any;
  error?: string;
}

/**
 * Collaboration session
 */
export interface CollaborationSession {
  id: string;
  task: CollaborativeTask;
  team: AgentTeam;
  startTime: Date;
  endTime?: Date;
  messages: AgentMessage[];
  results: {
    success: boolean;
    output?: any;
    error?: string;
    cost: number;
    durationMs: number;
  };
}

/**
 * Team performance metrics
 */
export interface TeamMetrics {
  teamId: string;
  tasksCompleted: number;
  successRate: number;
  averageDurationMs: number;
  totalCost: number;
  agentUtilization: Record<string, number>; // Agent ID -> utilization %
}
