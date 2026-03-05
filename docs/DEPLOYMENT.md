# 博客内容分离部署指南

本指南说明如何将博客内容分离到独立仓库，并配置自动构建部署流程。

## 架构概览

```
otter-content (内容仓库)
    ↓ 推送触发
otter-blog (构建仓库)
    ↓ 构建后推送
otter-assistant.github.io (部署仓库)
```

## 前置要求

1. GitHub 账户和仓库权限
2. 本地已克隆 `otter-blog` 仓库
3. Git 命令行工具

## 第一步：创建内容仓库

### 1.1 在 GitHub 创建仓库

访问 https://github.com/new 创建新仓库：
- 仓库名：`otter-content`
- 描述：Otter 博客内容仓库
- 可见性：Public 或 Private（根据需求）
- 不要初始化 README、.gitignore 或 license

### 1.2 本地初始化

```bash
cd /path/to/otter-blog
./scripts/init-content-repo.sh ../otter-content
```

### 1.3 推送到 GitHub

```bash
cd ../otter-content
git add .
git commit -m "feat: 初始化博客内容仓库"
git remote add origin https://github.com/otter-assistant/otter-content.git
git push -u origin main
```

## 第二步：迁移现有内容

### 2.1 运行迁移脚本

```bash
cd /path/to/otter-blog
./scripts/migrate-content.sh
```

### 2.2 提交迁移

```bash
cd ../otter-content
git add blog/
git commit -m "feat: 迁移博客内容"
git push
```

## 第三步：配置 GitHub Token

### 3.1 创建 Personal Access Token

1. 访问 https://github.com/settings/tokens/new
2. 配置：
   - 名称：`otter-blog-trigger`
   - 过期时间：No expiration（或根据安全策略设置）
   - 权限：`repo` (Full control of private repositories)
3. 点击 "Generate token"
4. **重要**：复制 token，页面关闭后无法再次查看

### 3.2 在 otter-content 仓库添加密钥

1. 访问 https://github.com/otter-assistant/otter-content/settings/secrets/actions
2. 点击 "New repository secret"
3. 配置：
   - Name：`TRIGGER_TOKEN`
   - Value：粘贴刚才创建的 token
4. 点击 "Add secret"

### 3.3 验证 otter-blog 仓库密钥

确认 `otter-blog` 仓库已有 `DEPLOY_TOKEN` 密钥：
- 访问 https://github.com/otter-assistant/otter-blog/settings/secrets/actions
- 应该存在名为 `DEPLOY_TOKEN` 的密钥

如果没有，请创建一个具有 `repo` 权限的 token 并添加。

## 第四步：验证工作流程

### 4.1 测试内容推送

```bash
cd /path/to/otter-content
echo "# Test Article" > blog/test.md
cat > blog/test.md << 'EOF'
---
title: 测试文章
date: 2026-03-06
tags: [测试]
---

这是一篇测试文章。
EOF

git add blog/test.md
git commit -m "test: 添加测试文章"
git push
```

### 4.2 检查 Actions 执行

1. 访问 https://github.com/otter-assistant/otter-content/actions
   - 应该看到 "Trigger Blog Build" 工作流正在运行
2. 访问 https://github.com/otter-assistant/otter-blog/actions
   - 应该看到 "Build and Deploy" 工作流被触发
3. 访问 https://github.com/otter-assistant/otter-assistant.github.io
   - 检查是否有新的部署提交

### 4.3 验证网站

访问 https://otter-assistant.github.io 确认测试文章已发布。

### 4.4 清理测试数据

```bash
cd /path/to/otter-content
git rm blog/test.md
git commit -m "test: 删除测试文章"
git push
```

## 第五步：更新本地开发环境

### 5.1 修改 otter-blog 配置（可选）

如果本地开发需要访问内容仓库，可以配置环境变量：

```bash
export CONTENT_REPO=https://github.com/otter-assistant/otter-content.git
export CONTENT_BRANCH=main
```

或在 `otter-blog` 根目录创建 `.env` 文件：

```env
CONTENT_REPO=https://github.com/otter-assistant/otter-content.git
CONTENT_BRANCH=main
```

### 5.2 本地开发时同步内容

```bash
cd /path/to/otter-blog
npx tsx scripts/sync-content.ts
npm run dev
```

## 日常工作流程

### 发布新文章

1. 在 `otter-content/blog/` 创建新的 Markdown 文件
2. 编写文章内容
3. 提交并推送到 `main` 分支
4. 等待自动构建和部署（约 2-3 分钟）

### 更新文章

1. 在 `otter-content/blog/` 修改对应文件
2. 在 frontmatter 中添加 `updated` 字段
3. 提交并推送

### 删除文章

1. 在 `otter-content/blog/` 删除对应文件
2. 提交并推送

## 故障排查

### 内容未同步

检查 GitHub Actions 日志：
- otter-content: Trigger Blog Build
- otter-blog: Build and Deploy

常见问题：
- `TRIGGER_TOKEN` 权限不足
- `DEPLOY_TOKEN` 权限不足
- 仓库地址配置错误

### 构建失败

1. 检查文章 frontmatter 格式
2. 查看构建日志中的错误信息
3. 本地运行 `npm run build` 测试

### 部署失败

1. 确认 `DEPLOY_TOKEN` 有效
2. 确认 `otter-assistant.github.io` 仓库存在
3. 检查 GitHub Pages 设置

## 安全建议

1. **Token 权限**：只授予必要的权限
2. **Token 过期**：定期更新 token
3. **Secret 管理**：不要在代码中硬编码 token
4. **访问控制**：限制仓库的写入权限

## 参考资料

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Repository Dispatch API](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)
- [Astro 内容集合](https://docs.astro.build/zh-cn/guides/content-collections/)
