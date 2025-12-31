/**
 * Skill Manager
 *
 * Manages claude-code-buddy generated skills with the sa: prefix convention.
 * Provides installation, listing, and filtering capabilities for skills.
 *
 * Naming Convention:
 * - User skills: <skill-name> (e.g., "frontend-design", "mcp-builder")
 * - Claude Code Buddy skills: sa:<skill-name> (e.g., "sa:code-review", "sa:test")
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Skill metadata
 */
export interface SkillMetadata {
  name: string;
  prefixed: string; // Name with sa: prefix if applicable
  isSmartAgents: boolean;
  path: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Skill content structure
 */
export interface SkillContent {
  name: string;
  description: string;
  content: string;
  category?: string;
}

/**
 * Skill Manager Class
 *
 * Centralized management for claude-code-buddy skills with namespace isolation.
 */
export class SkillManager {
  private readonly SKILL_PREFIX = 'sa:';
  private readonly SKILLS_DIR: string;

  constructor(skillsDir?: string) {
    // Default to Claude Code's skills directory
    this.SKILLS_DIR =
      skillsDir || path.join(os.homedir(), '.claude', 'skills');
  }

  /**
   * Install a claude-code-buddy skill with sa: prefix
   *
   * @param skillName - Name of the skill (without prefix)
   * @param content - Skill content (markdown format)
   * @returns The prefixed skill name
   */
  async installSkill(
    skillName: string,
    content: string
  ): Promise<string> {
    try {
      // Sanitize skill name to prevent path traversal
      const sanitizedName = this.sanitizeSkillName(skillName);

      // Add prefix if not already present
      const prefixedName = this.addPrefix(sanitizedName);

      // Create skill directory
      const skillPath = path.join(this.SKILLS_DIR, prefixedName);
      await fs.mkdir(skillPath, { recursive: true });

      // Write skill.md file
      const skillFilePath = path.join(skillPath, 'skill.md');
      await fs.writeFile(skillFilePath, content, 'utf-8');

      return prefixedName;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to install skill "${skillName}": ${errorMessage}`
      );
    }
  }

  /**
   * List all skills (both user and claude-code-buddy)
   *
   * @returns Array of skill metadata
   */
  async listAllSkills(): Promise<SkillMetadata[]> {
    try {
      // Ensure skills directory exists
      await fs.mkdir(this.SKILLS_DIR, { recursive: true });

      const entries = await fs.readdir(this.SKILLS_DIR, {
        withFileTypes: true,
      });

      const skills: SkillMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillName = entry.name;
          const skillPath = path.join(this.SKILLS_DIR, skillName);
          const isSmartAgents = skillName.startsWith(this.SKILL_PREFIX);

          // Get file stats for timestamps
          const skillFilePath = path.join(skillPath, 'skill.md');
          let stats;
          try {
            stats = await fs.stat(skillFilePath);
          } catch {
            // skill.md doesn't exist, skip timestamps
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list skills: ${errorMessage}`);
    }
  }

  /**
   * List only claude-code-buddy generated skills (sa: prefix)
   *
   * @returns Array of claude-code-buddy skill names
   */
  async listSmartAgentsSkills(): Promise<string[]> {
    const allSkills = await this.listAllSkills();
    return allSkills
      .filter(s => s.isSmartAgents)
      .map(s => s.name);
  }

  /**
   * List only user-installed skills (no sa: prefix)
   *
   * @returns Array of user skill names
   */
  async listUserSkills(): Promise<string[]> {
    const allSkills = await this.listAllSkills();
    return allSkills
      .filter(s => !s.isSmartAgents)
      .map(s => s.name);
  }

  /**
   * Check if a skill exists
   *
   * @param skillName - Name of the skill (with or without prefix)
   * @returns True if skill exists
   */
  async skillExists(skillName: string): Promise<boolean> {
    const sanitizedName = this.sanitizeSkillName(skillName);
    const prefixedName = this.addPrefix(sanitizedName);
    const skillPath = path.join(this.SKILLS_DIR, prefixedName);

    try {
      await fs.access(skillPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get skill content
   *
   * @param skillName - Name of the skill (with or without prefix)
   * @returns Skill content as string
   */
  async getSkillContent(skillName: string): Promise<string> {
    const sanitizedName = this.sanitizeSkillName(skillName);
    const prefixedName = this.addPrefix(sanitizedName);
    const skillFilePath = path.join(
      this.SKILLS_DIR,
      prefixedName,
      'skill.md'
    );

    try {
      return await fs.readFile(skillFilePath, 'utf-8');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to read skill "${skillName}": ${errorMessage}`
      );
    }
  }

  /**
   * Update an existing skill
   *
   * @param skillName - Name of the skill (with or without prefix)
   * @param content - New skill content
   */
  async updateSkill(
    skillName: string,
    content: string
  ): Promise<void> {
    const sanitizedName = this.sanitizeSkillName(skillName);
    const prefixedName = this.addPrefix(sanitizedName);

    // Check if skill exists
    if (!(await this.skillExists(prefixedName))) {
      throw new Error(`Skill "${skillName}" does not exist`);
    }

    const skillFilePath = path.join(
      this.SKILLS_DIR,
      prefixedName,
      'skill.md'
    );

    try {
      await fs.writeFile(skillFilePath, content, 'utf-8');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to update skill "${skillName}": ${errorMessage}`
      );
    }
  }

  /**
   * Delete a skill
   *
   * @param skillName - Name of the skill (with or without prefix)
   */
  async deleteSkill(skillName: string): Promise<void> {
    const sanitizedName = this.sanitizeSkillName(skillName);
    const prefixedName = this.addPrefix(sanitizedName);
    const skillPath = path.join(this.SKILLS_DIR, prefixedName);

    try {
      await fs.rm(skillPath, { recursive: true, force: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to delete skill "${skillName}": ${errorMessage}`
      );
    }
  }

  /**
   * Sanitize skill name to prevent path traversal attacks
   *
   * @param skillName - Skill name to sanitize
   * @returns Sanitized skill name
   * @throws Error if skill name contains invalid characters
   */
  private sanitizeSkillName(skillName: string): string {
    // Remove sa: prefix temporarily for validation
    const nameWithoutPrefix = skillName.startsWith(this.SKILL_PREFIX)
      ? skillName.slice(this.SKILL_PREFIX.length)
      : skillName;

    // Only allow alphanumeric, hyphens, and underscores
    // Reject path traversal attempts (.., /, \, null bytes)
    const validPattern = /^[a-zA-Z0-9_-]+$/;

    if (!validPattern.test(nameWithoutPrefix)) {
      throw new Error(
        `Invalid skill name "${skillName}". Only alphanumeric characters, hyphens, and underscores are allowed.`
      );
    }

    // Additional check for path traversal patterns
    if (nameWithoutPrefix.includes('..') || nameWithoutPrefix.includes('/') || nameWithoutPrefix.includes('\\')) {
      throw new Error(
        `Invalid skill name "${skillName}". Path traversal attempts are not allowed.`
      );
    }

    return skillName;
  }

  /**
   * Add sa: prefix to skill name if not present
   *
   * @param skillName - Original skill name
   * @returns Skill name with sa: prefix
   */
  private addPrefix(skillName: string): string {
    return skillName.startsWith(this.SKILL_PREFIX)
      ? skillName
      : `${this.SKILL_PREFIX}${skillName}`;
  }

  /**
   * Remove sa: prefix from skill name if present
   *
   * @param skillName - Skill name (possibly with prefix)
   * @returns Skill name without prefix
   */
  private removePrefix(skillName: string): string {
    return skillName.startsWith(this.SKILL_PREFIX)
      ? skillName.slice(this.SKILL_PREFIX.length)
      : skillName;
  }

  /**
   * Get skills directory path
   *
   * @returns Absolute path to skills directory
   */
  getSkillsDirectory(): string {
    return this.SKILLS_DIR;
  }

  /**
   * Get claude-code-buddy skill prefix
   *
   * @returns The sa: prefix string
   */
  getSkillPrefix(): string {
    return this.SKILL_PREFIX;
  }
}
