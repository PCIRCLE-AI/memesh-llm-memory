import { minimatch } from 'minimatch';
import { HealingConstraints, CodeChange } from '../types.js';

interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export class ScopeLimiter {
  private constraints: HealingConstraints;

  constructor(constraints: HealingConstraints) {
    this.constraints = constraints;
  }

  validateRepairScope(
    testFile: string,
    proposedFix: CodeChange[]
  ): ValidationResult {
    const violations: string[] = [];

    // Check 1: Max files modified
    if (proposedFix.length > this.constraints.maxFilesModified) {
      violations.push(
        `Fix modifies ${proposedFix.length} files, exceeds limit of ${this.constraints.maxFilesModified}`
      );
    }

    // Check 2: Max lines changed
    const totalLines = proposedFix.reduce(
      (sum, f) => sum + f.additions + f.deletions,
      0
    );
    if (totalLines > this.constraints.maxLinesChanged) {
      violations.push(
        `Fix changes ${totalLines} lines, exceeds limit of ${this.constraints.maxLinesChanged}`
      );
    }

    // Check 3: Forbidden files and Check 4: Allowed patterns (whitelist)
    // These are mutually exclusive - if forbidden, don't check whitelist
    for (const file of proposedFix) {
      if (this.isForbidden(file.path)) {
        violations.push(`Fix attempts to modify forbidden file: ${file.path}`);
      } else if (!this.isAllowed(file.path)) {
        violations.push(
          `File ${file.path} not in allowed patterns: ${this.constraints.allowedFilePatterns.join(', ')}`
        );
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  private isForbidden(filePath: string): boolean {
    return this.constraints.forbiddenFilePatterns.some((pattern) =>
      minimatch(filePath, pattern)
    );
  }

  private isAllowed(filePath: string): boolean {
    return this.constraints.allowedFilePatterns.some((pattern) =>
      minimatch(filePath, pattern)
    );
  }
}
