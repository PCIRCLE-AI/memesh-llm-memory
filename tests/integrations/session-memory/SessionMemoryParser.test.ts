/**
 * SessionMemoryParser Test Suite
 *
 * TDD tests for parsing Claude Code's native session memory (summary.md)
 * into structured ParsedSessionMemory objects.
 */

import { describe, it, expect } from 'vitest';
import { SessionMemoryParser } from '../../../src/integrations/session-memory/SessionMemoryParser.js';
import type {
  ParsedSessionMemory,
  FileReference,
  WorkflowStep,
  ErrorCorrection,
  Learning,
  WorklogEntry,
} from '../../../src/integrations/session-memory/types.js';

// ─── Test Fixtures ──────────────────────────────────────────────────

const COMPLETE_SUMMARY_MD = `# Session Title

_A short description of this session_

Implement SessionMemoryParser for CCB TDD

# Current State

_What is the current state of the work?_

Working on the parser implementation. Tests are written and passing.
Need to integrate with the ingestion pipeline next.

# Task specification

_What did the user ask you to do?_

Build a SessionMemoryParser that reads summary.md files and converts them
into structured ParsedSessionMemory objects for the KnowledgeGraph.

# Files and Functions

_Important files and their purposes_

- \`src/integrations/session-memory/SessionMemoryParser.ts\` - Main parser class that converts markdown to structured data
- \`src/integrations/session-memory/types.ts\` - TypeScript type definitions for parsed session memory
- \`tests/integrations/session-memory/SessionMemoryParser.test.ts\` - Test suite for the parser

# Workflow

_Bash commands you typically run_

\`\`\`bash
npx vitest run tests/integrations/session-memory/SessionMemoryParser.test.ts
\`\`\`

\`\`\`bash
npx tsc --noEmit
\`\`\`

- \`npm run lint\` - Run linter to check code style

# Errors & Corrections

_Errors encountered and how they were fixed_

- Error: TypeScript strict mode rejected implicit any in regex match groups
  - Correction: Added explicit type annotations for match results
  - Failed approach: Tried using non-null assertion but it masked real bugs

- Error: Section splitting broke when content contained markdown headers inside code blocks
  - Correction: Pre-process to remove code block content before splitting, then restore

# Codebase and System Documentation

_Key system components and architecture_

CCB uses a SQLite-based KnowledgeGraph for storing entities and relations.
Session memory files are written by Claude Code at ~/.claude/projects/{path}/{session}/session-memory/summary.md.
The parser converts these markdown files into structured data for ingestion.

# Learnings

_What worked, what didn't_

- Avoid using complex regex for markdown parsing - simple line-by-line processing works better
- The keyword-based learning classification works well for categorizing session insights
- TypeScript strict mode catches many bugs early but requires more explicit typing
- The system uses section headers as delimiters for parsing

# Worklog

_Chronological record of what was done_

- [Step 1] Set up project structure and types
- [Step 2] Wrote comprehensive test suite
- [Step 3] Implemented parser with TDD approach
- Reviewed and refactored error handling
`;

const TITLE_ONLY_MD = `# Session Title

Quick Bug Fix Session
`;

const EMPTY_SECTIONS_MD = `# Session Title

_A short description_

Database Migration Debugging

# Current State

_What is the current state?_

# Learnings

_What worked, what didn't_

# Worklog

_Chronological record_
`;

const MALFORMED_MD = `# Session Title

Some title here

# Current State

Content without italic description

# Unknown Custom Section

This section is not in the standard list.
It should be preserved in rawSections.

# Another Unknown

More custom content here.
`;

// ─── Tests ──────────────────────────────────────────────────────────

describe('SessionMemoryParser', () => {
  const parser = new SessionMemoryParser();

  describe('Section extraction', () => {
    it('should parse a complete summary.md with all standard sections', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);

      expect(result.title).toBe('Implement SessionMemoryParser for CCB TDD');
      expect(result.currentState).toContain('Working on the parser implementation');
      expect(result.taskSpec).toContain('Build a SessionMemoryParser');
      expect(result.filesAndFunctions.length).toBeGreaterThan(0);
      expect(result.workflow.length).toBeGreaterThan(0);
      expect(result.errorsAndCorrections.length).toBeGreaterThan(0);
      expect(result.codebaseDoc).toContain('SQLite-based KnowledgeGraph');
      expect(result.learnings.length).toBeGreaterThan(0);
      expect(result.worklog.length).toBeGreaterThan(0);
    });

    it('should return all expected fields in the parsed result', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('currentState');
      expect(result).toHaveProperty('taskSpec');
      expect(result).toHaveProperty('filesAndFunctions');
      expect(result).toHaveProperty('workflow');
      expect(result).toHaveProperty('errorsAndCorrections');
      expect(result).toHaveProperty('codebaseDoc');
      expect(result).toHaveProperty('learnings');
      expect(result).toHaveProperty('worklog');
      expect(result).toHaveProperty('rawSections');
    });
  });

  describe('Title parsing', () => {
    it('should extract the title from the Session Title section', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.title).toBe('Implement SessionMemoryParser for CCB TDD');
    });

    it('should extract title when it is the only section', () => {
      const result = parser.parse(TITLE_ONLY_MD);
      expect(result.title).toBe('Quick Bug Fix Session');
    });

    it('should return empty string for title when input is empty', () => {
      const result = parser.parse('');
      expect(result.title).toBe('');
    });

    it('should trim whitespace from the title', () => {
      const md = `# Session Title

   Whitespace Padded Title
`;
      const result = parser.parse(md);
      expect(result.title).toBe('Whitespace Padded Title');
    });
  });

  describe('Italic description filtering', () => {
    it('should filter out italic description lines from all sections', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);

      // The italic descriptions should not appear in parsed content
      expect(result.currentState).not.toContain('_What is the current state');
      expect(result.taskSpec).not.toContain('_What did the user ask');
      expect(result.codebaseDoc).not.toContain('_Key system components');
    });

    it('should return null for sections that only contain italic descriptions', () => {
      const result = parser.parse(EMPTY_SECTIONS_MD);

      // Current State section has only the italic description, no real content
      expect(result.currentState).toBeNull();
    });

    it('should filter italic lines from the title section as well', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.title).not.toContain('_A short description');
    });

    it('should not filter lines with underscores that are not italic markers', () => {
      const md = `# Session Title

Test Title

# Current State

The variable_name uses snake_case formatting.
This is _italic_ but has other content too.
`;
      const result = parser.parse(md);

      // Lines with underscores in variable names or inline italic should be kept
      expect(result.currentState).toContain('variable_name');
    });
  });

  describe('Learning classification', () => {
    it('should classify "Avoid doing X" as negative', () => {
      const md = `# Session Title

Test

# Learnings

- Avoid using complex regex for markdown parsing
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('negative');
      expect(result.learnings[0].content).toContain('Avoid using complex regex');
    });

    it('should classify "X works well" as positive', () => {
      const md = `# Session Title

Test

# Learnings

- The keyword-based classification works well for categorizing insights
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('positive');
    });

    it('should classify "The system uses Y" as neutral', () => {
      const md = `# Session Title

Test

# Learnings

- The system uses section headers as delimiters for parsing
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('neutral');
    });

    it('should classify "don\'t do X" as negative', () => {
      const md = `# Session Title

Test

# Learnings

- Don't use mutable global state for configuration
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('negative');
    });

    it('should classify "X failed" as negative', () => {
      const md = `# Session Title

Test

# Learnings

- The initial approach with dynamic code execution failed due to security restrictions
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('negative');
    });

    it('should classify "effective" as positive', () => {
      const md = `# Session Title

Test

# Learnings

- Using structured logging was effective for debugging production issues
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('positive');
    });

    it('should classify "recommended" as positive', () => {
      const md = `# Session Title

Test

# Learnings

- It is recommended to use dependency injection for testability
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('positive');
    });

    it('should classify ambiguous content as neutral', () => {
      const md = `# Session Title

Test

# Learnings

- TypeScript strict mode requires more explicit typing in function signatures
`;
      const result = parser.parse(md);
      expect(result.learnings).toHaveLength(1);
      expect(result.learnings[0].type).toBe('neutral');
    });

    it('should parse multiple learnings from the complete fixture', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.learnings.length).toBe(4);

      // "Avoid using complex regex..." -> negative
      expect(result.learnings[0].type).toBe('negative');

      // "...classification works well..." -> positive
      expect(result.learnings[1].type).toBe('positive');

      // "TypeScript strict mode catches many bugs..." -> neutral
      expect(result.learnings[2].type).toBe('neutral');

      // "The system uses..." -> neutral
      expect(result.learnings[3].type).toBe('neutral');
    });
  });

  describe('Error parsing', () => {
    it('should extract error/correction pairs from bullet points', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.errorsAndCorrections).toHaveLength(2);
    });

    it('should parse the error description from the main bullet', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.errorsAndCorrections[0].error).toContain(
        'TypeScript strict mode rejected implicit any'
      );
    });

    it('should parse the correction from sub-bullet', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.errorsAndCorrections[0].correction).toContain(
        'Added explicit type annotations'
      );
    });

    it('should parse the failed approach when present', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.errorsAndCorrections[0].failedApproach).toContain(
        'non-null assertion'
      );
    });

    it('should handle error entries without a failed approach', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      // Second error entry has no "Failed approach" sub-bullet
      expect(result.errorsAndCorrections[1].error).toContain('Section splitting broke');
      expect(result.errorsAndCorrections[1].correction).toContain('Pre-process to remove code block');
    });

    it('should return empty array when no errors section exists', () => {
      const result = parser.parse(TITLE_ONLY_MD);
      expect(result.errorsAndCorrections).toEqual([]);
    });
  });

  describe('File reference parsing', () => {
    it('should extract file paths and descriptions', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.filesAndFunctions).toHaveLength(3);
    });

    it('should parse the file path from backtick-wrapped text', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      const firstFile = result.filesAndFunctions[0];
      expect(firstFile.path).toBe('src/integrations/session-memory/SessionMemoryParser.ts');
    });

    it('should parse the description after the path', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      const firstFile = result.filesAndFunctions[0];
      expect(firstFile.description).toContain('Main parser class');
    });

    it('should return empty array when no files section exists', () => {
      const result = parser.parse(TITLE_ONLY_MD);
      expect(result.filesAndFunctions).toEqual([]);
    });

    it('should handle file references without backticks', () => {
      const md = `# Session Title

Test

# Files and Functions

- src/main.ts - Entry point for the application
`;
      const result = parser.parse(md);
      expect(result.filesAndFunctions).toHaveLength(1);
      expect(result.filesAndFunctions[0].path).toBe('src/main.ts');
      expect(result.filesAndFunctions[0].description).toContain('Entry point');
    });
  });

  describe('Workflow parsing', () => {
    it('should extract commands from code blocks', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      const codeBlockCommands = result.workflow.filter(
        (w) => w.command.includes('vitest') || w.command.includes('tsc')
      );
      expect(codeBlockCommands.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract commands from bullet points', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      const bulletCommand = result.workflow.find(
        (w) => w.command.includes('npm run lint')
      );
      expect(bulletCommand).toBeDefined();
      expect(bulletCommand!.description).toContain('Run linter');
    });

    it('should parse code block commands with their language tag stripped', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      const vitestStep = result.workflow.find(
        (w) => w.command.includes('npx vitest')
      );
      expect(vitestStep).toBeDefined();
      // Command should not include the ```bash marker
      expect(vitestStep!.command).not.toContain('```');
    });

    it('should return empty array when no workflow section exists', () => {
      const result = parser.parse(TITLE_ONLY_MD);
      expect(result.workflow).toEqual([]);
    });
  });

  describe('Worklog parsing', () => {
    it('should parse chronological entries from bullet points', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.worklog).toHaveLength(4);
    });

    it('should extract marker/step number from bracketed prefix', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.worklog[0].marker).toBe('Step 1');
      expect(result.worklog[0].activity).toContain('Set up project structure');
    });

    it('should handle entries without markers', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      const lastEntry = result.worklog[3];
      expect(lastEntry.marker).toBeUndefined();
      expect(lastEntry.activity).toContain('Reviewed and refactored');
    });

    it('should return empty array when no worklog section exists', () => {
      const result = parser.parse(TITLE_ONLY_MD);
      expect(result.worklog).toEqual([]);
    });

    it('should return empty array when worklog section has only italic description', () => {
      const result = parser.parse(EMPTY_SECTIONS_MD);
      expect(result.worklog).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should throw on excessively large input (DoS protection)', () => {
      const hugeInput = 'x'.repeat(10 * 1024 * 1024 + 1);
      expect(() => parser.parse(hugeInput)).toThrow('Input too large');
    });

    it('should handle empty string input', () => {
      const result = parser.parse('');

      expect(result.title).toBe('');
      expect(result.currentState).toBeNull();
      expect(result.taskSpec).toBeNull();
      expect(result.filesAndFunctions).toEqual([]);
      expect(result.workflow).toEqual([]);
      expect(result.errorsAndCorrections).toEqual([]);
      expect(result.codebaseDoc).toBeNull();
      expect(result.learnings).toEqual([]);
      expect(result.worklog).toEqual([]);
      expect(result.rawSections.size).toBe(0);
    });

    it('should handle input with only a title section', () => {
      const result = parser.parse(TITLE_ONLY_MD);

      expect(result.title).toBe('Quick Bug Fix Session');
      expect(result.currentState).toBeNull();
      expect(result.taskSpec).toBeNull();
      expect(result.filesAndFunctions).toEqual([]);
      expect(result.workflow).toEqual([]);
      expect(result.errorsAndCorrections).toEqual([]);
      expect(result.codebaseDoc).toBeNull();
      expect(result.learnings).toEqual([]);
      expect(result.worklog).toEqual([]);
    });

    it('should handle malformed/partial sections gracefully', () => {
      const result = parser.parse(MALFORMED_MD);

      expect(result.title).toBe('Some title here');
      // Current State has no italic description, just raw content
      expect(result.currentState).toContain('Content without italic description');
    });

    it('should preserve unknown sections in rawSections', () => {
      const result = parser.parse(MALFORMED_MD);

      expect(result.rawSections.has('Unknown Custom Section')).toBe(true);
      expect(result.rawSections.get('Unknown Custom Section')).toContain(
        'This section is not in the standard list'
      );
      expect(result.rawSections.has('Another Unknown')).toBe(true);
      expect(result.rawSections.get('Another Unknown')).toContain('More custom content');
    });

    it('should handle duplicate section headers by using the last occurrence', () => {
      const md = `# Session Title

First Title

# Session Title

Second Title
`;
      const result = parser.parse(md);
      // Last occurrence wins
      expect(result.title).toBe('Second Title');
    });

    it('should handle sections with only italic descriptions as empty', () => {
      const result = parser.parse(EMPTY_SECTIONS_MD);

      expect(result.title).toBe('Database Migration Debugging');
      expect(result.learnings).toEqual([]);
      expect(result.worklog).toEqual([]);
    });

    it('should handle content with Windows-style line endings (CRLF)', () => {
      const md = '# Session Title\r\n\r\nWindows Title\r\n\r\n# Current State\r\n\r\nSome state\r\n';
      const result = parser.parse(md);

      expect(result.title).toBe('Windows Title');
      expect(result.currentState).toContain('Some state');
    });

    it('should handle sections with no blank line after the header', () => {
      const md = `# Session Title
Immediate Content Title
`;
      const result = parser.parse(md);
      expect(result.title).toBe('Immediate Content Title');
    });
  });

  describe('Text content sections', () => {
    it('should parse Current State as trimmed text', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.currentState).toBe(
        'Working on the parser implementation. Tests are written and passing.\nNeed to integrate with the ingestion pipeline next.'
      );
    });

    it('should parse Task specification as trimmed text', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.taskSpec).toContain('Build a SessionMemoryParser');
      expect(result.taskSpec).toContain('KnowledgeGraph');
    });

    it('should parse Codebase and System Documentation as trimmed text', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);
      expect(result.codebaseDoc).toContain('SQLite-based KnowledgeGraph');
      expect(result.codebaseDoc).toContain('summary.md');
    });

    it('should return null for missing text sections', () => {
      const result = parser.parse(TITLE_ONLY_MD);
      expect(result.currentState).toBeNull();
      expect(result.taskSpec).toBeNull();
      expect(result.codebaseDoc).toBeNull();
    });
  });

  describe('rawSections Map', () => {
    it('should contain known sections in rawSections too', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);

      // rawSections should include ALL sections' raw content
      expect(result.rawSections.has('Session Title')).toBe(true);
      expect(result.rawSections.has('Current State')).toBe(true);
      expect(result.rawSections.has('Learnings')).toBe(true);
    });

    it('should store raw unprocessed content (including italic lines) in rawSections', () => {
      const result = parser.parse(COMPLETE_SUMMARY_MD);

      // rawSections keeps the original content before filtering
      const rawCurrentState = result.rawSections.get('Current State');
      expect(rawCurrentState).toContain('_What is the current state');
    });
  });
});
