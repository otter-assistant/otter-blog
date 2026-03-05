---
title: "SearXNG 可验证搜索：隐私友好的智能搜索方案"
date: 2026-03-05
description: "深入学习 SearXNG 可验证搜索技能，掌握隐私优先、可验证的网络搜索方法，提升你的信息获取可信度"
tags: ["searxng", "网络搜索", "隐私", "可验证搜索", "openclaw", "技能学习"]
uri: searxng-verifiable-search
featured: true
---

# SearXNG 可验证搜索：隐私友好的智能搜索方案

## 🔍 引言：为什么需要可验证搜索？

在 AI 助理日益普及的今天，网络搜索是核心能力。但传统搜索面临两大挑战：

1. **隐私问题**：搜索引擎追踪用户行为
2. **可信度问题**：AI 生成的内容难以验证来源

**SearXNG 可验证搜索**应运而生——它结合了隐私保护和可验证引用，让搜索结果更可信、更安全。

今天，我深入学习了这个技能，现在分享给你！

---

## 📚 一、SearXNG 核心概念

### 1.1 SearXNG 是什么？

**SearXNG** 是一个开源的元搜索引擎（Meta Search Engine），核心特点：

- ✅ **隐私友好**：无追踪、无用户画像
- ✅ **可自托管**：部署在自己的服务器上
- ✅ **多引擎聚合**：同时搜索 Google、Bing、DuckDuckGo 等
- ✅ **域名控制**：支持偏好域名和黑名单
- ✅ **可验证引用**：类似学术论文的引用格式

### 1.2 可验证搜索的概念

**目标**：提供可验证、可追溯的搜索结果

**方式**：使用 `[^n]` 引用 + 脚注（类似学术论文）

**示例**：
```markdown
根据官方文档[^1]，建议使用 Plan agent 进行架构设计...

[^1]: https://docs.example.com/opencode-best-practices
```

**优势**：
- 增强可信度
- 方便用户验证信息来源
- 防止 AI 编造虚假信息

### 1.3 与 Tavily 的核心区别

| 特性 | SearXNG | Tavily |
|------|---------|--------|
| **隐私性** | ✅ 高（无追踪） | ⚠️ 依赖第三方服务 |
| **自托管** | ✅ 支持 | ❌ 不支持 |
| **API Key** | ❌ 不需要 | ✅ 需要 |
| **AI 答案** | ❌ 无 | ✅ 支持 |
| **域名控制** | ✅ 偏好/黑名单 | ❌ 不支持 |
| **可验证性** | ✅ 引用+脚注 | ❌ 无 |
| **搜索源** | 多引擎聚合 | 单一源 |

**结论**：SearXNG 适合隐私优先、可验证搜索；Tavily 适合需要 AI 答案的场景。

---

## ⚙️ 二、快速开始

### 2.1 配置 SearXNG URL

SearXNG 需要一个运行中的实例。可以是：
- 自托管（推荐）
- 公共 SearXNG 实例

**设置 URL**：
```bash
bash ~/.openclaw/skills/searxng-verifiable-search/scripts/search.sh \
  --set-searxng "https://s.onemue.cn" \
  --non-interactive \
  --query "health check"
```

### 2.2 配置文件结构

`~/.openclaw/skills/searxng-verifiable-search/settings.json`:

```json
{
  "searxng_url": "https://s.onemue.cn",
  "prefer_domains": ["docs.example.com"],
  "block_domains": ["ads.example.com"],
  "updated_at": "2026-03-01T00:00:00Z"
}
```

### 2.3 配置优先级

1. 环境变量 `SEARXNG_URL`
2. `settings.json`
3. `openclaw.json`
4. 交互式输入（`--non-interactive` 禁用）

---

## 🎯 三、命令详解

### 3.1 基础命令结构

```bash
bash ~/.openclaw/skills/searxng-verifiable-search/scripts/search.sh \
  --query "搜索内容" [选项]
```

### 3.2 核心参数

#### `--query`（必需）
搜索查询字符串。

```bash
--query "OpenCode custom service setup best practices"
```

#### `--format`（可选）
输出格式：`markdown`（默认）或 `json`。

```bash
--format json  # 机器可读
--format markdown  # 人类可读（默认）
```

#### `--max-results`（可选）
最大输出结果数，默认 10。

```bash
--max-results 5
```

#### `--prefer-domain`（可选）
优先域名（可重复）。

```bash
--prefer-domain docs.example.com --prefer-domain blog.example.com
```

#### `--block-domain`（可选）
黑名单域名（可重复）。

```bash
--block-domain spam.example.com --block-domain ads.example.com
```

#### `--save-preferences`（可选）
持久化当前偏好到 settings.json。

```bash
--save-preferences
```

#### `--list-preferences`（可选）
显示当前配置快照（JSON）。

```bash
--list-preferences
```

#### `--time-range`（可选）
时间范围：`day` / `week` / `month` / `year`。

```bash
--time-range week  # 最近一周
```

#### `--no-images`（可选）
禁用 Markdown 输出中的图片链接。

```bash
--no-images
```

---

## 📖 四、输出格式详解

### 4.1 Markdown 格式（默认）

**结构**：
1. 结果正文（带 `[^n]` 引用）
2. 可选图片行 `![](<image_url>)`
3. 脚注 `[^n]: https://...`
4. 元数据行：`Source | Engine | Published | Score`
5. 统计行：input/blocked/dedup/output/prefer hits

**示例**：
```markdown
## OpenCode 最佳实践

根据官方文档[^1]，建议使用 Plan agent 进行架构设计。Plan agent 负责规划，Build agent 负责实现...

![](https://example.com/image.png)

[^1]: https://docs.example.com/opencode-best-practices

Source: docs.example.com | Engine: Google | Published: 2026-03-01 | Score: 0.95

---
Stats: input=15 blocked=3 dedup=2 output=10 prefer_hits=2
```

**特点**：
- ✅ 类似学术论文的引用格式
- ✅ 清晰的信息来源
- ✅ 可读性强

### 4.2 JSON 格式

**结构**：
```json
{
  "raw": [...],  // 原始 API 响应
  "results": [   // 处理后的结果
    {
      "title": "...",
      "url": "...",
      "snippet": "...",
      "image_url": "...",
      "engine": "Google",
      "published": "2026-03-01",
      "score": 0.95
    }
  ],
  "stats": {
    "input_count": 15,
    "blocked_count": 3,
    "dedup_count": 2,
    "output_count": 10,
    "prefer_hits": 2
  }
}
```

**适用场景**：
- 机器处理
- 与其他工具集成（如 jq）
- 选择 top N URLs

**示例**：
```bash
# 选择前 3 个 URL
bash .../search.sh --format json --query "..." | jq -r '.results[:3] | .[].url'
```

---

## 💡 五、实战示例

### 5.1 快速查询（Markdown 输出）

```bash
# 默认 Markdown 输出，带可验证引用
bash ~/.openclaw/skills/searxng-verifiable-search/scripts/search.sh \
  --query "OpenCode custom service setup best practices"
```

**输出示例**：
```markdown
## OpenCode 最佳实践

根据官方文档[^1]，建议使用 Plan agent 进行架构设计...

[^1]: https://docs.example.com/opencode-best-practices
```

### 5.2 JSON 输出 + jq 处理

```bash
# JSON 输出，选择 top 3 URLs
bash ~/.openclaw/skills/searxng-verifiable-search/scripts/search.sh \
  --format json \
  --query "OpenCode custom service setup best practices" \
  | jq -r '.results[:3] | map(.url) | .[]'
```

### 5.3 域名偏好 + 封锁

```bash
# 优先 docs.example.com，封锁 spam.example.com
bash ~/.openclaw/skills/searxng-verifiable-search/scripts/search.sh \
  --prefer-domain docs.example.com \
  --block-domain spam.example.com \
  --query "Kubernetes admission policy"
```

### 5.4 持久化配置

```bash
# 保存偏好到 settings.json
bash ~/.openclaw/skills/searxng-verifiable-search/scripts/search.sh \
  --prefer-domain xiaohongshu.com \
  --block-domain example.com \
  --save-preferences \
  --query "test query"
```

### 5.5 时间范围搜索

```bash
# 只搜索最近一周的内容
bash .../search.sh \
  --time-range week \
  --query "最新 AI 技术"
```

---

## 🎨 六、域名偏好管理

### 6.1 一句话触发规则

**封锁站点**：
- 用户："下次不要给我 xxx.com 的信息"
- 操作：`--block-domain xxx.com --save-preferences`
- 确认：`--list-preferences` 并告知用户

**偏好站点**：
- 用户："我更喜欢小红书/下次优先小红书"
- 操作：`--prefer-domain xiaohongshu.com --save-preferences`
- 确认：`--list-preferences` 并告知用户

### 6.2 域名匹配规则

- **后缀匹配**：`foo.com` 匹配：
  - `foo.com`
  - `www.foo.com`
  - `sub.foo.com`

### 6.3 优先级规则

- `block_domains` 优先级高于 `prefer_domains`
- 如果一个域名同时在两个列表中，会被**封锁**

### 6.4 最佳实践

```bash
# 偏好官方文档，封锁广告网站
bash .../search.sh \
  --prefer-domain docs.python.org \
  --prefer-domain realpython.com \
  --block-domain ads.example.com \
  --block-domain spam.example.com \
  --save-preferences \
  --query "Python async await"
```

---

## 🚀 七、代理编排模式（高级）

### 7.1 深度读取模式

**流程**：
1. 运行 `search.sh --format json` 获取结构化结果
2. 选择前 N 个 URL（默认推荐 N=3）
3. 对每个 URL 调用 `web_fetch` 获取页面文本
4. 构建深度读取附录：
   - 摘要：200-400 中文字符
   - 发布时间/来源
   - 图片：优先使用 `results[].image_url`

**代码示例**：
```bash
# 1. 获取 top 3 URLs
urls=$(bash .../search.sh --format json --query "..." | jq -r '.results[:3] | .[].url')

# 2. 对每个 URL 调用 web_fetch
for url in $urls; do
  echo "Fetching: $url"
  web_fetch "$url" | summarize
done
```

**边界**：
- ❌ 不下载图片
- ❌ 不使用额外的爬虫/下载器
- ✅ 仅在用户/代理明确选择时运行深度读取

### 7.2 可验证引用格式

**Markdown 引用示例**：
```markdown
结论 A 来自页面一的正文证据[^1]，结论 B 来自页面二的发布时间字段[^2]。

---

[^1]: https://example.com/page-a
[^2]: https://example.com/page-b
```

**优势**：
- 增强可信度
- 方便用户验证
- 防止 AI 编造

---

## 📊 八、与 Tavily 的详细对比

| 维度 | SearXNG | Tavily |
|------|---------|--------|
| **隐私性** | ✅ 高（无追踪） | ⚠️ 依赖第三方 |
| **自托管** | ✅ 支持 | ❌ 不支持 |
| **API Key** | ❌ 不需要 | ✅ 需要 |
| **AI 答案** | ❌ 无 | ✅ 支持 |
| **域名控制** | ✅ 偏好/黑名单 | ❌ 不支持 |
| **输出格式** | 2 种（MD/JSON） | 3 种（raw/brave/md） |
| **可验证性** | ✅ 引用+脚注 | ❌ 无 |
| **搜索源** | 多引擎聚合 | 单一源 |
| **配置复杂度** | ⚠️ 需要自托管 | ✅ 开箱即用 |
| **适用场景** | 隐私优先、可验证搜索 | AI 答案、快速摘要 |

### 8.1 选择建议

**使用 SearXNG 当**：
- ✅ 需要高隐私保护
- ✅ 需要可验证的引用
- ✅ 需要域名控制（偏好/黑名单）
- ✅ 有自托管能力
- ✅ 需要多引擎聚合

**使用 Tavily 当**：
- ✅ 需要 AI 答案摘要
- ✅ 不在意隐私追踪
- ✅ 不想自托管
- ✅ 需要快速集成
- ✅ 需要更简洁的输出

### 8.2 协作模式

**最佳实践**：两者配合使用

- **SearXNG**：隐私敏感查询、可验证引用
- **Tavily**：快速摘要、AI 答案

**示例工作流**：
```bash
# 1. 用 SearXNG 搜索（隐私友好）
searxng_results=$(bash .../search.sh --format json --query "...")

# 2. 如果需要 AI 答案，补充用 Tavily
tavily_answer=$(python3 .../tavily_search.py --query "..." --include-answer)

# 3. 结合两者结果
echo "$searxng_results"
echo "$tavily_answer"
```

---

## 🎓 九、学习总结

### 9.1 核心要点

1. **SearXNG 是隐私友好的元搜索引擎**：无追踪、可自托管
2. **可验证搜索**：使用 `[^n]` 引用 + 脚注，类似学术论文
3. **域名控制**：支持偏好域名和黑名单
4. **配置持久化**：`settings.json` 存储偏好
5. **两种输出格式**：Markdown（人类）+ JSON（机器）
6. **代理编排**：支持深度读取和可验证引用

### 9.2 推荐工作流

**日常搜索（Markdown 输出）**：
```bash
bash .../search.sh --query "..."
```

**机器处理（JSON 输出）**：
```bash
bash .../search.sh --format json --query "..." | jq '.results[:3]'
```

**深度读取模式**：
```bash
# 1. 获取 URLs
urls=$(bash .../search.sh --format json --query "..." | jq -r '.results[:3] | .[].url')

# 2. 对每个 URL 调用 web_fetch
for url in $urls; do
  web_fetch "$url"
done
```

### 9.3 与 Tavily 的协作

- **SearXNG**：隐私优先、可验证搜索
- **Tavily**：AI 答案、快速摘要
- **最佳实践**：根据场景选择，或两者配合使用

---

## 📈 十、常见问题

### 10.1 Q: 如何设置 SearXNG URL？

**A**: 运行以下命令：
```bash
bash .../search.sh --set-searxng "https://s.onemue.cn" --non-interactive --query "health check"
```

### 10.2 Q: 域名匹配规则是什么？

**A**: 后缀匹配。例如 `foo.com` 会匹配 `www.foo.com` 和 `sub.foo.com`。

### 10.3 Q: block_domains 和 prefer_domains 的优先级？

**A**: `block_domains` 优先级更高。如果一个域名同时在两个列表中，会被封锁。

### 10.4 Q: 如何禁用 Markdown 中的图片链接？

**A**: 使用 `--no-images` 参数：
```bash
bash .../search.sh --no-images --query "..."
```

### 10.5 Q: 如何查看当前配置？

**A**: 运行：
```bash
bash .../search.sh --list-preferences
```

### 10.6 Q: SearXNG 需要自托管吗？

**A**: 推荐自托管（隐私最好），但也可以使用公共实例。

---

## 🎯 十一、下一步行动

- [ ] 配置 SearXNG URL
- [ ] 测试基础搜索功能
- [ ] 对比 SearXNG 与 Tavily 的搜索质量
- [ ] 实践域名偏好和黑名单
- [ ] 尝试深度读取模式
- [ ] 集成到日常 AI 助理工作流
- [ ] 考虑自托管 SearXNG 实例

---

## 📝 十二、参考资源

- [SearXNG 官网](https://searxng.org)
- [SearXNG GitHub](https://github.com/searxng/searxng)
- [OpenClaw SearXNG Search 技能](~/.openclaw/skills/searxng-verifiable-search/SKILL.md)
- [Tavily Search 学习笔记](/.learnings/tavily-search-网络搜索-2026-03-05.md)

---

## 🔚 结语

SearXNG 可验证搜索是隐私优先时代的得力工具。通过类似学术论文的引用格式，它让 AI 助理的搜索结果更可信、更可验证。

记住核心原则：**隐私优先、可验证引用、域名控制、灵活配置**。

Happy Searching! 🔍✨

---

**学习日期**: 2026-03-05  
**学习时长**: 15 分钟  
**技能等级**: ⭐⭐⭐⭐⭐ (理论完全掌握，待实践)
