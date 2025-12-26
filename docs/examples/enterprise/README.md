# Enterprise Features (Optional)

This directory contains optional enterprise integrations that require paid services or additional dependencies.

## AWS Secrets Manager Integration

**Status**: Optional Enterprise Feature
**Cost**: AWS Secrets Manager is a paid service (~$0.40/secret/month + API calls)

### Why It's Here

AWS Secrets Manager provides enterprise-grade features:
- Automatic secret rotation
- Cross-region replication
- Fine-grained IAM access control
- Compliance & audit logging

### For Open-Source Use

**We recommend free alternatives**:
1. **MacOSKeychain** (built-in) - Secure local storage on macOS
2. **Encrypted SQLite** - Local encrypted database
3. **Environment Variables** - `.env` files with gitignore
4. **HashiCorp Vault** - Open-source, self-hosted secret management

### How to Use AWS Secrets Manager (If Needed)

1. **Install AWS SDK**:
```bash
npm install @aws-sdk/client-secrets-manager
```

2. **Copy implementation**:
```bash
cp docs/examples/enterprise/AWSSecretsManager.ts src/credentials/storage/
```

3. **Configure AWS credentials**:
```typescript
import { AWSSecretsManager } from './credentials/storage/AWSSecretsManager.js';

const storage = new AWSSecretsManager({
  region: 'us-east-1',
  // Will use AWS credential chain (env vars, ~/.aws/credentials, IAM role)
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
