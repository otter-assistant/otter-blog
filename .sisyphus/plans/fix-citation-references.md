# 修复 Citation 引用文献链接缺失

## TL;DR

> **Quick Summary**: 修复 `citationToHast.ts` 中缺少 `dataUrl` 属性映射的 bug，使链接引用 `{cite [text](url)}` 和 WikiLink 引用 `{cite [[文章名]]}` 在参考文献列表中生成可点击的链接。
> 
> **Deliverables**:
> - 修复后的 `citationToHast.ts`：正确提取 URL 并设置 `dataUrl` 属性
> - 导出 `loadAllPosts` 及相关函数从 `remarkWikiLinks.ts`
> - 新增 `citationToHast.test.ts` 单元测试
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — sequential (3 tasks, strict dependencies)
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
用户报告 citation 功能的「参考文献」（引用文献）没有正确生成。具体表现为：
- `{cite [百度](https://baidu.com)}` 在参考文献列表中显示为原始 markdown 文本 `[百度](https://baidu.com)` 而非可点击链接
- `{cite [[文章名]]}` 在参考文献列表中显示为原始文本 `[[文章名]]` 而非指向内部文章的链接
- 纯文字引用 `{cite 文字}` 正常工作

### Interview Summary
**Key Discussions**:
- 用户选择「快速修复」方案：仅修改 `citationToHast.ts`，不重构整个 remarkCitation 管道
- 用户确认 WikiLink 引用需要在参考文献中生成可点击的内部链接

**Research Findings**:
- Bug 根因：`citationToHast.ts` 仅设置 `dataId`、`dataContent`、`dataType`，未设置 `rehypeCitation.ts` 期望的 `dataUrl`
- WikiLink 解析模式已存在于 `remarkWikiLinks.ts`（`loadAllPosts` + `generateSlug`），可复用
- `rehypeCitation.ts` 已正确实现 `dataUrl` 消费逻辑（生成 `<a>` 标签 + `processLink` 处理外链）
- 当前无内容文件使用 `{cite}` 语法，无回归风险

### Metis Review
**Identified Gaps** (addressed):
- Slug 生成不一致：`remarkWikiLinks.generateSlug()` 与 `generatePostSlug()` 行为不同 → 决定：使用 `remarkWikiLinks` 的版本保持一致，slug 统一问题作为后续 issue
- `loadAllPosts()` 未导出 → 需要从 `remarkWikiLinks.ts` 导出
- 未匹配 WikiLink 的降级行为 → 与 `remarkWikiLinks` 保持一致：渲染为纯文本
- `citationToHast.ts` 无单元测试 → 新增测试文件
- 畸形链接内容的边界处理 → 需要 fallback 逻辑

---

## Work Objectives

### Core Objective
修复 `citationToHast.ts`，使其在 mdast → hast 转换时正确提取链接 URL 和 WikiLink 内部路径，设置 `dataUrl` 属性，让 `rehypeCitation.ts` 能生成可点击的参考文献链接。

### Concrete Deliverables
- `src/plugins/citationToHast.ts` — 增加 URL 提取逻辑（~30 行新代码）
- `src/plugins/remarkWikiLinks.ts` — 导出 `loadAllPosts`、`generateSlug` 及 `PostData` 类型
- `src/plugins/__tests__/citationToHast.test.ts` — 新增 5+ 个测试用例

### Definition of Done
- [ ] `npx vitest run` 所有测试通过（原有 14 + 新增 5+ = 19+ 测试）
- [ ] `npm run build` 构建成功
- [ ] 链接引用在 hast 输出中包含 `dataUrl` 属性
- [ ] WikiLink 引用解析为 `/post/{slug}.html` 格式的内部 URL
- [ ] 未匹配 WikiLink 降级为纯文本（无 `dataUrl`）
- [ ] 纯文字引用行为不变

### Must Have
- `contentType === 'link'`：从 `[text](url)` 提取 URL → `dataUrl`，文本 → `dataContent`
- `contentType === 'wikilink'`：从 `[[title]]` 提取标题，查找文章 → `dataUrl = /post/{slug}.html`
- `contentType === 'text'`：行为不变
- 同步执行（handler 必须同步）
- 所有现有测试继续通过

### Must NOT Have (Guardrails)
- ❌ 不修改 `remarkCitation.ts` — 它正确生成 citation 节点
- ❌ 不修改 `rehypeCitation.ts` — 它正确消费 `dataUrl`/`dataContent`
- ❌ 不修改 `astro.config.mjs`
- ❌ 不修复 slug 生成不一致问题（`remarkWikiLinks.generateSlug` vs `generatePostSlug`）— 后续 issue
- ❌ 不重构 `loadAllPosts()` 到共享模块 — 后续 issue
- ❌ 不添加 fuzzy matching / alias 匹配
- ❌ 不添加新 npm 依赖
- ❌ 不添加 console.log / 日志 / 遥测
- ❌ 不给其他文件的已有函数加 JSDoc
- ❌ 不添加异步操作

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest 3.2.4)
- **Automated tests**: YES (Tests-after — 因为是 bug 修复，先修复再验证)
- **Framework**: vitest
- **Test command**: `npx vitest run`

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Plugin 逻辑**: Use Bash (node/vitest) — 运行测试，断言结果
- **构建验证**: Use Bash — 执行 `npm run build`，检查无错误

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — export 准备):
└── Task 1: 从 remarkWikiLinks.ts 导出 loadAllPosts 相关函数 [quick]

Wave 2 (After Wave 1 — core fix):
└── Task 2: 修复 citationToHast.ts 并新增测试 [quick]

Wave 3 (After Wave 2 — verification):
└── Task 3: 全量验证（测试 + 构建） [quick]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
└── Task F3: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2 → Task 3 → F1-F3
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1    | —         | 2      | 1    |
| 2    | 1         | 3      | 2    |
| 3    | 2         | F1-F3  | 3    |
| F1   | 3         | —      | FINAL|
| F2   | 3         | —      | FINAL|
| F3   | 3         | —      | FINAL|

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick`
- **Wave 2**: 1 task — T2 → `quick`
- **Wave 3**: 1 task — T3 → `quick`
- **FINAL**: 3 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `deep`

---

## TODOs

- [x] 1. 从 remarkWikiLinks.ts 导出 loadAllPosts 相关函数和类型

  **What to do**:
  - 在 `src/plugins/remarkWikiLinks.ts` 中导出以下内容：
    - `PostData` 接口（当前在第 7-12 行定义）
    - `loadAllPosts()` 函数（当前在第 36-80 行定义）
    - `generateSlug()` 函数（当前在第 26-34 行定义）
  - 仅添加 `export` 关键字，不修改任何函数逻辑
  - 确保 `remarkWikiLinks` 默认导出不受影响

  **Must NOT do**:
  - 不修改任何函数的实现逻辑
  - 不重构文件结构
  - 不移动函数到其他文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 仅添加 export 关键字，3 处极小改动
  - **Skills**: []
    - 无需额外技能，纯文件编辑

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (alone)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/plugins/remarkWikiLinks.ts:7-12` — `PostData` 接口定义，需要加 `export`
  - `src/plugins/remarkWikiLinks.ts:26-34` — `generateSlug` 函数定义，需要加 `export`
  - `src/plugins/remarkWikiLinks.ts:36-80` — `loadAllPosts` 函数定义，需要加 `export`

  **WHY Each Reference Matters**:
  - 这三个导出是 Task 2 中 `citationToHast.ts` 需要导入的依赖
  - `PostData` 提供类型定义
  - `loadAllPosts()` 提供文章列表加载
  - `generateSlug()` 虽然 `loadAllPosts` 内部已使用，但类型安全需要导出

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 验证导出不破坏现有功能
    Tool: Bash (npx vitest)
    Preconditions: 修改完成后
    Steps:
      1. 运行 `npx vitest run src/plugins/__tests__/remarkCitation.test.ts --reporter=verbose`
      2. 检查输出包含 "7 passed"
      3. 运行 `npx vitest run src/plugins/__tests__/rehypeCitation.test.ts --reporter=verbose`
      4. 检查输出包含 "7 passed"
    Expected Result: 所有 14 个现有测试通过，0 失败
    Failure Indicators: 任何测试失败或 import 错误
    Evidence: .sisyphus/evidence/task-1-existing-tests-pass.txt

  Scenario: 验证导出可被正确导入
    Tool: Bash (node -e)
    Preconditions: 修改完成后
    Steps:
      1. 运行 TypeScript 编译检查：`npx tsc --noEmit src/plugins/citationToHast.ts 2>&1` （在 Task 2 完成导入后才能完全验证，此处仅确认导出语法正确）
      2. 检查 `src/plugins/remarkWikiLinks.ts` 文件中 `PostData`、`loadAllPosts`、`generateSlug` 均有 `export` 关键字
    Expected Result: 无语法错误，三个标识符均已导出
    Failure Indicators: TypeScript 编译错误
    Evidence: .sisyphus/evidence/task-1-export-syntax.txt
  ```

  **Commit**: YES
  - Message: `fix(citation): 导出 remarkWikiLinks 的 loadAllPosts 相关函数供 citationToHast 使用`
  - Files: `src/plugins/remarkWikiLinks.ts`
  - Pre-commit: `npx vitest run src/plugins/__tests__/ --reporter=verbose`

- [ ] 2. 修复 citationToHast.ts 并新增测试

  **What to do**:
  - 修改 `src/plugins/citationToHast.ts`：
    - 导入 `loadAllPosts` 从 `./remarkWikiLinks`
    - 在构建 HAST element 之前，根据 `contentType` 提取 URL：
      - `contentType === 'link'`：用正则 `/^\[([^\]]*)\]\(([^)]+)\)$/` 解析 `content`，提取 `text` 和 `url`，设置 `dataUrl = url`，`dataContent = text`
      - `contentType === 'wikilink'`：用正则 `/^\[\[([^\]]+)\]\]$/` 解析 `content`，提取 `title`，调用 `loadAllPosts()` 查找匹配文章（case-insensitive），匹配成功则设置 `dataUrl = /post/${slug}.html`，`dataContent = title`；未匹配则仅设置 `dataContent = title`，不设置 `dataUrl`
      - `contentType === 'text'`：保持原有行为，`dataContent = content`，不设置 `dataUrl`
    - 对于畸形链接内容（正则不匹配），fallback 为原始 content 作为 `dataContent`，不设置 `dataUrl`
  - 新建 `src/plugins/__tests__/citationToHast.test.ts`：
    - Test 1: 纯文字引用 → `dataContent` 设置，无 `dataUrl`，`dataType = 'text'`
    - Test 2: 链接引用 `[百度](https://baidu.com)` → `dataContent = '百度'`，`dataUrl = 'https://baidu.com'`，`dataType = 'link'`
    - Test 3: WikiLink 引用 `[[已存在文章]]` → `dataContent = '已存在文章'`，`dataUrl = '/post/{slug}.html'`，`dataType = 'wikilink'`（需要 mock `loadAllPosts`）
    - Test 4: WikiLink 引用 `[[不存在文章]]` → `dataContent = '不存在文章'`，无 `dataUrl`
    - Test 5: 畸形链接 `[no closing paren](` → `dataContent` = 原始内容，无 `dataUrl`
    - Test 6: 空链接文本 `[](https://example.com)` → `dataContent = ''`，`dataUrl = 'https://example.com'`

  **Must NOT do**:
  - 不修改 `remarkCitation.ts`
  - 不修改 `rehypeCitation.ts`
  - 不修改 `astro.config.mjs`
  - 不添加异步操作
  - 不添加新依赖
  - 不修改现有测试文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 核心修改约 30 行新代码 + 1 个新测试文件，逻辑清晰
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (alone)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/plugins/citationToHast.ts:1-25` — 当前完整实现，需要在此基础上添加 URL 提取逻辑
  - `src/plugins/remarkWikiLinks.ts:115-128` — WikiLink 解析模式：`posts.find(p => p.title.toLowerCase() === linkText.toLowerCase())`，匹配后 `const slug = post.uri || post.slug` 然后 `/post/${slug}.html`
  - `src/plugins/remarkCitation.ts:27-28` — 链接检测正则 `/^\[[^\]]+\]\([^)]+\)$/`，可参考但需要用捕获组版本提取 text 和 url

  **API/Type References**:
  - `src/plugins/remarkCitation.ts:5-10` — `CitationNode` 接口定义：`{ type, content, index, contentType }`
  - `src/plugins/remarkWikiLinks.ts:7-12` — `PostData` 接口：`{ title, slug, uri?, id }`

  **Test References**:
  - `src/plugins/__tests__/remarkCitation.test.ts` — 测试结构模式：使用 `describe/it`，`unified().use()`，`visit()` 遍历树
  - `src/plugins/__tests__/rehypeCitation.test.ts` — rehype 测试模式：`rehypeParse` + `runSync`

  **External References**:
  - `vitest` mock 文档：使用 `vi.mock('./remarkWikiLinks', ...)` mock `loadAllPosts` 返回测试数据

  **WHY Each Reference Matters**:
  - `citationToHast.ts` 是要修改的文件，需要完整理解当前实现
  - `remarkWikiLinks.ts:115-128` 提供了 WikiLink 解析的确切模式，必须复用相同的匹配逻辑（case-insensitive title match + `post.uri || post.slug`）
  - `remarkCitation.ts:27-28` 的正则可参考但需要改为捕获组版本
  - `CitationNode` 接口定义了输入数据结构
  - 测试文件提供了项目的测试风格模式

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 链接引用正确提取 URL
    Tool: Bash (npx vitest)
    Preconditions: citationToHast.ts 和 citationToHast.test.ts 已修改/创建
    Steps:
      1. 运行 `npx vitest run src/plugins/__tests__/citationToHast.test.ts --reporter=verbose`
      2. 检查 "链接引用" 相关测试用例通过
      3. 验证输出包含 "dataUrl" 和 "dataContent" 断言通过
    Expected Result: 所有 citationToHast 测试通过
    Failure Indicators: 测试失败，dataUrl 为 undefined
    Evidence: .sisyphus/evidence/task-2-citation-link-test.txt

  Scenario: WikiLink 引用解析为内部链接
    Tool: Bash (npx vitest)
    Preconditions: loadAllPosts 已 mock 返回测试数据
    Steps:
      1. 运行 `npx vitest run src/plugins/__tests__/citationToHast.test.ts --reporter=verbose`
      2. 检查 "WikiLink 引用" 相关测试用例通过
      3. 验证 dataUrl 格式为 `/post/{slug}.html`
    Expected Result: 匹配的 WikiLink 生成正确 URL，未匹配的无 dataUrl
    Failure Indicators: dataUrl 格式错误或 mock 失败
    Evidence: .sisyphus/evidence/task-2-citation-wikilink-test.txt

  Scenario: 纯文字引用行为不变
    Tool: Bash (npx vitest)
    Preconditions: citationToHast.ts 已修改
    Steps:
      1. 运行 `npx vitest run src/plugins/__tests__/citationToHast.test.ts --reporter=verbose`
      2. 检查 "纯文字引用" 测试用例通过
      3. 确认 dataUrl 未设置
    Expected Result: 纯文字引用仅设置 dataContent，无 dataUrl
    Failure Indicators: dataUrl 被意外设置
    Evidence: .sisyphus/evidence/task-2-citation-text-test.txt

  Scenario: 畸形链接内容 fallback
    Tool: Bash (npx vitest)
    Preconditions: citationToHast.ts 已修改
    Steps:
      1. 运行 `npx vitest run src/plugins/__tests__/citationToHast.test.ts --reporter=verbose`
      2. 检查 "畸形链接" 测试用例通过
      3. 确认 dataContent 为原始内容，dataUrl 未设置
    Expected Result: 不崩溃，fallback 为纯文本
    Failure Indicators: 正则匹配错误导致异常
    Evidence: .sisyphus/evidence/task-2-citation-malformed-test.txt

  Scenario: 所有现有测试仍然通过
    Tool: Bash (npx vitest)
    Preconditions: 所有修改完成
    Steps:
      1. 运行 `npx vitest run --reporter=verbose`
      2. 检查输出中所有测试文件均为 ✓
      3. 确认 0 failures
    Expected Result: 所有测试通过（原有 14 + 新增 5-6 = 19-20 测试）
    Failure Indicators: 任何现有测试失败
    Evidence: .sisyphus/evidence/task-2-all-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `fix(citation): 修复 citationToHast 缺少 dataUrl 属性导致参考文献无链接的 bug`
  - Files: `src/plugins/citationToHast.ts`, `src/plugins/__tests__/citationToHast.test.ts`
  - Pre-commit: `npx vitest run --reporter=verbose`

- [ ] 3. 全量验证：测试 + 构建

  **What to do**:
  - 运行完整测试套件确认无回归
  - 运行生产构建确认无编译错误
  - 验证 TypeScript 类型检查通过

  **Must NOT do**:
  - 不修改任何文件
  - 纯验证任务

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯命令执行和输出验证
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (alone)
  - **Blocks**: F1, F2, F3
  - **Blocked By**: Task 2

  **References**:
  - `package.json` — `"test": "vitest run"`, `"build": "VITE_GIT_HASH=... astro build"`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 完整测试套件通过
    Tool: Bash
    Preconditions: Task 1 和 Task 2 已完成
    Steps:
      1. 运行 `npx vitest run --reporter=verbose 2>&1`
      2. 检查输出中 "Tests" 行显示 0 failures
      3. 记录通过的测试总数
    Expected Result: 所有测试通过，0 失败，包含新增的 citationToHast 测试
    Failure Indicators: 任何测试失败
    Evidence: .sisyphus/evidence/task-3-full-test-suite.txt

  Scenario: 生产构建成功
    Tool: Bash
    Preconditions: 所有代码修改已完成
    Steps:
      1. 运行 `npm run build 2>&1`
      2. 检查输出中无 "error" 或 "Error"
      3. 检查输出中包含 "build" 完成信息
    Expected Result: 构建成功完成，无错误
    Failure Indicators: 构建失败、TypeScript 错误、import 错误
    Evidence: .sisyphus/evidence/task-3-build-success.txt
  ```

  **Commit**: NO (纯验证任务)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 3 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run linter check + `npx vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Order | Message | Files | Pre-commit |
|-------|---------|-------|------------|
| 1 | `fix(citation): 导出 remarkWikiLinks 的 loadAllPosts 相关函数供 citationToHast 使用` | `src/plugins/remarkWikiLinks.ts` | `npx vitest run src/plugins/__tests__/ --reporter=verbose` |
| 2 | `fix(citation): 修复 citationToHast 缺少 dataUrl 属性导致参考文献无链接的 bug` | `src/plugins/citationToHast.ts`, `src/plugins/__tests__/citationToHast.test.ts` | `npx vitest run --reporter=verbose` |

---

## Success Criteria

### Verification Commands
```bash
# 所有测试通过
npx vitest run --reporter=verbose
# Expected: Tests 19+ passed, 0 failed

# 构建成功
npm run build
# Expected: 无错误完成
```

### Final Checklist
- [ ] All "Must Have" present — 三种 contentType 的 URL 提取逻辑均实现
- [ ] All "Must NOT Have" absent — 未修改 remarkCitation / rehypeCitation / astro.config
- [ ] All tests pass — 原有 14 + 新增 5-6 测试全部通过
- [ ] Build succeeds — `npm run build` 无错误
