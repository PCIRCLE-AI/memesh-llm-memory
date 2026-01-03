#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render } from 'ink';
import { Box, Text, Spinner, ProgressBar, StatusIndicator } from './components/index.js';
const Demo = () => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => (prev < 100 ? prev + 5 : 0));
        }, 200);
        return () => clearInterval(interval);
    }, []);
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { variant: "primary", size: "2xl", weight: "bold" }, "Terminal UI Components Demo")),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { variant: "muted" }, '─'.repeat(60))),
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
            React.createElement(Text, { variant: "primary", weight: "bold" }, "Text Variants:"),
            React.createElement(Box, { flexDirection: "column", marginLeft: 2, marginTop: 1 },
                React.createElement(Text, { variant: "primary" }, "Primary text"),
                React.createElement(Text, { variant: "secondary" }, "Secondary text"),
                React.createElement(Text, { variant: "muted" }, "Muted text"),
                React.createElement(Text, { variant: "success" }, "Success text"),
                React.createElement(Text, { variant: "warning" }, "Warning text"),
                React.createElement(Text, { variant: "error" }, "Error text"),
                React.createElement(Text, { variant: "info" }, "Info text"))),
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
            React.createElement(Text, { variant: "primary", weight: "bold" }, "Box Variants:"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Box, { variant: "bordered", borderStyle: "light", padding: 1, marginBottom: 1 },
                    React.createElement(Text, null, "Light bordered box")),
                React.createElement(Box, { variant: "bordered", borderStyle: "heavy", padding: 1, marginBottom: 1 },
                    React.createElement(Text, null, "Heavy bordered box")),
                React.createElement(Box, { variant: "card", padding: 1 },
                    React.createElement(Text, null, "Card box with padding")))),
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
            React.createElement(Text, { variant: "primary", weight: "bold" }, "Spinners:"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Spinner, { variant: "primary", label: "Loading..." })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Spinner, { variant: "success", label: "Processing..." })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Spinner, { variant: "warning", label: "Warning..." })),
                React.createElement(Box, null,
                    React.createElement(Spinner, { variant: "error", label: "Error state..." })))),
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
            React.createElement(Text, { variant: "primary", weight: "bold" }, "Progress Bars:"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(ProgressBar, { value: progress, max: 100, width: 40, showPercentage: true, label: "Dynamic Progress", variant: "primary" })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(ProgressBar, { value: 75, max: 100, width: 40, showPercentage: true, label: "Success (75%)", variant: "success" })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(ProgressBar, { value: 50, max: 100, width: 40, showPercentage: true, label: "Warning (50%)", variant: "warning" })),
                React.createElement(Box, null,
                    React.createElement(ProgressBar, { value: 25, max: 100, width: 40, showPercentage: true, label: "Error (25%)", variant: "error" })))),
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
            React.createElement(Text, { variant: "primary", weight: "bold" }, "Status Indicators:"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(StatusIndicator, { status: "success", label: "Operation completed" })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(StatusIndicator, { status: "error", label: "Operation failed" })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(StatusIndicator, { status: "warning", label: "Warning detected" })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(StatusIndicator, { status: "info", label: "Information message" })),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(StatusIndicator, { status: "pending", label: "Waiting to start" })),
                React.createElement(Box, null,
                    React.createElement(StatusIndicator, { status: "in_progress", label: "Currently running" })))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { variant: "muted" }, '─'.repeat(60))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { variant: "muted" }, "Press Ctrl+C to exit"))));
};
render(React.createElement(Demo, null));
//# sourceMappingURL=demo.js.map