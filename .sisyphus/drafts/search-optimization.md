# Draft: 搜索优化（分层索引 + 按需加载 + 快捷键）

## Requirements (confirmed from user)
- 搜索支持两种搜索项：**标题** 与 **文章详情**。
- 支持 **正则** 搜索。
- 分层/逐层增加加载范围：最近 **3个月 / 6个月 / 1年 / 2年 / 全部**。
- **首次加载**：加载“全部标题 + 最近3个月文章详情”。
- 结果展示：显示标题与文章详情；匹配关键词高亮为主题色；详情最多3行，超出以省略样式处理（用户示例：`...xxx...`）。
- 按需加载 JS：
  - 首个 JS：仅用于快捷键监听，默认加载。
  - 其他 JS：按下快捷键后再加载，并加载特定的 HTML。
  - 加载“所有标题”的 JSON 信息；搜索后再逐层加载包含详情/标题/URI 的特定 JSON。
- 默认仅加载 3 个月；通过“搜索更多”逐层加载到 6 个月、1年、2年、全部。
- 全部加载仍无结果：提示跳转 Google 搜索（沿用当前搜索方式/关键词）。
- 快捷键平台差异：Windows 使用 **Ctrl+K**；macOS 使用 **Command+K**。

## Requirements (newly confirmed by Q&A)
- “文章详情”用于搜索与展示：取 **文章全文提取的纯文本**。
- 正则交互：提供一个 **“.*”按钮/开关**，开启后按正则解释查询。
- Google fallback：**新标签页打开**。
- Google 查询：使用 `site:本站域名` 限定。
- 时间分桶依据：按 **publishDate（date）**。

## Requirements (newly confirmed by user follow-up)
- 搜索覆盖范围：用户期望覆盖 `blog / microblog / tools / friends`。
  - 备注：代码库当前仅有 `blog` collection（microblog 似乎作为 blog 的一种分类在用），`tools` 与 `friends` 目前更像是页面（`src/pages/tool/*`、`src/pages/friends.astro`）。
- Ctrl/Cmd+K 行为：**两者结合**（既保留 Header 搜索入口，也要支持快捷键触发的按需加载能力）。
- 性能偏好：站点规模目前较小，但仍希望使用轻量索引库，并尽量减少首次加载（GitHub Pages 大陆访问慢）。

## Requirements (newly confirmed by follow-up Q&A)
- tools/friends 索引深度：仅做 **标题 + 描述**（不抓取整页全文）。
- 快捷键触发 HTML：**预渲染隐藏弹窗/面板**（首屏带 DOM 但 hidden），快捷键后再懒加载“重 JS + 索引 JSON”。
- 详情摘要截断：优先做 **命中上下文摘要**（...前文 命中词 后文...）并配合 `line-clamp-3`。
- placeholder 快捷键提示：**自动区分 Ctrl / ⌘**。
- 正则安全策略：regex 模式使用 **RE2**（线性时间），并与普通索引搜索分离（可懒加载 RE2）。

## Requirements (more confirmed)
- 非正则模式匹配规则：偏向 **包含匹配**（中文直觉）。
- RE2 正则模式作用范围：**标题 + 详情全文**。
- microblog 详情：索引 **全文纯文本**。
- 结果展示：除标题+3行详情外，额外显示 **publishDate**。

## Requirements (latest confirmations)
- 结果组织：**统一列表 + 标签**（类型标签：Blog/Microblog/Tool/Friend；命中来源标签：Title/Detail；日期若有则展示）。
- 排序：默认 **相关度优先**（同相关度再按日期新→旧）。
- 普通搜索实现：详情全文优先走 **includes 扫描**（针对“已加载分桶”逐层扫描）；标题可用轻量索引库加速。
- 轻量索引库偏好：**MiniSearch**。
- Friends：`config.friendlyLink[]` 每个条目作为 **独立可搜索结果**（name/desc/link）。

## Research Findings (additional)
- `src/content.config.ts` 当前只定义了 `blog` collection；microblog 通过 `post.data.categories === 'microblog'` + `filterContent(..., 'microblog')` 进行筛选（即 microblog 与 blog 同集合）。
- `src/config/index.ts` 里有 `friendlyLink[]`（name/link/desc/img），可用于 friends 的“标题+描述”索引来源。
- 现有 StructuredData 在首页把 SearchAction 指向 `/search/?q=...`，但代码库未发现 `/src/pages/search*.astro`（可能需要补一个 search 页面或调整）。

## Scope Boundaries
- INCLUDE: 前端搜索体验、索引 JSON 生成/拆分、懒加载脚本与 UI、结果高亮与摘要截断、快捷键行为、"搜索更多"交互与 Google fallback。
- EXCLUDE: 站内内容本身、文章渲染样式整体重构（除必要 UI 组件/样式类）。

## Technical Decisions (pending)
- 搜索引擎选择：Pagefind / Lunr / Fuse.js / MiniSearch / 自研正则扫描 JSON（性能权衡待定）。
- 索引数据结构：按时间分片 JSON 的字段定义（title/uri/content/excerpt/timestamp 等）。
- 正则语法与安全：是否限制为 JS RegExp（含 flags）？是否需要对 ReDoS 做限制（最大长度/超时/禁用回溯特性）？

## Research Findings
- 现有站点已存在 SearchBox（但目前行为是跳转 Google site-search，而非站内索引搜索）。
  - `src/components/SearchBox.astro`：渲染 input（id="search-input"），并加载 `src/scripts/search-box.ts`。
  - `src/scripts/search-box.ts`：监听 Ctrl/Cmd+K 聚焦；Enter 触发 Google `site:` 搜索；Esc 清空。
  - `src/components/SearchBox/index.ts` 里也有一份 `initSearchBox`（且 hardcode 域名），疑似历史遗留/重复实现，需要在计划里明确“以哪个为准”。
- 当前项目没有现成的本地搜索索引（未发现 pagefind/lunr/fuse/minisearch 集成，也未发现生成 search.json 的 build 步骤）。
- 内容与日期/路由（用于时间分桶与 URI）：
  - `src/content.config.ts`：blog schema 有 `date: z.coerce.date()`（= publishDate），`updated?: date`，`hidden?: boolean`，`uri?: string`。
  - `src/utils/index.ts`：`generatePostSlug()`（优先 data.uri，否则从 id 生成，兜底 hash）。
  - `src/utils/urls.ts`：`getPostUrl()` / `getMicroblogUrl()`。
  - `src/pages/post/index.astro`、`src/pages/blog/index.astro`：列表页按 date 排序。
  - microblog：页面通过 `filterContent(await getCollection("blog"), 'microblog')` 来筛选（说明 microblog 不是独立 collection）。
  - tools/friends：已发现 `src/pages/tool/index.astro`、`src/pages/tool/goto/index.astro`、`src/pages/friends.astro`。

## Open Questions
- （已确认）文章详情：正文全文提取纯文本。
- “全部标题 JSON”需要包含哪些字段：仅 title+uri+date？还是也要 category/tags？
- （已确认）正则 UI：存在 “.*” 按钮开关。
- 高亮主题色：当前项目的主题色 class/token 是什么（如 `text-primary`/`bg-primary`）？
- 结果页/弹窗位置：现有是否已有搜索弹层/组件？还是要新增？
- （已确认）Google fallback：新标签页打开，且使用 `site:本站域名`。

- 搜索范围：仅 `blog` 文章？是否包含 `microblog`？（两者当前都存在内容集合与路由）
- Ctrl/Cmd+K 行为：继续“聚焦 Header 输入框”，还是改为“打开搜索弹窗/面板（你提到会加载特定 HTML）”？
- 大概文章数量/正文体量：用于确定 JSON 分片粒度、是否需要 Web Worker，以及高亮/截断性能策略。

### Open Questions (updated)
- tools/friends 如何纳入索引：
  - 仅索引页面标题 + 简短描述？
  - 还是把页面正文也提取为“详情”（全文纯文本）？
- 时间分桶对 tools/friends 是否适用？还是它们永远归入“全部/固定桶”（因为可能没有 date）？
- 快捷键触发的“加载特定 HTML”：
  - 允许把搜索弹窗 HTML 预渲染在页面里（hidden），仅懒加载 JS + JSON？
  - 还是必须在按下快捷键后才 fetch 一段 HTML fragment（更省首屏 DOM，但实现复杂度更高）？

- friends：要不要把 `config.friendlyLink` 里的每个友链条目作为可搜索结果（name/url/desc），还是只索引“友情链接”页面本身？
- 搜索引擎/索引库最终选型：MiniSearch vs FlexSearch（或其他轻量库）。需要确定以便计划落地。

## Test Strategy Decision (pending)
- 需要探测项目是否已有测试基础设施；若无，默认以 Playwright/agent QA 场景验证为主。
