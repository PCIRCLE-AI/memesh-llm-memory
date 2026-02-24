export interface SkillMetadata {
    name: string;
    prefixed: string;
    isSmartAgents: boolean;
    path: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface SkillContent {
    name: string;
    description: string;
    content: string;
    category?: string;
}
export declare class SkillManager {
    private readonly SKILL_PREFIX;
    private readonly SKILLS_DIR;
    constructor(skillsDir?: string);
    installSkill(skillName: string, content: string): Promise<string>;
    listAllSkills(): Promise<SkillMetadata[]>;
    listSmartAgentsSkills(): Promise<string[]>;
    listUserSkills(): Promise<string[]>;
    skillExists(skillName: string): Promise<boolean>;
    getSkillContent(skillName: string): Promise<string>;
    updateSkill(skillName: string, content: string): Promise<void>;
    deleteSkill(skillName: string): Promise<void>;
    private sanitizeSkillName;
    private addPrefix;
    private removePrefix;
    getSkillsDirectory(): string;
    getSkillPrefix(): string;
}
//# sourceMappingURL=SkillManager.d.ts.map