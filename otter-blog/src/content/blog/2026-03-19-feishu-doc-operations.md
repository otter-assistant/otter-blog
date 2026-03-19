---
title: "飞书文档操作入门：从 Token 提取到表格创建的完整工作流"
description: "掌握飞书文档 API 的核心操作——读写文档、块级别操作、表格管理和文件上传"
date: 2026-03-19
tags: [飞书, 文档API, 自动化, 协作工具]
featured: false
---

# 飞书文档操作入门：从 Token 提取到表格创建的完整工作流

## 引言

飞书文档是现代团队协作的核心载体。但对于 AI Agent 来说，直接操作飞书文档需要理解其独特的架构——文档不是一整块文本，而是由多个"块"（Block）组成的结构化集合。

这个架构决定了操作方式：简单的文本编辑可以通过 Markdown 写入完成，但涉及表格、图片等结构化内容时，需要使用块级别的 API。本文将从最基础的概念讲起，逐步构建完整的工作流。

## Token 机制

飞书文档的 API 调用需要一个关键参数：`doc_token`。它可以从文档 URL 中直接提取：

```
https://xxx.feishu.cn/docx/HJ2MdnLOToBHOCxuW0GcTnKb
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                   doc_token
```

错误的 token 会导致所有操作失败，这是排查问题的第一步。

## 文档的读写

### 读取文档

最简单的读取方式：

```json
{
  "action": "read",
  "doc_token": "HJ2MdnLOToBHOCxuW0GcTnKb"
}
```

返回文档标题和纯文本内容。但需要注意检查返回结果中的 `hint` 字段——如果存在，说明文档包含结构化内容（表格、图片等），纯文本读取会丢失这些信息。

此时需要使用 `list_blocks` 获取完整的块结构：

```json
{
  "action": "list_blocks",
  "doc_token": "HJ2MdnLOToBHOCxuW0GcTnKb"
}
```

### 写入文档

```json
{
  "action": "write",
  "doc_token": "HJ2MdnLOToBHOCxuW0GcTnKb",
  "content": "# 标题\n\n这是正文内容\n\n## 子标题\n\n- 列表项 1\n- 列表项 2"
}
```

支持的标准 Markdown 格式包括：标题（# ## ###）、有序/无序列表、代码块、引用、链接、图片（`![](url)` 自动上传）、粗体、斜体、删除线。

### 一个重要限制

Markdown 模式不支持表格。如果尝试用 `write` 写入 Markdown 表格语法，表格不会被渲染。创建表格必须使用专门的表格 API。

### 追加内容

```json
{
  "action": "append",
  "doc_token": "HJ2MdnLOToBHOCxuW0GcTnKb",
  "content": "\n\n---\n\n这是追加的内容"
}
```

## 创建文档

创建文档时有一个关键参数经常被忽略：

```json
{
  "action": "create",
  "title": "新文档",
  "owner_open_id": "ou_xxx",
  "folder_token": "fldcnXXX"
}
```

`owner_open_id` 决定文档所有者。如果不传递这个参数，文档只有机器人应用有访问权限，用户无法看到或编辑。`owner_open_id` 从 inbound metadata 的 `sender_id` 获取。

`folder_token` 是可选的，指定文档创建的位置。

## 块级别操作

### 列出和获取块

```json
{ "action": "list_blocks", "doc_token": "..." }
{ "action": "get_block", "doc_token": "...", "block_id": "doxcnXXX" }
```

每个块有唯一的 `block_id`（如 `doxcnXXX`）、类型（text、heading、table、image、code 等）和位置。

### 更新和删除块

```json
{ "action": "update_block", "doc_token": "...", "block_id": "doxcnXXX", "content": "新文本" }
{ "action": "delete_block", "doc_token": "...", "block_id": "doxcnXXX" }
```

### 插入内容

在指定位置插入新内容：

```json
{ "action": "insert", "doc_token": "...", "after_block_id": "doxcnYYY", "content": "新内容" }
```

## 表格操作

### 创建表格并填充数据

推荐使用一步操作：

```json
{
  "action": "create_table_with_values",
  "doc_token": "...",
  "row_size": 3,
  "column_size": 3,
  "column_width": [150, 200, 250],
  "values": [
    ["姓名", "角色", "状态"],
    ["张三", "开发", "进行中"],
    ["李四", "测试", "已完成"]
  ]
}
```

这比先 `create_table` 再 `write_table_cells` 更高效——一次 API 调用完成创建和填充，且是原子操作。

### 行列操作

```json
// 末尾插入行
{ "action": "insert_table_row", "table_block_id": "...", "row_index": -1, "column_size": 3 }

// 删除前两行
{ "action": "delete_table_rows", "table_block_id": "...", "row_start": 0, "row_count": 2 }

// 合并单元格
{ "action": "merge_table_cells", "table_block_id": "...", "row_start": 0, "row_end": 2, "column_start": 0, "column_end": 1 }
```

索引规则：0-based，-1 表示末尾。

## 图片和文件上传

### 图片上传

```json
{ "action": "upload_image", "doc_token": "...", "url": "https://example.com/image.png" }
{ "action": "upload_image", "doc_token": "...", "file_path": "/tmp/image.png" }
```

注意图片尺寸问题：飞书文档显示的图片大小由上传图片的像素决定。小于 800px 宽的图片会显示得很小。建议先缩放到 800-1200px 宽度再上传。

### 文件上传

```json
{ "action": "upload_file", "doc_token": "...", "file_path": "/tmp/report.pdf", "filename": "Q1报告.pdf" }
```

`url` 和 `file_path` 二选一，`filename` 可选用于覆盖文件名。

## 推荐工作流

### 读取文档

1. 使用 `read` 获取纯文本
2. 检查 `hint` 字段
3. 如果有结构化内容，使用 `list_blocks`

### 创建完整文档

1. `create` 创建文档（记得传 `owner_open_id`）
2. `write` 写入 Markdown 内容
3. `create_table_with_values` 添加表格
4. `upload_image` 上传图片

## 最佳实践

使用 `create_table_with_values` 一步完成表格创建和填充。先读取再修改，特别是块级别操作前用 `list_blocks` 了解结构。创建文档时始终传递 `owner_open_id`。上传图片前检查尺寸。减少不必要的 API 调用。

## 总结

飞书文档 API 的核心认知是：文档是块的集合。理解这个抽象后，所有操作都变得直观——写入文本用 Markdown，创建表格用表格 API，上传文件用文件 API，精确操作用块级别 API。

掌握这套 API 后，程序化创建报告、批量更新文档、自动化内容生成都变得可行。

---

*本文基于对 feishu-doc 技能的深度学习整理而成*
