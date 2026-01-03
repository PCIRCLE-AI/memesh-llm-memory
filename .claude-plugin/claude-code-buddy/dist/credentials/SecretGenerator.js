import crypto from 'crypto';
import { logger } from '../utils/logger.js';
export var PasswordStrength;
(function (PasswordStrength) {
    PasswordStrength["WEAK"] = "weak";
    PasswordStrength["MEDIUM"] = "medium";
    PasswordStrength["STRONG"] = "strong";
    PasswordStrength["VERY_STRONG"] = "very_strong";
})(PasswordStrength || (PasswordStrength = {}));
export class SecretGenerator {
    static LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
    static UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    static DIGITS = '0123456789';
    static SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    static AMBIGUOUS = '0O1lI';
    static generatePassword(options = {}) {
        const opts = {
            length: 16,
            lowercase: true,
            uppercase: true,
            digits: true,
            special: true,
            specialChars: this.SPECIAL,
            excludeAmbiguous: false,
            minOfEachType: 1,
            ...options,
        };
        let charset = '';
        const requiredChars = [];
        if (opts.lowercase) {
            let chars = this.LOWERCASE;
            if (opts.excludeAmbiguous) {
                chars = chars.replace(/[lI]/g, '');
            }
            charset += chars;
            for (let i = 0; i < opts.minOfEachType; i++) {
                requiredChars.push(this.randomChar(chars));
            }
        }
        if (opts.uppercase) {
            let chars = this.UPPERCASE;
            if (opts.excludeAmbiguous) {
                chars = chars.replace(/[OI]/g, '');
            }
            charset += chars;
            for (let i = 0; i < opts.minOfEachType; i++) {
                requiredChars.push(this.randomChar(chars));
            }
        }
        if (opts.digits) {
            let chars = this.DIGITS;
            if (opts.excludeAmbiguous) {
                chars = chars.replace(/[01]/g, '');
            }
            charset += chars;
            for (let i = 0; i < opts.minOfEachType; i++) {
                requiredChars.push(this.randomChar(chars));
            }
        }
        if (opts.special) {
            charset += opts.specialChars;
            for (let i = 0; i < opts.minOfEachType; i++) {
                requiredChars.push(this.randomChar(opts.specialChars));
            }
        }
        if (charset.length === 0) {
            throw new Error('At least one character type must be enabled');
        }
        const remainingLength = opts.length - requiredChars.length;
        if (remainingLength < 0) {
            throw new Error('Password length too short for required character types');
        }
        for (let i = 0; i < remainingLength; i++) {
            requiredChars.push(this.randomChar(charset));
        }
        return this.shuffle(requiredChars).join('');
    }
    static generateApiKey(options = {}) {
        const opts = {
            length: 32,
            encoding: 'base64url',
            ...options,
        };
        const bytes = crypto.randomBytes(opts.length);
        let key;
        switch (opts.encoding) {
            case 'base64':
                key = bytes.toString('base64');
                break;
            case 'base64url':
                key = bytes.toString('base64url');
                break;
            case 'hex':
                key = bytes.toString('hex');
                break;
            default:
                throw new Error(`Unknown encoding: ${opts.encoding}`);
        }
        return opts.prefix ? `${opts.prefix}${key}` : key;
    }
    static generateUUID() {
        return crypto.randomUUID();
    }
    static generateToken(length = 32) {
        return crypto.randomBytes(length).toString('base64url');
    }
    static generateEncryptionKey(bits = 256) {
        if (![128, 192, 256].includes(bits)) {
            throw new Error('Key size must be 128, 192, or 256 bits');
        }
        return crypto.randomBytes(bits / 8).toString('hex');
    }
    static generateCustomSecret(alphabet, length) {
        if (!alphabet || alphabet.length === 0) {
            throw new Error('Alphabet cannot be empty');
        }
        if (length <= 0) {
            throw new Error('Length must be positive');
        }
        const result = [];
        for (let i = 0; i < length; i++) {
            result.push(this.randomChar(alphabet));
        }
        return result.join('');
    }
    static generatePIN(digits = 6) {
        if (digits < 4 || digits > 12) {
            throw new Error('PIN must be between 4 and 12 digits');
        }
        return this.generateCustomSecret(this.DIGITS, digits);
    }
    static generatePassphrase(wordCount = 6, separator = '-') {
        const words = [
            'correct', 'horse', 'battery', 'staple', 'mountain', 'river',
            'ocean', 'forest', 'desert', 'cloud', 'thunder', 'lightning',
            'rainbow', 'sunset', 'sunrise', 'galaxy', 'planet', 'comet',
            'asteroid', 'nebula', 'quasar', 'pulsar', 'meteor', 'eclipse',
            'aurora', 'crater', 'volcano', 'canyon', 'glacier', 'tundra',
        ];
        if (wordCount < 3 || wordCount > 10) {
            throw new Error('Word count must be between 3 and 10');
        }
        const selectedWords = [];
        for (let i = 0; i < wordCount; i++) {
            const randomIndex = crypto.randomInt(0, words.length);
            selectedWords.push(words[randomIndex]);
        }
        return selectedWords.join(separator);
    }
    static estimateStrength(password) {
        let charsetSize = 0;
        if (/[a-z]/.test(password))
            charsetSize += 26;
        if (/[A-Z]/.test(password))
            charsetSize += 26;
        if (/[0-9]/.test(password))
            charsetSize += 10;
        if (/[^a-zA-Z0-9]/.test(password))
            charsetSize += 32;
        const entropy = Math.log2(Math.pow(charsetSize, password.length));
        let score;
        let strength;
        if (entropy < 40) {
            score = 1;
            strength = PasswordStrength.WEAK;
        }
        else if (entropy < 60) {
            score = 2;
            strength = PasswordStrength.MEDIUM;
        }
        else if (entropy < 80) {
            score = 3;
            strength = PasswordStrength.STRONG;
        }
        else {
            score = 4;
            strength = PasswordStrength.VERY_STRONG;
        }
        return { strength, entropy, score };
    }
    static validatePassword(password, requirements = {}) {
        const errors = [];
        if (requirements.length && password.length < requirements.length) {
            errors.push(`Password must be at least ${requirements.length} characters`);
        }
        if (requirements.lowercase !== false && !/[a-z]/.test(password)) {
            errors.push('Password must contain lowercase letters');
        }
        if (requirements.uppercase !== false && !/[A-Z]/.test(password)) {
            errors.push('Password must contain uppercase letters');
        }
        if (requirements.digits !== false && !/[0-9]/.test(password)) {
            errors.push('Password must contain digits');
        }
        if (requirements.special !== false && !/[^a-zA-Z0-9]/.test(password)) {
            errors.push('Password must contain special characters');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static getTemplates() {
        return {
            webPassword: {
                name: 'Web Password',
                description: 'Strong password for web applications',
                generator: () => this.generatePassword({
                    length: 16,
                    lowercase: true,
                    uppercase: true,
                    digits: true,
                    special: true,
                    excludeAmbiguous: true,
                }),
                strength: PasswordStrength.STRONG,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{16,}$/,
            },
            apiKey: {
                name: 'API Key',
                description: 'Secure API key with prefix',
                generator: () => this.generateApiKey({ prefix: 'sk_', length: 32 }),
                strength: PasswordStrength.VERY_STRONG,
                pattern: /^sk_[A-Za-z0-9_-]{43}$/,
            },
            databasePassword: {
                name: 'Database Password',
                description: 'Very strong password for database access',
                generator: () => this.generatePassword({
                    length: 32,
                    lowercase: true,
                    uppercase: true,
                    digits: true,
                    special: true,
                    minOfEachType: 2,
                }),
                strength: PasswordStrength.VERY_STRONG,
            },
            encryptionKey: {
                name: 'Encryption Key',
                description: 'AES-256 encryption key',
                generator: () => this.generateEncryptionKey(256),
                strength: PasswordStrength.VERY_STRONG,
                pattern: /^[0-9a-f]{64}$/,
            },
            accessToken: {
                name: 'Access Token',
                description: 'Temporary access token',
                generator: () => this.generateToken(32),
                strength: PasswordStrength.VERY_STRONG,
                pattern: /^[A-Za-z0-9_-]{43}$/,
            },
            pin: {
                name: 'PIN Code',
                description: '6-digit PIN code',
                generator: () => this.generatePIN(6),
                strength: PasswordStrength.WEAK,
                pattern: /^\d{6}$/,
            },
            passphrase: {
                name: 'Passphrase',
                description: 'Memorable passphrase',
                generator: () => this.generatePassphrase(6, '-'),
                strength: PasswordStrength.STRONG,
            },
        };
    }
    static generateFromTemplate(templateName) {
        const templates = this.getTemplates();
        const template = templates[templateName];
        if (!template) {
            throw new Error(`Unknown template: ${templateName}`);
        }
        const secret = template.generator();
        logger.info('Secret generated from template', {
            template: templateName,
            strength: template.strength,
        });
        return secret;
    }
    static randomChar(charset) {
        const index = crypto.randomInt(0, charset.length);
        return charset[index];
    }
    static shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = crypto.randomInt(0, i + 1);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
//# sourceMappingURL=SecretGenerator.js.map