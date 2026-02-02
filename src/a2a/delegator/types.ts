export interface TaskInfo {
  taskId: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  agentId: string;
  createdAt: number;
  status: 'PENDING' | 'IN_PROGRESS';
}
