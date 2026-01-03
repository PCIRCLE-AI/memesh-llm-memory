import React from 'react';
export type Status = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'in_progress';
export interface StatusIndicatorProps {
    status: Status;
    label?: string;
    showIcon?: boolean;
}
export declare const StatusIndicator: React.FC<StatusIndicatorProps>;
export default StatusIndicator;
//# sourceMappingURL=StatusIndicator.d.ts.map