import chalk from 'chalk';
import * as readline from 'readline';
import { saveCredentials, loadCredentials } from './credentials.js';
import { logger } from '../utils/logger.js';
const DEFAULT_BACKEND_URL = 'https://memesh-backend.fly.dev';
async function openBrowser(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return;
        }
    }
    catch {
        return;
    }
    const { spawn } = await import('child_process');
    const platform = process.platform;
    try {
        if (platform === 'darwin') {
            spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
        }
        else if (platform === 'win32') {
            spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
        }
        else {
            spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
        }
    }
    catch {
    }
}
async function deviceFlowLogin(backendUrl) {
    console.log(chalk.bold('\nMeMesh Cloud Login\n'));
    const existing = loadCredentials();
    if (existing) {
        console.log(chalk.yellow('You are already logged in.'));
        console.log(chalk.dim('Run `memesh logout` first to log out, or use --manual to enter a new key.\n'));
        return;
    }
    console.log(chalk.dim('Initiating device authorization...'));
    let deviceAuth;
    try {
        const response = await fetch(`${backendUrl}/auth/device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: 'memesh-cli' }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_description || 'Failed to initiate device authorization');
        }
        deviceAuth = await response.json();
    }
    catch (error) {
        console.error(chalk.red('Failed to connect to MeMesh Cloud.'));
        console.error(chalk.dim(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
    console.log('');
    console.log(chalk.bold('  Your code: ') + chalk.cyan.bold(deviceAuth.user_code));
    console.log('');
    console.log(chalk.dim('  Opening browser to approve...'));
    console.log(chalk.dim(`  ${deviceAuth.verification_uri_complete}`));
    console.log('');
    await openBrowser(deviceAuth.verification_uri_complete);
    console.log(chalk.dim('  Waiting for approval... (Ctrl+C to cancel)'));
    const startTime = Date.now();
    const expiresMs = deviceAuth.expires_in * 1000;
    let interval = deviceAuth.interval * 1000;
    let cancelled = false;
    const sigintHandler = () => {
        cancelled = true;
        console.log('\n\n  Login cancelled.\n');
        process.exit(130);
    };
    process.on('SIGINT', sigintHandler);
    try {
        while (!cancelled && Date.now() - startTime < expiresMs) {
            await new Promise(resolve => setTimeout(resolve, interval));
            try {
                const response = await fetch(`${backendUrl}/auth/device/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                        device_code: deviceAuth.device_code,
                    }),
                });
                if (response.ok) {
                    const tokenData = await response.json();
                    saveCredentials({
                        apiKey: tokenData.api_key,
                        baseUrl: backendUrl !== DEFAULT_BACKEND_URL ? backendUrl : undefined,
                        createdAt: new Date().toISOString(),
                    });
                    console.log(chalk.green.bold('\n  ✓ Login successful!\n'));
                    console.log(chalk.dim('  API key stored in ~/.config/memesh/credentials.json'));
                    console.log(chalk.dim('  MCP tools will automatically use this key.\n'));
                    return;
                }
                const error = await response.json();
                if (error.error === 'authorization_pending') {
                    process.stdout.write(chalk.dim('.'));
                    continue;
                }
                if (error.error === 'slow_down') {
                    interval += 5000;
                    continue;
                }
                if (error.error === 'access_denied') {
                    console.log(chalk.red('\n  ✗ Authorization denied.\n'));
                    process.exit(1);
                }
                if (error.error === 'expired_token') {
                    console.log(chalk.red('\n  ✗ Authorization expired. Please try again.\n'));
                    process.exit(1);
                }
                console.error(chalk.red(`\n  Error: ${error.error_description || error.error}\n`));
                process.exit(1);
            }
            catch (error) {
                logger.debug('Polling error', { error: String(error) });
                continue;
            }
        }
    }
    finally {
        process.removeListener('SIGINT', sigintHandler);
    }
    console.log(chalk.red('\n  ✗ Authorization timed out. Please try again.\n'));
    process.exit(1);
}
export function readApiKeyFromStdin() {
    if (!process.stdin.isTTY) {
        console.error(chalk.red('Error: --manual requires an interactive terminal.'));
        console.error(chalk.dim('Use `memesh login` for browser-based device flow instead.'));
        process.exit(1);
    }
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
        });
        const sigintHandler = () => {
            rl.close();
            console.log('\n\n  Login cancelled.\n');
            process.exit(130);
        };
        process.on('SIGINT', sigintHandler);
        const originalWrite = rl._writeToOutput;
        rl._writeToOutput = function (stringToWrite) {
            if (stringToWrite.includes('Enter API key:')) {
                originalWrite.call(rl, stringToWrite);
            }
            else {
                originalWrite.call(rl, '*');
            }
        };
        rl.question('  Enter API key: ', (answer) => {
            process.removeListener('SIGINT', sigintHandler);
            rl.close();
            console.log('');
            resolve(answer.trim());
        });
        rl.on('error', (err) => {
            process.removeListener('SIGINT', sigintHandler);
            rl.close();
            reject(err);
        });
    });
}
async function manualKeyLogin(backendUrl) {
    console.log(chalk.bold('\nMeMesh Cloud Login (Manual API Key)\n'));
    console.log(chalk.dim('  Your input will be hidden for security.\n'));
    const apiKey = await readApiKeyFromStdin();
    if (!apiKey) {
        console.error(chalk.red('No API key entered.'));
        process.exit(1);
    }
    const API_KEY_PATTERN = /^sk_memmesh_[a-zA-Z0-9_]{20,}$/;
    if (!API_KEY_PATTERN.test(apiKey)) {
        console.error(chalk.red('Invalid API key format. Expected: sk_memmesh_<key> (alphanumeric, min 20 chars after prefix)'));
        process.exit(1);
    }
    console.log(chalk.dim('Verifying API key...'));
    try {
        const response = await fetch(`${backendUrl}/agents/me`, {
            headers: { 'x-api-key': apiKey },
        });
        if (!response.ok) {
            console.error(chalk.red('Invalid API key. Please check and try again.'));
            process.exit(1);
        }
    }
    catch {
        console.error(chalk.red('Failed to connect to MeMesh Cloud. Please check your network.'));
        process.exit(1);
    }
    saveCredentials({
        apiKey,
        baseUrl: backendUrl !== DEFAULT_BACKEND_URL ? backendUrl : undefined,
        createdAt: new Date().toISOString(),
    });
    console.log(chalk.green.bold('  ✓ Login successful!\n'));
    console.log(chalk.dim('  API key stored in ~/.config/memesh/credentials.json\n'));
}
export function registerLoginCommand(program) {
    program
        .command('login')
        .description('Authenticate with MeMesh Cloud')
        .option('--manual', 'Enter API key manually (secure stdin input)')
        .option('--backend-url <url>', 'Backend URL', DEFAULT_BACKEND_URL)
        .action(async (options) => {
        try {
            if (options.manual) {
                await manualKeyLogin(options.backendUrl);
            }
            else {
                await deviceFlowLogin(options.backendUrl);
            }
        }
        catch (error) {
            logger.error('Login failed', { error });
            console.error(chalk.red('Login failed:'), error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=login.js.map