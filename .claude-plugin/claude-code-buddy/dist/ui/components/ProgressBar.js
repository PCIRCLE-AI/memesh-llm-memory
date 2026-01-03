import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { theme } from '../theme.js';
export const ProgressBar = ({ value, max = 100, width = 40, showPercentage = true, label, variant = 'primary', }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const colorMap = {
        primary: theme.colors.primary.main,
        success: theme.colors.success,
        warning: theme.colors.warning,
        error: theme.colors.error,
    };
    const color = colorMap[variant];
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    const bar = chalk.hex(color)(filledBar) + chalk.gray(emptyBar);
    return (React.createElement(Box, { flexDirection: "column" },
        label && (React.createElement(Box, { marginBottom: 0 },
            React.createElement(Text, null, label))),
        React.createElement(Box, null,
            React.createElement(Text, null,
                "[",
                bar,
                "]"),
            showPercentage && (React.createElement(Text, null,
                " ",
                Math.round(percentage),
                "%")))));
};
export default ProgressBar;
//# sourceMappingURL=ProgressBar.js.map