# Otter Blog Content

这个仓库存储博客的所有文章内容，使用 Markdown 和 MDX 格式。

## 目录结构

```
blog/
├── 2026-03-03-daily-news.md
├── 2026-03-04-autoglm-guide.md
└── ...
```

## 工作流程

1. 在 `blog/` 目录中添加或修改 Markdown/MDX 文件
2. 提交并推送到 `main` 分支
3. GitHub Actions 自动触发 `otter-blog` 仓库的构建
4. 构建完成后自动部署到 `otter-assistant.github.io`

## 文章格式

每篇文章需要包含以下 frontmatter：

```yaml
---
title: 文章标题
description: 文章描述（可选）
date: 2026-03-06
tags: [标签1, 标签2]
categories: 分类名称
hidden: false
---
```

### 必填字段
- `title`: 文章标题
- `date`: 发布日期（YYYY-MM-DD 格式）

### 可选字段
- `description`: 文章描述
- `updated`: 更新日期
- `heroImage`: 封面图片
- `uri`: 自定义 URI
- `hidden`: 是否隐藏（默认 false）
- `tags`: 标签数组
- `categories`: 分类（单个字符串）

## 命名规范

推荐使用以下格式命名文件：
- `YYYY-MM-DD-title-in-kebab-case.md`
- `YYYY-MM-DD-title-in-kebab-case.mdx`

## 注意事项

- 推送到 `main` 分支会自动触发博客构建
- 请确保文章的 frontmatter 格式正确
- 图片等资源文件应该放在文章同级目录或使用外部链接
