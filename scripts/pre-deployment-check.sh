#!/bin/bash
# Pre-Deployment Checklist
# 部署前強制檢查，確保所有條件滿足

set -e

echo "🔍 Pre-Deployment Checklist"
echo "================================"
echo ""

FAILED=0

# 1. Git 狀態
echo "📋 [1/7] Checking git status..."
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Git working directory not clean"
  git status --short
  FAILED=1
else
  echo "✅ Git working directory clean"
fi
echo ""

# 2. 測試
echo "🧪 [2/7] Running tests..."
if npm test -- --run >/dev/null 2>&1; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
  echo "Run 'npm test' to see details"
  FAILED=1
fi
echo ""

# 3. Lint
echo "🔍 [3/7] Running lint..."
if npm run lint >/dev/null 2>&1; then
  echo "✅ Lint passed"
else
  echo "❌ Lint failed"
  echo "Run 'npm run lint' to see details"
  FAILED=1
fi
echo ""

# 4. TypeScript
echo "📘 [4/7] Running typecheck..."
if npm run typecheck >/dev/null 2>&1; then
  echo "✅ TypeScript check passed"
else
  echo "❌ TypeScript errors found"
  echo "Run 'npm run typecheck' to see details"
  FAILED=1
fi
echo ""

# 5. Build
echo "🔨 [5/7] Building project..."
if npm run build >/dev/null 2>&1; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  echo "Run 'npm run build' to see details"
  FAILED=1
fi
echo ""

# 6. 依賴驗證
echo "🔗 [6/7] Verifying workflow dependencies..."
MISSING_FILES=()

# Check workflow scripts
if [ -d .github/workflows ]; then
  while IFS= read -r script; do
    if [ -n "$script" ]; then
      if ! git ls-files --error-unmatch "$script" >/dev/null 2>&1; then
        MISSING_FILES+=("$script (required by workflow)")
      fi
    fi
  done < <(grep -rh "run:" .github/workflows/*.yml 2>/dev/null | grep -o '\./scripts/[^"]*' | sort -u)
fi

# Check package.json scripts
if [ -f package.json ]; then
  while IFS= read -r script; do
    if [ -n "$script" ] && [ -f "$script" ]; then
      if ! git ls-files --error-unmatch "$script" >/dev/null 2>&1; then
        MISSING_FILES+=("$script (required by package.json)")
      fi
    fi
  done < <(jq -r '.scripts | to_entries[] | .value' package.json 2>/dev/null | grep -o '\./[^" ]*\.sh' | sort -u)
fi

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo "✅ All workflow dependencies in git"
else
  echo "❌ Missing files:"
  for file in "${MISSING_FILES[@]}"; do
    echo "   - $file"
  done
  FAILED=1
fi
echo ""

# 7. Changelog
echo "📝 [7/7] Checking CHANGELOG..."
version=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
if [ "$version" != "unknown" ]; then
  if grep -q "## \[$version\]" CHANGELOG.md 2>/dev/null; then
    echo "✅ CHANGELOG updated for v$version"
  else
    echo "⚠️  CHANGELOG not updated for v$version"
    echo "   (Not blocking, but recommended)"
  fi
else
  echo "⚠️  Cannot check CHANGELOG (package.json issue)"
fi
echo ""

# Final result
echo "================================"
if [ $FAILED -eq 0 ]; then
  echo "✅ All checks passed!"
  echo ""
  echo "Ready to deploy."
  exit 0
else
  echo "❌ Some checks failed"
  echo ""
  echo "Fix the issues above before deploying."
  exit 1
fi
