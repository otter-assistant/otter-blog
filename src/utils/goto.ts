import config from '../config/index.ts';

/**
 * 判断 URL 是否为绝对 HTTP/HTTPS URL
 */
export function isAbsoluteHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url.trim());
}

/**
 * 判断 URL 是否为 HTTP（非 HTTPS）
 */
export function isHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /^http:\/\//i.test(url.trim());
}

/**
 * 将通配符白名单转换为正则表达式
 * 支持 * 通配符（匹配任意字符）
 * 支持直接正则字符串（如 /^https?:\/\/...$/i）
 */
export function whiteListPatternToRegex(pattern: string): RegExp {
  const trimmed = pattern.trim();
  
  // 如果是正则字符串（如 "/^...$/i"）
  if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
    const lastSlashIndex = trimmed.lastIndexOf('/');
    const regexBody = trimmed.slice(1, lastSlashIndex);
    const flags = trimmed.slice(lastSlashIndex + 1);
    try {
      return new RegExp(regexBody, flags);
    } catch (e) {
      console.warn(`Invalid regex pattern in whitelist: ${pattern}`, e);
      return new RegExp('^$'); // 不匹配任何内容
    }
  }
  
  // 通配符转正则：* -> .*?，转义特殊字符
  let regexStr = trimmed
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符（除了 *）
    .replace(/\*/g, '.*?'); // * -> .*?
  
  // 确保完整匹配
  regexStr = `^${regexStr}$`;
  
  try {
    return new RegExp(regexStr, 'i');
  } catch (e) {
    console.warn(`Invalid wildcard pattern in whitelist: ${pattern}`, e);
    return new RegExp('^$');
  }
}

/**
 * 判断 URL 是否在白名单中
 */
export function isInGotoWhitelist(url: string, whiteList?: string[]): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const patterns = whiteList || config.goto?.whiteList || [];
  if (!Array.isArray(patterns) || patterns.length === 0) return false;
  
  const urlToMatch = url.trim();
  
  return patterns.some(pattern => {
    if (!pattern || typeof pattern !== 'string') return false;
    const regex = whiteListPatternToRegex(pattern);
    return regex.test(urlToMatch);
  });
}

/**
 * 判断 URL 是否为友链
 */
export function isFriendlyLink(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const friendlyLinks = config.friendlyLink || [];
  if (!Array.isArray(friendlyLinks) || friendlyLinks.length === 0) return false;
  
  const urlToMatch = url.trim();
  
  return friendlyLinks.some(link => {
    if (!link?.link) return false;
    return link.link.trim() === urlToMatch;
  });
}

/**
 * 综合判断：是否应该将 URL 转换为 goto
 * 优先级：http 强制 > 白名单 > 友链配置
 */
export function shouldUseGoto(url: string): boolean {
  if (!isAbsoluteHttpUrl(url)) return false;
  
  // 1. http:// 强制走 goto（最高优先级）
  if (isHttpUrl(url)) return true;
  
  // 2. 白名单中的 URL 不走 goto
  if (isInGotoWhitelist(url)) return false;
  
  // 3. 友链根据配置决定
  if (isFriendlyLink(url)) {
    return config.goto?.friendlyLinkUseGoto === true;
  }
  
  // 4. 其他所有 https:// 外链都走 goto
  return true;
}

/**
 * 生成 goto 跳转链接
 */
export function toGotoHref(url: string): string {
  if (!url || typeof url !== 'string') return url;
  
  const gotoPath = config.goto?.path || '/tool/goto/';
  const encodedUrl = encodeURIComponent(url.trim());
  
  // http:// 强制添加 stop=true
  if (isHttpUrl(url)) {
    return `${gotoPath}?url=${encodedUrl}&stop=true`;
  }
  
  return `${gotoPath}?url=${encodedUrl}`;
}

/**
 * 判断是否为站内链接
 */
export function isInternalLink(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  
  // 相对路径、锚点、站内绝对路径
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return true;
  }
  
  // 检查是否为当前站点域名
  const siteUrl = config.siteUrl;
  if (siteUrl && trimmed.startsWith(siteUrl)) {
    return true;
  }
  
  return false;
}

/**
 * 智能处理链接：根据规则决定是否转换为 goto
 */
export function processLink(url: string): string {
  if (!url || typeof url !== 'string') return url;
  
  // 站内链接不处理
  if (isInternalLink(url)) return url;
  
  // 非 HTTP/HTTPS 协议不处理
  if (!isAbsoluteHttpUrl(url)) return url;
  
  // 根据规则决定是否转换为 goto
  if (shouldUseGoto(url)) {
    return toGotoHref(url);
  }
  
  return url;
}
