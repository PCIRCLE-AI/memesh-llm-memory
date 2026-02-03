interface MCPServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
}
interface ClaudeCodeConfig {
    mcpServers?: {
        [key: string]: MCPServerConfig;
    };
    [key: string]: any;
}
interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    config?: ClaudeCodeConfig;
}
export declare class ConfigManager {
    static getConfigPath(): string;
    static getConfigPathDescription(): string;
    static readConfig(): Promise<ClaudeCodeConfig | null>;
    static writeConfig(config: ClaudeCodeConfig): Promise<boolean>;
    static validateConfig(): Promise<ValidationResult>;
    static generateDefaultConfig(): ClaudeCodeConfig;
    private static findMemeshPath;
    static highlightJSON(obj: any): string;
    static openInEditor(): Promise<boolean>;
    private static getDefaultEditor;
    static backupConfig(): Promise<string | null>;
}
export declare function showConfig(): Promise<void>;
export declare function validateConfig(): Promise<void>;
export declare function editConfig(): Promise<void>;
export declare function resetConfig(): Promise<void>;
export {};
//# sourceMappingURL=config.d.ts.map