import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { theme } from '../theme.js';

export interface ProgressBarProps {
  /**
   * Current progress (0-100)
   */
  value: number;

  /**
   * Maximum value (default: 100)
   */
  max?: number;

  /**
   * Width of the progress bar in characters
   */
  width?: number;

  /**
   * Show percentage label
   */
  showPercentage?: boolean;

  /**
   * Label to display
   */
  label?: string;

  /**
   * Color variant
   */
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

/**
 * Progress bar component
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  width = 40,
  showPercentage = true,
  label,
  variant = 'primary',
}) => {
  // Calculate percentage
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  // Map variant to color
  const colorMap = {
    primary: theme.colors.primary.main,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  };

  const color = colorMap[variant];

  // Build progress bar
  const filledBar = '█'.repeat(filled);
  const emptyBar = '░'.repeat(empty);
  const bar = chalk.hex(color)(filledBar) + chalk.gray(emptyBar);

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={0}>
          <Text>{label}</Text>
        </Box>
      )}
      <Box>
        <Text>[{bar}]</Text>
        {showPercentage && (
          <Text> {Math.round(percentage)}%</Text>
        )}
      </Box>
    </Box>
  );
};

export default ProgressBar;
