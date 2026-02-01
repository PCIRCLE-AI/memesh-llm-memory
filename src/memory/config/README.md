# Semantic Groups Configuration

This directory contains configuration for semantic keyword matching used in ProactiveReminder.

## Overview

Semantic groups define sets of contextually related words. The ProactiveReminder uses these groups to identify when an operation is similar to a past mistake, even if different words are used.

### Example

When a user performs "Edit files for refactoring", and there's a past mistake about "Modified files without testing", the system recognizes these are related because:
- "Edit" and "Modified" are in the same semantic group
- "Files" are mentioned in both

## Configuration File

**File**: `semantic-groups.ts`

This file exports:
- `SEMANTIC_GROUPS`: Array of semantic groups (string arrays)
- `getSemanticGroups()`: Function to retrieve all groups
- `findSemanticGroup(keyword)`: Find group containing a keyword
- `areSemanticallySimilar(word1, word2)`: Check if two words are related

## How to Extend

### Adding a New Semantic Group

To add a new semantic group, edit `semantic-groups.ts`:

```typescript
export const SEMANTIC_GROUPS: SemanticGroup[] = [
  // Existing groups...
  ['edit', 'modify', 'modified', 'change', 'changed', 'update', 'updated'],

  // Add your new group
  ['build', 'compile', 'bundle', 'transpile'],
];
```

### Guidelines for Semantic Groups

1. **Focus**: Each group should represent a single concept
   - ✅ Good: `['test', 'tests', 'testing', 'tested']`
   - ❌ Bad: `['test', 'build', 'deploy']` (too broad)

2. **Completeness**: Include common variations
   - Base form: `test`
   - Plural: `tests`
   - Present participle: `testing`
   - Past tense: `tested`

3. **No Overlap**: Words should only appear in one group
   - ✅ Each word appears exactly once
   - ❌ Same word in multiple groups

4. **Context-Specific**: Consider the development workflow context
   - Focus on operations, actions, and states
   - Include technical synonyms

### Common Semantic Groups

The default configuration includes groups for:

- **File Modification**: edit, modify, change, update
- **File References**: file, files
- **Testing**: test, tests, testing, tested
- **Verification**: verify, verified, verification, check, checked
- **Execution**: run, running, execute, executed
- **Completion**: complete, completion, finish, finished, done
- **Refactoring**: refactor, refactoring, refactored
- **Creation**: add, added, create, created
- **Deletion**: delete, deleted, remove, removed

## Testing

After adding or modifying semantic groups:

1. Run the configuration tests:
   ```bash
   npm test -- semantic-groups.test.ts
   ```

2. Verify ProactiveReminder integration:
   ```bash
   npm test -- ProactiveReminder.test.ts
   ```

3. Test manually with the MCP tools:
   ```bash
   # Store a mistake
   ccb store-mistake "Forgot to run tests after modifying files"

   # Check if warning appears for similar operation
   # Should trigger warning for "edit files" operation
   ```

## Architecture Decision

**Why Configuration-Based?**

Originally, semantic groups were hardcoded in the `checkStemMatch` method. This had several drawbacks:
- Difficult to maintain and extend
- Configuration mixed with business logic
- Hard to test in isolation

By extracting to a configuration file:
- ✅ Clear separation of concerns
- ✅ Easy to add new semantic groups
- ✅ Testable independently
- ✅ Self-documenting through types

**Related Code Review Issue**: M3 - Configurable Semantic Rules

## Future Enhancements

Possible future improvements:
- Load semantic groups from external JSON/YAML file
- Support custom user-defined semantic groups
- Implement synonym expansion using NLP libraries
- Add domain-specific semantic groups (frontend, backend, DevOps)
