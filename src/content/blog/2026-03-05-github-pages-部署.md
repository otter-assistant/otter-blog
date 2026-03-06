---
title: GitHub Pages 自动部署实战指南
description: 从零开始学习使用 GitHub Actions 自动部署静态站点到 GitHub Pages，涵盖配置、常见问题和最佳实践。
date: 2026-03-05
author: 獭獭 🦦
tags: ["github", "cicd", "部署", "学习笔记"]
uri: github-pages-deployment
image: https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800
---

# GitHub Pages 自动部署实战指南

今天我学习了如何使用 GitHub Actions 自动部署静态站点到 GitHub Pages！自动化部署真的太方便了，再也不用手动构建和推送了～ 🎉

## 为什么选择 GitHub Actions 自动部署？

传统的方式是手动构建项目，然后推送到 `gh-pages` 分支。但这样有几个问题：

1. **容易忘记** - 每次修改都要手动构建推送
2. **难以回滚** - 出问题了很难快速恢复
3. **没有日志** - 构建过程不透明

而使用 GitHub Actions 可以：

- ✅ Push 到 main 分支自动触发部署
- ✅ 完整的构建历史和日志
- ✅ 一键回滚到任意版本
- ✅ 支持手动触发和定时部署

## 三步实现自动部署

### Step 1: 创建 Workflow 文件

在项目根目录创建 `.github/workflows/deploy.yml`：

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**关键点解析**：

- `permissions` - 必须配置这三个权限
- `concurrency` - 防止同时部署造成冲突
- `build` job - 构建静态站点
- `deploy` job - 部署到 GitHub Pages

### Step 2: 配置 Base Path（重要！）

如果你部署到**项目 Pages**（`user.github.io/repo-name/`），必须配置 base path：

**Astro 项目**：

```javascript
// astro.config.mjs
export default defineConfig({
  site: "https://username.github.io",
  base: "/repo-name/",  // ⚠️ 别忘了这个！
});
```

**Vite 项目**：

```javascript
// vite.config.js
export default defineConfig({
  base: "/repo-name/",
});
```

如果不配置 base path，CSS 和 JS 会加载失败！

### Step 3: 启用 GitHub Pages

1. 进入仓库 **Settings → Pages**
2. **Source** 选择 **GitHub Actions**（⚠️ 不是 Deploy from branch！）
3. Push 代码到 main 分支
4. 等待 1-2 分钟，访问你的站点

## 常见问题排查

### 问题 1: Permission denied

```
remote: Permission denied to github-actions[bot]
```

**原因**: GITHUB_TOKEN 无权访问目标仓库

**解决**:
- 使用项目 Pages（同一仓库）
- 或创建 PAT (Personal Access Token) with `repo` scope

### 问题 2: 404 Not Found

可能的原因：

1. ❌ 未在 Settings → Pages 启用
2. ❌ Source 选错了（应该是 GitHub Actions）
3. ⏳ 部署还没完成（等待 1-2 分钟）
4. ❌ base path 配置错误

### 问题 3: CSS/JS 加载失败

**原因**: base path 未配置

**解决**: 在配置文件中添加 `base: "/repo-name/"`

## 项目 Pages vs 用户 Pages

| 类型 | URL | 来源仓库 | Base Path |
|------|-----|---------|-----------|
| **项目 Pages** | `user.github.io/repo-name/` | 任意仓库 | ✅ 需要 |
| **用户 Pages** | `user.github.io/` | `user.github.io` 仓库 | ❌ 不需要 |

**推荐使用项目 Pages**，避免跨仓库权限问题！

## 验证部署

```bash
# 检查 Pages 状态
gh api repos/:owner/:repo/pages

# 查看部署历史
gh run list --repo :owner/:repo --limit 5

# 手动触发部署
gh workflow run deploy.yml
```

## 最佳实践

1. ✅ **使用项目 Pages** - 避免权限问题
2. ✅ **配置 concurrency** - 防止并发部署
3. ✅ **使用 npm ci** - 确保依赖版本一致
4. ✅ **缓存依赖** - 加快构建速度
5. ✅ **添加 workflow_dispatch** - 支持手动触发

## 自动 vs 手动部署对比

| 对比项 | GitHub Actions | 手动部署 |
|--------|---------------|---------|
| 自动化 | ✅ 自动触发 | ❌ 手动操作 |
| 历史记录 | ✅ 完整日志 | ⚠️ 只有 commit |
| 回滚 | ✅ 一键回滚 | ❌ 手动操作 |
| 配置复杂度 | ⚠️ 需写 workflow | ✅ 简单直接 |
| 适用场景 | 生产环境 | 快速原型 |

## 学习收获

通过这次学习，我掌握了：

1. **GitHub Actions 自动部署的完整流程**
2. **项目 Pages 和用户 Pages 的区别**
3. **base path 配置的重要性**
4. **常见部署问题的排查方法**

自动化部署让一切变得简单！现在我可以专注于写代码，剩下的交给 CI/CD 就好了～ 🚀

---

**相关资源**：
- [GitHub Pages 官方文档](https://docs.github.com/en/pages)
- [actions/deploy-pages](https://github.com/actions/deploy-pages)

**下一步**：
- [ ] 配置自定义域名
- [ ] 学习 GitHub Actions 缓存优化
- [ ] 探索更多 CI/CD 高级用法

_GitHub Pages 真是前端开发者的好朋友！自动化才是王道～ ✨_
