// src/components/ThemeColorButton/index.ts
// 主题色切换功能

interface ThemeColorConfig {
  defaultColor: string;
  hashColor: string;
}

/**
 * 计算颜色的相对亮度 (0-1)
 * 基于 WCAG 2.0 标准
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 计算两个颜色之间的对比度
 * 返回值范围 1-21
 */
function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 解析十六进制颜色为 RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * RGB 转十六进制
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => {
    c = Math.round(Math.max(0, Math.min(255, c)));
    return c.toString(16).padStart(2, '0');
  }).join('');
}

/**
 * 调整颜色亮度
 * factor > 1 变亮，< 1 变暗
 */
function adjustBrightness(r: number, g: number, b: number, factor: number): { r: number; g: number; b: number } {
  return {
    r: Math.min(255, r * factor),
    g: Math.min(255, g * factor),
    b: Math.min(255, b * factor)
  };
}

/**
 * 确保颜色满足 WCAG AA 对比度标准 (4.5:1)
 * 分别检查在白色背景和深色背景上的对比度
 */
function ensureAAContrast(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  
  // 背景色
  const whiteBg = { r: 255, g: 255, b: 255 }; // 亮色模式背景
  const darkBg = { r: 15, g: 23, b: 42 }; // slate-950 暗色模式背景
  
  const AA_RATIO = 4.5; // WCAG AA 标准对比度
  
  let adjustedRgb = { ...rgb };
  
  // 检查在白色背景上的对比度（颜色需要足够深）
  let contrastOnWhite = getContrastRatio(adjustedRgb, whiteBg);
  
  // 检查在深色背景上的对比度（颜色需要足够亮）
  let contrastOnDark = getContrastRatio(adjustedRgb, darkBg);
  
  // 如果两个对比度都不够，需要调整
  if (contrastOnWhite < AA_RATIO && contrastOnDark < AA_RATIO) {
    // 计算原始颜色的亮度
    const luminance = getLuminance(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
    const midLuminance = 0.5;
    
    if (luminance < midLuminance) {
      // 颜色偏暗，尝试变亮
      let factor = 1.1;
      while (factor <= 3) {
        const testRgb = adjustBrightness(rgb.r, rgb.g, rgb.b, factor);
        const testContrastDark = getContrastRatio(testRgb, darkBg);
        if (testContrastDark >= AA_RATIO) {
          adjustedRgb = testRgb;
          break;
        }
        factor += 0.05;
      }
    } else {
      // 颜色偏亮，尝试变暗
      let factor = 0.9;
      while (factor >= 0.2) {
        const testRgb = adjustBrightness(rgb.r, rgb.g, rgb.b, factor);
        const testContrastWhite = getContrastRatio(testRgb, whiteBg);
        if (testContrastWhite >= AA_RATIO) {
          adjustedRgb = testRgb;
          break;
        }
        factor -= 0.05;
      }
    }
  }
  
  return rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
}

function initThemeColorButton() {
  const storageKey = "theme-color";
  const toggle = document.getElementById("theme-color-toggle");
  const root = document.documentElement;
  const transitionCircle = document.getElementById("theme-color-transition-circle");

  // 从脚本标签获取 hash 颜色
  const scriptTag = document.querySelector('script[data-version-hash]');
  const versionHash = scriptTag?.getAttribute('data-version-hash') || '7cae16f';

  // 默认颜色（备用）
  const DEFAULT_COLOR = '#8080f7';
  
  // 从 hash 生成颜色
  const generateColorFromHash = (hash: string): string => {
    if (!hash) return '#666666';
    
    const hexRegex = /^[0-9a-f]+$/i;
    if (hexRegex.test(hash) && hash.length >= 6) {
      return `#${hash.substring(0, 6)}`;
    }
    
    let hashValue = 5381;
    for (let i = 0; i < hash.length; i++) {
      hashValue = (hashValue * 33) ^ hash.charCodeAt(i);
    }
    
    const r = (hashValue & 0xFF0000) >> 16;
    const g = (hashValue & 0x00FF00) >> 8;
    const b = hashValue & 0x0000FF;
    
    const adjust = (c: number) => {
      const adjusted = Math.floor(100 + (c / 255) * 100);
      return adjusted.toString(16).padStart(2, '0');
    };
    
    return `#${adjust(r)}${adjust(g)}${adjust(b)}`;
  };

  // 生成原始 hash 颜色并确保符合 AA 对比度标准
  const rawHashColor = generateColorFromHash(versionHash);
  const HASH_COLOR = ensureAAContrast(rawHashColor);

  const config: ThemeColorConfig = {
    defaultColor: DEFAULT_COLOR,
    hashColor: HASH_COLOR
  };

  let isAnimating = false;

  // 设置主题色（无动画）
  const applyThemeColor = (theme: string) => {
    const color = theme === 'default' ? config.defaultColor : config.hashColor;
    
    // 设置 CSS 变量
    root.style.setProperty('--color-primary', color);
    
    // 更新按钮状态
    toggle?.setAttribute('data-color-theme', theme);
    
    // 更新指示器颜色
    const indicator = toggle?.querySelector('.color-indicator');
    if (indicator instanceof HTMLElement) {
      indicator.style.backgroundColor = color;
    }
    
    // 更新 Footer 中的版本 hash 颜色 - 始终显示 hash 颜色
    const versionHashEl = document.querySelector('.version-hash');
    if (versionHashEl instanceof HTMLElement) {
      versionHashEl.style.color = config.hashColor;
    }
  };

  // 带过渡动画的主题色切换
  const applyThemeColorWithTransition = (theme: string) => {
    if (!document.startViewTransition) {
      applyWithCircleAnimation(theme);
      return;
    }
    applyWithViewTransition(theme);
  };

  // 方案1: View Transition API
  const applyWithViewTransition = (theme: string) => {
    const rect = toggle!.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // 设置 CSS 变量用于动画
    document.documentElement.style.setProperty("--theme-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-y", `${y}px`);

    const transition = document.startViewTransition!(() => {
      applyThemeColor(theme);
    });

    transition.finished
      .then(() => {
        isAnimating = false;
      })
      .catch(() => {
        isAnimating = false;
      });
  };

  // 方案2: 传统圆形展开动画
  const applyWithCircleAnimation = (theme: string) => {
    const rect = toggle!.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const color = theme === 'default' ? config.defaultColor : config.hashColor;

    transitionCircle!.style.left = x + "px";
    transitionCircle!.style.top = y + "px";
    transitionCircle!.style.backgroundColor = color;
    transitionCircle!.classList.add("animate");

    setTimeout(() => {
      applyThemeColor(theme);
    }, 500);

    setTimeout(() => {
      transitionCircle!.classList.remove("animate");
      transitionCircle!.style.width = "0";
      transitionCircle!.style.height = "0";
      isAnimating = false;
    }, 1000);
  };

  // 加载保存的主题 - 默认为 hash
  const loadTheme = (): string => {
    const saved = localStorage.getItem(storageKey);
    // 默认使用 hash 颜色
    if (!saved) return 'hash';
    return saved === 'default' ? 'default' : 'hash';
  };

  // 循环切换主题
  const cycleTheme = (theme: string): string => {
    if (theme === 'hash') return 'default';
    return 'hash';
  };

  // 初始化
  const init = () => {
    const savedTheme = loadTheme();
    applyThemeColor(savedTheme);

    toggle?.addEventListener('click', () => {
      if (isAnimating) return;
      isAnimating = true;

      const currentTheme = toggle.getAttribute('data-color-theme') || 'hash';
      const nextTheme = cycleTheme(currentTheme);
      localStorage.setItem(storageKey, nextTheme);
      applyThemeColorWithTransition(nextTheme);
    });
  };

  init();
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeColorButton);
} else {
  initThemeColorButton();
}
