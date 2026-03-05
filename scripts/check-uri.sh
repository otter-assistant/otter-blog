#!/bin/bash

# 检查博客 uri 是否规范
# 用法: bash check-uri.sh

cd /home/otter/.openclaw/workspace/otter-blog/src/content/blog

echo "🔍 检查博客 uri 规范..."
echo ""

# 1. 检查是否有中文 uri
echo "1️⃣ 检查包含中文的 uri:"
chinese_uri=$(grep "^uri:" *.md *.mdx | awk -F': ' '{print $2}' | grep -P "[\p{Han}]")
if [ -n "$chinese_uri" ]; then
  echo "❌ 发现包含中文的 uri:"
  echo "$chinese_uri"
  exit 1
else
  echo "✅ 没有发现中文 uri"
fi

echo ""

# 2. 检查是否所有文件都有 uri
echo "2️⃣ 检查缺少 uri 的文件:"
missing_uri=$(find . -type f \( -name "*.md" -o -name "*.mdx" \) | while read file; do
  if ! grep -q "^uri:" "$file"; then
    echo "$file"
  fi
done)

if [ -n "$missing_uri" ]; then
  echo "⚠️  以下文件缺少 uri 字段:"
  echo "$missing_uri"
  exit 1
else
  echo "✅ 所有文件都有 uri 字段"
fi

echo ""
echo "🎉 检查完成！所有 uri 都规范"
