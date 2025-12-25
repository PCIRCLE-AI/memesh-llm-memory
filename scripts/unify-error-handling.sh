#!/bin/bash
# 🔧 自動化統一錯誤處理：console.error → logger.error

echo "🔍 Finding all console.error usages..."

# 找出所有使用 console.error 的文件
files=$(grep -rl "console.error" src/ --include="*.ts")

echo "📝 Files to update:"
echo "$files"
echo ""

# 對每個文件進行替換
for file in $files; do
  echo "Processing: $file"

  # 替換 console.error 為 logger.error
  # 保留 emoji 和格式，但改用 logger
  sed -i '' \
    -e "s/console\.error('\([^']*\)', /logger.error('\1', { error: /g" \
    -e "s/console\.error('\([^']*\)');/logger.error('\1');/g" \
    -e "s/console\.error(/logger.error(/g" \
    "$file"
done

echo ""
echo "✅ Done! Please review the changes with 'git diff'"
echo "⚠️  Remember to import logger if needed"
