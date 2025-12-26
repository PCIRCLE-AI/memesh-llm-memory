# Enterprise Features (Optional)

This directory contains optional enterprise integrations that require paid services or additional dependencies.

## Cloud Provider Secret Management

### AWS Secrets Manager

**Status**: Optional Enterprise Feature
**Cost**: Paid service (~$0.40/secret/month + API calls)

### Azure Key Vault

**Status**: Optional Enterprise Feature
**Cost**: Paid service (~$0.03/10,000 operations + vault fees)

### Why They're Here

Cloud provider secret managers provide enterprise-grade features:
- Automatic secret rotation
- Cross-region replication
- Fine-grained access control (IAM/RBAC)
- Compliance & audit logging
- Integration with cloud services

### For Open-Source Use

**We recommend free alternatives**:
1. **MacOSKeychain** (built-in) - Secure local storage on macOS
2. **Encrypted SQLite** - Local encrypted database
3. **Environment Variables** - `.env` files with gitignore
4. **HashiCorp Vault** - Open-source, self-hosted secret management

### How to Use (If Needed)

#### AWS Secrets Manager

1. **Install AWS SDK**:
```bash
npm install @aws-sdk/client-secrets-manager
```

2. **Copy implementation**:
```bash
cp docs/examples/enterprise/AWSSecretsManager.ts src/credentials/storage/
```

3. **Update exports**: Add to `src/credentials/storage/index.ts`:
```typescript
export { AWSSecretsManager, type AWSSecretsManagerConfig } from './AWSSecretsManager.js';
```

4. **Configure**:
```typescript
import { AWSSecretsManager } from './credentials/storage/AWSSecretsManager.js';

const storage = new AWSSecretsManager({
  region: 'us-east-1',
  // Will use AWS credential chain (env vars, ~/.aws/credentials, IAM role)
});
```

#### Azure Key Vault

1. **Install Azure SDK**:
```bash
npm install @azure/keyvault-secrets @azure/identity
```

2. **Copy implementation**:
```bash
cp docs/examples/enterprise/AzureKeyVault.ts src/credentials/storage/
```

3. **Update exports**: Add to `src/credentials/storage/index.ts`:
```typescript
export { AzureKeyVault, type AzureKeyVaultConfig } from './AzureKeyVault.js';
```

4. **Configure**:
```typescript
import { AzureKeyVault } from './credentials/storage/AzureKeyVault.js';

const storage = new AzureKeyVault({
  vaultUrl: 'https://your-vault.vault.azure.net',
  // Uses DefaultAzureCredential or provide clientSecret
});
```

### Alternative: Implement Your Own

The credential storage system is designed to be pluggable. Implement the `SecureStorage` interface:

```typescript
export interface SecureStorage {
  set(credential: Credential): Promise<void>;
  get(service: string, account: string): Promise<Credential | null>;
  delete(service: string, account: string): Promise<void>;
  list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
  isAvailable(): Promise<boolean>;
  close(): Promise<void>;
}
```

Then use it with `CredentialVault`:

```typescript
import { CredentialVault } from './credentials/CredentialVault.js';

const vault = new CredentialVault(yourCustomStorage);
```

## Contributing

If you implement integrations with other secret management services (e.g., Azure Key Vault, Google Secret Manager, 1Password), please contribute them here as optional examples!
