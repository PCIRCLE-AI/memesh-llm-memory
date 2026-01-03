import React from 'react';
import { Box as InkBox } from 'ink';
const mapBorderStyle = (style) => {
    const mapping = {
        light: 'single',
        heavy: 'bold',
        double: 'double',
    };
    return mapping[style];
};
export const Box = ({ variant = 'default', borderStyle = 'light', children, ...props }) => {
    if (variant === 'bordered' || variant === 'card') {
        const inkBorderStyle = mapBorderStyle(borderStyle);
        return (React.createElement(InkBox, { borderStyle: inkBorderStyle, paddingX: variant === 'card' ? 1 : 0, paddingY: variant === 'card' ? 0 : 0, ...props }, children));
    }
    return React.createElement(InkBox, { ...props }, children);
};
export default Box;
//# sourceMappingURL=Box.js.map