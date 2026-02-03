export declare const operationDisplayNames: Record<string, string>;
export declare const operationIcons: {
    readonly search: "🔍";
    readonly memory: "🧠";
    readonly task: "📋";
    readonly agent: "🤖";
    readonly help: "💡";
    readonly knowledge: "✨";
    readonly secret: "🔐";
    readonly health: "💊";
    readonly create: "✨";
    readonly update: "🔄";
    readonly delete: "🗑️";
    readonly send: "📤";
    readonly receive: "📥";
    readonly success: "✓";
    readonly error: "✗";
    readonly warning: "⚠";
    readonly info: "ℹ";
    readonly pending: "○";
};
export declare const semanticColors: {
    readonly success: "#10b981";
    readonly error: "#ef4444";
    readonly warning: "#f59e0b";
    readonly info: "#3b82f6";
    readonly brand: "#667eea";
    readonly brandAccent: "#5568d3";
    readonly emphasis: "#f9fafb";
    readonly body: "#d1d5db";
    readonly subtle: "#9ca3af";
    readonly link: "#3b82f6";
    readonly linkHover: "#8b9dc3";
};
export declare function getOperationDisplayName(operationName: string): string;
export declare function getOperationIcon(operationName: string): string;
//# sourceMappingURL=design-tokens.d.ts.map