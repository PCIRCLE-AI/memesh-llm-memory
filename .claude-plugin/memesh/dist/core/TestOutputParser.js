export class TestOutputParser {
    parse(output) {
        const passedPattern = /(\d+)\s+(?:tests?\s+)?pass(?:ed|ing)/gi;
        const failedPattern = /(\d+)\s+(?:tests?\s+)?fail(?:ed|ing)/gi;
        let passed = 0;
        let failed = 0;
        let match;
        while ((match = passedPattern.exec(output)) !== null) {
            passed = parseInt(match[1], 10);
        }
        while ((match = failedPattern.exec(output)) !== null) {
            failed = parseInt(match[1], 10);
        }
        const total = passed + failed;
        let failedTests = [];
        if (failed > 0) {
            const framework = this.detectFramework(output);
            switch (framework) {
                case 'vitest':
                    failedTests = this.parseVitestFailures(output);
                    break;
                case 'jest':
                    failedTests = this.parseJestFailures(output);
                    break;
                case 'mocha':
                    failedTests = this.parseMochaFailures(output);
                    break;
            }
        }
        return { total, passed, failed, failedTests };
    }
    detectFramework(output) {
        if (output.includes(' > ') && output.includes('FAIL  '))
            return 'vitest';
        if (output.includes(' ● '))
            return 'jest';
        if (/\d+\)/.test(output) && /\d+\s+(?:passing|failing)/.test(output))
            return 'mocha';
        return 'unknown';
    }
    parseVitestFailures(output) {
        const failures = [];
        const lines = output.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const failMatch = /^\s*FAIL\s+(.+?)\s+>\s+(.+?)$/.exec(line);
            if (failMatch) {
                const fullPath = failMatch[1].trim();
                const testPath = failMatch[2].trim();
                const file = fullPath.includes('>') ? fullPath.split('>')[0].trim() : fullPath;
                const name = testPath;
                let error;
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine && !nextLine.startsWith('FAIL') && !nextLine.startsWith('Test Files')) {
                        error = nextLine;
                    }
                }
                failures.push({ name, file, error });
            }
        }
        return failures;
    }
    parseJestFailures(output) {
        const failures = [];
        const lines = output.split('\n');
        const files = [];
        for (const line of lines) {
            const fileMatch = /^\s*FAIL\s+(.+?)$/.exec(line);
            if (fileMatch && !line.includes('●')) {
                files.push(fileMatch[1].trim());
            }
        }
        let currentFileIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const failMatch = /^\s*●\s+(.+?)$/.exec(line);
            if (failMatch) {
                const name = failMatch[1].trim();
                const file = files[currentFileIndex];
                let error;
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    const errorLine = lines[j].trim();
                    if (errorLine && !errorLine.includes('●') && !errorLine.startsWith('FAIL')) {
                        error = errorLine;
                        break;
                    }
                }
                failures.push({ name, file, error });
            }
        }
        return failures;
    }
    parseMochaFailures(output) {
        const failures = [];
        const lines = output.split('\n');
        let inFailingSection = false;
        let failingSectionStart = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/\d+\s+failing/.test(line)) {
                inFailingSection = true;
                failingSectionStart = i;
                continue;
            }
            if (!inFailingSection || i <= failingSectionStart)
                continue;
            if (line.trim().startsWith('npm ') || line.trim().startsWith('Error: '))
                break;
            const singleLineMatch = /^\s*\d+\)\s+(.+?):\s*$/.exec(line);
            if (singleLineMatch) {
                const name = singleLineMatch[1].trim();
                let error;
                if (i + 1 < lines.length) {
                    const errorLine = lines[i + 1].trim();
                    if (errorLine && !errorLine.match(/^\d+\)/) && !errorLine.startsWith('at ')) {
                        error = errorLine;
                    }
                }
                failures.push({ name, error });
                continue;
            }
            const suiteMatch = /^\s*(\d+)\)\s+(.+?)\s*$/.exec(line);
            if (suiteMatch && i + 1 < lines.length) {
                const suite = suiteMatch[2].trim();
                const nextLine = lines[i + 1].trim();
                if (nextLine.endsWith(':') && lines[i + 1].startsWith('     ')) {
                    const testName = nextLine.slice(0, -1).trim();
                    const name = `${suite} ${testName}`;
                    let error;
                    if (i + 2 < lines.length) {
                        const errorLine = lines[i + 2].trim();
                        if (errorLine && !errorLine.match(/^\d+\)/) && !errorLine.startsWith('at ')) {
                            error = errorLine;
                        }
                    }
                    failures.push({ name, error });
                }
            }
        }
        return failures;
    }
}
//# sourceMappingURL=TestOutputParser.js.map