import { SESSION_MEMORY_SECTIONS, } from './types.js';
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
const POSITIVE_KEYWORDS = [
    'works well',
    'success',
    'effective',
    'recommended',
    'best practice',
    'good',
    'helpful',
];
const ITALIC_LINE_PATTERN = /^_[^_]+_$/;
export class SessionMemoryParser {
    static MAX_INPUT_SIZE = 10 * 1024 * 1024;
    parse(markdown) {
        if (markdown.length > SessionMemoryParser.MAX_INPUT_SIZE) {
            throw new Error(`Input too large: ${markdown.length} bytes exceeds maximum of ${SessionMemoryParser.MAX_INPUT_SIZE}`);
        }
        const normalized = markdown.replace(/\r\n/g, '\n');
        const rawSections = this.splitSections(normalized);
        const titleContent = rawSections.get(SESSION_MEMORY_SECTIONS.TITLE);
        const title = titleContent
            ? this.filterItalicLines(titleContent).trim()
            : '';
        const currentState = this.parseTextSection(rawSections.get(SESSION_MEMORY_SECTIONS.CURRENT_STATE));
        const taskSpec = this.parseTextSection(rawSections.get(SESSION_MEMORY_SECTIONS.TASK_SPEC));
        const codebaseDoc = this.parseTextSection(rawSections.get(SESSION_MEMORY_SECTIONS.CODEBASE));
        const filesAndFunctions = this.parseFileReferences(rawSections.get(SESSION_MEMORY_SECTIONS.FILES));
        const workflow = this.parseWorkflow(rawSections.get(SESSION_MEMORY_SECTIONS.WORKFLOW));
        const errorsAndCorrections = this.parseErrors(rawSections.get(SESSION_MEMORY_SECTIONS.ERRORS));
        const learnings = this.parseLearnings(rawSections.get(SESSION_MEMORY_SECTIONS.LEARNINGS));
        const worklog = this.parseWorklog(rawSections.get(SESSION_MEMORY_SECTIONS.WORKLOG));
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
    splitSections(markdown) {
        const sections = new Map();
        if (!markdown.trim()) {
            return sections;
        }
        const lines = markdown.split('\n');
        let currentHeader = null;
        let currentContent = [];
        for (const line of lines) {
            const headerMatch = line.match(/^# (.+)$/);
            if (headerMatch) {
                if (currentHeader !== null) {
                    sections.set(currentHeader, currentContent.join('\n'));
                }
                currentHeader = headerMatch[1].trim();
                currentContent = [];
            }
            else if (currentHeader !== null) {
                currentContent.push(line);
            }
        }
        if (currentHeader !== null) {
            sections.set(currentHeader, currentContent.join('\n'));
        }
        return sections;
    }
    parseTextSection(raw) {
        if (!raw)
            return null;
        const filtered = this.filterItalicLines(raw).trim();
        return filtered || null;
    }
    filterItalicLines(content) {
        return content
            .split('\n')
            .filter((line) => !ITALIC_LINE_PATTERN.test(line.trim()))
            .join('\n');
    }
    parseFileReferences(raw) {
        if (!raw)
            return [];
        const filtered = this.filterItalicLines(raw);
        const results = [];
        for (const line of filtered.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('-') && !trimmed.startsWith('*'))
                continue;
            const content = trimmed.replace(/^[-*]\s+/, '');
            const backtickMatch = content.match(/^`([^`]+)`\s*[-–—]\s*(.+)$/);
            if (backtickMatch) {
                results.push({
                    path: backtickMatch[1].trim(),
                    description: backtickMatch[2].trim(),
                });
                continue;
            }
            const plainMatch = content.match(/^([^\s-–—]+\.\w+)\s*[-–—]\s*(.+)$/);
            if (plainMatch) {
                results.push({
                    path: plainMatch[1].trim(),
                    description: plainMatch[2].trim(),
                });
            }
        }
        return results;
    }
    parseWorkflow(raw) {
        if (!raw)
            return [];
        const filtered = this.filterItalicLines(raw);
        const results = [];
        const lines = filtered.split('\n');
        let inCodeBlock = false;
        let codeBlockContent = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (trimmed.startsWith('```') && !inCodeBlock) {
                inCodeBlock = true;
                codeBlockContent = [];
                continue;
            }
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
            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }
            if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                const content = trimmed.replace(/^[-*]\s+/, '');
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
    parseErrors(raw) {
        if (!raw)
            return [];
        const filtered = this.filterItalicLines(raw);
        const results = [];
        const lines = filtered.split('\n');
        let currentError = null;
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            const isTopLevel = /^[-*]\s/.test(trimmed) && !/^\s{2,}/.test(line);
            const isSubLevel = /^\s{2,}[-*]\s/.test(line);
            if (isTopLevel) {
                if (currentError?.error) {
                    results.push(this.finalizeError(currentError));
                }
                const content = trimmed.replace(/^[-*]\s+/, '');
                const errorText = content.replace(/^Error:\s*/i, '');
                currentError = { error: errorText };
            }
            else if (isSubLevel && currentError) {
                const content = trimmed.replace(/^[-*]\s+/, '');
                if (/^Correction:\s*/i.test(content)) {
                    currentError.correction = content.replace(/^Correction:\s*/i, '');
                }
                else if (/^Failed approach:\s*/i.test(content)) {
                    currentError.failedApproach = content.replace(/^Failed approach:\s*/i, '');
                }
            }
        }
        if (currentError?.error) {
            results.push(this.finalizeError(currentError));
        }
        return results;
    }
    finalizeError(partial) {
        return {
            error: partial.error ?? '',
            correction: partial.correction ?? '',
            ...(partial.failedApproach
                ? { failedApproach: partial.failedApproach }
                : {}),
        };
    }
    parseLearnings(raw) {
        if (!raw)
            return [];
        const filtered = this.filterItalicLines(raw);
        const results = [];
        for (const line of filtered.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('-') && !trimmed.startsWith('*'))
                continue;
            const content = trimmed.replace(/^[-*]\s+/, '').trim();
            if (!content)
                continue;
            results.push({
                content,
                type: this.classifyLearning(content),
            });
        }
        return results;
    }
    classifyLearning(content) {
        const lower = content.toLowerCase();
        for (const keyword of NEGATIVE_KEYWORDS) {
            if (lower.includes(keyword)) {
                return 'negative';
            }
        }
        for (const keyword of POSITIVE_KEYWORDS) {
            if (lower.includes(keyword)) {
                return 'positive';
            }
        }
        return 'neutral';
    }
    parseWorklog(raw) {
        if (!raw)
            return [];
        const filtered = this.filterItalicLines(raw);
        const results = [];
        for (const line of filtered.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('-') && !trimmed.startsWith('*'))
                continue;
            const content = trimmed.replace(/^[-*]\s+/, '').trim();
            if (!content)
                continue;
            const markerMatch = content.match(/^\[([^\]]+)\]\s*(.+)$/);
            if (markerMatch) {
                results.push({
                    marker: markerMatch[1].trim(),
                    activity: markerMatch[2].trim(),
                });
            }
            else {
                results.push({
                    activity: content,
                });
            }
        }
        return results;
    }
}
//# sourceMappingURL=SessionMemoryParser.js.map