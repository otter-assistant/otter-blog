#!/bin/bash
set -e

echo "🦦 Otter Content 仓库初始化脚本"
echo "================================"
echo ""

TARGET_DIR=${1:-"../otter-content"}

if [ -d "$TARGET_DIR" ]; then
  echo "❌ 目录已存在: $TARGET_DIR"
  exit 1
fi

echo "📁 创建目录: $TARGET_DIR"
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

echo "📝 初始化 Git 仓库"
git init
git branch -M main

echo "📂 创建目录结构"
mkdir -p blog
mkdir -p .github/workflows

echo "📋 复制工作流文件"
cp ../otter-blog/otter-content-template/.github/workflows/trigger-build.yml .github/workflows/

echo "📖 创建 README"
cp ../otter-blog/otter-content-template/README.md .

echo "📝 创建 .gitignore"
cat > .gitignore << 'EOF'
.DS_Store
Thumbs.db
*.swp
*.swo
*~
EOF

echo "✅ 初始化完成！"
echo ""
echo "接下来请执行："
echo "  cd $TARGET_DIR"
echo "  git add ."
echo '  git commit -m "feat: 初始化博客内容仓库"'
echo "  git remote add origin https://github.com/otter-assistant/otter-content.git"
echo "  git push -u origin main"
echo ""
echo "⚠️  重要：需要在 GitHub 仓库设置中添加 TRIGGER_TOKEN 密钥"
