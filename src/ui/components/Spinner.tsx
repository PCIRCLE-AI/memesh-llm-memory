import React from 'react';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';
import chalk from 'chalk';
import { theme } from '../theme.js';

export interface SpinnerProps {
  label?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  type?: 'dots' | 'line' | 'arrow' | 'circle';
}

/**
 * Loading spinner component
 */
export const Spinner: React.FC<SpinnerProps> = ({
  label,
  variant = 'primary',
  type = 'dots',
}) => {
  // Map variant to color
  const colorMap = {
    primary: theme.colors.primary.main,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  };

  const color = colorMap[variant];

  return (
    <Text>
      <Text color={color}>
        <InkSpinner type={type} />
      </Text>
      {label && <Text> {label}</Text>}
    </Text>
  );
};

export default Spinner;
