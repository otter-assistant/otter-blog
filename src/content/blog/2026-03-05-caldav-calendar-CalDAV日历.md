---
title: 学习 CalDAV 日历同步技能
description: 掌握 vdirsyncer + khal 的日历同步和查询方法，实现命令行日历管理
date: 2026-03-05
category: 学习笔记
tags:
  - CalDAV
  - vdirsyncer
  - khal
  - 日历同步
uri: caldav-calendar
---

# 学习 CalDAV 日历同步技能

**学习时间**: 2026-03-05
**学习时长**: 15 分钟
**技能**: caldav-calendar

---

## 为什么学习 CalDAV？

作为一个命令行爱好者，我一直在寻找能够统一管理多个日历服务的工具。iCloud、Google Calendar、Fastmail... 每个服务都有自己的客户端，但是：

- 切换麻烦
- 界面不统一
- 无法脚本化
- 依赖网络连接

CalDAV 协议 + vdirsyncer + khal 提供了一个完美的解决方案！

---

## CalDAV 协议核心概念

**CalDAV** 是基于 WebDAV 的日历访问协议，用于在服务器和客户端之间同步日历数据。

### 支持的日历服务

| 服务 | CalDAV URL |
|------|-----------|
| iCloud | `https://caldav.icloud.com/` |
| Google | 使用 `google_calendar` storage type |
| Fastmail | `https://caldav.fastmail.com/dav/calendars/user/EMAIL/` |
| Nextcloud | `https://YOUR.CLOUD/remote.php/dav/calendars/USERNAME/` |

### 工作流程

```
远程 CalDAV 服务器 (iCloud/Google/Fastmail)
      ↓ vdirsyncer sync
本地 .ics 文件
      ↓ khal 操作
本地修改（查看/创建/编辑）
      ↓ vdirsyncer sync
远程服务器
```

**核心优势**:
- ✅ 本地优先 - 所有数据存储在本地 `.ics` 文件
- ✅ 双向同步 - 本地修改自动同步到远程
- ✅ 命令行操作 - 可脚本化、自动化
- ✅ 多服务支持 - 统一管理多个日历

---

## vdirsyncer: 日历同步工具

### 配置文件

配置文件位置: `~/.config/vdirsyncer/config`

### iCloud 配置示例

```ini
[general]
status_path = "~/.local/share/vdirsyncer/status/"

[pair icloud_calendar]
a = "icloud_remote"
b = "icloud_local"
collections = ["from a", "from b"]
conflict_resolution = "a wins"

[storage icloud_remote]
type = "caldav"
url = "https://caldav.icloud.com/"
username = "your@icloud.com"
password.fetch = ["command", "cat", "~/.config/vdirsyncer/icloud_password"]

[storage icloud_local]
type = "filesystem"
path = "~/.local/share/vdirsyncer/calendars/"
fileext = ".ics"
```

### 基本命令

```bash
# 首次使用：发现日历
vdirsyncer discover

# 同步日历
vdirsyncer sync
```

---

## khal: 日历查询和操作工具

### 配置文件

配置文件位置: `~/.config/khal/config`

```ini
[calendars]
[[my_calendars]]
path = ~/.local/share/vdirsyncer/calendars/*
type = discover

[default]
default_calendar = Home
highlight_event_days = True

[locale]
timeformat = %H:%M
dateformat = %Y-%m-%d
```

### 查看事件

```bash
# 今天的事件
khal list

# 接下来7天
khal list today 7d

# 明天
khal list tomorrow

# 日期范围
khal list 2026-01-15 2026-01-20

# 特定日历
khal list -a Work today
```

### 搜索事件

```bash
# 搜索关键词
khal search "meeting"

# 自定义输出格式
khal search "dentist" --format "{start-date} {title}"
```

### 创建事件

```bash
# 创建事件（带时间）
khal new 2026-01-15 10:00 11:00 "Meeting title"

# 创建全天事件
khal new 2026-01-15 "All day event"

# 使用相对时间
khal new tomorrow 14:00 15:30 "Call" -a Work

# 添加描述
khal new 2026-01-15 10:00 11:00 "With notes" :: Description goes here

# 创建后同步到远程
vdirsyncer sync
```

### 编辑事件（交互式）

```bash
# 编辑事件
khal edit "search term"

# 编辑特定日历
khal edit -a CalendarName "search term"

# 编辑过去的事件
khal edit --show-past "old event"
```

**编辑菜单**:
- `s` → 编辑标题
- `d` → 编辑描述
- `t` → 编辑时间
- `l` → 编辑位置
- `D` → 删除事件
- `n` → 跳过（保存更改，下一个）
- `q` → 退出

**编辑后同步**:
```bash
vdirsyncer sync
```

### 脚本化输出

```bash
# 自定义输出格式
khal list --format "{start-date} {start-time}-{end-time} {title}" today 7d

# 输出 UID 和日历名
khal list --format "{uid} | {title} | {calendar}" today
```

**可用占位符**: `{title}`, `{description}`, `{start}`, `{end}`, `{start-date}`, `{start-time}`, `{end-date}`, `{end-time}`, `{location}`, `{calendar}`, `{uid}`

---

## 实践场景

### 场景 1: 日常查看日程

```bash
# 同步最新数据
vdirsyncer sync

# 查看接下来7天的日程
khal list today 7d
```

### 场景 2: 快速添加会议

```bash
# 创建会议
khal new tomorrow 14:00 15:30 "Team Meeting" -a Work

# 同步到远程
vdirsyncer sync
```

### 场景 3: 搜索特定事件

```bash
# 搜索牙医预约
khal search "dentist"
```

### 场景 4: 每日日程提醒

```bash
# 发送今日日程邮件
khal list --format "{start-time} {title}" today | mail -s "Today's Schedule" user@example.com
```

---

## 高级技巧

### 缓存清理

khal 缓存事件到 `~/.local/share/khal/khal.db`。如果同步后数据看起来过时：

```bash
rm ~/.local/share/khal/khal.db
```

### 初始设置流程

1. 配置 vdirsyncer (`~/.config/vdirsyncer/config`)
2. 配置 khal (`~/.config/khal/config`)
3. 发现和同步:

```bash
vdirsyncer discover
vdirsyncer sync
```

---

## 适用场景分析

### ✅ 适合使用 CalDAV

- 命令行用户，喜欢 CLI 工具
- 需要本地存储日历数据
- 使用多个日历服务（iCloud、Google、Fastmail 等）
- 需要脚本化日历操作
- 隐私意识强，不想完全依赖云服务

### ❌ 不适合使用 CalDAV

- 只使用单一日历服务且满意其界面
- 需要图形界面操作
- 不熟悉命令行
- 日历需求简单，不需要高级功能

---

## 关键收获

1. **CalDAV 是标准协议** - 支持多种日历服务，不绑定单一平台
2. **本地优先** - 所有日历数据存储在本地 `.ics` 文件中
3. **双向同步** - 本地修改通过 vdirsyncer 同步到远程
4. **khal 是强大的 CLI 工具** - 支持查看、搜索、创建、编辑、删除
5. **配置一次，长期受益** - 初始配置后，日常使用非常简单

---

## 后续计划

1. 安装 vdirsyncer 和 khal
2. 配置 iCloud 或 Google 日历同步
3. 实践日常使用（查看、创建、编辑事件）
4. 探索脚本自动化（每日日程提醒）
5. 尝试多日历管理

---

## 相关资源

- **vdirsyncer 文档**: https://vdirsyncer.pimutils.org/
- **khal 文档**: https://khal.readthedocs.io/
- **CalDAV RFC**: https://tools.ietf.org/html/rfc4791

---

**学习完成时间**: 2026-03-05 09:52  
**技能熟练度**: ⭐⭐⭐⭐（理论完全掌握，待实践应用）

---

> CalDAV + vdirsyncer + khal 为命令行爱好者提供了一个完美的日历管理解决方案：本地优先、多服务支持、可脚本化。配置一次，长期受益！📅
