// src/components/ThemeColorButton/index.ts
// 主题色切换功能

interface ThemeColorConfig {
  defaultColor: string;
  hashColor: string;
}

function initThemeColorButton() {
  const storageKey = "theme-color";
  const toggle = document.getElementById("theme-color-toggle");
  const root = document.documentElement;
  const transitionCircle = document.getElementById("theme-color-transition-circle");

  // 从脚本标签获取 hash 颜色
  const scriptTag = document.querySelector('script[data-version-hash]');
  const versionHash = scriptTag?.getAttribute('data-version-hash') || '7cae16f';

  // 默认颜色
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

  const HASH_COLOR = generateColorFromHash(versionHash);

  const config: ThemeColorConfig = {
    defaultColor: DEFAULT_COLOR,
    hashColor: HASH_COLOR
  };

  let isAnimating = false;

  // 设置主题色（无动画）
  const applyThemeColor = (theme: string) => {
    const color = theme === 'hash' ? config.hashColor : config.defaultColor;
    
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

    const color = theme === 'hash' ? config.hashColor : config.defaultColor;

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

  // 加载保存的主题
  const loadTheme = (): string => {
    const saved = localStorage.getItem(storageKey);
    return saved === 'hash' ? 'hash' : 'default';
  };

  // 循环切换主题
  const cycleTheme = (theme: string): string => {
    if (theme === 'default') return 'hash';
    return 'default';
  };

  // 初始化
  const init = () => {
    const savedTheme = loadTheme();
    applyThemeColor(savedTheme);

    toggle?.addEventListener('click', () => {
      if (isAnimating) return;
      isAnimating = true;

      const currentTheme = toggle.getAttribute('data-color-theme') || 'default';
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
