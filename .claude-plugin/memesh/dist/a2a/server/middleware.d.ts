import type { Request, Response, NextFunction } from 'express';
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
export declare function corsMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function jsonErrorHandler(err: Error, _req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=middleware.d.ts.map