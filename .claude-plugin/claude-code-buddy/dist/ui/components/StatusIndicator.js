import React from 'react';
import { Text } from 'ink';
import { theme } from '../theme.js';
export const StatusIndicator = ({ status, label, showIcon = true, }) => {
    const statusConfig = {
        success: {
            icon: theme.icons.success,
            color: theme.colors.success,
        },
        error: {
            icon: theme.icons.error,
            color: theme.colors.error,
        },
        warning: {
            icon: theme.icons.warning,
            color: theme.colors.warning,
        },
        info: {
            icon: theme.icons.info,
            color: theme.colors.info,
        },
        pending: {
            icon: theme.icons.pending,
            color: theme.colors.gray[400],
        },
        in_progress: {
            icon: theme.icons.inProgress,
            color: theme.colors.primary.main,
        },
    };
    const config = statusConfig[status];
    const icon = showIcon ? `${config.icon} ` : '';
    return (React.createElement(Text, null,
        React.createElement(Text, { color: config.color },
            icon,
            label)));
};
export default StatusIndicator;
//# sourceMappingURL=StatusIndicator.js.map