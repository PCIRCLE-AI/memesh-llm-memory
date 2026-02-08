---
name: warn-git-push-main
enabled: true
event: bash
pattern: git\s+push\s+(origin\s+)?(main|master)
action: warn
---

# ⚠️ PUSHING TO MAIN BRANCH

You're about to push to the main branch.

## Before pushing, verify

- ✅ All tests passed?
- ✅ Code review completed?
- ✅ User approved the changes?
- ✅ No breaking changes without migration plan?

## If this is a release

Consider if you should also push tags:
```bash
git push --tags
```

**Note:** If this push includes version tags, you'll be blocked by the `block-unauthorized-publish` rule.
