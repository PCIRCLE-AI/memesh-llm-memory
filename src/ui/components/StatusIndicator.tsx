import React from 'react';
import { Text } from 'ink';
import chalk from 'chalk';
import { theme } from '../theme.js';

export type Status = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'in_progress';

export interface StatusIndicatorProps {
  status: Status;
  label?: string;
  showIcon?: boolean;
}

/**
 * Status indicator component with icon and optional label
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  showIcon = true,
}) => {
  // Map status to icon and color
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

  return (
    <Text>
      <Text color={config.color}>
        {icon}
        {label}
      </Text>
    </Text>
  );
};

export default StatusIndicator;
