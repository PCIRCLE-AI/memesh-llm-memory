import type { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    agentId?: string;
}
export declare function authenticateToken(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map