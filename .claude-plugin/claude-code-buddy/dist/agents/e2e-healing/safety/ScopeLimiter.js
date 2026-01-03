import { minimatch } from 'minimatch';
export class ScopeLimiter {
    constraints;
    constructor(constraints) {
        this.constraints = constraints;
    }
    validateRepairScope(testFile, proposedFix) {
        const violations = [];
        if (proposedFix.length > this.constraints.maxFilesModified) {
            violations.push(`Fix modifies ${proposedFix.length} files, exceeds limit of ${this.constraints.maxFilesModified}`);
        }
        const totalLines = proposedFix.reduce((sum, f) => sum + f.additions + f.deletions, 0);
        if (totalLines > this.constraints.maxLinesChanged) {
            violations.push(`Fix changes ${totalLines} lines, exceeds limit of ${this.constraints.maxLinesChanged}`);
        }
        for (const file of proposedFix) {
            if (this.isForbidden(file.path)) {
                violations.push(`Fix attempts to modify forbidden file: ${file.path}`);
            }
            else if (!this.isAllowed(file.path)) {
                violations.push(`File ${file.path} not in allowed patterns: ${this.constraints.allowedFilePatterns.join(', ')}`);
            }
        }
        return {
            valid: violations.length === 0,
            violations,
        };
    }
    isForbidden(filePath) {
        return this.constraints.forbiddenFilePatterns.some((pattern) => minimatch(filePath, pattern));
    }
    isAllowed(filePath) {
        return this.constraints.allowedFilePatterns.some((pattern) => minimatch(filePath, pattern));
    }
}
//# sourceMappingURL=ScopeLimiter.js.map