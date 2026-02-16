---
name: block-git-push-main
enabled: true
event: bash
pattern: git\s+push\s+.*\b(main|master)\b
action: block
---

# BLOCKED: Direct push to main/master

**Direct pushes to main/master are not allowed.** Use a Pull Request instead.

## Correct workflow

1. Push your changes to `develop` or a feature branch:
   ```bash
   git push origin develop
   git push origin feature/your-feature
   ```

2. Open a PR to merge into `main`:
   ```bash
   gh pr create --base main --head develop
   ```

## Why?

- All changes to `main` must go through code review via PR
- This prevents accidental pushes of untested or unapproved code
- See `docs/RELEASE_PROCESS.md` for the full release workflow
