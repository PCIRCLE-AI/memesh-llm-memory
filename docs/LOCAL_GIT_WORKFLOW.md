# Local Git Workflow（本地 Git 工作流程）

## 🎯 核心理念

**GitHub 不是必須的** - Smart-agents 和 Claude Code 可以完全在本地運作，只使用本地 Git 進行版本控制和代碼管理。

## 📊 GitHub vs 本地 Git 比較

| 功能 | 本地 Git (Local Only) | GitHub (Remote) |
|------|----------------------|-----------------|
| **版本控制** | ✅ 完整支援 | ✅ 完整支援 |
| **代碼備份** | ⚠️ 只在本機 | ✅ 雲端備份 |
| **多人協作** | ❌ 不支援 | ✅ 完整支援 |
| **代碼分享** | ❌ 不方便 | ✅ 公開/私密分享 |
| **CI/CD** | ❌ 無法使用 | ✅ GitHub Actions |
| **學習成本** | ✅ 較低 | ⚠️ 較高 |
| **需要網路** | ❌ 不需要 | ✅ 需要 |
| **需要帳號** | ❌ 不需要 | ✅ 需要 GitHub 帳號 |
| **適合對象** | 個人專案、學習 | 團隊協作、開源 |

## 🏠 本地 Git 工作流程（推薦給非技術用戶）

### 基本概念

```
你的專案資料夾 (Working Directory)
    ↓
本地 Git 儲存庫 (Local Repository)
    ↓
版本歷史 (Commit History)

不需要：
❌ GitHub 帳號
❌ SSH Keys
❌ Remote Repository
❌ Push/Pull
❌ 網路連線
```

### 簡化工作流程

```bash
# 1. 初始化專案（只需一次）
cd /path/to/your/project
git init

# 2. 配置基本資訊（只需一次）
git config user.name "你的名字"
git config user.email "your@email.com"

# 3. 日常工作流程
# 寫代碼 → 儲存版本 → 繼續工作

# 儲存當前版本
git add .
git commit -m "完成登入功能"

# 查看歷史版本
git log --oneline

# 回到之前的版本
git checkout <commit-id>

# 建立新分支測試功能
git checkout -b new-feature

# 完成後合併
git checkout main
git merge new-feature
```

## 🎨 Smart-Agents 本地工作流程

### 方案 A: 純本地（無 GitHub）

```
用戶專案
├── .git/                    # 本地 Git 儲存庫
├── src/                     # 原始碼
├── docs/                    # 文檔
└── .smart-agents/          # Smart-agents 配置
    ├── knowledge-graph/    # 本地知識圖譜
    ├── workflows/          # 本地工作流
    └── backups/            # 本地備份

所有資料都在本機，不上傳到雲端
```

**優點**：
- ✅ 簡單、不需要學習 GitHub
- ✅ 不需要網路
- ✅ 隱私完全掌控
- ✅ 適合個人專案、學習

**缺點**：
- ⚠️ 電腦損壞 = 資料遺失（需要手動備份）
- ⚠️ 無法多人協作
- ⚠️ 無法從其他電腦存取

### 方案 B: 本地 + 可選 GitHub

```
用戶專案
├── .git/                    # 本地 Git
├── src/
├── docs/
└── .smart-agents/
    └── config.json
        {
          "git": {
            "mode": "local",        # 預設本地模式
            "autoBackup": false,    # 不自動備份到 GitHub
            "github": {
              "enabled": false      # GitHub 功能關閉
            }
          }
        }

# 用戶可以隨時啟用 GitHub（可選）
{
  "git": {
    "mode": "hybrid",             # 本地 + GitHub
    "autoBackup": true,           # 自動備份到 GitHub
    "github": {
      "enabled": true,
      "repo": "username/project"
    }
  }
}
```

**優點**：
- ✅ 預設簡單（本地模式）
- ✅ 需要時可以升級到 GitHub
- ✅ 漸進式學習
- ✅ 靈活度高

## 🛡️ 本地備份策略（不使用 GitHub）

既然不用 GitHub，如何保護代碼？

### 策略 1: 自動本地備份

```bash
# Smart-agents 可以自動執行
#!/bin/bash
# .smart-agents/scripts/local-backup.sh

BACKUP_DIR="$HOME/.smart-agents-backups/$(basename $(pwd))"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

# 複製整個專案（包含 .git）
cp -r . "$BACKUP_DIR/$TIMESTAMP"

# 保留最近 10 個備份
ls -t "$BACKUP_DIR" | tail -n +11 | xargs -I {} rm -rf "$BACKUP_DIR/{}"

echo "✅ Backup created: $BACKUP_DIR/$TIMESTAMP"
```

### 策略 2: 外接硬碟備份

```bash
# 備份到外接硬碟
rsync -av --exclude=node_modules \
  /path/to/project \
  /Volumes/ExternalDrive/Backups/
```

### 策略 3: iCloud/Dropbox 同步

```bash
# 將專案放在雲端同步資料夾
~/Library/Mobile Documents/com~apple~CloudDocs/Projects/my-project/

# Git 依然正常運作，檔案自動同步
```

## 🎓 非技術用戶友善的 Git 命令

### 簡化版命令（Smart-agents 可以提供）

```bash
# ❌ 技術性命令（嚇人）
git add .
git commit -m "feat: implement authentication module with JWT tokens"
git push origin feature/auth-system

# ✅ 友善命令（易懂）
save-work "完成登入功能"
# → Smart-agents 自動執行 git add + commit

list-versions
# → Smart-agents 顯示歷史版本（格式化）

go-back-to "昨天下午的版本"
# → Smart-agents 找到對應 commit 並 checkout

backup-now
# → Smart-agents 執行本地備份

show-changes
# → Smart-agents 顯示與上一版本的差異（可視化）
```

### Smart-Agents CLI 包裝

```typescript
// src/cli/friendly-git-commands.ts

export class FriendlyGitCommands {
  /**
   * 儲存目前工作
   */
  async saveWork(description: string): Promise<void> {
    // 內部執行 git add + commit
    await execAsync('git add .');
    await execAsync(`git commit -m "${description}"`);

    // 自動本地備份
    if (this.config.autoLocalBackup) {
      await this.createLocalBackup();
    }

    console.log('✅ 工作已儲存');
    console.log('📝 描述:', description);
    console.log('🕐 時間:', new Date().toLocaleString());
  }

  /**
   * 列出歷史版本
   */
  async listVersions(limit: number = 10): Promise<void> {
    const result = await execAsync(`git log --oneline -${limit}`);

    console.log('📚 最近的版本：\n');
    const commits = result.stdout.split('\n');

    commits.forEach((commit, index) => {
      const [hash, ...messageParts] = commit.split(' ');
      const message = messageParts.join(' ');
      console.log(`${index + 1}. ${message}`);
      console.log(`   (版本號: ${hash})\n`);
    });
  }

  /**
   * 回到之前的版本
   */
  async goBackTo(identifier: string): Promise<void> {
    // 用戶可以用版本號、描述、或相對時間
    let commitHash: string;

    if (identifier.includes('昨天')) {
      // 找昨天的 commit
      commitHash = await this.findCommitByTime('yesterday');
    } else if (identifier.includes('版本')) {
      // 用版本號查找
      commitHash = await this.findCommitByNumber(parseInt(identifier));
    } else {
      // 直接用 hash
      commitHash = identifier;
    }

    await execAsync(`git checkout ${commitHash}`);
    console.log('✅ 已回到該版本');
  }

  /**
   * 創建本地備份
   */
  private async createLocalBackup(): Promise<void> {
    const backupDir = path.join(
      os.homedir(),
      '.smart-agents-backups',
      path.basename(process.cwd())
    );

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = path.join(backupDir, timestamp);

    await fs.mkdir(backupDir, { recursive: true });
    await execAsync(`cp -r . ${backupPath}`);

    // 只保留最近 10 個備份
    const backups = await fs.readdir(backupDir);
    const sortedBackups = backups.sort().reverse();

    for (const backup of sortedBackups.slice(10)) {
      await fs.rm(path.join(backupDir, backup), { recursive: true });
    }
  }

  /**
   * 顯示變更
   */
  async showChanges(): Promise<void> {
    const result = await execAsync('git diff HEAD~1');

    console.log('📊 與上一版本的差異：\n');

    // 簡化的 diff 顯示
    const lines = result.stdout.split('\n');
    const changes = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[]
    };

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        changes.added.push(line.slice(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        changes.removed.push(line.slice(1));
      }
    }

    console.log(`✅ 新增了 ${changes.added.length} 行`);
    console.log(`❌ 刪除了 ${changes.removed.length} 行`);
  }
}
```

## 📱 視覺化 Git 介面（未來）

對於完全不想用命令列的用戶：

```
Smart-Agents GUI (Electron App)

┌─────────────────────────────────────────┐
│  📁 My Project                          │
├─────────────────────────────────────────┤
│  Current Branch: main                   │
│                                          │
│  Recent Versions:                       │
│  ┌────────────────────────────────────┐ │
│  │ 1. 完成登入功能 (2 小時前)          │ │
│  │ 2. 修復密碼驗證 bug (昨天)          │ │
│  │ 3. 新增註冊頁面 (3 天前)            │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Actions:                                │
│  [💾 儲存目前工作]  [⏮️ 回到上一版本]    │
│  [📊 查看變更]      [💿 創建備份]        │
│                                          │
│  Unsaved Changes:                        │
│  ✏️ src/login.ts                        │
│  ✏️ src/auth.ts                         │
│                                          │
│  Description: ___________________        │
│                [儲存版本] 按鈕            │
└─────────────────────────────────────────┘
```

## 🎯 建議的預設配置

### 個人用戶（學習、個人專案）

```json
{
  "git": {
    "mode": "local-only",
    "autoCommit": false,
    "autoBackup": true,
    "backupInterval": "daily",
    "backupLocation": "~/.smart-agents-backups",
    "github": {
      "enabled": false
    }
  },
  "ui": {
    "simplifiedCommands": true,
    "visualDiff": true,
    "autoSuggestions": true
  }
}
```

### 專業用戶（團隊協作、開源）

```json
{
  "git": {
    "mode": "hybrid",
    "autoCommit": false,
    "autoBackup": true,
    "backupInterval": "hourly",
    "github": {
      "enabled": true,
      "repo": "username/project",
      "autoPush": false
    }
  },
  "ui": {
    "simplifiedCommands": false,
    "showRawGitCommands": true
  }
}
```

## 🚀 實作建議

### Phase 1: 本地優先（立即實作）

1. ✅ 預設使用本地 Git
2. ✅ 不強制要求 GitHub
3. ✅ 提供友善的 Git 命令包裝
4. ✅ 自動本地備份

### Phase 2: 漸進式複雜度（未來）

1. ⬜ 檢測用戶熟悉度
2. ⬜ 根據熟悉度顯示不同介面
3. ⬜ 新手模式：只顯示簡化命令
4. ⬜ 專家模式：顯示原始 Git 命令

### Phase 3: 可選 GitHub（未來）

1. ⬜ "升級到 GitHub" 引導流程
2. ⬜ 自動創建 GitHub repo
3. ⬜ 自動配置 remote
4. ⬜ 簡化 push/pull 操作

## 💡 關鍵洞察

### 對於非技術用戶

**他們不需要知道**：
- ❌ Git 的內部運作
- ❌ Commit, Branch, Merge 的技術概念
- ❌ Remote, Push, Pull
- ❌ GitHub 是什麼

**他們只需要知道**：
- ✅ "儲存版本" 可以記錄目前狀態
- ✅ "回到之前版本" 可以恢復舊代碼
- ✅ "查看變更" 可以看修改了什麼
- ✅ "創建備份" 可以保護工作

### 類比：就像文件系統

```
Git 版本控制    ≈    檔案管理

儲存版本       ≈    儲存檔案
回到之前版本   ≈    開啟舊版本檔案
查看歷史       ≈    查看檔案修改日期
創建分支       ≈    複製資料夾測試
```

## 📚 用戶文檔範例

### 新手指南

```markdown
# 如何保存你的工作

## 1. 儲存目前版本

當你完成一個功能後，使用：

​```bash
save-work "完成了登入功能"
​```

就像儲存文件一樣簡單！

## 2. 查看歷史版本

想看之前做了什麼？

​```bash
list-versions
​```

會顯示：
1. 完成登入功能 (2 小時前)
2. 修復密碼 bug (昨天)
3. 新增註冊頁面 (3 天前)

## 3. 回到之前的版本

發現新代碼有問題？回到舊版本：

​```bash
go-back-to "昨天的版本"
​```

就這麼簡單！
```

## 🔒 資料安全

### 本地 Git 的資料保護

```bash
# 1. 定期自動備份（Smart-agents 自動執行）
0 */4 * * * ~/.smart-agents/scripts/local-backup.sh

# 2. 外接硬碟備份（每週）
rsync -av ~/Projects /Volumes/Backup/

# 3. 雲端同步（可選）
# 放在 iCloud/Dropbox 資料夾，自動同步

# 4. Time Machine（macOS）
# 系統自動備份整個電腦
```

## ✅ 結論

**GitHub 不是必需的！**

Smart-agents 應該：
1. ✅ 預設使用本地 Git
2. ✅ 提供友善的命令介面
3. ✅ 自動本地備份
4. ✅ GitHub 作為可選功能
5. ✅ 漸進式學習路徑

這樣可以：
- 降低學習門檻
- 保護用戶隱私
- 適合個人專案
- 需要時可升級到 GitHub
