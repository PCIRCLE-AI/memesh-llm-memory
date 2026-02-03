import type { Request, Response, NextFunction } from 'express';
export declare function startCsrfCleanup(): void;
export declare function stopCsrfCleanup(): void;
export declare function clearCsrfTokens(): void;
export declare function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function csrfProtection(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=csrf.d.ts.map