import { SkillManager } from '../skills/SkillManager.js';
export interface UninstallOptions {
    keepData?: boolean;
    keepConfig?: boolean;
    dryRun?: boolean;
}
export interface UninstallReport {
    removed: string[];
    kept: string[];
    errors: string[];
    dryRun: boolean;
}
export declare class UninstallManager {
    private skillManager;
    private smartAgentsDir;
    private dataDir;
    constructor(skillManager?: SkillManager);
    uninstall(options?: UninstallOptions): Promise<UninstallReport>;
    private pathExists;
    formatReport(report: UninstallReport): string;
    preview(options?: UninstallOptions): Promise<UninstallReport>;
}
//# sourceMappingURL=UninstallManager.d.ts.map