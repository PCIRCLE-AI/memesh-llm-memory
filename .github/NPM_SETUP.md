# npm 自動發布設置指南

## 概述

本項目已配置 GitHub Actions，可在發布 GitHub Release 時自動部署到 npm registry。

## 設置步驟

### 1. 獲取 npm Access Token

1. 登入 [npmjs.com](https://www.npmjs.com/)
2. 點擊頭像 → **Access Tokens**
3. 點擊 **Generate New Token**
4. 選擇 **Automation** 類型（用於 CI/CD）
5. 設置權限：**Read and Publish**
6. 複製生成的 token（格式：`npm_xxxxxxxxxxxxxx`）

### 2. 添加到 GitHub Secrets

1. 前往 GitHub repository: **Settings** → **Secrets and variables** → **Actions**
2. 點擊 **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: 貼上剛才複製的 npm token
5. 點擊 **Add secret**

### 3. 發布流程

#### 方式一：命令行發布（推薦）

```bash
# 1. 確保所有變更已提交
git add .
git commit -m "chore: prepare for release"

# 2. 更新版本號並創建 tag
npm version patch  # 或 minor/major
# 這會自動：
# - 更新 package.json 版本
# - 創建 git commit
# - 創建 git tag

# 3. 推送到 GitHub（包含 tags）
git push --follow-tags

# 4. 創建 GitHub Release（使用剛才的 tag）
gh release create v2.3.12 \
  --title "v2.3.12" \
  --notes "Release notes here"

# GitHub Actions 會自動觸發並發布到 npm
```

#### 方式二：GitHub Web 界面

1. 前往 **Releases** → **Draft a new release**
2. **Choose a tag** → 輸入新版本（例如 `v2.3.12`）
3. 填寫 Release title 和 description
4. 點擊 **Publish release**

### 4. 驗證發布

發布後，檢查：

1. **GitHub Actions** 頁面查看 workflow 執行狀態
2. **npm package page**: https://www.npmjs.com/package/@pcircle/claude-code-buddy-mcp
3. Release 下方會自動添加評論，包含 npm 連結

### 5. 測試安裝

```bash
# 測試從 npm 安裝
npx -y @pcircle/claude-code-buddy-mcp@latest

# 或全局安裝
npm install -g @pcircle/claude-code-buddy-mcp
```

## Workflow 細節

自動發布流程（`.github/workflows/publish-npm.yml`）包含：

1. ✅ Checkout 代碼
2. ✅ 設置 Node.js 20
3. ✅ 安裝依賴 (`npm ci`)
4. ✅ 建構項目 (`npm run build`)
5. ✅ 運行測試 (`npm test`)
6. ✅ 運行安裝測試 (`npm run test:install`)
7. ✅ 發布到 npm（帶 provenance）
8. ✅ 在 Release 添加成功評論

## 注意事項

- ⚠️ **版本號必須遞增**：npm 不允許覆蓋已發布的版本
- ⚠️ **測試失敗不會阻止發布**：但會在 Actions 中顯示警告
- ⚠️ **npm provenance**：自動添加發布來源驗證，提升安全性
- ⚠️ **tag 格式**：建議使用 `vX.Y.Z` 格式（例如 `v2.3.12`）

## 故障排除

### npm publish 失敗

- 檢查 `NPM_TOKEN` 是否正確設置
- 確認 token 有 **Publish** 權限
- 檢查版本號是否已存在於 npm

### GitHub Actions 未觸發

- 確認使用 **Release published** 事件（不是 draft）
- 檢查 workflow 文件語法
- 查看 **Actions** → **All workflows** 是否啟用

### 如何回滾

npm 發布是**永久的**，無法刪除。如果需要修復：

```bash
# 發布修正版本
npm version patch
git push --follow-tags
gh release create v2.3.13 --notes "Fix: ..."
```

## 版本更新策略

遵循 [Semantic Versioning](https://semver.org/)：

- **Patch** (`2.3.11` → `2.3.12`): Bug 修復
- **Minor** (`2.3.11` → `2.4.0`): 新功能（向後兼容）
- **Major** (`2.3.11` → `3.0.0`): 破壞性變更

```bash
npm version patch  # Bug fixes
npm version minor  # New features
npm version major  # Breaking changes
```

## 額外資源

- [GitHub Actions - Publishing packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [npm - Creating tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
