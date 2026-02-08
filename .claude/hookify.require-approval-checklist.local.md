---
name: require-approval-checklist
enabled: true
event: stop
pattern: .*
action: warn
---

# ✋ Pre-Completion Checklist

Before claiming work is complete, verify:

## 1. Testing & Quality
- [ ] All unit tests passed?
- [ ] All integration tests passed?
- [ ] Installation tests passed (if applicable)?
- [ ] Code review completed?

## 2. Documentation
- [ ] README updated (if needed)?
- [ ] CHANGELOG updated (if needed)?
- [ ] API docs updated (if needed)?

## 3. User Approval Required?

**If ANY of these are true, you MUST get user approval before stopping:**

- [ ] Created/modified npm package
- [ ] Made database schema changes
- [ ] Changed public APIs
- [ ] Modified deployment configuration
- [ ] Made breaking changes
- [ ] Deleted files/code
- [ ] Modified security settings

## 4. What to Report

If user approval needed:
```
完成報告：

✅ 已完成：
- [具體完成內容]

🧪 測試結果：
- [測試通過情況]

📝 變更摘要：
- [主要變更]

請確認是否需要：
- [ ] 發布新版本？
- [ ] 部署到 production？
- [ ] 其他操作？
```

**Wait for user response before proceeding.**

---

This checklist helps prevent premature completion claims and ensures user is involved in critical decisions.
