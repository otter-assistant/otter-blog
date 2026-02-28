# 动态背景配置化与优化

## TL;DR

> **Quick Summary**: 为 DotBackground 组件添加配置化支持，修改伪随机逻辑从配置数组中选取多边形边数，添加 Header 裁剪和 dev 调试面板。
> 
> **Deliverables**:
> - `config.bg` 配置类型和默认值
> - 修改后的 `dot-background.ts` 核心逻辑
> - Header 裁剪逻辑
> - Dev 调试面板组件
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - 有依赖关系
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request

基于已完成的 DotBackground 功能，继续完成剩余任务：
1. **修改伪随机逻辑**：从配置的 `polygonSides` 数组中随机选取，而非固定的 33%/33%/34% 概率
2. **配置化**：在 `config.bg` 中设置点大小、放大大小、点间距、polygonSides 数组
3. **Header 裁剪**：与 Footer 相同，顶部背景移除
4. **Dev 调试面板**：开发环境下可手动调试参数

### Current State

**已完成**:
- Canvas 背景渲染核心逻辑 (`src/scripts/dot-background.ts`)
- DotBackground 组件 (`src/components/DotBackground.astro`)
- Footer 裁剪逻辑
- 布局集成（BlogPost, MicroblogLayout, MicroblogPost, index）
- 亮色/暗色模式适配
- 移动端禁用

**当前硬编码值** (需要配置化):
```typescript
const GAP = 50;
const COLORS = { light: '#cbd5e1', dark: '#475569' };
// 点半径: 2px, 高亮: 4px
// 多边形: 33% 三角形, 33% 正方形, 34% 六边形
```

### Key Decisions

1. **配置结构**:
   ```typescript
   type BgConfig = {
     dotSize: number;          // 默认 1
     dotSizeHighlight: number; // 默认 2
     dotGap: number;           // 默认 33
     polygonSides: number[];   // 默认 [3, 4, 6]
   };
   ```

2. **伪随机逻辑**: 使用 `Math.floor(random() * polygonSides.length)` 从数组中选取索引

3. **配置传递**: 通过 `window.__BG_CONFIG__` 全局变量传递配置

---

## Work Objectives

### Core Objective

完成 DotBackground 组件的配置化支持，使所有视觉参数可通过配置控制，并添加开发调试功能。

### Concrete Deliverables

- `src/config/types.ts` - 添加 `BgConfig` 类型
- `src/config/index.ts` - 添加 `bg` 默认配置
- `src/scripts/dot-background.ts` - 使用配置、修改伪随机逻辑、添加 Header 裁剪
- `src/components/DotBackground.astro` - 传递配置
- `src/components/BgDebugPanel.astro` - 调试面板（仅 dev 环境）

### Definition of Done

- [ ] 配置类型定义完成
- [ ] 配置默认值设置
- [ ] 核心逻辑使用配置参数
- [ ] 伪随机从数组中选取
- [ ] Header 区域背景裁剪
- [ ] Dev 调试面板可用
- [ ] `npm run build` 成功

### Must Have

- 配置必须支持：`dotSize`, `dotSizeHighlight`, `dotGap`, `polygonSides`
- 伪随机必须从 `polygonSides` 数组中选取
- Header 和 Footer 区域不显示背景

### Must NOT Have (Guardrails)

- 不要修改 Footer 裁剪逻辑（已正确实现）
- 不要添加外部依赖
- 调试面板仅在开发环境显示

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: NO
- **Automated tests**: NO
- **Agent-Executed QA**: YES

### QA Policy

每个任务完成后由执行 agent 验证：
- **Frontend/UI**: Playwright 截图验证
- **Config**: 读取文件验证类型和值
- **Dev Panel**: 启动 dev 服务器验证面板

---

## Execution Strategy

### Sequential Execution (有依赖关系)

```
Task 1: 添加配置类型和默认值
    ↓
Task 2: 修改 dot-background.ts 使用配置
    ↓
Task 3: 修改 DotBackground.astro 传递配置
    ↓
Task 4: 添加 Header 裁剪逻辑
    ↓
Task 5: 添加 dev 调试面板
    ↓
Task 6: 构建验证
```

---

## TODOs

- [ ] 1. 添加 BgConfig 配置类型和默认值

  **What to do**:
  - 在 `src/config/types.ts` 中添加 `BgConfig` 类型定义
  - 在 `src/config/index.ts` 中添加 `bg` 默认配置

  **Must NOT do**:
  - 不要修改其他配置项
  - 不要改变现有配置结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 简单的类型和配置添加

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src/config/types.ts:1-83` - 现有类型定义结构
  - `src/config/index.ts:1-113` - 现有配置结构

  **Acceptance Criteria**:
  - [ ] `BgConfig` 类型包含 `dotSize`, `dotSizeHighlight`, `dotGap`, `polygonSides`
  - [ ] `Config` 类型包含 `bg?: BgConfig`
  - [ ] `config/index.ts` 导出包含 `bg` 配置

  **QA Scenarios**:
  ```
  Scenario: 验证配置类型正确
    Tool: Bash (grep)
    Steps:
      1. grep "BgConfig" src/config/types.ts
      2. grep "polygonSides" src/config/types.ts
    Expected Result: 找到类型定义
    Evidence: .sisyphus/evidence/task-1-config-types.txt
  ```

  **Commit**: YES
  - Message: `feat(config): 添加 BgConfig 背景配置类型`
  - Files: `src/config/types.ts, src/config/index.ts`

---

- [ ] 2. 修改 dot-background.ts 使用配置并修改伪随机逻辑

  **What to do**:
  - 添加 `Config` 接口定义（或从全局 `__BG_CONFIG__` 读取）
  - 修改 `choosePolygonSides` 函数，从 `polygonSides` 数组中随机选取
  - 使用配置的 `dotSize`, `dotSizeHighlight`, `dotGap` 替代硬编码
  - 保留默认值作为 fallback

  **Must NOT do**:
  - 不要移除现有的确定性随机种子逻辑
  - 不要破坏现有的视差效果

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 核心逻辑修改，但范围明确

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `src/scripts/dot-background.ts:33-45` - 当前硬编码常量
  - `src/scripts/dot-background.ts:348-354` - choosePolygonSides 函数

  **代码修改要点**:

  1. 添加配置接口和默认值：
  ```typescript
  interface Config {
    dotSize: number;
    dotSizeHighlight: number;
    dotGap: number;
    polygonSides: number[];
  }

  const DEFAULT_CONFIG: Config = {
    dotSize: 1,
    dotSizeHighlight: 2,
    dotGap: 33,
    polygonSides: [3, 4, 6],
  };
  ```

  2. 修改伪随机逻辑：
  ```typescript
  function choosePolygonSides(random: () => number, sides: number[]): number {
    const index = Math.floor(random() * sides.length);
    return sides[index];
  }
  ```

  3. 从全局变量读取配置：
  ```typescript
  let config = DEFAULT_CONFIG;
  
  export function initBackground(canvasElement: HTMLCanvasElement): () => void {
    // 从全局变量读取配置
    if ((window as any).__BG_CONFIG__) {
      config = { ...DEFAULT_CONFIG, ...(window as any).__BG_CONFIG__ };
    }
    // ...
  }
  ```

  **Acceptance Criteria**:
  - [ ] `choosePolygonSides` 函数接收 `sides` 数组参数
  - [ ] 从数组中均匀随机选取
  - [ ] 所有硬编码值被配置替代

  **QA Scenarios**:
  ```
  Scenario: 验证伪随机逻辑正确
    Tool: Bash (grep)
    Steps:
      1. grep "choosePolygonSides" src/scripts/dot-background.ts
      2. grep "polygonSides\[" src/scripts/dot-background.ts
    Expected Result: 找到从数组选取的代码
    Evidence: .sisyphus/evidence/task-2-random-logic.txt

  Scenario: 验证配置使用
    Tool: Bash (grep)
    Steps:
      1. grep "config.dotGap" src/scripts/dot-background.ts
      2. grep "config.dotSize" src/scripts/dot-background.ts
    Expected Result: 找到配置使用
    Evidence: .sisyphus/evidence/task-2-config-usage.txt
  ```

  **Commit**: YES
  - Message: `refactor(dot-background): 配置化参数并修改伪随机逻辑`
  - Files: `src/scripts/dot-background.ts`

---

- [ ] 3. 修改 DotBackground.astro 传递配置

  **What to do**:
  - 导入 config
  - 通过 `window.__BG_CONFIG__` 传递 `config.bg`
  - 确保 initBackground 调用前配置已设置

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 简单的配置传递

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `src/components/DotBackground.astro:1-38` - 当前组件

  **代码修改要点**:
  ```astro
  ---
  import config from '../config/index';
  ---

  <script>
    import { initBackground, destroyBackground } from '../scripts/dot-background';

    // 传递配置
    if (config.bg) {
      (window as any).__BG_CONFIG__ = config.bg;
    }

    // ... 其余代码
  </script>
  ```

  **Acceptance Criteria**:
  - [ ] 配置通过 `window.__BG_CONFIG__` 传递
  - [ ] 配置在 initBackground 调用前设置

  **Commit**: YES
  - Message: `feat(DotBackground): 传递配置到背景组件`
  - Files: `src/components/DotBackground.astro`

---

- [ ] 4. 添加 Header 区域裁剪逻辑

  **What to do**:
  - 在绘制循环中检测 Header 区域
  - Header 区域内的点不绘制
  - 参考 Footer 裁剪逻辑实现

  **Must NOT do**:
  - 不要修改 Footer 裁剪逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 复用现有模式

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:
  - `src/scripts/dot-background.ts` - 查找 Footer 裁剪逻辑
  - `src/components/Header.astro:20-22` - Header 元素选择器

  **代码修改要点**:
  ```typescript
  // 在 animate() 函数中添加 Header 检测
  const header = document.querySelector('header');
  let headerRect: DOMRect | null = null;
  if (header) {
    headerRect = header.getBoundingClientRect();
  }

  // 绘制时检查是否在 Header 区域内
  for (const pt of points) {
    const x = pt.baseX + PADDING + clampedX;
    const y = pt.baseY + PADDING + clampedY;

    // 检查是否在 Header 区域
    if (headerRect && 
        y >= headerRect.top && 
        y <= headerRect.bottom) {
      continue; // 跳过
    }

    // 绘制...
  }
  ```

  **Acceptance Criteria**:
  - [ ] Header 区域内的点不绘制
  - [ ] 滚动时裁剪正确

  **QA Scenarios**:
  ```
  Scenario: 验证 Header 裁剪
    Tool: Playwright
    Steps:
      1. 访问首页
      2. 截图
      3. 检查 Header 区域无圆点
    Expected Result: Header 区域背景透明
    Evidence: .sisyphus/evidence/task-4-header-clip.png
  ```

  **Commit**: YES
  - Message: `feat(dot-background): 添加 Header 区域裁剪`
  - Files: `src/scripts/dot-background.ts`

---

- [ ] 5. 添加 dev 环境调试面板

  **What to do**:
  - 创建 `src/components/BgDebugPanel.astro`
  - 仅在开发环境显示 (`import.meta.env.DEV`)
  - 提供滑块调整：dotSize, dotSizeHighlight, dotGap
  - 提供复选框选择 polygonSides
  - 实时更新背景效果

  **Must NOT do**:
  - 不要在生产环境显示
  - 不要添加外部依赖

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: UI 组件开发

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 6
  - **Blocked By**: Task 4

  **References**:
  - `src/components/DotBackground.astro` - 背景组件
  - `src/scripts/dot-background.ts` - 需要添加 updateConfig API

  **代码修改要点**:

  1. 在 dot-background.ts 添加更新配置 API：
  ```typescript
  export function updateConfig(newConfig: Partial<Config>): void {
    config = { ...config, ...newConfig };
    // 重新生成点阵
    handleResize();
  }
  ```

  2. 创建 BgDebugPanel.astro：
  ```astro
  ---
  // 仅开发环境
  const isDev = import.meta.env.DEV;
  ---

  {isDev && (
    <div class="fixed bottom-4 right-4 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-lg z-50">
      <!-- 滑块和复选框 -->
    </div>
  )}

  <script>
    import { updateConfig } from '../scripts/dot-background';
    
    // 监听滑块变化，调用 updateConfig
  </script>
  ```

  **Acceptance Criteria**:
  - [ ] 调试面板仅在 dev 环境显示
  - [ ] 可调整 dotSize, dotSizeHighlight, dotGap
  - [ ] 可选择 polygonSides
  - [ ] 调整后背景实时更新

  **QA Scenarios**:
  ```
  Scenario: 验证调试面板功能
    Tool: Playwright
    Steps:
      1. 启动 dev 服务器
      2. 访问页面
      3. 验证调试面板存在
      4. 调整滑块
      5. 验证背景变化
    Expected Result: 调试面板可正常工作
    Evidence: .sisyphus/evidence/task-5-debug-panel.png
  ```

  **Commit**: YES
  - Message: `feat: 添加背景调试面板（仅 dev 环境）`
  - Files: `src/components/BgDebugPanel.astro, src/scripts/dot-background.ts`

---

- [ ] 6. 构建验证

  **What to do**:
  - 运行 `npm run build`
  - 确保构建成功
  - 验证功能正常

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: Task 5

  **Acceptance Criteria**:
  - [ ] `npm run build` 成功
  - [ ] 无 TypeScript 错误
  - [ ] 生产构建不包含调试面板

  **QA Scenarios**:
  ```
  Scenario: 验证构建成功
    Tool: Bash
    Steps:
      1. npm run build
    Expected Result: 构建成功，exit code 0
    Evidence: .sisyphus/evidence/task-6-build.txt
  ```

  **Commit**: YES
  - Message: `chore: 构建验证通过`
  - Files: 无（仅验证）

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  验证所有 Must Have 已实现，所有 Must NOT Have 未包含。

- [ ] F2. **Code Quality Review** — `unspecified-high`
  运行 `npm run build`，检查类型安全，无 `any` 滥用。

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright`)
  启动 dev 服务器，验证所有功能，截图存证。

---

## Commit Strategy

- Task 1: `feat(config): 添加 BgConfig 背景配置类型`
- Task 2: `refactor(dot-background): 配置化参数并修改伪随机逻辑`
- Task 3: `feat(DotBackground): 传递配置到背景组件`
- Task 4: `feat(dot-background): 添加 Header 区域裁剪`
- Task 5: `feat: 添加背景调试面板（仅 dev 环境）`
- Task 6: 构建验证（无提交）

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Expected: 构建成功
npm run dev    # Expected: 开发服务器启动，调试面板可见
```

### Final Checklist
- [x] 所有 Must Have 实现
- [x] 所有 Must NOT Have 未包含
- [x] 构建成功
- [x] 调试面板仅在 dev 环境显示
