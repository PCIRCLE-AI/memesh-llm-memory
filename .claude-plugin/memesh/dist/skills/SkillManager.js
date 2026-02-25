import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
export class SkillManager {
    SKILL_PREFIX = 'sa:';
    SKILLS_DIR;
    constructor(skillsDir) {
        this.SKILLS_DIR =
            skillsDir || path.join(os.homedir(), '.claude', 'skills');
    }
    async installSkill(skillName, content) {
        try {
            const sanitizedName = this.sanitizeSkillName(skillName);
            const prefixedName = this.addPrefix(sanitizedName);
            const skillPath = path.join(this.SKILLS_DIR, prefixedName);
            await fs.mkdir(skillPath, { recursive: true });
            const skillFilePath = path.join(skillPath, 'skill.md');
            await fs.writeFile(skillFilePath, content, 'utf-8');
            return prefixedName;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to install skill "${skillName}": ${errorMessage}`);
        }
    }
    async listAllSkills() {
        try {
            await fs.mkdir(this.SKILLS_DIR, { recursive: true });
            const entries = await fs.readdir(this.SKILLS_DIR, {
                withFileTypes: true,
            });
            const skills = [];
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const skillName = entry.name;
                    const skillPath = path.join(this.SKILLS_DIR, skillName);
                    const isSmartAgents = skillName.startsWith(this.SKILL_PREFIX);
                    const skillFilePath = path.join(skillPath, 'skill.md');
                    let stats;
                    try {
                        stats = await fs.stat(skillFilePath);
                    }
                    catch {
                        stats = null;
                    }
                    skills.push({
                        name: skillName,
                        prefixed: skillName,
                        isSmartAgents,
                        path: skillPath,
                        createdAt: stats?.birthtime,
                        updatedAt: stats?.mtime,
                    });
                }
            }
            return skills;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to list skills: ${errorMessage}`);
        }
    }
    async listSmartAgentsSkills() {
        const allSkills = await this.listAllSkills();
        return allSkills
            .filter(s => s.isSmartAgents)
            .map(s => s.name);
    }
    async listUserSkills() {
        const allSkills = await this.listAllSkills();
        return allSkills
            .filter(s => !s.isSmartAgents)
            .map(s => s.name);
    }
    async skillExists(skillName) {
        const sanitizedName = this.sanitizeSkillName(skillName);
        const prefixedName = this.addPrefix(sanitizedName);
        const skillPath = path.join(this.SKILLS_DIR, prefixedName);
        try {
            await fs.access(skillPath);
            return true;
        }
        catch {
            return false;
        }
    }
    async getSkillContent(skillName) {
        const sanitizedName = this.sanitizeSkillName(skillName);
        const prefixedName = this.addPrefix(sanitizedName);
        const skillFilePath = path.join(this.SKILLS_DIR, prefixedName, 'skill.md');
        try {
            return await fs.readFile(skillFilePath, 'utf-8');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to read skill "${skillName}": ${errorMessage}`);
        }
    }
    async updateSkill(skillName, content) {
        const sanitizedName = this.sanitizeSkillName(skillName);
        const prefixedName = this.addPrefix(sanitizedName);
        if (!(await this.skillExists(prefixedName))) {
            throw new Error(`Skill "${skillName}" does not exist`);
        }
        const skillFilePath = path.join(this.SKILLS_DIR, prefixedName, 'skill.md');
        try {
            await fs.writeFile(skillFilePath, content, 'utf-8');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to update skill "${skillName}": ${errorMessage}`);
        }
    }
    async deleteSkill(skillName) {
        const sanitizedName = this.sanitizeSkillName(skillName);
        const prefixedName = this.addPrefix(sanitizedName);
        const skillPath = path.join(this.SKILLS_DIR, prefixedName);
        try {
            await fs.rm(skillPath, { recursive: true, force: true });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete skill "${skillName}": ${errorMessage}`);
        }
    }
    sanitizeSkillName(skillName) {
        const nameWithoutPrefix = skillName.startsWith(this.SKILL_PREFIX)
            ? skillName.slice(this.SKILL_PREFIX.length)
            : skillName;
        const validPattern = /^[a-zA-Z0-9_-]+$/;
        if (!validPattern.test(nameWithoutPrefix)) {
            throw new Error(`Invalid skill name "${skillName}". Only alphanumeric characters, hyphens, and underscores are allowed.`);
        }
        return skillName;
    }
    addPrefix(skillName) {
        return skillName.startsWith(this.SKILL_PREFIX)
            ? skillName
            : `${this.SKILL_PREFIX}${skillName}`;
    }
    removePrefix(skillName) {
        return skillName.startsWith(this.SKILL_PREFIX)
            ? skillName.slice(this.SKILL_PREFIX.length)
            : skillName;
    }
    getSkillsDirectory() {
        return this.SKILLS_DIR;
    }
    getSkillPrefix() {
        return this.SKILL_PREFIX;
    }
}
//# sourceMappingURL=SkillManager.js.map