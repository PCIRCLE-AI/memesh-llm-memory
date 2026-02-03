import type { Request, Response, NextFunction } from 'express';
export declare function startResourceProtectionCleanup(): void;
export declare function stopResourceProtectionCleanup(): void;
export declare function clearConnectionTracking(): void;
export declare function getConnectionStats(): {
    totalIPs: number;
    totalConnections: number;
    topIPs: Array<{
        ip: string;
        connections: number;
    }>;
};
export declare function connectionLimitMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export declare function payloadSizeLimitMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export declare function memoryPressureMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export declare function resourceProtectionMiddleware(): ((req: Request, res: Response, next: NextFunction) => void)[];
//# sourceMappingURL=resourceProtection.d.ts.map