# Error Handling Standards

**Version**: 1.0.0
**Last Updated**: 2026-01-01
**Status**: Active

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Error Classification](#error-classification)
4. [Standard Patterns](#standard-patterns)
5. [Utility Functions](#utility-functions)
6. [Recovery Strategies](#recovery-strategies)
7. [Examples](#examples)
8. [Anti-Patterns](#anti-patterns)
9. [Testing Error Handling](#testing-error-handling)

---

## Overview

This document defines standardized error handling patterns across the Claude Code Buddy codebase. Consistent error handling ensures:

- **Reliable debugging**: Full stack traces and context in logs
- **Security**: Sensitive data sanitization in error messages
- **User experience**: Clear, actionable error messages
- **Maintainability**: Consistent patterns across all components
- **Observability**: Structured error logging for monitoring

---

## Core Principles

### 1. Never Swallow Errors

```typescript
// ❌ BAD: Silent failure
try {
  await operation();
} catch (err) {
  // Do nothing - error silently ignored
}

// ✅ GOOD: Log and handle
try {
  await operation();
} catch (error) {
  logError(error, {
    component: 'ServiceName',
    method: 'methodName',
    operation: 'performing operation',
  });
  throw error; // or handle appropriately
}
```

### 2. Always Include Context

Error logs must include:
- Component/class name
- Method/function name
- Operation being performed
- Relevant data (sanitized)
- Full stack trace

### 3. Sanitize Sensitive Data

All error logs and messages must use the sanitization utilities to prevent leaking:
- API keys
- Passwords
- Tokens
- Personal information
- File paths with usernames

### 4. Use Structured Logging

All errors must be logged using the centralized `logError()` function with structured context:

```typescript
import { logError, ErrorContext } from '../utils/errorHandler.js';

const context: ErrorContext = {
  component: 'KnowledgeGraph',
  method: 'createEntity',
  operation: 'creating entity in database',
  data: { entityName: name, entityType: type },
};

logError(error, context);
```

### 5. Fail Fast, Recover Smart

- **Fail fast**: Detect and report errors immediately
- **Recover smart**: Only recover from truly recoverable errors
- **Be explicit**: Document recovery strategies in code

---

## Error Classification

### Recoverable Errors

Errors where the operation can be retried or an alternative approach exists:

- **Network timeouts**: Retry with backoff
- **Rate limiting**: Wait and retry
- **Temporary resource unavailability**: Queue and retry
- **Partial batch failures**: Continue processing remaining items

### Fatal Errors

Errors that cannot be recovered and should fail the operation:

- **Configuration errors**: Invalid config that prevents operation
- **Authentication failures**: Invalid credentials
- **Data integrity violations**: Constraint violations, invalid state
- **Programming errors**: Null pointer, type errors, assertion failures

### Expected Errors

Errors that are part of normal operation:

- **Not found**: Entity doesn't exist (use `NotFoundError`)
- **Validation failures**: Invalid user input
- **Permission denied**: Authorization check failed

---

## Standard Patterns

### Pattern 1: Service Layer Errors

For business logic and service layer methods:

```typescript
import { logError, handleError } from '../utils/errorHandler.js';

export class MyService {
  async performOperation(params: Params): Promise<Result> {
    try {
      // Validate inputs
      this.validateParams(params);

      // Perform operation
      const result = await this.doWork(params);

      return result;
    } catch (error) {
      logError(error, {
        component: 'MyService',
        method: 'performOperation',
        operation: 'performing business operation',
        data: { params },
      });

      // Rethrow to let caller handle
      throw error;
    }
  }
}
```

### Pattern 2: MCP Tool Handlers

For MCP tools that return formatted responses:

```typescript
import { logError, handleError, formatMCPError } from '../utils/errorHandler.js';

async function handleToolCall(
  input: ToolInput
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Perform operation
    const result = await performOperation(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logError(error, {
      component: 'ToolHandlers',
      method: 'handleToolCall',
      operation: 'processing tool request',
      data: { input },
    });

    const handled = handleError(error, {
      component: 'ToolHandlers',
      method: 'handleToolCall',
    });

    return {
      content: [
        {
          type: 'text',
          text: `❌ Operation failed: ${handled.message}`,
        },
      ],
    };
  }
}
```

### Pattern 3: Database Operations

For operations involving database transactions:

```typescript
import { logError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';

async function performDatabaseOperation(data: Data): Promise<Result> {
  const transaction = this.db.transaction(() => {
    try {
      // Database operations
      const result = this.insertData(data);
      this.updateRelated(result.id);

      return result;
    } catch (error) {
      logError(error, {
        component: 'DatabaseService',
        method: 'performDatabaseOperation',
        operation: 'database transaction',
        data: { dataId: data.id },
      });

      // Transaction will auto-rollback on throw
      throw error;
    }
  });

  try {
    return transaction();
  } catch (error) {
    logger.error('Transaction failed and rolled back', { error });
    throw error;
  }
}
```

### Pattern 4: Async Iterator/Stream Errors

For operations that process streams or batches:

```typescript
import { logError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';

async function processBatch(items: Item[]): Promise<ProcessResult> {
  const results: Result[] = [];
  const errors: Error[] = [];

  for (const item of items) {
    try {
      const result = await processItem(item);
      results.push(result);
    } catch (error) {
      logError(error, {
        component: 'BatchProcessor',
        method: 'processBatch',
        operation: `processing item ${item.id}`,
        data: { itemId: item.id },
      });

      errors.push(error as Error);
      // Continue processing remaining items
    }
  }

  if (errors.length > 0) {
    logger.warn(`Batch processing completed with ${errors.length} errors`, {
      totalItems: items.length,
      successCount: results.length,
      errorCount: errors.length,
    });
  }

  return {
    results,
    errors,
    successCount: results.length,
    errorCount: errors.length,
  };
}
```

### Pattern 5: Initialization Errors

For component initialization and setup:

```typescript
import { logError } from '../utils/errorHandler.js';

export class MyComponent {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Setup operations
      await this.setupDatabase();
      await this.loadConfig();

      this.isInitialized = true;
    } catch (error) {
      logError(error, {
        component: 'MyComponent',
        method: 'initialize',
        operation: 'component initialization',
      });

      // Fatal error - cannot proceed
      throw new Error(`Failed to initialize MyComponent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new StateError('MyComponent not initialized - call initialize() first');
    }
  }
}
```

---

## Utility Functions

### Available Error Handling Utilities

Located in `/src/utils/errorHandler.ts`:

#### `logError(error: unknown, context: ErrorContext): void`

Log error with full stack trace and structured context.

**Usage**:
```typescript
logError(error, {
  component: 'ComponentName',
  method: 'methodName',
  operation: 'what was being attempted',
  data: { additionalContext: 'value' },
});
```

#### `handleError(error: unknown, context: ErrorContext, userMessage?: string): HandledError`

Log error and return formatted error object for responses.

**Usage**:
```typescript
const handled = handleError(error, {
  component: 'ComponentName',
  method: 'methodName',
}, 'User-friendly error message');

return {
  success: false,
  error: handled.message,
};
```

#### `formatMCPError(error: unknown, context: ErrorContext): MCPErrorResponse`

Format error for MCP tool responses.

**Usage**:
```typescript
return formatMCPError(error, {
  component: 'ToolHandlers',
  method: 'handleTool',
});
```

#### `withErrorHandling<T>(fn: Function, context: ErrorContext): Function`

Wrap async function with automatic error handling.

**Usage**:
```typescript
const safeFunction = withErrorHandling(
  async (params) => {
    // Your logic
  },
  {
    component: 'ServiceName',
    method: 'functionName',
  }
);
```

#### `getErrorMessage(error: unknown): string`

Safely extract error message from any error type.

#### `getErrorStack(error: unknown): string | undefined`

Safely extract sanitized stack trace.

---

## Recovery Strategies

### 1. Retry with Exponential Backoff

For transient failures (network, rate limiting):

```typescript
import { retryWithBackoff } from '../utils/retry.js';

const result = await retryWithBackoff(
  async () => await networkOperation(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    onRetry: (error, attempt) => {
      logger.warn(`Retry attempt ${attempt}`, { error });
    },
  }
);
```

### 2. Circuit Breaker

For protecting against cascading failures:

```typescript
// Not implemented yet - document when available
```

### 3. Graceful Degradation

For non-critical failures:

```typescript
async function getEnhancedData(id: string): Promise<Data> {
  try {
    const baseData = await getBaseData(id);

    try {
      // Try to enhance with additional data
      const enrichment = await getEnrichmentData(id);
      return { ...baseData, ...enrichment };
    } catch (error) {
      logError(error, {
        component: 'DataService',
        method: 'getEnhancedData',
        operation: 'enriching data (non-critical)',
        data: { id },
      });

      // Return base data without enrichment
      logger.info('Returning base data without enrichment', { id });
      return baseData;
    }
  } catch (error) {
    // Base data is critical - rethrow
    logError(error, {
      component: 'DataService',
      method: 'getEnhancedData',
      operation: 'fetching base data',
      data: { id },
    });
    throw error;
  }
}
```

### 4. Fallback Values

For optional features with sensible defaults:

```typescript
async function getConfig(key: string, defaultValue: string): Promise<string> {
  try {
    return await this.configStore.get(key);
  } catch (error) {
    logError(error, {
      component: 'ConfigService',
      method: 'getConfig',
      operation: 'fetching config value',
      data: { key },
    });

    logger.info(`Using default value for ${key}`, { defaultValue });
    return defaultValue;
  }
}
```

---

## Examples

### Example 1: Agent Method with Error Handling

```typescript
import { logError } from '../utils/errorHandler.js';
import { StateError, NotFoundError } from '../errors/index.js';

export class KnowledgeAgent {
  async createEntity(data: EntityData): Promise<Entity> {
    // Ensure initialized
    this.ensureInitialized();

    try {
      // Validate input
      this.validateEntityData(data);

      // Create entity
      const entity = await this.graph.createEntity(data);

      logger.info('Entity created successfully', {
        entityId: entity.id,
        entityName: entity.name,
      });

      return entity;
    } catch (error) {
      logError(error, {
        component: 'KnowledgeAgent',
        method: 'createEntity',
        operation: 'creating knowledge graph entity',
        data: { entityName: data.name, entityType: data.type },
      });

      // Rethrow to let caller handle
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new StateError('KnowledgeAgent not initialized');
    }
  }
}
```

### Example 2: MCP Handler with User-Friendly Errors

```typescript
import { logError, handleError } from '../utils/errorHandler.js';

async function handleCreateEntity(input: CreateEntityInput) {
  try {
    const entity = await knowledgeAgent.createEntity(input);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Entity created: ${entity.name}`,
        },
      ],
    };
  } catch (error) {
    logError(error, {
      component: 'KnowledgeHandlers',
      method: 'handleCreateEntity',
      operation: 'creating entity via MCP',
      data: { entityName: input.name },
    });

    const handled = handleError(
      error,
      {
        component: 'KnowledgeHandlers',
        method: 'handleCreateEntity',
      },
      'Failed to create entity. Please check the input and try again.'
    );

    return {
      content: [
        {
          type: 'text',
          text: `❌ ${handled.message}`,
        },
      ],
    };
  }
}
```

### Example 3: Database Transaction with Rollback

```typescript
import { logError } from '../utils/errorHandler.js';

async function createEntityWithRelations(
  entityData: EntityData,
  relations: RelationData[]
): Promise<Entity> {
  const transaction = this.db.transaction(() => {
    try {
      // Create entity
      const entity = this.createEntityRaw(entityData);

      // Create relations
      for (const relation of relations) {
        this.createRelationRaw({
          ...relation,
          fromId: entity.id,
        });
      }

      return entity;
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraph',
        method: 'createEntityWithRelations',
        operation: 'transaction: create entity and relations',
        data: {
          entityName: entityData.name,
          relationCount: relations.length,
        },
      });

      // Transaction will rollback automatically
      throw error;
    }
  });

  return transaction();
}
```

---

## Anti-Patterns

### ❌ Don't Use console.error

```typescript
// ❌ BAD
try {
  await operation();
} catch (err) {
  console.error('Operation failed', err);
}

// ✅ GOOD
try {
  await operation();
} catch (error) {
  logError(error, {
    component: 'ComponentName',
    method: 'methodName',
    operation: 'operation description',
  });
  throw error;
}
```

### ❌ Don't Swallow Errors Without Logging

```typescript
// ❌ BAD
try {
  await riskyOperation();
} catch (err) {
  // Silent failure
}

// ✅ GOOD
try {
  await riskyOperation();
} catch (error) {
  logError(error, {
    component: 'ComponentName',
    method: 'methodName',
    operation: 'risky operation',
  });

  // Either rethrow or handle gracefully with logging
  return fallbackValue;
}
```

### ❌ Don't Lose Error Context

```typescript
// ❌ BAD
try {
  await operation();
} catch (err) {
  throw new Error('Operation failed'); // Lost original error
}

// ✅ GOOD
try {
  await operation();
} catch (error) {
  logError(error, {
    component: 'ComponentName',
    method: 'methodName',
    operation: 'operation description',
  });

  throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`, {
    cause: error, // Preserve original error
  });
}
```

### ❌ Don't Create Error Objects Without Throwing/Logging

```typescript
// ❌ BAD
if (invalid) {
  const error = new Error('Invalid input');
  // Error created but not thrown or logged
}

// ✅ GOOD
if (invalid) {
  const error = new Error('Invalid input');
  logError(error, {
    component: 'ComponentName',
    method: 'methodName',
    operation: 'validation',
  });
  throw error;
}
```

### ❌ Don't Use Generic Catch-All Without Specificity

```typescript
// ❌ BAD
try {
  await operation1();
  await operation2();
  await operation3();
} catch (err) {
  logError(err, { component: 'X', method: 'Y' });
  // Which operation failed?
}

// ✅ GOOD
try {
  await operation1();
} catch (error) {
  logError(error, {
    component: 'X',
    method: 'Y',
    operation: 'operation1',
  });
  throw error;
}

try {
  await operation2();
} catch (error) {
  logError(error, {
    component: 'X',
    method: 'Y',
    operation: 'operation2',
  });
  throw error;
}
```

---

## Testing Error Handling

### Test That Errors Are Logged

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logError } from '../utils/errorHandler.js';

vi.mock('../utils/errorHandler.js', () => ({
  logError: vi.fn(),
}));

describe('ErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log errors with context', async () => {
    const service = new MyService();

    await expect(service.failingOperation()).rejects.toThrow();

    expect(logError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: 'MyService',
        method: 'failingOperation',
      })
    );
  });
});
```

### Test Error Recovery

```typescript
it('should retry on transient failures', async () => {
  const mockFn = vi.fn()
    .mockRejectedValueOnce(new Error('Temporary failure'))
    .mockResolvedValueOnce('success');

  const result = await retryWithBackoff(mockFn, { maxRetries: 3 });

  expect(result).toBe('success');
  expect(mockFn).toHaveBeenCalledTimes(2);
});
```

### Test Graceful Degradation

```typescript
it('should return base data when enrichment fails', async () => {
  const service = new DataService();

  vi.spyOn(service, 'getEnrichmentData').mockRejectedValue(new Error('Enrichment failed'));

  const result = await service.getEnhancedData('123');

  expect(result).toEqual(expect.objectContaining({
    id: '123',
    // Base data fields
  }));

  expect(logError).toHaveBeenCalled();
});
```

---

## Checklist for Error Handling Implementation

When implementing error handling in a new component:

- [ ] All try/catch blocks use `logError()` with full context
- [ ] Error context includes: component, method, operation, relevant data
- [ ] No errors are swallowed without logging
- [ ] Sensitive data is sanitized (handled by `logError` automatically)
- [ ] Recovery strategies are documented in code
- [ ] User-facing errors have clear, actionable messages
- [ ] Fatal errors fail fast with clear error messages
- [ ] Database transactions rollback on error
- [ ] Batch operations handle partial failures gracefully
- [ ] Error handling is tested

---

## Migration Guide

### Migrating Existing Code

1. **Replace console.error with logError**:
   ```diff
   - console.error('Operation failed', error);
   + logError(error, {
   +   component: 'ComponentName',
   +   method: 'methodName',
   +   operation: 'operation description',
   + });
   ```

2. **Add context to existing try/catch blocks**:
   ```diff
   try {
     await operation();
   } catch (error) {
   -   throw error;
   +   logError(error, {
   +     component: 'ComponentName',
   +     method: 'methodName',
   +     operation: 'operation description',
   +   });
   +   throw error;
   }
   ```

3. **Add missing try/catch blocks**:
   ```diff
   async function riskyOperation() {
   +   try {
       const result = await externalService.call();
       return result;
   +   } catch (error) {
   +     logError(error, {
   +       component: 'ComponentName',
   +       method: 'riskyOperation',
   +       operation: 'calling external service',
   +     });
   +     throw error;
   +   }
   }
   ```

---

## References

- Error Handler Implementation: `/src/utils/errorHandler.ts`
- Logger Configuration: `/src/utils/logger.ts`
- Retry Utilities: `/src/utils/retry.ts`
- Custom Errors: `/src/errors/index.ts`
- Sanitization Utilities: `/src/telemetry/sanitization.ts`

---

**Enforcement**: This standard is enforced through:
- Code reviews
- Linting rules (future)
- Test coverage requirements
- Documentation requirements

**Questions?** Refer to examples above or consult the team lead.
