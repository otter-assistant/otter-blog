/**
 * dot-background.ts - Canvas 动态几何顶点背景核心渲染逻辑
 *
 * 功能：
 * - 确定性随机种子（基于日期，同一天保持相同形状）
 * - 多边形网格（三角形/正方形/六边形）
 * - 鼠标视差效果
 * - 最近点高亮
 * - 主题颜色响应
 */

import siteConfig from '../config/index';
// ============ 类型定义 ============

interface Point {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  targetRadius: number;
}

interface MousePosition {
  x: number;
  y: number;
}

interface AnimationState {
  offsetX: number;
  offsetY: number;
}

// ============ 常量配置 ============

export interface BgConfig {
  dotSize: number;
  dotSizeHighlight: number;
  /** 外接圆直径 - 所有网格类型使用统一的外接圆直径作为基准 */
  dotGap: number;
  polygonSides: number[];
  showLines?: boolean;
}

export let config: BgConfig = {
  dotSize: siteConfig.background?.dotSize ?? 1,
  dotSizeHighlight: siteConfig.background?.dotSizeHighlight ?? 2,
  dotGap: siteConfig.background?.dotGap ?? 40, // 外接圆直径
  polygonSides: siteConfig.background?.polygonSides ?? [3, 4, 6],
  showLines: siteConfig.background?.showLines ?? false,
};

const PADDING = 200;
const MAX_OFFSET = 200;
const TRANSITION_DURATION = 0.3;
const DEBOUNCE_DELAY = 200;

// 颜色配置
const COLORS = {
  light: '#cbd5e1', // slate-300
  dark: '#475569', // slate-600
} as const;

// ============ 模块状态 ============

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let points: Point[] = [];
let mouse: MousePosition = { x: 0, y: 0 };
let animation: AnimationState = { offsetX: 0, offsetY: 0 };
let rafId: number | null = null;
let isDarkMode = false;
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
let mutationObserver: MutationObserver | null = null;
let currentSides: number = 4;
let gridCols: number = 0;
let gridRows: number = 0;

// ============ 确定性随机数生成器 ============

/**
 * 创建基于日期字符串的确定性伪随机数生成器
 * 同一天生成的随机序列相同
 */
function createSeededRandom(seed: string): () => number {
  // 使用简单哈希将字符串转为数字种子
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  // Mulberry32 算法
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============ 网格生成 ============

/**
 * 根据多边形边数生成点阵
 * @param sides 多边形边数 (3, 4, 6)
 * @param width Canvas 宽度
 * @param height Canvas 高度
 * @param random 伪随机数生成器
 */
function generatePoints(
  sides: number,
  width: number,
  height: number,
  random: () => number
): Point[] {
  currentSides = sides;
  const pts: Point[] = [];
  const extendX = PADDING;
  const extendY = PADDING;

  switch (sides) {
    case 3: // 正三角形网格
      generateTriangleGrid(pts, width, height, extendX, extendY);
      break;
    case 4: // 正方形网格
      generateSquareGrid(pts, width, height, extendX, extendY);
      break;
    case 6: // 正六边形网格（蜂窝状）
      generateHexagonGrid(pts, width, height, extendX, extendY);
      break;
    default:
      generateSquareGrid(pts, width, height, extendX, extendY);
  }

  // 保存规则格点坐标到 baseX/baseY
  // showLines=false 时对 x/y 添加微小随机偏移使效果更自然
  // showLines=true 时 x/y 与 baseX/baseY 保持一致，确保连线几何规则
  for (const pt of pts) {
    pt.baseX = pt.x;
    pt.baseY = pt.y;
    // 移除抖动，保证不显示连线时也能看出是绝对的正多边形网格
  }

  return pts;
}

/**
 * 正三角形网格
 * 外接圆直径 D = dotGap，边长 a = √3 * D/2
 * 水平间距 = a，垂直间距 = a * √3/2
 */
function generateTriangleGrid(
  pts: Point[],
  width: number,
  height: number,
  extendX: number,
  extendY: number
): void {
  // 边长 a = √3 * D/2，D = dotGap
  const sideLength = config.dotGap * (Math.sqrt(3) / 2);
  const xSpacing = sideLength;
  const ySpacing = sideLength * (Math.sqrt(3) / 2);

  const cols = Math.ceil((width + extendX * 2) / xSpacing) + 2;
  const rows = Math.ceil((height + extendY * 2) / ySpacing) + 2;
  gridCols = cols;
  gridRows = rows;

  for (let row = 0; row < rows; row++) {
    const xOffset = row % 2 === 0 ? 0 : xSpacing / 2;
    for (let col = 0; col < cols; col++) {
      pts.push({
        x: col * xSpacing + xOffset - extendX,
        y: row * ySpacing - extendY,
        baseX: 0,
        baseY: 0,
        radius: config.dotSize,
        targetRadius: config.dotSize,
      });
    }
  }
}

/**
 * 正方形网格
 * 外接圆直径 D = dotGap，边长 a = √2 * D/2
 */
function generateSquareGrid(
  pts: Point[],
  width: number,
  height: number,
  extendX: number,
  extendY: number
): void {
  // 边长 a = √2 * D/2，D = dotGap
  const sideLength = config.dotGap * (Math.sqrt(2) / 2);

  const cols = Math.ceil((width + extendX * 2) / sideLength) + 2;
  const rows = Math.ceil((height + extendY * 2) / sideLength) + 2;
  gridCols = cols;
  gridRows = rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      pts.push({
        x: col * sideLength - extendX,
        y: row * sideLength - extendY,
        baseX: 0,
        baseY: 0,
        radius: config.dotSize,
        targetRadius: config.dotSize,
      });
    }
  }
}

/**
 * 正六边形网格（蜂窝状）
 * 外接圆直径 D = dotGap，边长 a = D/2
 * 同行相邻点间距 = a，垂直间距 = a * √3/2
 */
function generateHexagonGrid(
  pts: Point[],
  width: number,
  height: number,
  extendX: number,
  extendY: number
): void {
  // 边长 a = D/2，D = dotGap
  const sideLength = config.dotGap / 2;
  // 垂直间距 = a * √3/2
  const ySpacing = sideLength * (Math.sqrt(3) / 2);

  const cols = Math.ceil((width + extendX * 2) / (3 * sideLength)) + 2;
  const rows = Math.ceil((height + extendY * 2) / ySpacing) + 2;
  gridCols = cols * 2;
  gridRows = rows;

  for (let row = 0; row < rows; row++) {
    const isEven = row % 2 === 0;
    for (let col = 0; col < cols; col++) {
      const baseX = col * 3 * sideLength;
      const offsetX = isEven ? 0 : 1.5 * sideLength;

      // Point A
      pts.push({
        x: baseX + offsetX - extendX,
        y: row * ySpacing - extendY,
        baseX: 0,
        baseY: 0,
        radius: config.dotSize,
        targetRadius: config.dotSize,
      });

      // Point B
      pts.push({
        x: baseX + offsetX + sideLength - extendX,
        y: row * ySpacing - extendY,
        baseX: 0,
        baseY: 0,
        radius: config.dotSize,
        targetRadius: config.dotSize,
      });
    }
  }
}

// ============ 连线绘制 ============

function drawLines(clampedX: number, clampedY: number): void {
  if (!ctx || points.length === 0) return;

  ctx.beginPath();
  switch (currentSides) {
    case 3:
      drawTriangleLines(clampedX, clampedY);
      break;
    case 4:
      drawSquareLines(clampedX, clampedY);
      break;
    case 6:
      drawHexagonLines(clampedX, clampedY);
      break;
  }
  ctx.stroke();
}

function drawTriangleLines(clampedX: number, clampedY: number): void {
  if (!ctx) return;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const i = row * gridCols + col;
      if (i >= points.length) continue;
      const pt = points[i];
      const x = pt.baseX + PADDING + clampedX;
      const y = pt.baseY + PADDING + clampedY;

      // Connect to right neighbor
      if (col < gridCols - 1) {
        const rightPt = points[i + 1];
        ctx.moveTo(x, y);
        ctx.lineTo(rightPt.baseX + PADDING + clampedX, rightPt.baseY + PADDING + clampedY);
      }

      // Connect to bottom neighbors
      if (row < gridRows - 1) {
        const isEvenRow = row % 2 === 0;
        // Bottom left
        if (!isEvenRow || col > 0) {
          const bottomLeftIdx = i + gridCols - (isEvenRow ? 1 : 0);
          if (bottomLeftIdx < points.length) {
            const blPt = points[bottomLeftIdx];
            ctx.moveTo(x, y);
            ctx.lineTo(blPt.baseX + PADDING + clampedX, blPt.baseY + PADDING + clampedY);
          }
        }
        // Bottom right
        if (isEvenRow || col < gridCols - 1) {
          const bottomRightIdx = i + gridCols + (isEvenRow ? 0 : 1);
          if (bottomRightIdx < points.length) {
            const brPt = points[bottomRightIdx];
            ctx.moveTo(x, y);
            ctx.lineTo(brPt.baseX + PADDING + clampedX, brPt.baseY + PADDING + clampedY);
          }
        }
      }
    }
  }
}

function drawSquareLines(clampedX: number, clampedY: number): void {
  if (!ctx) return;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const i = row * gridCols + col;
      if (i >= points.length) continue;
      const pt = points[i];
      const x = pt.baseX + PADDING + clampedX;
      const y = pt.baseY + PADDING + clampedY;

      // Connect to right neighbor
      if (col < gridCols - 1) {
        const rightPt = points[i + 1];
        ctx.moveTo(x, y);
        ctx.lineTo(rightPt.baseX + PADDING + clampedX, rightPt.baseY + PADDING + clampedY);
      }

      // Connect to bottom neighbor
      if (row < gridRows - 1) {
        const bottomPt = points[i + gridCols];
        if (bottomPt) {
          ctx.moveTo(x, y);
          ctx.lineTo(bottomPt.baseX + PADDING + clampedX, bottomPt.baseY + PADDING + clampedY);
        }
      }
    }
  }
}

function drawHexagonLines(clampedX: number, clampedY: number): void {
  if (!ctx) return;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const i = row * gridCols + col;
      if (i >= points.length) continue;
      const pt = points[i];
      const x = pt.baseX + PADDING + clampedX;
      const y = pt.baseY + PADDING + clampedY;

      // 1. Connect Horizontal (Right)
      if (col % 2 === 0 && col < gridCols - 1) {
        const rightPt = points[i + 1];
        ctx.moveTo(x, y);
        ctx.lineTo(rightPt.baseX + PADDING + clampedX, rightPt.baseY + PADDING + clampedY);
      }

      // 2. Connect Slanted
      if (row < gridRows - 1) {
        const isEvenRow = row % 2 === 0;
        if (isEvenRow && col > 0) {
          const swIdx = i + gridCols - 1;
          if (swIdx < points.length) {
            const swPt = points[swIdx];
            ctx.moveTo(x, y);
            ctx.lineTo(swPt.baseX + PADDING + clampedX, swPt.baseY + PADDING + clampedY);
          }
        } else if (!isEvenRow && col < gridCols - 1) {
          const seIdx = i + gridCols + 1;
          if (seIdx < points.length) {
            const sePt = points[seIdx];
            ctx.moveTo(x, y);
            ctx.lineTo(sePt.baseX + PADDING + clampedX, sePt.baseY + PADDING + clampedY);
          }
        }
      }
    }
  }
}

// ============ 颜色检测 ============

/**
 * 检测当前是否为暗色模式
 */
function checkDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * 设置 MutationObserver 监听主题变化
 */
function setupThemeObserver(): void {
  mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        isDarkMode = checkDarkMode();
      }
    }
  });

  mutationObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

// ============ Debounce 工具 ============

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => fn(...args), delay);
  };
}

// ============ 渲染逻辑 ============

/**
 * 动画帧更新
 */
function animate(): void {
  if (!ctx || !canvas) return;

  // 平滑视差偏移（缓动）
  const easing = 0.08;
  animation.offsetX += (mouse.x - animation.offsetX) * easing;
  animation.offsetY += (mouse.y - animation.offsetY) * easing;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 设置颜色
  ctx.fillStyle = isDarkMode ? COLORS.dark : COLORS.light;
  ctx.strokeStyle = isDarkMode ? COLORS.dark : COLORS.light;
  ctx.lineWidth = 1;

  // 计算中心偏移（视差效果）
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const parallaxX = (animation.offsetX - centerX) * -0.1;
  const parallaxY = (animation.offsetY - centerY) * -0.1;

  // 限制偏移范围
  const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, parallaxX));
  const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, parallaxY));

  // 如果启用显示连线，绘制连线
  if (config.showLines) {
    drawLines(clampedX, clampedY);
  }

  // 找到最近的点
  let minDist = Infinity;
  let nearestIndex = -1;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const screenX = pt.x + PADDING + clampedX;
    const screenY = pt.y + PADDING + clampedY;
    const dist = Math.hypot(mouse.x - screenX, mouse.y - screenY);

    if (dist < minDist) {
      minDist = dist;
      nearestIndex = i;
    }
  }


  // 更新点半径（平滑过渡）
  const transitionSpeed = TRANSITION_DURATION * 0.1;
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    pt.targetRadius = i === nearestIndex ? config.dotSizeHighlight : config.dotSize;
    pt.radius += (pt.targetRadius - pt.radius) * transitionSpeed;
  }

  // 绘制所有点
  for (const pt of points) {
    const x = pt.x + PADDING + clampedX;
    const y = pt.y + PADDING + clampedY;

    ctx.beginPath();
    ctx.arc(x, y, pt.radius, 0, Math.PI * 2);
    ctx.fill();
  }


  rafId = requestAnimationFrame(animate);
}

/**
 * 处理窗口大小变化
 */
function handleResize(): void {
  if (!canvas) return;

  const width = window.innerWidth + PADDING * 2;
  const height = window.innerHeight + PADDING * 2;

  canvas.width = width;
  canvas.height = height;

  // 重新生成点阵
  const seed = new Date().toDateString();
  const random = createSeededRandom(seed);
  const sides = choosePolygonSides(random);
  points = generatePoints(sides, width, height, random);
}
/**
 * 根据随机值选择多边形边数
 */
function choosePolygonSides(random: () => number): number {
  const sides = config.polygonSides;
  if (sides.length === 0) return 4;
  const index = Math.floor(random() * sides.length);
  return sides[index];
}

/**
 * 处理鼠标移动
 */
function handleMouseMove(e: MouseEvent): void {
  mouse.x = e.clientX + PADDING;
  mouse.y = e.clientY + PADDING;
}

// ============ 公共 API ============

/**
 * 更新配置并重新生成背景
 * @param newConfig 新配置（部分）
 */
export function updateConfig(newConfig: Partial<BgConfig>): void {
  config = { ...config, ...newConfig };
  handleResize();
}

export function initBackground(canvasElement: HTMLCanvasElement): () => void {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error('DotBackground: 无法获取 Canvas 2D 上下文');
    return () => {};
  }

  // 初始化状态
  isDarkMode = checkDarkMode();
  mouse = { x: window.innerWidth / 2 + PADDING, y: window.innerHeight / 2 + PADDING };
  animation = { offsetX: mouse.x, offsetY: mouse.y };

  // 设置 Canvas 尺寸
  const width = window.innerWidth + PADDING * 2;
  const height = window.innerHeight + PADDING * 2;
  canvas.width = width;
  canvas.height = height;

  // 初始 transform
  canvas.style.transform = `translate(${-PADDING}px, ${-PADDING}px)`;
  canvas.style.zIndex = '-1';

  // 生成点阵
  const seed = new Date().toDateString();
  const random = createSeededRandom(seed);
  const sides = choosePolygonSides(random);
  points = generatePoints(sides, width, height, random);

  // 设置主题监听
  setupThemeObserver();

  // 事件监听
  const debouncedResize = debounce(handleResize, DEBOUNCE_DELAY);
  window.addEventListener('resize', debouncedResize);
  window.addEventListener('mousemove', handleMouseMove);

  // 启动动画
  rafId = requestAnimationFrame(animate);

  // 返回清理函数
  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('resize', debouncedResize);
    window.removeEventListener('mousemove', handleMouseMove);
  };
}

/**
 * 销毁背景（全局清理）
 */
export function destroyBackground(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
    resizeTimeout = null;
  }

  canvas = null;
  ctx = null;
  points = [];
  mouse = { x: 0, y: 0 };
  animation = { offsetX: 0, offsetY: 0 };
}
