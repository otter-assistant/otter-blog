import config from '../config/index.ts';
import crypto from 'crypto';
import { MD_LINK_REG } from './regexps.ts';
import { generateCategorySlug } from './categories.ts';
import { generateTagSlug } from './tags.ts';

/**
 * 生成统一的 slug（用于文章、目录标题等URL生成）
 * 规则：trim -> 去除标点 -> 空白/下划线/斜杠替换为 '-' -> 去重 '-' -> 去除首尾 '-'
 * @param input - 输入文本或文章对象
 * @param fallbackPrefix - 当生成的slug为空时的前缀，默认为'temporary-url'
 * @returns 生成的 slug
 */
export function generatePostSlug(input: string | { id: string; data: { uri?: string } }, fallbackPrefix: string = 'temporary-url'): string {
  // 如果是文章对象，优先使用 uri
  if (typeof input === 'object') {
    if (input.data.uri) {
      return input.data.uri;
    }
    // 如果没有uri，使用id生成
    const text = input.id;
    const slug = generateSlugFromText(text);
    return slug || `${fallbackPrefix}/` + crypto
      .createHash('sha256')
      .update(input.id, 'utf8')
      .digest('hex')
      .slice(0, 32);
  }
  
  // 如果是字符串，直接处理
  const slug = generateSlugFromText(input);
  return slug || `${fallbackPrefix}-${crypto
    .createHash('sha256')
    .update(input, 'utf8')
    .digest('hex')
    .slice(0, 8)}`;
}

/**
 * 从文本生成slug的核心函数
 * @param text - 文本内容
 * @returns 生成的 slug
 */
function generateSlugFromText(text: string): string {
  if (typeof text !== 'string' || !text.trim()) return '';
  let s = text.trim();
  s = s.replace(/[!@#$%^&*()+=,.:;"'<>?`~\[\]{}]/g, '');
  s = s.replace(/\s+/g, '-');
  s = s.replace(/[_/\\]+/g, '-');
  s = s.replace(/-{2,}/g, '-');
  s = s.replace(/^-|-$/g, '');
  return s;
}

/**
 * 转换 Markdown 中的所有行内链接，非白名单链接转为 /tool/goto?url=原始链接 格式
 * @param {string} mdContent - 原始 Markdown 内容字符串
 * @param {Array<string>} whiteList - 链接白名单列表（匹配原始链接，精准匹配）
 * @returns {string} 处理后的 Markdown 内容
 */
export function convertMdALinksToGoto(mdContent: string, whiteList: string[] = config.friendlyLink.map(link => link.link)): string {
  // 校验参数类型，避免异常
  if (typeof mdContent !== 'string') {
    throw new TypeError('第一个参数 mdContent 必须是字符串类型');
  }
  if (!Array.isArray(whiteList)) {
    throw new TypeError('第二个参数 whiteList 必须是数组类型');
  }

  // 使用 replace 方法进行批量替换，回调函数处理每个匹配项
  return mdContent.replace(MD_LINK_REG, (match, linkText, originalUrl, title) => {
    // 判断原始链接是否在白名单中
    const isInWhiteList = whiteList.some(whiteUrl => whiteUrl === originalUrl);

    if (isInWhiteList) {
      // 白名单内的链接，直接返回原匹配内容，不做修改
      return match;
    } else {
      // 非白名单链接，转换为目标格式，对原始链接进行 URL 编码（避免特殊字符导致跳转异常）
      const encodedUrl = encodeURIComponent(originalUrl);
      const targetUrl = `/tool/goto?url=${encodedUrl}`;
      // 拼接新的 Markdown 链接，保留原链接文本和可选标题
      return title ? `[${linkText}](${targetUrl}${title})` : `[${linkText}](${targetUrl})`;
    }
  });
}

/**
 * 从 HTML 中提取所有 a 标签，将非白名单链接的 href 转为 /tool/goto?url=原始链接 格式
 * @param {string} htmlContent - 原始 HTML 内容字符串
 * @param {Array<string>} whiteList - 链接白名单列表（匹配原始 href，精准匹配）
 * @returns {string} 处理后的 HTML 内容
 */
export function convertHtmlALinksToGoto(htmlContent: string, whiteList: string[] = config.friendlyLink.map(link => link.link)) {
  // 校验参数类型，避免异常
  if (typeof htmlContent !== 'string') {
    throw new TypeError('第一个参数 htmlContent 必须是字符串类型');
  }
  if (!Array.isArray(whiteList)) {
    throw new TypeError('第二个参数 whiteList 必须是数组类型');
  }

  // 1. 创建 DOMParser 实例，用于解析 HTML 字符串（原生浏览器 API，不依赖第三方库）
  const parser = new DOMParser();
  // 2. 解析 HTML 内容，生成文档对象模型（DOM）
  const doc = parser.parseFromString(htmlContent, 'text/html');
  // 3. 提取文档中所有的 <a> 标签
  const aTags = doc.querySelectorAll('a');

  // 4. 遍历所有 <a> 标签，进行链接处理
  aTags.forEach(aTag => {
    // 获取 a 标签的原始 href 属性值（忽略空 href 或无 href 属性的标签）
    const originalHref = aTag.getAttribute('href');
    if (!originalHref) return;

    // 5. 判断原始链接是否在白名单中
    const isInWhiteList = whiteList.some(whiteUrl => whiteUrl === originalHref);

    if (!isInWhiteList) {
      // 6. 非白名单链接：进行 URL 编码，避免特殊字符导致参数异常
      const encodedHref = encodeURIComponent(originalHref);
      // 7. 拼接目标链接格式，更新 a 标签的 href 属性
      const targetHref = `/tool/goto?url=${encodedHref}`;
      aTag.setAttribute('href', targetHref);
    }
    // 白名单链接：不做任何修改，保留原始 href
  });

  // 8. 将处理后的 DOM 转换回 HTML 字符串并返回
  return doc.body.innerHTML;
}

/**
 * 从 Markdown 内容中提取纯文本描述
 * @param content - Markdown 内容字符串
 * @param maxLength - 最大长度，默认180字
 * @returns 提取的纯文本描述
 */
export function extractDescriptionFromContent(content: string, maxLength: number = 180): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // 移除 frontmatter
  let cleanContent = content.replace(/^---\n.*?\n---\n/s, '');
  
  // 移除 Markdown 语法
  cleanContent = cleanContent
    // 移除标题标记
    .replace(/^#{1,6}\s+/gm, '')
    // 移除加粗和斜体
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // 移除代码块
    .replace(/```[\s\S]*?```/g, '')
    // 移除行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 移除链接，保留文本
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除图片
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // 移除引用
    .replace(/^>\s+/gm, '')
    // 移除列表标记
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 移除表格
    .replace(/\|.*\|/g, '')
    // 移除分隔线
    .replace(/^---+$/gm, '')
    // 移除多余的空白字符
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 限制长度
  if (cleanContent.length > maxLength) {
    return cleanContent.substring(0, maxLength).trim() + '...';
  }

  return cleanContent;
}

/**
 * 生成统一的标题 slug（与分类/标签slug保持一致的规则）
 * 规则：trim -> 去除标点 -> 空白/下划线/斜杠替换为 '-' -> 去重 '-' -> 去除首尾 '-'
 * @param text - 标题文本
 * @returns 标题的 slug
 */
export function generateHeadingSlug(text: string): string {
  if (typeof text !== 'string') return '';
  let s = text.trim();
  s = s.replace(/[!@#$%^&*()+=,.:;"'<>?`~\[\]{}]/g, '');
  s = s.replace(/\s+/g, '-');
  s = s.replace(/[_/\\]+/g, '-');
  s = s.replace(/-{2,}/g, '-');
  s = s.replace(/^-|-$/g, '');
  return s;
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
function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
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
 * @param hexColor - 十六进制颜色值
 * @returns 符合 AA 标准的颜色值
 */
export function ensureAAContrastColor(hexColor: string): string {
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

/**
 * 根据哈希值生成颜色
 * 直接使用哈希值的前6位作为颜色值（如果哈希值是有效的十六进制）
 * 并确保颜色符合 WCAG AA 对比度标准
 * @param hash - 哈希字符串
 * @returns 生成的十六进制颜色值
 */
export function generateColorFromHash(hash: string): string {
  if (!hash) return '#666666';
  
  let rawColor: string;
  
  // 如果哈希值只包含十六进制字符且长度 >= 6，直接使用前6位
  const hexRegex = /^[0-9a-f]+$/i;
  if (hexRegex.test(hash) && hash.length >= 6) {
    rawColor = `#${hash.substring(0, 6)}`;
  } else {
    // 如果哈希值不是纯十六进制，使用哈希算法生成颜色
    let hashValue = 5381;
    for (let i = 0; i < hash.length; i++) {
      hashValue = (hashValue * 33) ^ hash.charCodeAt(i);
    }
    
    // 生成3个颜色分量
    const r = (hashValue & 0xFF0000) >> 16;
    const g = (hashValue & 0x00FF00) >> 8;
    const b = hashValue & 0x0000FF;
    
    // 调整亮度确保可读性
    const adjust = (c: number) => {
      const adjusted = Math.floor(100 + (c / 255) * 100);
      return adjusted.toString(16).padStart(2, '0');
    };
    
    rawColor = `#${adjust(r)}${adjust(g)}${adjust(b)}`;
  }
  
  // 确保颜色符合 WCAG AA 对比度标准
  return ensureAAContrastColor(rawColor);
}

// 统一导出所有 utils 方法和规则
export { generateCategorySlug, generateTagSlug };
export { filterContent } from './filterContent';
export { MD_LINK_REG } from './regexps.ts';
export { getPostUrl, getPostAbsUrl, getMicroblogUrl, getMicroblogAbsUrl } from './urls';