/**
 * Credential Management Types
 */

export interface Credential {
  /**
   * Unique identifier for the credential
   */
  id: string;

  /**
   * Service name (e.g., 'openai', 'github', 'database')
   */
  service: string;

  /**
   * Account/username
   */
  account: string;

  /**
   * The actual credential value (API key, password, token)
   */
  value: string;

  /**
   * Optional metadata
   */
  metadata?: {
    /**
     * When the credential was created
     */
    createdAt: Date;

    /**
     * When the credential was last modified
     */
    updatedAt: Date;

    /**
     * When the credential expires (optional)
     */
    expiresAt?: Date;

    /**
     * Additional notes
     */
    notes?: string;

    /**
     * Tags for organization
     */
    tags?: string[];
  };
}

export interface CredentialInput {
  service: string;
  account: string;
  value: string;
  expiresAt?: Date;
  notes?: string;
  tags?: string[];
}

export interface CredentialQuery {
  service?: string;
  account?: string;
  id?: string;
  tags?: string[];
}

/**
 * Platform-agnostic secure storage interface
 */
export interface SecureStorage {
  /**
   * Store a credential securely
   */
  set(credential: Credential): Promise<void>;

  /**
   * Retrieve a credential
   */
  get(service: string, account: string): Promise<Credential | null>;

  /**
   * Delete a credential
   */
  delete(service: string, account: string): Promise<void>;

  /**
   * List all credentials (values excluded)
   */
  list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;

  /**
   * Check if storage is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get storage type (for debugging)
   */
  getType(): string;
}

/**
 * Platform detection
 */
export type Platform = 'darwin' | 'win32' | 'linux';

export function getPlatform(): Platform {
  return process.platform as Platform;
}

export function isMacOS(): boolean {
  return getPlatform() === 'darwin';
}

export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}
