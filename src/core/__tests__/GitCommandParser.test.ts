import { describe, it, expect } from 'vitest';
import { GitCommandParser } from '../GitCommandParser';

describe('GitCommandParser', () => {
  describe('isGitAdd', () => {
    it('should detect git add commands', () => {
      expect(GitCommandParser.isGitAdd('git add src/file.ts')).toBe(true);
      expect(GitCommandParser.isGitAdd('git add .')).toBe(true);
      expect(GitCommandParser.isGitAdd('git add -A')).toBe(true);
    });

    it('should detect git add with leading whitespace', () => {
      expect(GitCommandParser.isGitAdd('  git add .')).toBe(true);
    });

    it('should reject non-git-add commands', () => {
      expect(GitCommandParser.isGitAdd('npm install')).toBe(false);
      expect(GitCommandParser.isGitAdd('git status')).toBe(false);
      expect(GitCommandParser.isGitAdd('git commit -m "msg"')).toBe(false);
      expect(GitCommandParser.isGitAdd('git push')).toBe(false);
    });
  });

  describe('isGitCommit', () => {
    it('should detect git commit commands', () => {
      expect(GitCommandParser.isGitCommit('git commit -m "feat: add feature"')).toBe(true);
      expect(GitCommandParser.isGitCommit('git commit')).toBe(true);
      expect(GitCommandParser.isGitCommit('git commit --amend')).toBe(true);
    });

    it('should detect git commit in chained commands', () => {
      expect(GitCommandParser.isGitCommit('git add . && git commit -m "msg"')).toBe(true);
      expect(GitCommandParser.isGitCommit('cd project; git commit -m "msg"')).toBe(true);
    });

    it('should reject non-commit commands', () => {
      expect(GitCommandParser.isGitCommit('git push')).toBe(false);
      expect(GitCommandParser.isGitCommit('git add .')).toBe(false);
      expect(GitCommandParser.isGitCommit('npm install')).toBe(false);
    });
  });

  describe('extractCommitMessage', () => {
    it('should extract message from -m flag with double quotes', () => {
      const msg = GitCommandParser.extractCommitMessage('git commit -m "feat: add feature"');
      expect(msg).toBe('feat: add feature');
    });

    it('should extract message from -m flag with single quotes', () => {
      const msg = GitCommandParser.extractCommitMessage("git commit -m 'fix: bug fix'");
      expect(msg).toBe('fix: bug fix');
    });

    it('should extract unquoted message', () => {
      const msg = GitCommandParser.extractCommitMessage('git commit -m fix-typo');
      expect(msg).toBe('fix-typo');
    });

    it('should combine multiple -m flags', () => {
      const msg = GitCommandParser.extractCommitMessage('git commit -m "title" -m "body"');
      expect(msg).toBe('title\nbody');
    });

    it('should return null for no -m flag', () => {
      expect(GitCommandParser.extractCommitMessage('git commit')).toBeNull();
      expect(GitCommandParser.extractCommitMessage('git commit --amend')).toBeNull();
    });

    it('should extract message from chained command', () => {
      const msg = GitCommandParser.extractCommitMessage('git add . && git commit -m "feat: new"');
      expect(msg).toBe('feat: new');
    });
  });

  describe('isTestFile', () => {
    it('should identify .test. files', () => {
      expect(GitCommandParser.isTestFile('src/__tests__/foo.test.ts')).toBe(true);
      expect(GitCommandParser.isTestFile('src/utils/helper.test.js')).toBe(true);
    });

    it('should identify .spec. files', () => {
      expect(GitCommandParser.isTestFile('tests/unit/bar.spec.ts')).toBe(true);
      expect(GitCommandParser.isTestFile('src/component.spec.jsx')).toBe(true);
    });

    it('should identify files in /tests/ directory', () => {
      expect(GitCommandParser.isTestFile('src/tests/integration.ts')).toBe(true);
    });

    it('should reject non-test files', () => {
      expect(GitCommandParser.isTestFile('src/index.ts')).toBe(false);
      expect(GitCommandParser.isTestFile('src/utils/helper.ts')).toBe(false);
      expect(GitCommandParser.isTestFile('package.json')).toBe(false);
    });
  });

  describe('isTestCommand', () => {
    it('should detect npm test commands', () => {
      expect(GitCommandParser.isTestCommand('npm test')).toBe(true);
      expect(GitCommandParser.isTestCommand('npm run test')).toBe(true);
    });

    it('should detect test runner commands', () => {
      expect(GitCommandParser.isTestCommand('vitest run')).toBe(true);
      expect(GitCommandParser.isTestCommand('npx vitest')).toBe(true);
      expect(GitCommandParser.isTestCommand('jest --coverage')).toBe(true);
      expect(GitCommandParser.isTestCommand('mocha tests/')).toBe(true);
    });

    it('should reject non-test commands', () => {
      expect(GitCommandParser.isTestCommand('npm install')).toBe(false);
      expect(GitCommandParser.isTestCommand('git status')).toBe(false);
      expect(GitCommandParser.isTestCommand('node server.js')).toBe(false);
    });
  });

  describe('findGitCommitSegment', () => {
    it('should find git commit in simple command', () => {
      expect(GitCommandParser.findGitCommitSegment('git commit -m "msg"')).toBe('git commit -m "msg"');
    });

    it('should find git commit in && chain', () => {
      expect(GitCommandParser.findGitCommitSegment('git add . && git commit -m "msg"')).toBe('git commit -m "msg"');
    });

    it('should find git commit in ; chain', () => {
      expect(GitCommandParser.findGitCommitSegment('cd repo; git commit -m "msg"')).toBe('git commit -m "msg"');
    });

    it('should return null when no git commit present', () => {
      expect(GitCommandParser.findGitCommitSegment('git add .')).toBeNull();
      expect(GitCommandParser.findGitCommitSegment('npm install')).toBeNull();
    });
  });
});
