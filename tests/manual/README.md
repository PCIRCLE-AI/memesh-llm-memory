# Manual Test Scripts

**This directory contains manual test scripts for development and debugging.**

⚠️ **These files are NOT pushed to git** (excluded via .gitignore)

## Purpose

Manual test scripts are used for:
- Testing specific features during development
- Debugging issues locally
- Validating system behavior
- Performance testing

## Usage

These scripts are meant to be run manually during development:

```bash
# Example
npm run tsx tests/manual/test-knowledge-graph.ts
```

## Organization

- `*.ts` - TypeScript test scripts
- `*.sh` - Shell test scripts
- `*.js` - JavaScript test scripts

## Important

- Do NOT commit these to git
- Keep tests focused and documented
- Clean up after yourself
- Use proper unit/e2e tests for automated testing

---

**For automated tests, see:**
- `tests/` - Unit tests (*.test.ts)
- `tests/e2e/` - E2E tests (*.spec.ts)
