/**
 * MeMesh Login Command
 *
 * OAuth 2.0 Device Authorization Flow for CLI authentication.
 * Opens browser for user approval, polls for API key, stores locally.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { saveCredentials, loadCredentials } from './credentials.js';
import { logger } from '../utils/logger.js';

const DEFAULT_BACKEND_URL = 'https://memesh-backend.fly.dev';

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  api_key: string;
  token_type: string;
}

interface OAuth2Error {
  error: string;
  error_description?: string;
}

/**
 * Open URL in default browser (cross-platform)
 * Uses spawn with argument arrays to prevent command injection.
 */
async function openBrowser(url: string): Promise<void> {
  // Validate URL before opening - only allow HTTP(S)
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return; // Only open HTTP(S) URLs
    }
  } catch {
    return; // Invalid URL
  }

  const { spawn } = await import('child_process');
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    // Silently fail - user can manually open URL
  }
}

/**
 * Device flow login - opens browser, polls for approval
 */
async function deviceFlowLogin(backendUrl: string): Promise<void> {
  console.log(chalk.bold('\nMeMesh Cloud Login\n'));

  // Check existing credentials
  const existing = loadCredentials();
  if (existing) {
    console.log(chalk.yellow('You are already logged in.'));
    console.log(chalk.dim('Run `memesh logout` first to log out, or use --api-key to override.\n'));
    return;
  }

  // Step 1: Initiate device authorization
  console.log(chalk.dim('Initiating device authorization...'));

  let deviceAuth: DeviceAuthResponse;
  try {
    const response = await fetch(`${backendUrl}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'memesh-cli' }),
    });

    if (!response.ok) {
      const error = await response.json() as OAuth2Error;
      throw new Error(error.error_description || 'Failed to initiate device authorization');
    }

    deviceAuth = await response.json() as DeviceAuthResponse;
  } catch (error) {
    console.error(chalk.red('Failed to connect to MeMesh Cloud.'));
    console.error(chalk.dim(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }

  // Step 2: Display code and open browser
  console.log('');
  console.log(chalk.bold('  Your code: ') + chalk.cyan.bold(deviceAuth.user_code));
  console.log('');
  console.log(chalk.dim('  Opening browser to approve...'));
  console.log(chalk.dim(`  ${deviceAuth.verification_uri_complete}`));
  console.log('');

  await openBrowser(deviceAuth.verification_uri_complete);

  // Step 3: Poll for token
  console.log(chalk.dim('  Waiting for approval... (Ctrl+C to cancel)'));

  const startTime = Date.now();
  const expiresMs = deviceAuth.expires_in * 1000;
  let interval = deviceAuth.interval * 1000;

  // Allow clean Ctrl+C cancellation during polling
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
          const tokenData = await response.json() as TokenResponse;

          // Save credentials
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

        // Handle OAuth2 errors
        const error = await response.json() as OAuth2Error;

        if (error.error === 'authorization_pending') {
          // Still waiting - continue polling (show dots for progress)
          process.stdout.write(chalk.dim('.'));
          continue;
        }

        if (error.error === 'slow_down') {
          interval += 5000; // Back off by 5 seconds
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

        // Unknown error
        console.error(chalk.red(`\n  Error: ${error.error_description || error.error}\n`));
        process.exit(1);

      } catch (error) {
        // Network error during polling - retry
        logger.debug('Polling error', { error: String(error) });
        continue;
      }
    }
  } finally {
    process.removeListener('SIGINT', sigintHandler);
  }

  console.log(chalk.red('\n  ✗ Authorization timed out. Please try again.\n'));
  process.exit(1);
}

/**
 * Manual API key login
 */
async function manualKeyLogin(apiKey: string, backendUrl: string): Promise<void> {
  console.log(chalk.bold('\nMeMesh Cloud Login (API Key)\n'));

  // Validate key format
  if (!apiKey.startsWith('sk_memmesh_')) {
    console.error(chalk.red('Invalid API key format. Keys should start with "sk_memmesh_"'));
    process.exit(1);
  }

  // Test the key
  console.log(chalk.dim('Verifying API key...'));
  try {
    const response = await fetch(`${backendUrl}/agents/me`, {
      headers: { 'x-api-key': apiKey },
    });

    if (!response.ok) {
      console.error(chalk.red('Invalid API key. Please check and try again.'));
      process.exit(1);
    }
  } catch {
    console.error(chalk.red('Failed to connect to MeMesh Cloud. Please check your network.'));
    process.exit(1);
  }

  // Save credentials
  saveCredentials({
    apiKey,
    baseUrl: backendUrl !== DEFAULT_BACKEND_URL ? backendUrl : undefined,
    createdAt: new Date().toISOString(),
  });

  console.log(chalk.green.bold('  ✓ Login successful!\n'));
  console.log(chalk.dim('  API key stored in ~/.config/memesh/credentials.json\n'));
}

/**
 * Register login command with Commander
 */
export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Authenticate with MeMesh Cloud')
    .option('--api-key <key>', 'Use existing API key (note: visible in process list, prefer device flow)')
    .option('--backend-url <url>', 'Backend URL', DEFAULT_BACKEND_URL)
    .action(async (options: { apiKey?: string; backendUrl: string }) => {
      try {
        if (options.apiKey) {
          await manualKeyLogin(options.apiKey, options.backendUrl);
        } else {
          await deviceFlowLogin(options.backendUrl);
        }
      } catch (error) {
        logger.error('Login failed', { error });
        console.error(chalk.red('Login failed:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
