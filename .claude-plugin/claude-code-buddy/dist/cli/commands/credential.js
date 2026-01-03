#!/usr/bin/env node
import { Command } from 'commander';
import { CredentialVault } from '../../credentials/CredentialVault.js';
import * as readline from 'readline';
function createReadline() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}
async function promptPassword(prompt) {
    return new Promise((resolve, reject) => {
        const rl = createReadline();
        const stdin = process.stdin;
        let password = '';
        let isRawMode = false;
        let timeoutHandle = null;
        const cleanup = () => {
            if (isRawMode) {
                try {
                    stdin.setRawMode(false);
                    isRawMode = false;
                }
                catch (err) {
                }
            }
            stdin.pause();
            stdin.removeAllListeners('data');
            rl.close();
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
            if (password.length > 0) {
                password = '\0'.repeat(password.length);
            }
        };
        timeoutHandle = setTimeout(() => {
            cleanup();
            process.stdout.write('\n');
            reject(new Error('Password input timeout (5 minutes)'));
        }, 5 * 60 * 1000);
        try {
            stdin.setRawMode(true);
            isRawMode = true;
        }
        catch (err) {
            cleanup();
            reject(new Error('Cannot set raw mode (terminal not supported)'));
            return;
        }
        process.stdout.write(prompt);
        stdin.on('data', (char) => {
            const charStr = char.toString('utf8');
            if (charStr === '\n' || charStr === '\r' || charStr === '\u0004') {
                const finalPassword = password;
                cleanup();
                process.stdout.write('\n');
                resolve(finalPassword);
            }
            else if (charStr === '\u0003') {
                cleanup();
                process.stdout.write('\n');
                reject(new Error('User cancelled password input'));
            }
            else if (charStr === '\u007f' || charStr === '\b') {
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    process.stdout.write('\b \b');
                }
            }
            else if (charStr >= ' ' && charStr <= '~') {
                password += charStr;
                process.stdout.write('*');
            }
        });
        const terminationHandler = () => {
            cleanup();
            process.exit(0);
        };
        process.once('SIGINT', terminationHandler);
        process.once('SIGTERM', terminationHandler);
    });
}
async function prompt(question) {
    return new Promise((resolve) => {
        const rl = createReadline();
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
async function addCredential(options) {
    const vault = CredentialVault.create();
    await vault.initialize();
    try {
        const isNonInteractive = options.service && options.account && options.value;
        const service = options.service || (await prompt('Service: '));
        const account = options.account || (await prompt('Account: '));
        const value = options.value || (await promptPassword('Value (hidden): '));
        if (!service || !account || !value) {
            console.error('❌ Service, account, and value are required');
            process.exit(1);
        }
        const notes = options.notes !== undefined
            ? options.notes
            : (isNonInteractive ? undefined : await prompt('Notes (optional): '));
        const tagsStr = options.tags !== undefined
            ? options.tags
            : (isNonInteractive ? undefined : await prompt('Tags (comma-separated, optional): '));
        const expiresStr = options.expires !== undefined
            ? options.expires
            : (isNonInteractive ? undefined : await prompt('Expires at (YYYY-MM-DD, optional): '));
        const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
        const expiresAt = expiresStr ? new Date(expiresStr) : undefined;
        const credential = await vault.add({
            service,
            account,
            value,
            notes: notes || undefined,
            tags,
            expiresAt,
        });
        console.log(`✅ Added credential: ${credential.service}/${credential.account}`);
    }
    catch (error) {
        console.error('❌ Failed to add credential:', error);
        process.exit(1);
    }
    finally {
        vault.close();
    }
}
async function getCredential(service, account, options) {
    const vault = CredentialVault.create();
    await vault.initialize();
    try {
        const credential = await vault.get(service, account);
        if (!credential) {
            console.log(`❌ Credential not found: ${service}/${account}`);
            process.exit(1);
        }
        console.log('\n📋 Credential Details:');
        console.log(`Service:    ${credential.service}`);
        console.log(`Account:    ${credential.account}`);
        if (options.show) {
            console.log(`Value:      ${credential.value}`);
        }
        else {
            console.log(`Value:      ${'*'.repeat(credential.value.length)} (hidden, use --show to reveal)`);
        }
        if (credential.metadata) {
            console.log(`Created:    ${credential.metadata.createdAt.toISOString()}`);
            console.log(`Updated:    ${credential.metadata.updatedAt.toISOString()}`);
            if (credential.metadata.expiresAt) {
                const expired = credential.metadata.expiresAt < new Date();
                console.log(`Expires:    ${credential.metadata.expiresAt.toISOString()} ${expired ? '⚠️ EXPIRED' : ''}`);
            }
            if (credential.metadata.notes) {
                console.log(`Notes:      ${credential.metadata.notes}`);
            }
            if (credential.metadata.tags && credential.metadata.tags.length > 0) {
                console.log(`Tags:       ${credential.metadata.tags.join(', ')}`);
            }
        }
        console.log();
    }
    catch (error) {
        console.error('❌ Failed to get credential:', error);
        process.exit(1);
    }
    finally {
        vault.close();
    }
}
async function listCredentials(options) {
    const vault = CredentialVault.create();
    await vault.initialize();
    try {
        const query = {
            service: options.service,
            account: options.account,
            tags: options.tag ? [options.tag] : undefined,
        };
        const credentials = await vault.list(query);
        if (credentials.length === 0) {
            console.log('No credentials found');
            return;
        }
        if (options.json) {
            console.log(JSON.stringify(credentials, null, 2));
            return;
        }
        console.log(`\n📋 Found ${credentials.length} credential(s):\n`);
        for (const cred of credentials) {
            const expired = cred.metadata?.expiresAt && cred.metadata.expiresAt < new Date();
            const expiryStatus = expired ? ' ⚠️ EXPIRED' : '';
            console.log(`• ${cred.service}/${cred.account}${expiryStatus}`);
            if (cred.metadata) {
                console.log(`  Created: ${cred.metadata.createdAt.toISOString()}`);
                if (cred.metadata.tags && cred.metadata.tags.length > 0) {
                    console.log(`  Tags: ${cred.metadata.tags.join(', ')}`);
                }
                if (cred.metadata.notes) {
                    console.log(`  Notes: ${cred.metadata.notes}`);
                }
            }
            console.log();
        }
    }
    catch (error) {
        console.error('❌ Failed to list credentials:', error);
        process.exit(1);
    }
    finally {
        vault.close();
    }
}
async function updateCredential(service, account, options) {
    const vault = CredentialVault.create();
    await vault.initialize();
    try {
        const value = options.value || (await promptPassword('New value (leave empty to keep current): '));
        const updates = {};
        if (value) {
            updates.value = value;
        }
        if (options.notes !== undefined) {
            updates.notes = options.notes;
        }
        if (options.tags) {
            updates.tags = options.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
        if (options.expires) {
            updates.expiresAt = new Date(options.expires);
        }
        if (Object.keys(updates).length === 0) {
            console.log('❌ No updates specified');
            process.exit(1);
        }
        const credential = await vault.update(service, account, updates);
        console.log(`✅ Updated credential: ${credential.service}/${credential.account}`);
    }
    catch (error) {
        console.error('❌ Failed to update credential:', error);
        process.exit(1);
    }
    finally {
        vault.close();
    }
}
async function deleteCredential(service, account, options) {
    const vault = CredentialVault.create();
    await vault.initialize();
    try {
        if (!options.force) {
            const confirm = await prompt(`Delete credential ${service}/${account}? (y/N): `);
            if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
                console.log('Cancelled');
                return;
            }
        }
        await vault.delete(service, account);
        console.log(`✅ Deleted credential: ${service}/${account}`);
    }
    catch (error) {
        console.error('❌ Failed to delete credential:', error);
        process.exit(1);
    }
    finally {
        vault.close();
    }
}
async function showStats() {
    const vault = CredentialVault.create();
    await vault.initialize();
    try {
        const stats = vault.getStats();
        console.log('\n📊 Vault Statistics:\n');
        console.log(`Total credentials: ${stats.total}`);
        console.log(`Expired:           ${stats.expired}`);
        console.log(`Expiring soon:     ${stats.expiringSoon} (within 7 days)`);
        console.log('\nBy service:');
        Object.entries(stats.byService)
            .sort(([, a], [, b]) => b - a)
            .forEach(([service, count]) => {
            console.log(`  ${service}: ${count}`);
        });
        console.log();
    }
    catch (error) {
        console.error('❌ Failed to get stats:', error);
        process.exit(1);
    }
    finally {
        vault.close();
    }
}
async function cleanExpired(options) {
    const vault = CredentialVault.create();
    await vault.initialize();
    try {
        const expired = await vault.findExpired();
        if (expired.length === 0) {
            console.log('✅ No expired credentials found');
            return;
        }
        console.log(`\nFound ${expired.length} expired credential(s):`);
        expired.forEach((cred) => {
            console.log(`  • ${cred.service}/${cred.account}`);
        });
        console.log();
        if (!options.force) {
            const confirm = await prompt(`Delete all ${expired.length} expired credentials? (y/N): `);
            if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
                console.log('Cancelled');
                return;
            }
        }
        const deleted = await vault.deleteExpired();
        console.log(`✅ Deleted ${deleted} expired credential(s)`);
    }
    catch (error) {
        console.error('❌ Failed to clean expired credentials:', error);
        process.exit(1);
    }
    finally {
        vault.close();
    }
}
export function createCredentialCommand() {
    const cmd = new Command('cred');
    cmd
        .description('Manage credentials in the secure vault')
        .addHelpText('after', `
Examples:
  $ smart-agents cred add --service github --account myuser
  $ smart-agents cred get github myuser
  $ smart-agents cred list --service github
  $ smart-agents cred update github myuser --notes "Updated token"
  $ smart-agents cred delete github myuser
  $ smart-agents cred stats
  $ smart-agents cred clean
    `);
    cmd
        .command('add')
        .description('Add a new credential')
        .option('-s, --service <service>', 'Service name')
        .option('-a, --account <account>', 'Account name')
        .option('-v, --value <value>', 'Credential value')
        .option('-n, --notes <notes>', 'Notes')
        .option('-t, --tags <tags>', 'Comma-separated tags')
        .option('-e, --expires <date>', 'Expiration date (YYYY-MM-DD)')
        .action(addCredential);
    cmd
        .command('get <service> <account>')
        .description('Get a credential')
        .option('--show', 'Show credential value in plain text')
        .action(getCredential);
    cmd
        .command('list')
        .description('List credentials')
        .option('-s, --service <service>', 'Filter by service')
        .option('-a, --account <account>', 'Filter by account')
        .option('-t, --tag <tag>', 'Filter by tag')
        .option('--json', 'Output as JSON')
        .action(listCredentials);
    cmd
        .command('update <service> <account>')
        .description('Update a credential')
        .option('-v, --value <value>', 'New credential value')
        .option('-n, --notes <notes>', 'New notes')
        .option('-t, --tags <tags>', 'New comma-separated tags')
        .option('-e, --expires <date>', 'New expiration date (YYYY-MM-DD)')
        .action(updateCredential);
    cmd
        .command('delete <service> <account>')
        .alias('rm')
        .description('Delete a credential')
        .option('-f, --force', 'Skip confirmation')
        .action(deleteCredential);
    cmd
        .command('stats')
        .description('Show vault statistics')
        .action(showStats);
    cmd
        .command('clean')
        .description('Delete expired credentials')
        .option('-f, --force', 'Skip confirmation')
        .action(cleanExpired);
    return cmd;
}
//# sourceMappingURL=credential.js.map