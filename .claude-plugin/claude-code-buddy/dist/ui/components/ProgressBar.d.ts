import React from 'react';
export interface ProgressBarProps {
    value: number;
    max?: number;
    width?: number;
    showPercentage?: boolean;
    label?: string;
    variant?: 'primary' | 'success' | 'warning' | 'error';
}
export declare const ProgressBar: React.FC<ProgressBarProps>;
export default ProgressBar;
//# sourceMappingURL=ProgressBar.d.ts.map