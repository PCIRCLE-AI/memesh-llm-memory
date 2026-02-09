import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
export function getCredentialsPath() {
    const configDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(configDir, 'memesh', 'credentials.json');
}
export function loadCredentials() {
    const credPath = getCredentialsPath();
    try {
        if (!fs.existsSync(credPath))
            return null;
        const content = fs.readFileSync(credPath, 'utf-8');
        const creds = JSON.parse(content);
        if (!creds || typeof creds.apiKey !== 'string' || !creds.apiKey) {
            return null;
        }
        return creds;
    }
    catch {
        return null;
    }
}
export function saveCredentials(creds) {
    const credPath = getCredentialsPath();
    const dir = path.dirname(credPath);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(credPath, JSON.stringify(creds, null, 2), { mode: 0o600 });
    fs.chmodSync(credPath, 0o600);
}
export function deleteCredentials() {
    const credPath = getCredentialsPath();
    try {
        if (fs.existsSync(credPath)) {
            fs.unlinkSync(credPath);
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=credentials.js.map