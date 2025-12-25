import React from 'react';
import { Text as InkText, TextProps as InkTextProps } from 'ink';
import chalk from 'chalk';
import { theme } from '../theme.js';

export interface TextProps extends Omit<InkTextProps, 'color'> {
  variant?: 'primary' | 'secondary' | 'muted' | 'success' | 'warning' | 'error' | 'info';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'bold';
}

/**
 * Enhanced Text component with theme support
 */
export const Text: React.FC<TextProps> = ({
  variant = 'primary',
  size = 'base',
  weight = 'normal',
  children,
  ...props
}) => {
  // Map variant to color
  const colorMap = {
    primary: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
    muted: theme.colors.text.muted,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
  };

  const color = colorMap[variant];

  let styledText = children;

  // Apply color
  if (typeof children === 'string') {
    styledText = chalk.hex(color)(children);

    // Apply weight
    if (weight === 'bold') {
      styledText = chalk.bold(styledText);
    }
  }

  return <InkText {...props}>{styledText}</InkText>;
};

export default Text;
