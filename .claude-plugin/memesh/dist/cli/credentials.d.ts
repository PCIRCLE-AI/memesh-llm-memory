export interface MeMeshCredentials {
    apiKey: string;
    email?: string;
    userId?: string;
    baseUrl?: string;
    createdAt: string;
}
export declare function getCredentialsPath(): string;
export declare function loadCredentials(): MeMeshCredentials | null;
export declare function saveCredentials(creds: MeMeshCredentials): void;
export declare function deleteCredentials(): boolean;
//# sourceMappingURL=credentials.d.ts.map