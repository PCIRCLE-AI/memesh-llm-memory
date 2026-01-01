# Deprecated SQLiteStore Implementations

This directory contains deprecated/obsolete versions of SQLiteStore that have been superseded by the refactored main implementation.

## Files

### SQLiteStore.basic.ts

**Status:** ✅ DEPRECATED - Moved here 2026-01-02

**Reason for deprecation:**
- NOT refactored with repository pattern
- All SQL logic is inline (God Object anti-pattern)
- Duplicates functionality now properly separated in repositories
- Not used anywhere in the codebase

**Use instead:** `../SQLiteStore.ts` - The canonical, refactored version

**Why keep it:**
- Reference for SQL injection protection patterns (whitelist-based sort columns)
- Historical reference for migration/comparison
- May contain edge case handling not yet ported to main version

## Active Implementations

### ../SQLiteStore.ts (CANONICAL)
- ✅ Refactored with repository pattern
- ✅ Delegates to 7 specialized repositories (Task, Execution, Span, Pattern, Adaptation, Reward, Stats)
- ✅ Clean separation of concerns
- ✅ Used in tests and production code

### ../SQLiteStore.enhanced.ts (SPECIAL PURPOSE)
- ✅ Extends the canonical SQLiteStore.ts
- ✅ Adds: backup/restore, performance monitoring, FTS search
- ⚠️ Not currently imported anywhere (future use)
- ✅ Good example of extending the base class

## Migration Path

If you're using SQLiteStore.basic.ts:
1. Replace import: `import { SQLiteStore } from './SQLiteStore.basic.js'` → `import { SQLiteStore } from './SQLiteStore.js'`
2. No API changes needed - interface is identical
3. Test thoroughly - implementation differs internally

## When to Delete

These files can be safely deleted when:
- [ ] All edge cases from basic version verified ported to main version
- [ ] No references exist in any branch
- [ ] 6+ months have passed since deprecation
- [ ] Team confirms no historical value
