import type { Request, Response, NextFunction } from 'express';
import type { AgentCard } from '../types/index.js';
import { TaskQueue } from '../storage/TaskQueue.js';
export declare class A2ARoutes {
    private _agentId;
    private taskQueue;
    private agentCard;
    constructor(_agentId: string, taskQueue: TaskQueue, agentCard: AgentCard);
    sendMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTask: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    listTasks: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAgentCard: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelTask: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=routes.d.ts.map