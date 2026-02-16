---
name: block-unauthorized-publish
enabled: false
event: bash
pattern: npm\s+publish|npm\s+version\s+(patch|minor|major)|git\s+push.*--tags|vercel\s+--prod
action: block
---

# 🚨 UNAUTHORIZED PUBLISH ATTEMPT BLOCKED

**This command requires explicit user approval.**

## What was blocked

You attempted to run a publish/deploy command without user approval.

## Mandatory Process

1. ✅ Complete all work and testing
2. ✅ Commit changes to git
3. ⛔ **STOP - Report to user first**
4. ❌ **DO NOT run publish commands**

## What you MUST do instead

**Report to user:**
```
修復完成報告：

✅ 已完成：
- [列出修復內容]
- [列出通過的測試]

📦 準備發布：
- 版本：v{version}
- 變更：[主要變更摘要]

請確認是否可以發布到 npm？
```

**Wait for user to explicitly say:**
- "OK to publish"
- "Proceed"
- "發布吧"

**ONLY THEN** can you run the publish command.

## Why this rule exists

User explicitly stated:
- "口頭保證一點都不值錢"
- "必須要有一個實際有效的機制做法"

This rule was created on 2026-02-08 after repeated violations of publishing without approval.

## Last violation

2026-02-08: Published v2.8.2 to npm without user approval, causing severe loss of trust.

---

**This is a BLOCKING rule. The command will NOT execute.**

**Ask user for approval first.**
