import React from 'react';
import { TextProps as InkTextProps } from 'ink';
export interface TextProps extends Omit<InkTextProps, 'color'> {
    variant?: 'primary' | 'secondary' | 'muted' | 'success' | 'warning' | 'error' | 'info';
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    weight?: 'normal' | 'bold';
}
export declare const Text: React.FC<TextProps>;
export default Text;
//# sourceMappingURL=Text.d.ts.map