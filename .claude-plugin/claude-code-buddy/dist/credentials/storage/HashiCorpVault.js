import { logger } from '../../utils/logger.js';
export class HashiCorpVault {
    config;
    baseUrl;
    constructor(config) {
        this.config = {
            mountPath: 'secret',
            useKVv2: true,
            timeout: 30000,
            ...config,
        };
        this.baseUrl = `${this.config.address}/v1`;
        logger.info('HashiCorp Vault storage initialized', {
            address: this.config.address,
            mountPath: this.config.mountPath,
            kvVersion: this.config.useKVv2 ? 'v2' : 'v1',
        });
    }
    getSecretPath(service, account, operation = 'data') {
        const secretName = `${service}/${account}`;
        if (this.config.useKVv2) {
            return `${this.config.mountPath}/${operation}/${secretName}`;
        }
        else {
            return `${this.config.mountPath}/${secretName}`;
        }
    }
    async vaultRequest(method, path, data) {
        const url = `${this.baseUrl}/${path}`;
        const headers = {
            'X-Vault-Token': this.config.token,
            'Content-Type': 'application/json',
        };
        if (this.config.namespace) {
            headers['X-Vault-Namespace'] = this.config.namespace;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
                signal: controller.signal,
                rejectUnauthorized: !this.config.tls?.skipVerify,
            });
            clearTimeout(timeoutId);
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Vault request failed: ${response.status} ${errorText}`);
            }
            if (response.status === 204) {
                return null;
            }
            return (await response.json());
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`Vault request timeout after ${this.config.timeout}ms`);
            }
            throw error;
        }
    }
    async set(credential) {
        const path = this.getSecretPath(credential.service, credential.account);
        const secretData = {
            value: credential.value,
        };
        if (credential.metadata) {
            secretData.metadata = credential.metadata;
        }
        try {
            if (this.config.useKVv2) {
                await this.vaultRequest('POST', path, {
                    data: secretData,
                });
            }
            else {
                await this.vaultRequest('POST', path, secretData);
            }
            logger.info('Credential stored in HashiCorp Vault', {
                service: credential.service,
                account: credential.account,
                kvVersion: this.config.useKVv2 ? 'v2' : 'v1',
            });
        }
        catch (error) {
            logger.error('Failed to store credential in HashiCorp Vault', {
                error: error.message,
                service: credential.service,
                account: credential.account,
            });
            throw new Error(`HashiCorp Vault set failed: ${error.message}`);
        }
    }
    async get(service, account) {
        const path = this.getSecretPath(service, account);
        try {
            const response = await this.vaultRequest('GET', path);
            if (!response) {
                return null;
            }
            let secretData;
            if (this.config.useKVv2) {
                secretData = response.data?.data;
            }
            else {
                secretData = response.data;
            }
            if (!secretData || !secretData.value) {
                return null;
            }
            const credential = {
                id: `${service}/${account}`,
                service,
                account,
                value: secretData.value,
                metadata: secretData.metadata || {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };
            logger.debug('Credential retrieved from HashiCorp Vault', {
                service,
                account,
            });
            return credential;
        }
        catch (error) {
            logger.error('Failed to retrieve credential from HashiCorp Vault', {
                error: error.message,
                service,
                account,
            });
            throw new Error(`HashiCorp Vault get failed: ${error.message}`);
        }
    }
    async delete(service, account) {
        const path = this.getSecretPath(service, account);
        try {
            if (this.config.useKVv2) {
                const metadataPath = this.getSecretPath(service, account, 'metadata');
                await this.vaultRequest('DELETE', metadataPath);
            }
            else {
                await this.vaultRequest('DELETE', path);
            }
            logger.info('Credential deleted from HashiCorp Vault', {
                service,
                account,
                kvVersion: this.config.useKVv2 ? 'v2' : 'v1',
            });
        }
        catch (error) {
            logger.error('Failed to delete credential from HashiCorp Vault', {
                error: error.message,
                service,
                account,
            });
            throw new Error(`HashiCorp Vault delete failed: ${error.message}`);
        }
    }
    async list(query) {
        const credentials = [];
        try {
            const mountPath = this.config.mountPath || 'secret';
            const listPath = this.config.useKVv2
                ? `${mountPath}/metadata`
                : mountPath;
            const response = await this.vaultRequest('LIST', listPath);
            if (!response || !response.data?.keys) {
                return [];
            }
            for (const key of response.data.keys) {
                if (key.endsWith('/'))
                    continue;
                const parts = key.split('/');
                if (parts.length !== 2)
                    continue;
                const [service, account] = parts;
                if (query?.service && service !== query.service)
                    continue;
                if (query?.account && account !== query.account)
                    continue;
                let metadata = {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                if (this.config.useKVv2) {
                    try {
                        const metadataPath = this.getSecretPath(service, account, 'metadata');
                        const metadataResponse = await this.vaultRequest('GET', metadataPath);
                        if (metadataResponse?.data) {
                            const createdTime = metadataResponse.data.created_time;
                            const updatedTime = metadataResponse.data.updated_time;
                            metadata = {
                                createdAt: createdTime ? new Date(createdTime) : new Date(),
                                updatedAt: updatedTime ? new Date(updatedTime) : new Date(),
                            };
                        }
                    }
                    catch (error) {
                    }
                }
                credentials.push({
                    id: `${service}/${account}`,
                    service,
                    account,
                    metadata,
                });
            }
            logger.debug('Listed credentials from HashiCorp Vault', {
                count: credentials.length,
                query,
            });
            return credentials;
        }
        catch (error) {
            logger.error('Failed to list credentials from HashiCorp Vault', {
                error: error.message,
            });
            throw new Error(`HashiCorp Vault list failed: ${error.message}`);
        }
    }
    async isAvailable() {
        try {
            const healthUrl = `${this.config.address}/v1/sys/health`;
            const response = await fetch(healthUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.status === 200 || response.status === 429 || response.status === 473;
        }
        catch (error) {
            logger.warn('HashiCorp Vault availability check failed', {
                error: error.message,
            });
            return false;
        }
    }
    getType() {
        return 'hashicorp-vault';
    }
    async renewToken(increment) {
        try {
            await this.vaultRequest('POST', 'auth/token/renew-self', {
                increment: increment || 3600,
            });
            logger.info('Vault token renewed', { increment });
        }
        catch (error) {
            logger.error('Failed to renew Vault token', {
                error: error.message,
            });
            throw new Error(`Vault token renewal failed: ${error.message}`);
        }
    }
    async revokeToken() {
        try {
            await this.vaultRequest('POST', 'auth/token/revoke-self');
            logger.info('Vault token revoked');
        }
        catch (error) {
            logger.error('Failed to revoke Vault token', {
                error: error.message,
            });
        }
    }
}
//# sourceMappingURL=HashiCorpVault.js.map