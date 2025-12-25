import React from 'react';
import { Box as InkBox, BoxProps as InkBoxProps } from 'ink';
import { theme } from '../theme.js';

export interface BoxProps extends Omit<InkBoxProps, 'borderStyle'> {
  variant?: 'default' | 'bordered' | 'card';
  borderStyle?: 'light' | 'heavy' | 'double';
  children?: React.ReactNode;
}

/**
 * Map custom border styles to Ink's BorderStyle
 */
const mapBorderStyle = (style: 'light' | 'heavy' | 'double'): 'single' | 'bold' | 'double' => {
  const mapping = {
    light: 'single' as const,
    heavy: 'bold' as const,
    double: 'double' as const,
  };
  return mapping[style];
};

/**
 * Enhanced Box component with theme support
 */
export const Box: React.FC<BoxProps> = ({
  variant = 'default',
  borderStyle = 'light',
  children,
  ...props
}) => {
  if (variant === 'bordered' || variant === 'card') {
    const inkBorderStyle = mapBorderStyle(borderStyle);

    return (
      <InkBox
        borderStyle={inkBorderStyle}
        paddingX={variant === 'card' ? 1 : 0}
        paddingY={variant === 'card' ? 0 : 0}
        {...props}
      >
        {children}
      </InkBox>
    );
  }

  return <InkBox {...props}>{children}</InkBox>;
};

export default Box;
