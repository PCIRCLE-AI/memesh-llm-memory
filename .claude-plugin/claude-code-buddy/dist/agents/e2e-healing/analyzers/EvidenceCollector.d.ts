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
export declare class EvidenceCollector {
    private fileReader;
    private globber;
    constructor();
    setFileReader(reader: FileReader): void;
    setGlobber(globber: Globber): void;
    collect(testFile: string): Promise<Evidence>;
    private extractComponentName;
    private findRelatedFiles;
    private defaultFileReader;
    private defaultGlobber;
}
export {};
//# sourceMappingURL=EvidenceCollector.d.ts.map