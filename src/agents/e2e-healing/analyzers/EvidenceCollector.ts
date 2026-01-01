import { readFile } from 'fs/promises';
import { glob } from 'glob';

interface Evidence {
  testFile: string;
  testCode: string;
  error?: Error;
  screenshot?: string;
  logs?: string[];
  relatedFiles: string[];
}

type FileReader = (path: string) => Promise<string>;
type Globber = (pattern: string) => Promise<string[]>;

export class EvidenceCollector {
  private fileReader: FileReader;
  private globber: Globber;

  constructor() {
    this.fileReader = this.defaultFileReader;
    this.globber = this.defaultGlobber;
  }

  setFileReader(reader: FileReader): void {
    this.fileReader = reader;
  }

  setGlobber(globber: Globber): void {
    this.globber = globber;
  }

  async collect(testFile: string): Promise<Evidence> {
    // Read test file
    const testCode = await this.fileReader(testFile);

    // Identify component name from test file
    const componentName = this.extractComponentName(testFile);

    // Find related files (component + styles)
    const relatedFiles = await this.findRelatedFiles(componentName);

    return {
      testFile,
      testCode,
      relatedFiles,
    };
  }

  private extractComponentName(testFile: string): string {
    const match = testFile.match(/\/([^/]+)\.test\.(tsx?|jsx?)$/);
    return match ? match[1] : '';
  }

  private async findRelatedFiles(componentName: string): Promise<string[]> {
    if (!componentName) return [];

    const patterns = [
      `**/${componentName}.tsx`,
      `**/${componentName}.ts`,
      `**/${componentName}.jsx`,
      `**/${componentName}.js`,
      `**/${componentName}.module.css`,
      `**/${componentName}.module.scss`,
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await this.globber(pattern);
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async defaultFileReader(path: string): Promise<string> {
    return await readFile(path, 'utf-8');
  }

  private async defaultGlobber(pattern: string): Promise<string[]> {
    return await glob(pattern);
  }
}
