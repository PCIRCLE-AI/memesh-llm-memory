import { Request, Response, NextFunction } from 'express';
export declare function getTimeoutMs(): number;
export declare function requestTimeoutMiddleware(timeoutMs?: number): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=timeout.d.ts.map