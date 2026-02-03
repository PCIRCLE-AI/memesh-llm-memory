# 部署/安裝強制檢查清單

**🚨 違反此清單 = 嚴重錯誤 🚨**

## 核心原則

**永遠不要在沒有看到驗證通過的實際結果前宣稱完成。**

## 檢查清單

### 任何 Build/Install/Deploy 操作後

```bash
□ 1. 執行操作（build/install/deploy）
□ 2. 執行驗證命令
□ 3. 看到實際輸出結果
□ 4. 檢查結果是否通過
    ✓ 通過 → 才能說「完成」
    ✗ 失敗 → 調查 → 修復 → 回到步驟 2
□ 5. 記錄驗證結果（複製實際輸出）
```

### 具體範例

#### Plugin 安裝
```bash
# ❌ 錯誤做法
npm run build:plugin
# 看到 "✅ registered successfully" 就說完成

# ✅ 正確做法
npm run build:plugin
claude mcp list | grep memesh-mcp
# 看到 "✓ Connected" → 才說完成
# 看到 "✗ Failed" → 調查原因 → 修復 → 再次驗證
```

#### 測試執行
```bash
# ❌ 錯誤做法
npm test
# 看到 "Tests: 2020 passed" 就說完成

# ✅ 正確做法
npm test
# 檢查是否有 FAILED 測試
# 檢查 exit code: echo $?
# 0 = 成功，非 0 = 失敗
# 全部通過才說完成
```

#### Git 操作
```bash
# ❌ 錯誤做法
git commit -m "..."
# 沒檢查 pre-commit hook 是否通過

# ✅ 正確做法
git commit -m "..."
# 看實際輸出
# 有 "error" 或 hook 失敗 → 修復
# 看到 commit hash → 才算完成
```

## 紅線（Red Lines）

**絕對禁止的行為：**

1. ❌ 看到 script 說 "success" 就相信
2. ❌ 假設「應該會 work」
3. ❌ 沒跑驗證命令就宣稱完成
4. ❌ 看到部分成功就忽略失敗部分
5. ❌ 用戶質疑時才去檢查

## 違規後果

**每次違反此清單：**
1. 記錄到 docs/mistakes/
2. 向用戶道歉
3. 重新執行完整檢查清單
4. 反省為什麼又犯同樣錯誤

## 記住

**"Script 說成功" ≠ 實際成功**
**"應該會 work" ≠ 實際 work**
**"看起來好了" ≠ 真的好了**

**唯一的事實：驗證命令的實際輸出結果**
