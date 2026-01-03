import React from 'react';
import { BoxProps as InkBoxProps } from 'ink';
export interface BoxProps extends Omit<InkBoxProps, 'borderStyle'> {
    variant?: 'default' | 'bordered' | 'card';
    borderStyle?: 'light' | 'heavy' | 'double';
    children?: React.ReactNode;
}
export declare const Box: React.FC<BoxProps>;
export default Box;
//# sourceMappingURL=Box.d.ts.map