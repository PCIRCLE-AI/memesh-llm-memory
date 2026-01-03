import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const TARGET_PREFIX = 'SmartAgents';
export class WindowsCredentialManager {
    async set(credential) {
        const targetName = `${TARGET_PREFIX}/${credential.service}/${credential.account}`;
        const comment = credential.metadata ? JSON.stringify(credential.metadata) : '';
        const psCommand = `
      $password = ConvertTo-SecureString '${this.escapeString(credential.value)}' -AsPlainText -Force;
      $cred = New-Object System.Management.Automation.PSCredential ('${this.escapeString(credential.account)}', $password);

      # Use cmdkey as it's more reliable than PowerShell Credential Manager
      cmdkey /generic:"${this.escapeString(targetName)}" /user:"${this.escapeString(credential.account)}" /pass:"${this.escapeString(credential.value)}"
    `;
        try {
            await execAsync(`powershell.exe -Command "${psCommand}"`, {
                shell: 'cmd.exe',
            });
        }
        catch (error) {
            throw new Error(`Failed to store credential in Windows Credential Manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async get(service, account) {
        const targetName = `${TARGET_PREFIX}/${service}/${account}`;
        const psCommand = `
      cmdkey /list:"${this.escapeString(targetName)}"
    `;
        try {
            const { stdout } = await execAsync(`powershell.exe -Command "${psCommand}"`, {
                shell: 'cmd.exe',
            });
            return null;
        }
        catch {
            return null;
        }
    }
    async delete(service, account) {
        const targetName = `${TARGET_PREFIX}/${service}/${account}`;
        const psCommand = `
      cmdkey /delete:"${this.escapeString(targetName)}"
    `;
        try {
            await execAsync(`powershell.exe -Command "${psCommand}"`, {
                shell: 'cmd.exe',
            });
        }
        catch (error) {
            throw new Error(`Failed to delete credential from Windows Credential Manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async list(query) {
        const psCommand = `
      cmdkey /list | Select-String "${TARGET_PREFIX}"
    `;
        try {
            const { stdout } = await execAsync(`powershell.exe -Command "${psCommand}"`, {
                shell: 'cmd.exe',
            });
            const credentials = [];
            return credentials;
        }
        catch {
            return [];
        }
    }
    async isAvailable() {
        try {
            await execAsync('where cmdkey', { shell: 'cmd.exe' });
            return true;
        }
        catch {
            return false;
        }
    }
    getType() {
        return 'Windows Credential Manager';
    }
    escapeString(str) {
        return str
            .replace(/'/g, "''")
            .replace(/"/g, '`"')
            .replace(/\$/g, '`$');
    }
}
//# sourceMappingURL=WindowsCredentialManager.js.map