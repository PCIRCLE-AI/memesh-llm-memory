/**
 * SessionMemoryParser
 *
 * Parses Claude Code's native session memory (summary.md) into
 * structured ParsedSessionMemory objects. Uses pure string parsing
 * with no external dependencies.
 *
 * Summary.md format:
 *   # Section Header
 *   _Italic description line (filtered out)_
 *   Content lines...
 */

import {
  SESSION_MEMORY_SECTIONS,
  type ParsedSessionMemory,
  type FileReference,
  type WorkflowStep,
  type ErrorCorrection,
  type Learning,
  type LearningType,
  type WorklogEntry,
} from './types.js';

// ─── Constants ──────────────────────────────────────────────────────

/** Keywords that indicate a negative learning (mistake, thing to avoid) */
const NEGATIVE_KEYWORDS = [
  'avoid',
  "don't",
  'failed',
  'not work',
  'should not',
  'never',
  'broke',
  'wrong',
];

/** Keywords that indicate a positive learning (best practice, success) */
const POSITIVE_KEYWORDS = [
  'works well',
  'success',
  'effective',
  'recommended',
  'best practice',
  'good',
  'helpful',
];

/** Pattern matching an italic description line: starts with _ and ends with _ */
const ITALIC_LINE_PATTERN = /^_[^_]+_$/;

// ─── Parser Class ───────────────────────────────────────────────────

/**
 * Parses Claude Code summary.md files into structured data.
 *
 * Usage:
 *   const parser = new SessionMemoryParser();
 *   const result = parser.parse(markdownContent);
 */
export class SessionMemoryParser {
  /**
   * Parse a complete summary.md markdown string into a ParsedSessionMemory object.
   *
   * @param markdown - Raw markdown content from a summary.md file
   * @returns Parsed and structured session memory
   */
  /** Maximum input size to prevent DoS with very large files (10MB) */
  private static readonly MAX_INPUT_SIZE = 10 * 1024 * 1024;

  parse(markdown: string): ParsedSessionMemory {
    // Guard against excessively large inputs
    if (markdown.length > SessionMemoryParser.MAX_INPUT_SIZE) {
      throw new Error(
        `Input too large: ${markdown.length} bytes exceeds maximum of ${SessionMemoryParser.MAX_INPUT_SIZE}`,
      );
    }

    // Normalize line endings (CRLF -> LF)
    const normalized = markdown.replace(/\r\n/g, '\n');

    // Split into sections by top-level headers
    const rawSections = this.splitSections(normalized);

    // Extract title
    const titleContent = rawSections.get(SESSION_MEMORY_SECTIONS.TITLE);
    const title = titleContent
      ? this.filterItalicLines(titleContent).trim()
      : '';

    // Parse text content sections
    const currentState = this.parseTextSection(
      rawSections.get(SESSION_MEMORY_SECTIONS.CURRENT_STATE)
    );
    const taskSpec = this.parseTextSection(
      rawSections.get(SESSION_MEMORY_SECTIONS.TASK_SPEC)
    );
    const codebaseDoc = this.parseTextSection(
      rawSections.get(SESSION_MEMORY_SECTIONS.CODEBASE)
    );

    // Parse structured sections
    const filesAndFunctions = this.parseFileReferences(
      rawSections.get(SESSION_MEMORY_SECTIONS.FILES)
    );
    const workflow = this.parseWorkflow(
      rawSections.get(SESSION_MEMORY_SECTIONS.WORKFLOW)
    );
    const errorsAndCorrections = this.parseErrors(
      rawSections.get(SESSION_MEMORY_SECTIONS.ERRORS)
    );
    const learnings = this.parseLearnings(
      rawSections.get(SESSION_MEMORY_SECTIONS.LEARNINGS)
    );
    const worklog = this.parseWorklog(
      rawSections.get(SESSION_MEMORY_SECTIONS.WORKLOG)
    );

    return {
      title,
      currentState,
      taskSpec,
      filesAndFunctions,
      workflow,
      errorsAndCorrections,
      codebaseDoc,
      learnings,
      worklog,
      rawSections,
    };
  }

  // ─── Section Splitting ──────────────────────────────────────────

  /**
   * Split markdown content into sections based on `# Header` lines.
   * Duplicate headers are resolved by keeping the last occurrence.
   *
   * @returns Map of section name -> raw content (without the header line)
   */
  private splitSections(markdown: string): Map<string, string> {
    const sections = new Map<string, string>();

    if (!markdown.trim()) {
      return sections;
    }

    const lines = markdown.split('\n');
    let currentHeader: string | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^# (.+)$/);
      if (headerMatch) {
        // Save previous section if exists
        if (currentHeader !== null) {
          sections.set(currentHeader, currentContent.join('\n'));
        }
        currentHeader = headerMatch[1].trim();
        currentContent = [];
      } else if (currentHeader !== null) {
        currentContent.push(line);
      }
    }

    // Save the last section
    if (currentHeader !== null) {
      sections.set(currentHeader, currentContent.join('\n'));
    }

    return sections;
  }

  // ─── Text Section Parsing ──────────────────────────────────────

  /**
   * Parse a plain text section: filter italic lines, trim, return null if empty.
   */
  private parseTextSection(raw: string | undefined): string | null {
    if (!raw) return null;

    const filtered = this.filterItalicLines(raw).trim();
    return filtered || null;
  }

  // ─── Italic Line Filtering ─────────────────────────────────────

  /**
   * Remove lines that are pure italic descriptions (e.g., `_description text_`).
   * Keeps lines with inline underscores or mixed content.
   */
  private filterItalicLines(content: string): string {
    return content
      .split('\n')
      .filter((line) => !ITALIC_LINE_PATTERN.test(line.trim()))
      .join('\n');
  }

  // ─── File Reference Parsing ────────────────────────────────────

  /**
   * Parse file references from bullet points.
   * Supports formats:
   *   - `path/to/file.ts` - Description text
   *   - path/to/file.ts - Description text
   */
  private parseFileReferences(raw: string | undefined): FileReference[] {
    if (!raw) return [];

    const filtered = this.filterItalicLines(raw);
    const results: FileReference[] = [];

    for (const line of filtered.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;

      // Remove bullet marker
      const content = trimmed.replace(/^[-*]\s+/, '');

      // Try backtick-wrapped path: `path` - description
      const backtickMatch = content.match(/^`([^`]+)`\s*[-–—]\s*(.+)$/);
      if (backtickMatch) {
        results.push({
          path: backtickMatch[1].trim(),
          description: backtickMatch[2].trim(),
        });
        continue;
      }

      // Try plain path: path/to/file.ext - description
      // Match file paths that contain at least one / or end with a file extension
      const plainMatch = content.match(
        /^(\S+(?:\/\S+)*\.\w+)\s*[-–—]\s*(.+)$/
      );
      if (plainMatch) {
        results.push({
          path: plainMatch[1].trim(),
          description: plainMatch[2].trim(),
        });
      }
    }

    return results;
  }

  // ─── Workflow Parsing ──────────────────────────────────────────

  /**
   * Parse workflow steps from code blocks and bullet points.
   * Supports:
   *   ```bash
   *   command here
   *   ```
   *   - `command` - description
   */
  private parseWorkflow(raw: string | undefined): WorkflowStep[] {
    if (!raw) return [];

    const filtered = this.filterItalicLines(raw);
    const results: WorkflowStep[] = [];
    const lines = filtered.split('\n');

    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle code block start
      if (trimmed.startsWith('```') && !inCodeBlock) {
        inCodeBlock = true;
        codeBlockContent = [];
        continue;
      }

      // Handle code block end
      if (trimmed === '```' && inCodeBlock) {
        inCodeBlock = false;
        const command = codeBlockContent.join('\n').trim();
        if (command) {
          results.push({
            command,
            description: command,
          });
        }
        continue;
      }

      // Accumulate code block content
      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle bullet point commands
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const content = trimmed.replace(/^[-*]\s+/, '');

        // Try: `command` - description
        const backtickMatch = content.match(/^`([^`]+)`\s*[-–—]\s*(.+)$/);
        if (backtickMatch) {
          results.push({
            command: backtickMatch[1].trim(),
            description: backtickMatch[2].trim(),
          });
        }
      }
    }

    return results;
  }

  // ─── Error Parsing ─────────────────────────────────────────────

  /**
   * Parse error/correction pairs from the Errors & Corrections section.
   * Format:
   *   - Error: description
   *     - Correction: how it was fixed
   *     - Failed approach: what didn't work (optional)
   */
  private parseErrors(raw: string | undefined): ErrorCorrection[] {
    if (!raw) return [];

    const filtered = this.filterItalicLines(raw);
    const results: ErrorCorrection[] = [];
    const lines = filtered.split('\n');

    let currentError: Partial<ErrorCorrection> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check if this is a top-level bullet (error entry)
      // Top-level bullets start with - or * without leading whitespace (after trim of the original line)
      const isTopLevel = /^[-*]\s/.test(trimmed) && !/^\s{2,}/.test(line);
      const isSubLevel = /^\s{2,}[-*]\s/.test(line);

      if (isTopLevel) {
        // Save previous error if exists
        if (currentError?.error) {
          results.push(this.finalizeError(currentError));
        }

        const content = trimmed.replace(/^[-*]\s+/, '');
        // Strip "Error:" prefix if present
        const errorText = content.replace(/^Error:\s*/i, '');
        currentError = { error: errorText };
      } else if (isSubLevel && currentError) {
        const content = trimmed.replace(/^[-*]\s+/, '');

        if (/^Correction:\s*/i.test(content)) {
          currentError.correction = content.replace(/^Correction:\s*/i, '');
        } else if (/^Failed approach:\s*/i.test(content)) {
          currentError.failedApproach = content.replace(
            /^Failed approach:\s*/i,
            ''
          );
        }
      }
    }

    // Save the last error
    if (currentError?.error) {
      results.push(this.finalizeError(currentError));
    }

    return results;
  }

  /**
   * Finalize a partial error correction, ensuring required fields have defaults.
   */
  private finalizeError(partial: Partial<ErrorCorrection>): ErrorCorrection {
    return {
      error: partial.error ?? '',
      correction: partial.correction ?? '',
      ...(partial.failedApproach
        ? { failedApproach: partial.failedApproach }
        : {}),
    };
  }

  // ─── Learning Parsing ──────────────────────────────────────────

  /**
   * Parse learnings from bullet points and classify them by sentiment.
   */
  private parseLearnings(raw: string | undefined): Learning[] {
    if (!raw) return [];

    const filtered = this.filterItalicLines(raw);
    const results: Learning[] = [];

    for (const line of filtered.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;

      const content = trimmed.replace(/^[-*]\s+/, '').trim();
      if (!content) continue;

      results.push({
        content,
        type: this.classifyLearning(content),
      });
    }

    return results;
  }

  /**
   * Classify a learning as positive, negative, or neutral based on keyword analysis.
   * Case-insensitive matching against known keyword lists.
   */
  private classifyLearning(content: string): LearningType {
    const lower = content.toLowerCase();

    // Check negative keywords first (order matters: "avoid" is more decisive)
    for (const keyword of NEGATIVE_KEYWORDS) {
      if (lower.includes(keyword)) {
        return 'negative';
      }
    }

    // Check positive keywords
    for (const keyword of POSITIVE_KEYWORDS) {
      if (lower.includes(keyword)) {
        return 'positive';
      }
    }

    return 'neutral';
  }

  // ─── Worklog Parsing ───────────────────────────────────────────

  /**
   * Parse worklog entries from bullet points.
   * Supports optional bracketed markers: [Step 1], [2023-01-01], etc.
   */
  private parseWorklog(raw: string | undefined): WorklogEntry[] {
    if (!raw) return [];

    const filtered = this.filterItalicLines(raw);
    const results: WorklogEntry[] = [];

    for (const line of filtered.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;

      const content = trimmed.replace(/^[-*]\s+/, '').trim();
      if (!content) continue;

      // Try to extract a bracketed marker: [Step 1] Activity description
      const markerMatch = content.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (markerMatch) {
        results.push({
          marker: markerMatch[1].trim(),
          activity: markerMatch[2].trim(),
        });
      } else {
        results.push({
          activity: content,
        });
      }
    }

    return results;
  }
}
