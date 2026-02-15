# Landing Page 部署指南

## 🚀 使用 GitHub Pages 部署（推薦）

### 方法 1：自動部署（GitHub Actions）✅ **已設置！**

**Workflow 文件**：`.github/workflows/deploy-landing-page.yml`

**如何使用**：

1. **啟用 GitHub Pages**：
   ```bash
   # 在 GitHub repo 設定中啟用
   # Settings → Pages → Source: GitHub Actions
   ```

2. **提交並推送**：
   ```bash
   git add landing-page/ .github/workflows/deploy-landing-page.yml
   git commit -m "feat(landing): add GitHub Pages deployment workflow"
   git push origin main
   ```

3. **自動部署**：
   - 每次 `landing-page/` 資料夾有變更時自動部署
   - 也可以手動觸發：GitHub → Actions → "Deploy Landing Page" → Run workflow

4. **訪問 Landing Page**：
   - https://pcircle-ai.github.io/claude-code-buddy/

---

### 方法 2：手動部署（gh-pages branch）

如果不想用 GitHub Actions：

```bash
# 1. 安裝 gh-pages 工具
npm install -g gh-pages

# 2. 部署
cd /Users/ktseng/Developer/Projects/claude-code-buddy
gh-pages -d landing-page

# 完成！訪問：
# https://pcircle-ai.github.io/claude-code-buddy/
```

---

### 方法 3：使用 Settings 手動配置

**Step 1：推送代碼**
```bash
git add landing-page/
git commit -m "feat(landing): add landing page"
git push origin main
```

**Step 2：GitHub 設定**
1. 前往：https://github.com/PCIRCLE-AI/claude-code-buddy/settings/pages
2. Source: **Deploy from a branch**
3. Branch: **main**
4. Folder: **/ (root)** 或創建 `/docs` 資料夾
5. Save

**Step 3：移動文件**（如果選擇 `/docs`）
```bash
mkdir -p docs
cp landing-page/index.html docs/
git add docs/
git commit -m "feat(landing): move to docs for GitHub Pages"
git push origin main
```

---

## 🌐 自訂網域設定（memesh.ai）

### DNS 配置

在您的網域 DNS 設定中添加：

```
# A Records（推薦）
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153

# CNAME（www 子網域）
CNAME www   pcircle-ai.github.io
```

### GitHub 設定

1. 前往：https://github.com/PCIRCLE-AI/claude-code-buddy/settings/pages
2. Custom domain: `memesh.ai`
3. ✅ Enforce HTTPS
4. Save

等待 DNS 傳播（通常 5-30 分鐘）

---

## ❌ Gist（不推薦用於 Landing Page）

**為什麼不推薦**：
- ❌ URL 不友善：`gist.github.com/username/32位亂碼`
- ❌ 無法使用自訂網域
- ❌ 不支援多文件結構（只能單一 HTML）
- ❌ SEO 不佳
- ❌ 無法設定 CNAME

**Gist 適合的用途**：
- 代碼片段分享
- 臨時展示 demo
- 快速測試 HTML/CSS

**Landing Page 需求**：
- ✅ 專業域名
- ✅ SEO 優化
- ✅ 多文件支援（未來可能需要 CSS/JS 文件）
- ✅ 分析工具整合

**結論**：GitHub Pages 完全滿足需求，Gist 不適合正式 Landing Page

---

## 📋 部署檢查清單

部署前確認：

### 內容檢查
- [ ] 所有數據已更新為真實值（63 stars, 13.5K clones, 1.7K downloads）
- [ ] 移除所有佔位符圖片
- [ ] 添加實際 demo GIFs
- [ ] 所有連結正確
- [ ] Meta tags 完整

### 技術檢查
- [ ] HTML 驗證通過（https://validator.w3.org/）
- [ ] 在手機測試（iOS, Android）
- [ ] 在桌面測試（Chrome, Firefox, Safari, Edge）
- [ ] 頁面載入 < 3 秒

### SEO 檢查
- [ ] Meta description 完整
- [ ] Open Graph tags 設定
- [ ] Twitter Card tags 設定
- [ ] Favicon 正確

---

## 🔧 測試部署

**本地測試**：

```bash
# 方法 1：Python HTTP Server
cd landing-page
python3 -m http.server 8000
# 訪問：http://localhost:8000

# 方法 2：Node.js http-server
npx http-server landing-page -p 8000
# 訪問：http://localhost:8000

# 方法 3：Live Server（VS Code 擴展）
# 右鍵 index.html → Open with Live Server
```

---

## 📊 部署後驗證

部署完成後測試：

```bash
# 1. 檢查 DNS 解析
dig memesh.ai

# 2. 檢查 HTTPS
curl -I https://pcircle-ai.github.io/claude-code-buddy/

# 3. 檢查內容
curl https://pcircle-ai.github.io/claude-code-buddy/ | grep "MeMesh"

# 4. 測試 meta tags
curl -s https://pcircle-ai.github.io/claude-code-buddy/ | grep -E "og:|twitter:"
```

---

## 🚀 推薦部署流程

**最簡單的方式**（使用 GitHub Actions）：

```bash
# 1. 提交代碼
git add landing-page/ .github/workflows/deploy-landing-page.yml
git commit -m "feat(landing): add landing page with auto-deployment"
git push origin main

# 2. 啟用 GitHub Pages
# 前往：https://github.com/PCIRCLE-AI/claude-code-buddy/settings/pages
# Source: GitHub Actions

# 3. 完成！
# 訪問：https://pcircle-ai.github.io/claude-code-buddy/
```

**未來更新**：
```bash
# 修改 landing-page/index.html
vim landing-page/index.html

# 提交推送（自動部署）
git add landing-page/
git commit -m "docs(landing): update stats"
git push origin main

# GitHub Actions 自動部署，無需手動操作
```

---

## 💡 Pro Tips

1. **預覽部署**：每次 PR 都會生成預覽 URL（如果設定 Vercel/Netlify）

2. **自訂 404 頁面**：
   ```bash
   cp landing-page/index.html landing-page/404.html
   ```

3. **添加分析**：
   - Google Analytics 4
   - Plausible（隱私友善）
   - GitHub 內建流量統計

4. **加速 CDN**：GitHub Pages 已使用 Fastly CDN，全球分發

5. **監控正常運作**：
   - https://www.githubstatus.com/
   - Uptime Robot（免費監控）

---

## 🔗 相關連結

- **GitHub Pages 文檔**：https://docs.github.com/pages
- **自訂網域設定**：https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site
- **GitHub Actions**：https://docs.github.com/actions

---

**推薦**：使用 GitHub Actions 自動部署 → 簡單、可靠、免費

**不推薦**：Gist → 不適合正式 Landing Page

**下一步**：執行「推薦部署流程」中的 3 個步驟即可上線！
