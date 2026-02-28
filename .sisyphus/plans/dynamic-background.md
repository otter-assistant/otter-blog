# 动态几何顶点背景 (Dynamic Polygon Vertex Background)

## TL;DR

> **Quick Summary**: 在博客全局背景中添加一层基于“每日确定性随机种子”生成的几何顶点点阵（正 X 边形，X ∈ {3, 4, 6}）。背景随鼠标反向移动（视差），并对最近的顶点进行平滑放大高亮。
> 
> **Deliverables**:
> - `src/components/DotBackground.astro`: 背景容器组件
> - `src/scripts/dot-background.ts`: Canvas 核心绘制与逻辑脚本
> - 集成到所有主要布局文件
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: 背景逻辑脚本 -> 布局集成 -> 验证

---

## Context

### Original Request
用户希望背景增加正多边形（3, 4, 6 边形）的顶点（2px 圆点），鼠标靠近时放大至 4px（0.3s 过渡）。背景超出屏幕两行并跟随鼠标反向移动（±200px）。

### Interview Summary
**Key Discussions**:
- **几何规则**: X 由“当日日期种子”决定，由于正五边形无法完美平铺，X 仅在 {3, 4, 6} 之间随机。
- **视觉约束**: 仅展示顶点；灰色系点（slate-300/600）；背景层不进入 Footer 区域。
- **交互细节**: 背景视差移动范围 ±200px；仅高亮最近的 1 个点。
- **平台限制**: 移动端完全禁用 Canvas。

### Metis Review
**Identified Gaps** (addressed):
- **SSR 安全**: 必须确保 Canvas 仅在 client 初始化。
- **Footer 裁剪**: 使用 `ctx.clip()` 或 `clearRect` 动态排除 Footer 区域。
- **清理逻辑**: 监听组件卸载，移除事件和 rAF。

---

## Work Objectives

### Core Objective
实现一个高性能、全局一致、且具备每日变化特征的 Canvas 背景效果。

### Concrete Deliverables
- `src/scripts/dot-background.ts`: 包含点阵生成、视差计算、最近点高亮算法。
- `src/components/DotBackground.astro`: 在所有页面挂载的 Canvas 节点。
- 对 Layouts 进行小幅修改以注入组件。

### Definition of Done
- [ ] 页面刷新后显示点阵背景（X = 3, 4 或 6）。
- [ ] 鼠标移动时，背景在 X/Y 轴方向反向移动（视差）。
- [ ] 鼠标最近的 1 个点平滑放大至 4px。
- [ ] Footer 区域内不出现任何点（包括高亮点）。
- [ ] 移动端不渲染 Canvas 且无 JS 性能损耗。
### 性能优化
- **交互检测**: 使用 `window.matchMedia('(pointer: fine)').matches` 判断桌面端设备。
- **背景偏移预防**: Canvas 尺寸设为 `innerWidth + 400` / `innerHeight + 400`，配合 `translate(-200px, -200px)` 初始偏移，防止视差移动出现白边。
- **裁剪性能**: 在 rAF 循环中使用 `ctx.clip()` 动态裁剪 Footer 区域。
- **主题监听**: 使用 `MutationObserver` 监听 `document.documentElement` 的 `class` 变化，以便实时更新颜色。
- **资源清理**: 明确卸载时取消 `requestAnimationFrame` 并移除全局监听。
- **resize 优化**: 使用防抖（debounce）处理 `resize` 事件。

### Must Have
- 0.3s 的平滑缩放过渡。
- 每日确定的随机种子（相同日期 X 值一致）。
- 性能友好（rAF 驱动，无 layout shift）。

### Must NOT Have (Guardrails)
- 不得使用外部动画库（GSAP, Framer Motion 等）。
- 严禁背景拦截页面交互（`pointer-events: none`）。
- 严禁在 Footer 中显示点阵。

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Verification Method**: Agent-Executed QA via Playwright.

### QA Policy
每项任务需附带 Agent-Executed QA Scenarios，涵盖正常路径与边界情况。

## TODOs

- [ ] 1. 背景核心逻辑脚本实现 (scripts/dot-background.ts)

  **What to do**:
  - 创建 `src/scripts/dot-background.ts` 导出核心渲染逻辑。
  - 实现基于日期的确定性随机种子（如 `new Date().toDateString()` 作为 seed）。
  - 根据 seed 随机决定 X ∈ {3, 4, 6}：
    - X=3: 正三角形网格
    - X=4: 正方形网格
    - X=6: 正六边形网格（蜂窝状）
  - 实现 Canvas 初始化、rAF 循环、resize 监听。
  - 实现鼠标位置平滑视差（inverse parallax, offset ±200px）。
  - 计算最近的 1 个点并实现 0.3s 的半径过渡动画。

  **Must NOT do**:
  - 不使用 `window.setInterval` 或 `setTimeout` 处理动画。
  - 不引入 `gsap` 或 `animejs`。

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`typescript`, `canvas-api`]

  **Parallelization**: Wave 1 (Start Immediately)
  - **Blocks**: Task 4, 5

  **References**:
  - `src/config/index.ts` - 查看全局配置模式。

  **Acceptance Criteria**:
  - [ ] 脚本导出 `initBackground` 和 `destroyBackground` 函数。
  - [ ] 同一天运行脚本 X 值保持不变。

  **QA Scenarios**:
  ```
  Scenario: 验证视差偏移量限制
    Tool: Playwright
    Preconditions: 浏览器启动
    Steps:
      1. 将鼠标移至屏幕最左侧 (x=0)。
      2. 获取 Canvas 内的点阵相对偏移。
      3. 确认点阵向右偏移，且最大位移不超过 200px。
    Expected Result: 偏移量在 [0, 200] 范围内。
    Evidence: .sisyphus/evidence/task-1-parallax-x.png
  ```

- [ ] 2. 背景 Astro 组件封装 (components/DotBackground.astro)

  **What to do**:
  - 创建 `src/components/DotBackground.astro`。
  - 容器应为 `position: fixed; inset: 0; z-index: -1; pointer-events: none;`。
  - 客户端脚本部分应使用 `onMount` 逻辑初始化 `DotBackground`。
  - 包含移动端检测，若 `window.matchMedia('(max-width: 768px)').matches` 则不初始化 Canvas。

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`astro-component`]

  **Parallelization**: Wave 1
  - **Blocks**: Task 4

  **QA Scenarios**:
  ```
  Scenario: 验证移动端禁用逻辑
    Tool: Playwright (Mobile Emulation)
    Steps:
      1. 使用 iPhone 模式打开页面。
      2. 检查 DOM 中是否存在 `<canvas>` 或是否被初始化（可以检查 JS 标记）。
    Expected Result: 移动端 Canvas 不挂载或不开始绘制。
    Evidence: .sisyphus/evidence/task-2-mobile-check.png
  ```

- [ ] 3. 布局集成与基础验证 (Layout Injection)

  **What to do**:
  - 在 `src/layouts/BlogPost.astro`, `src/layouts/MicroblogLayout.astro`, `src/layouts/MicroblogPost.astro` 以及 `src/pages/index.astro` 中引入 `DotBackground` 组件。
  - 将组件放置在 `<body>` 标签的顶部，确保其 `fixed` 定位覆盖全屏。

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`astro-layout`]

  **Parallelization**: Wave 2
  - **Blocked By**: Task 1, 2

  **QA Scenarios**:
  ```
  Scenario: 跨页面背景保持验证
    Tool: Playwright
    Steps:
      1. 打开首页，确认背景渲染正常。
      2. 点击任意文章进入详情页。
      3. 确认背景依然存在且正常渲染。
    Expected Result: 首页与详情页都有背景渲染。
    Evidence: .sisyphus/evidence/task-3-cross-page.png
  ```

- [ ] 4. Footer 裁剪逻辑实现

  **What to do**:
  - 修改 `DotBackground` 组件或脚本，使其在渲染前检测 `<footer>` 元素的位置。
  - 获取 `footer.getBoundingClientRect().top`。
  - 在 Canvas 渲染循环中，只绘制 Y 坐标小于 `footerTop` 的点阵。
  - 考虑到视差滚动，Footer 裁剪应每帧或通过 resize 事件动态更新阈值。

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`canvas-api`, `dom-api`]

  **Parallelization**: Wave 2
  - **Blocked By**: Task 1

  **QA Scenarios**:
  ```
  Scenario: 验证 Footer 区域空白
    Tool: Playwright
    Steps:
      1. 滚动页面至 Footer 出现。
      2. 截取 Footer 区域。
      3. 验证 Footer 范围内不存在点阵点。
    Expected Result: Footer 区域内背景干净。
    Evidence: .sisyphus/evidence/task-4-footer-clip.png
  ```

- [ ] 5. 亮色/暗色模式适配 (Theme Sync)

  **What to do**:
  - 在 `DotBackground` 中监听主题变化（通常是 `html` 类的 `dark` 切换）。
  - 根据主题动态更新点颜色：
    - 亮色: `slate-300` (#cbd5e1)
    - 暗色: `slate-600` (#475569)
  - 颜色切换应伴随平滑过渡。

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`tailwindcss`]

  **Parallelization**: Wave 2
  - **Blocked By**: Task 1

  **QA Scenarios**:
  ```
  Scenario: 切换主题颜色验证
    Tool: Playwright
    Steps:
      1. 在亮色模式下获取点的颜色（采样截图像素）。
      2. 点击切换按钮进入暗色模式。
      3. 获取暗色模式下点的颜色并进行对比。
    Expected Result: 颜色从 slate-300 变为 slate-600。
    Evidence: .sisyphus/evidence/task-5-theme-sync.png
  ```

- [ ] 6. 综合性能审计与内存清理

  **What to do**:
  - 确保组件卸载时正确取消 `requestAnimationFrame`。
  - 审计 resize 处理逻辑，增加 debounce 以免频繁重绘点阵耗尽主线程。
  - 检查 GPU 内存占用是否合理。

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`chrome-devtools-performance`]

  **Parallelization**: Wave 3
  - **Blocked By**: Task 1, 4

  **QA Scenarios**:
  ```
  Scenario: 内存泄漏检查
    Tool: Playwright + chrome-devtools
    Steps:
      1. 持续快速在页面间跳转（触发组件挂载/卸载）。
      2. 检查内存快照中 Canvas 相关对象的增长情况。
    Expected Result: 内存占用应保持稳定，无持续增长。
    Evidence: .sisyphus/evidence/task-6-memory-audit.txt
  ```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — logic & scaffolding):
├── Task 1: 背景核心逻辑脚本 (Point calculation & Rendering) [deep]
├── Task 2: 背景 Astro 组件封装 (Canvas wrapper) [quick]
└── Task 3: 确定性随机种子实现 [quick]

Wave 2 (After Wave 1 — integration):
├── Task 4: 布局集成 (Add to layout files) [quick]
├── Task 5: 响应式与 Footer 裁剪逻辑 [unspecified-high]
└── Task 6: 暗色/亮色模式适配 [visual-engineering]

Wave 3 (Final Verification):
├── Task 7: 综合 QA 验证 [deep]
└── Task 8: 性能与资源清理审计 [unspecified-high]

Wave FINAL (After ALL tasks):
├── Task F1: 计划合规性审计 (oracle)
└── Task F2: 真实环境 QA
```

---

## TODOs

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Real Manual QA** — `unspecified-high` (+ `playwright`)

---

## Success Criteria

### Verification Commands
```bash
npm run build  # 验证集成后构建不报错
```

### Final Checklist
- [ ] 每日形状变化符合预期
- [ ] 视差效果方向正确
- [ ] Footer 排除逻辑生效
- [ ] 最近点平滑放大生效
