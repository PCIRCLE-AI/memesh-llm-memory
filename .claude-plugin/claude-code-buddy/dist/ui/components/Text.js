import React from 'react';
import { Text as InkText } from 'ink';
import chalk from 'chalk';
import { theme } from '../theme.js';
export const Text = ({ variant = 'primary', size = 'base', weight = 'normal', children, ...props }) => {
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
    if (typeof children === 'string') {
        styledText = chalk.hex(color)(children);
        if (weight === 'bold') {
            styledText = chalk.bold(styledText);
        }
    }
    return React.createElement(InkText, { ...props }, styledText);
};
export default Text;
//# sourceMappingURL=Text.js.map