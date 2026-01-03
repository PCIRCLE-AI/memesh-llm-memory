export declare enum PasswordStrength {
    WEAK = "weak",
    MEDIUM = "medium",
    STRONG = "strong",
    VERY_STRONG = "very_strong"
}
export interface PasswordOptions {
    length?: number;
    lowercase?: boolean;
    uppercase?: boolean;
    digits?: boolean;
    special?: boolean;
    specialChars?: string;
    excludeAmbiguous?: boolean;
    minOfEachType?: number;
}
export interface ApiKeyOptions {
    prefix?: string;
    length?: number;
    encoding?: 'base64' | 'base64url' | 'hex';
}
export interface SshKeyOptions {
    type?: 'rsa' | 'ed25519' | 'ecdsa';
    bits?: number;
    comment?: string;
    passphrase?: string;
}
export interface SshKeyPair {
    publicKey: string;
    privateKey: string;
    fingerprint: string;
    type: string;
    comment?: string;
}
export interface SecretTemplate {
    name: string;
    description: string;
    generator: () => string;
    strength: PasswordStrength;
    pattern?: RegExp;
}
export declare class SecretGenerator {
    private static readonly LOWERCASE;
    private static readonly UPPERCASE;
    private static readonly DIGITS;
    private static readonly SPECIAL;
    private static readonly AMBIGUOUS;
    static generatePassword(options?: PasswordOptions): string;
    static generateApiKey(options?: ApiKeyOptions): string;
    static generateUUID(): string;
    static generateToken(length?: number): string;
    static generateEncryptionKey(bits?: number): string;
    static generateCustomSecret(alphabet: string, length: number): string;
    static generatePIN(digits?: number): string;
    static generatePassphrase(wordCount?: number, separator?: string): string;
    static estimateStrength(password: string): {
        strength: PasswordStrength;
        entropy: number;
        score: number;
    };
    static validatePassword(password: string, requirements?: PasswordOptions): {
        valid: boolean;
        errors: string[];
    };
    static getTemplates(): Record<string, SecretTemplate>;
    static generateFromTemplate(templateName: string): string;
    private static randomChar;
    private static shuffle;
}
//# sourceMappingURL=SecretGenerator.d.ts.map