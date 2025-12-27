/**
 * Credential Management Constants
 *
 * Centralized configuration values and magic numbers
 * extracted from various credential management modules.
 */

/**
 * Health Check Configuration
 */
export const HEALTH_CHECK = {
  /** Maximum acceptable query execution time in milliseconds */
  MAX_QUERY_TIME_MS: 100,

  /** Maximum database size in megabytes before warning */
  MAX_DATABASE_SIZE_MB: 1024,

  /** Interval between health checks in milliseconds */
  CHECK_INTERVAL_MS: 5000,

  /** Number of failed health checks before marking unhealthy */
  FAILURE_THRESHOLD: 3,
} as const;

/**
 * Encryption Configuration
 */
export const ENCRYPTION = {
  /** Supported AES key sizes in bits */
  KEY_SIZES: [128, 192, 256] as const,

  /** Default key size for new keys */
  DEFAULT_KEY_SIZE: 256,

  /** Algorithm identifier */
  ALGORITHM: 'aes-256-gcm' as const,

  /** IV length in bytes */
  IV_LENGTH: 16,

  /** Auth tag length in bytes */
  AUTH_TAG_LENGTH: 16,
} as const;

/**
 * Time Constants
 */
export const TIME = {
  /** Milliseconds in one second */
  MS_PER_SECOND: 1000,

  /** Milliseconds in one minute */
  MS_PER_MINUTE: 60 * 1000,

  /** Milliseconds in one hour */
  MS_PER_HOUR: 60 * 60 * 1000,

  /** Milliseconds in one day */
  MS_PER_DAY: 24 * 60 * 60 * 1000,

  /** Milliseconds in one week */
  MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,

  /** Milliseconds in 30 days */
  MS_PER_MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Validation Limits
 */
export const VALIDATION = {
  /** Maximum service name length */
  MAX_SERVICE_NAME_LENGTH: 255,

  /** Maximum account name length */
  MAX_ACCOUNT_NAME_LENGTH: 255,

  /** Maximum metadata size in bytes */
  MAX_METADATA_SIZE_BYTES: 10240,

  /** Maximum notes field length */
  MAX_NOTES_LENGTH: 1000,

  /** Maximum tags array length */
  MAX_TAGS_COUNT: 20,
} as const;

/**
 * Rate Limiting
 */
export const RATE_LIMIT = {
  /** Default operations per minute */
  DEFAULT_OPS_PER_MINUTE: 60,

  /** Maximum failed attempts before lockout */
  MAX_FAILED_ATTEMPTS: 5,

  /** Lockout duration in milliseconds */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
} as const;

/**
 * Rotation Policy
 */
export const ROTATION = {
  /** Default rotation interval in days */
  DEFAULT_ROTATION_DAYS: 90,

  /** Warning threshold before expiry (days) */
  EXPIRY_WARNING_DAYS: 7,

  /** Grace period after expiry (days) */
  GRACE_PERIOD_DAYS: 3,
} as const;

/**
 * Audit Log Configuration
 */
export const AUDIT = {
  /** Default retention period in days */
  DEFAULT_RETENTION_DAYS: 365,

  /** Batch size for bulk operations */
  BATCH_SIZE: 1000,

  /** Maximum search results */
  MAX_SEARCH_RESULTS: 10000,
} as const;

/**
 * Database Configuration
 */
export const DATABASE = {
  /** SQLite journal mode */
  JOURNAL_MODE: 'WAL' as const,

  /** Foreign keys enforcement */
  FOREIGN_KEYS: 'ON' as const,

  /** Default busy timeout in milliseconds */
  BUSY_TIMEOUT_MS: 5000,
} as const;

/**
 * Multi-Tenancy Configuration
 */
export const MULTI_TENANT = {
  /** Tenant validation cache TTL in milliseconds */
  VALIDATION_CACHE_TTL_MS: 60000, // 1 minute

  /** Default credential quota per tenant */
  DEFAULT_CREDENTIAL_QUOTA: 1000,

  /** Default storage quota per tenant in bytes */
  DEFAULT_STORAGE_QUOTA_BYTES: 100 * 1024 * 1024, // 100 MB

  /** Default API calls per hour per tenant */
  DEFAULT_API_CALLS_PER_HOUR: 1000,
} as const;
