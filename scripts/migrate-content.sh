#!/bin/bash
set -e

echo "🦦 博客内容迁移脚本"
echo "===================="
echo ""

SOURCE_DIR=${1:-"../otter-blog/src/content/blog"}
TARGET_DIR=${2:-"../otter-content/blog"}

if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ 源目录不存在: $SOURCE_DIR"
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "📁 创建目标目录: $TARGET_DIR"
  mkdir -p "$TARGET_DIR"
fi

echo "📋 复制博客内容..."
echo "  源目录: $SOURCE_DIR"
echo "  目标目录: $TARGET_DIR"
echo ""

cp -r "$SOURCE_DIR"/* "$TARGET_DIR"/

FILE_COUNT=$(find "$TARGET_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l)

echo "✅ 迁移完成！"
echo "📊 迁移了 $FILE_COUNT 个文件"
echo ""
echo "接下来请执行："
echo "  cd ../otter-content"
echo "  git add blog/"
echo '  git commit -m "feat: 迁移博客内容"'
echo "  git push"
