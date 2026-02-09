import chalk from 'chalk';
import { deleteCredentials, loadCredentials } from './credentials.js';
export function registerLogoutCommand(program) {
    program
        .command('logout')
        .description('Remove stored MeMesh credentials')
        .action(() => {
        const existing = loadCredentials();
        if (!existing) {
            console.log(chalk.yellow('\nNot currently logged in.\n'));
            return;
        }
        const deleted = deleteCredentials();
        if (deleted) {
            console.log(chalk.green('\n  ✓ Logged out. Credentials removed.\n'));
        }
        else {
            console.error(chalk.red('\nFailed to remove credentials.\n'));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=logout.js.map