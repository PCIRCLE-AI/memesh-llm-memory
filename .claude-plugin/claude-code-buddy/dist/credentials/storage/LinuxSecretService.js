import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const SCHEMA = 'com.smart-agents.credential';
export class LinuxSecretService {
    toolType = null;
    async set(credential) {
        await this.ensureToolAvailable();
        if (this.toolType === 'secret-tool') {
            const attributes = [
                `service ${credential.service}`,
                `account ${credential.account}`,
            ].join(' ');
            const label = `Smart-Agents: ${credential.service}/${credential.account}`;
            const command = `echo '${this.escapeString(credential.value)}' | secret-tool store --label='${label}' ${attributes}`;
            try {
                await execAsync(command, { shell: '/bin/bash' });
            }
            catch (error) {
                throw new Error(`Failed to store credential in Linux Secret Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            if (credential.metadata) {
                const metadataAttributes = [
                    `service ${credential.service}.metadata`,
                    `account ${credential.account}`,
                ].join(' ');
                const metadataValue = JSON.stringify(credential.metadata);
                const metadataCommand = `echo '${this.escapeString(metadataValue)}' | secret-tool store --label='${label} metadata' ${metadataAttributes}`;
                try {
                    await execAsync(metadataCommand, { shell: '/bin/bash' });
                }
                catch {
                }
            }
        }
        else if (this.toolType === 'kwallet') {
            const folder = 'Smart-Agents';
            const key = `${credential.service}/${credential.account}`;
            const command = `qdbus org.kde.kwalletd5 /modules/kwalletd5 org.kde.KWallet.writePassword 0 ${folder} ${key} '${this.escapeString(credential.value)}' Smart-Agents`;
            try {
                await execAsync(command);
            }
            catch (error) {
                throw new Error(`Failed to store credential in KWallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    async get(service, account) {
        await this.ensureToolAvailable();
        if (this.toolType === 'secret-tool') {
            const attributes = [
                `service ${service}`,
                `account ${account}`,
            ].join(' ');
            const command = `secret-tool lookup ${attributes}`;
            try {
                const { stdout } = await execAsync(command);
                const value = stdout.trim();
                let metadata;
                try {
                    const metadataAttributes = [
                        `service ${service}.metadata`,
                        `account ${account}`,
                    ].join(' ');
                    const metadataCommand = `secret-tool lookup ${metadataAttributes}`;
                    const { stdout: metadataStdout } = await execAsync(metadataCommand);
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
            catch {
                return null;
            }
        }
        else if (this.toolType === 'kwallet') {
            const folder = 'Smart-Agents';
            const key = `${service}/${account}`;
            const command = `qdbus org.kde.kwalletd5 /modules/kwalletd5 org.kde.KWallet.readPassword 0 ${folder} ${key} Smart-Agents`;
            try {
                const { stdout } = await execAsync(command);
                const value = stdout.trim();
                return {
                    id: `${service}:${account}`,
                    service,
                    account,
                    value,
                };
            }
            catch {
                return null;
            }
        }
        return null;
    }
    async delete(service, account) {
        await this.ensureToolAvailable();
        if (this.toolType === 'secret-tool') {
            const attributes = [
                `service ${service}`,
                `account ${account}`,
            ].join(' ');
            const command = `secret-tool clear ${attributes}`;
            try {
                await execAsync(command);
                try {
                    const metadataAttributes = [
                        `service ${service}.metadata`,
                        `account ${account}`,
                    ].join(' ');
                    const metadataCommand = `secret-tool clear ${metadataAttributes}`;
                    await execAsync(metadataCommand);
                }
                catch {
                }
            }
            catch (error) {
                throw new Error(`Failed to delete credential from Linux Secret Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        else if (this.toolType === 'kwallet') {
            const folder = 'Smart-Agents';
            const key = `${service}/${account}`;
            const command = `qdbus org.kde.kwalletd5 /modules/kwalletd5 org.kde.KWallet.removeEntry 0 ${folder} ${key} Smart-Agents`;
            try {
                await execAsync(command);
            }
            catch (error) {
                throw new Error(`Failed to delete credential from KWallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    async list(query) {
        return [];
    }
    async isAvailable() {
        try {
            await execAsync('which secret-tool');
            this.toolType = 'secret-tool';
            return true;
        }
        catch {
        }
        try {
            await execAsync('which qdbus');
            const { stdout } = await execAsync('qdbus org.kde.kwalletd5');
            if (stdout.includes('kwalletd5')) {
                this.toolType = 'kwallet';
                return true;
            }
        }
        catch {
        }
        return false;
    }
    getType() {
        if (this.toolType === 'secret-tool') {
            return 'Linux Secret Service (GNOME)';
        }
        else if (this.toolType === 'kwallet') {
            return 'Linux Secret Service (KDE KWallet)';
        }
        return 'Linux Secret Service';
    }
    async ensureToolAvailable() {
        if (this.toolType === null) {
            const available = await this.isAvailable();
            if (!available) {
                throw new Error('Linux Secret Service not available');
            }
        }
    }
    escapeString(str) {
        return str.replace(/'/g, "'\\''");
    }
}
//# sourceMappingURL=LinuxSecretService.js.map