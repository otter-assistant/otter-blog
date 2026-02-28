# Dynamic Background - 学习笔记

## 2026-02-27 Task 1: dot-background.ts 创建

### 技术实现

1. **确定性随机数生成**
   - 使用 Mulberry32 算法（轻量级 PRNG）
   - 种子基于 `new Date().toDateString()`，同一天结果一致
   - 哈希字符串转数字种子：简单移位累加

2. **多边形网格算法**
   - 三角形 (X=3): 偶数行 X 偏移 gap/2，Y 间距 `gap * sqrt(3) / 2`
   - 正方形 (X=4): 基础 `(i * gap, j * gap)`
   - 六边形 (X=6): 蜂窝状，行间错位 0.75 * gap

3. **Canvas 配置**
   - 尺寸: `innerWidth + 400`, `innerHeight + 400`
   - transform: `translate(-200px, -200px)`
   - z-index: -1

4. **视差效果**
   - 缓动系数 0.08（平滑跟随）
   - 反向偏移系数 0.1
   - 最大偏移 ±200px（`Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, value))`）

5. **半径过渡动画**
   - 基准 2px，高亮 4px
   - 过渡速度 `TRANSITION_DURATION * 0.1`
   - 每帧插值：`radius += (target - current) * speed`

6. **主题监听**
   - MutationObserver 监听 `<html>` 的 class 属性
   - 检测 `dark` 类存在

7. **性能优化**
   - requestAnimationFrame 驱动
   - resize 使用 debounce (200ms)
   - 提供 cleanup 和 destroyBackground 清理

### 导出签名

```typescript
export function initBackground(canvas: HTMLCanvasElement): () => void
export function destroyBackground(): void
```

### 颜色配置

- 亮色: `#cbd5e1` (slate-300)
- 暗色: `#475569` (slate-600)

### 注意事项

- 桌面端检测在 DotBackground.astro 组件中完成
- 脚本本身不负责检测 `(pointer: fine)`
