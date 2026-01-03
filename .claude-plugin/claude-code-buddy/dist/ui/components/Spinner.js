import React from 'react';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { theme } from '../theme.js';
export const Spinner = ({ label, variant = 'primary', type = 'dots', }) => {
    const colorMap = {
        primary: theme.colors.primary.main,
        success: theme.colors.success,
        warning: theme.colors.warning,
        error: theme.colors.error,
    };
    const color = colorMap[variant];
    return (React.createElement(Text, null,
        React.createElement(Text, { color: color },
            React.createElement(InkSpinner, { type: type })),
        label && React.createElement(Text, null,
            " ",
            label)));
};
export default Spinner;
//# sourceMappingURL=Spinner.js.map