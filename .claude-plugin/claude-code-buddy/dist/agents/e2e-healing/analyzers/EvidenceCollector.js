import { readFile } from 'fs/promises';
import { glob } from 'glob';
export class EvidenceCollector {
    fileReader;
    globber;
    constructor() {
        this.fileReader = this.defaultFileReader;
        this.globber = this.defaultGlobber;
    }
    setFileReader(reader) {
        this.fileReader = reader;
    }
    setGlobber(globber) {
        this.globber = globber;
    }
    async collect(testFile) {
        const testCode = await this.fileReader(testFile);
        const componentName = this.extractComponentName(testFile);
        const relatedFiles = await this.findRelatedFiles(componentName);
        return {
            testFile,
            testCode,
            relatedFiles,
        };
    }
    extractComponentName(testFile) {
        const match = testFile.match(/\/([^/]+)\.test\.(tsx?|jsx?)$/);
        return match ? match[1] : '';
    }
    async findRelatedFiles(componentName) {
        if (!componentName)
            return [];
        const patterns = [
            `**/${componentName}.tsx`,
            `**/${componentName}.ts`,
            `**/${componentName}.jsx`,
            `**/${componentName}.js`,
            `**/${componentName}.module.css`,
            `**/${componentName}.module.scss`,
        ];
        const files = [];
        for (const pattern of patterns) {
            const matches = await this.globber(pattern);
            files.push(...matches);
        }
        return [...new Set(files)];
    }
    async defaultFileReader(path) {
        return await readFile(path, 'utf-8');
    }
    async defaultGlobber(pattern) {
        return await glob(pattern);
    }
}
//# sourceMappingURL=EvidenceCollector.js.map