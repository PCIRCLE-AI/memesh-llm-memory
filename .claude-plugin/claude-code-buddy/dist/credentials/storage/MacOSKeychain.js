import { spawn } from 'child_process';
const SERVICE_PREFIX = 'com.smart-agents';
async function execSecurely(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('security', args);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            }
            else {
                reject(new Error(stderr || `security command exited with code ${code}`));
            }
        });
        proc.on('error', (error) => {
            reject(error);
        });
    });
}
export class MacOSKeychain {
    async set(credential) {
        const serviceName = `${SERVICE_PREFIX}.${credential.service}`;
        try {
            await this.delete(credential.service, credential.account);
        }
        catch {
        }
        const args = [
            'add-generic-password',
            '-s', serviceName,
            '-a', credential.account,
            '-w', credential.value,
            '-U',
        ];
        try {
            await execSecurely(args);
        }
        catch (error) {
            throw new Error(`Failed to store credential in macOS Keychain: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        if (credential.metadata) {
            const metadataService = `${serviceName}.metadata`;
            const metadataValue = JSON.stringify(credential.metadata);
            const metadataArgs = [
                'add-generic-password',
                '-s', metadataService,
                '-a', credential.account,
                '-w', metadataValue,
                '-U',
            ];
            try {
                await execSecurely(metadataArgs);
            }
            catch {
            }
        }
    }
    async get(service, account) {
        const serviceName = `${SERVICE_PREFIX}.${service}`;
        const args = [
            'find-generic-password',
            '-s', serviceName,
            '-a', account,
            '-w',
        ];
        try {
            const stdout = await execSecurely(args);
            const value = stdout.trim();
            let metadata;
            try {
                const metadataService = `${serviceName}.metadata`;
                const metadataArgs = [
                    'find-generic-password',
                    '-s', metadataService,
                    '-a', account,
                    '-w',
                ];
                const metadataStdout = await execSecurely(metadataArgs);
                metadata = JSON.parse(metadataStdout.trim());
                if (metadata.createdAt)
                    metadata.createdAt = new Date(metadata.createdAt);
                if (metadata.updatedAt)
                    metadata.updatedAt = new Date(metadata.updatedAt);
                if (metadata.expiresAt)
                    metadata.expiresAt = new Date(metadata.expiresAt);
            }
            catch {
            }
            return {
                id: `${service}:${account}`,
                service,
                account,
                value,
                metadata,
            };
        }
        catch (error) {
            return null;
        }
    }
    async delete(service, account) {
        const serviceName = `${SERVICE_PREFIX}.${service}`;
        const args = [
            'delete-generic-password',
            '-s', serviceName,
            '-a', account,
        ];
        try {
            await execSecurely(args);
            try {
                const metadataService = `${serviceName}.metadata`;
                const metadataArgs = [
                    'delete-generic-password',
                    '-s', metadataService,
                    '-a', account,
                ];
                await execSecurely(metadataArgs);
            }
            catch {
            }
        }
        catch (error) {
            throw new Error(`Failed to delete credential from macOS Keychain: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async list(query) {
        return [];
    }
    async isAvailable() {
        try {
            await execSecurely(['help']);
            return true;
        }
        catch {
            return false;
        }
    }
    getType() {
        return 'macOS Keychain';
    }
}
//# sourceMappingURL=MacOSKeychain.js.map