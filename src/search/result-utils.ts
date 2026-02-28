/**
 * 搜索结果工具函数
 * 
 * 提供搜索结果排序、渲染和标签转换功能
 */

import type { SearchResult, SearchItemType, HitSource } from './types';

// ==================== 标签映射 ====================

/**
 * 内容类型中文标签映射
 */
const TYPE_LABELS: Record<SearchItemType, string> = {
  blog: '博客',
  microblog: '微博',
  tool: '工具',
  friend: '友链',
};

/**
 * 命中来源中文标签映射
 */
const HIT_SOURCE_LABELS: Record<HitSource, string> = {
  title: '标题',
  detail: '正文',
};

/**
 * 获取内容类型的中文标签
 * @param type - 内容类型
 * @returns 中文标签
 */
export function getTypeLabel(type: SearchItemType): string {
  return TYPE_LABELS[type] || type;
}

/**
 * 获取命中来源的中文标签
 * @param hitSource - 命中来源
 * @returns 中文标签
 */
export function getHitSourceLabel(hitSource: HitSource): string {
  return HIT_SOURCE_LABELS[hitSource] || hitSource;
}

// ==================== 日期格式化 ====================

/**
 * 格式化日期为相对时间或绝对日期
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 格式化后的日期字符串
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 7天内显示相对时间
  if (diffDays < 0) {
    return '刚刚';
  } else if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}周前`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}个月前`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}年前`;
  }
}

/**
 * 格式化日期为绝对日期（YYYY-MM-DD）
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 格式化后的日期字符串
 */
function formatDateAbsolute(dateStr?: string): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// ==================== 排序逻辑 ====================

/**
 * 查找查询词在文本中的最早匹配位置（不区分大小写）
 * @param text - 要搜索的文本
 * @param query - 查询词
 * @returns 匹配位置，未匹配返回 Infinity
 */
function findMatchPosition(text: string, query: string): number {
  if (!text || !query) return Infinity;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  return lowerText.indexOf(lowerQuery);
}

/**
 * 比较两个日期（用于排序）
 * @param dateA - 第一个日期字符串
 * @param dateB - 第二个日期字符串
 * @returns 负数表示 A 更新，正数表示 B 更新
 */
function compareDates(dateA?: string, dateB?: string): number {
  // 有日期的排在前面
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  
  const timeA = new Date(dateA).getTime();
  const timeB = new Date(dateB).getTime();
  
  // 日期较新的排在前面（降序）
  return timeB - timeA;
}

/**
 * 排序搜索结果
 * 
 * 排序规则：
 * 1. 标题命中 > 详情命中（hitSource: title > detail）
 * 2. 相同命中来源时，匹配位置越靠前排名越高
 * 3. 日期较新的排在前面（作为 tie-breaker）
 * 
 * @param results - 搜索结果数组
 * @param query - 搜索查询词
 * @returns 排序后的搜索结果数组
 */
export function sortResults(results: SearchResult[], query: string): SearchResult[] {
  // 复制数组以避免修改原数组
  const sortedResults = [...results];
  
  sortedResults.sort((a, b) => {
    // 1. 标题命中优先于详情命中
    if (a.hitSource !== b.hitSource) {
      return a.hitSource === 'title' ? -1 : 1;
    }
    
    // 2. 相同命中来源时，比较匹配位置
    const textA = a.hitSource === 'title' ? a.title : (a.excerpt || a.description || '');
    const textB = b.hitSource === 'title' ? b.title : (b.excerpt || b.description || '');
    
    const posA = findMatchPosition(textA, query);
    const posB = findMatchPosition(textB, query);
    
    if (posA !== posB) {
      return posA - posB; // 位置越靠前，值越小，排名越高
    }
    
    // 3. 日期较新的排在前面
    return compareDates(a.date, b.date);
  });
  
  return sortedResults;
}

// ==================== 结果渲染 ====================

/**
 * 转义 HTML 特殊字符
 * @param text - 要转义的文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

/**
 * 高亮查询词（使用主题色）
 * @param text - 原始文本
 * @param query - 查询词
 * @returns 包含高亮标记的 HTML 字符串
 */
function highlightQuery(text: string, query: string): string {
  if (!query || !text) return escapeHtml(text);
  
  // 转义原始文本
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  
  // 使用正则进行不区分大小写的替换
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  return escapedText.replace(regex, '<mark class="bg-primary/20 text-primary rounded px-0.5">$1</mark>');
}

/**
 * 渲染单个搜索结果项
 * 
 * @param result - 搜索结果对象
 * @param query - 搜索查询词（用于高亮）
 * @returns HTML 字符串
 */
export function renderResultItem(result: SearchResult, query: string): string {
  const typeLabel = getTypeLabel(result.type);
  const hitSourceLabel = getHitSourceLabel(result.hitSource);
  const dateDisplay = formatDate(result.date);
  const dateTitle = formatDateAbsolute(result.date);
  
  // 高亮标题
  const highlightedTitle = highlightQuery(result.title, query);
  
  // 摘录内容：优先使用 excerpt，否则使用 description
  const excerptText = result.excerpt || result.description || '';
  const highlightedExcerpt = highlightQuery(excerptText, query);
  
  return `
<li class="group relative flex cursor-pointer select-none flex-col rounded-xl px-4 py-3 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors" 
    role="option" 
    tabindex="-1"
    data-url="${escapeHtml(result.url)}"
    data-id="${escapeHtml(result.id)}">
  <div class="flex items-center justify-between mb-1.5">
    <div class="flex items-center gap-2.5 overflow-hidden">
      <span class="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate result-title">
        ${highlightedTitle}
      </span>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <span class="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 result-type">
          ${typeLabel}
        </span>
        <span class="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary result-hit-source">
          ${hitSourceLabel}
        </span>
      </div>
    </div>
    <span class="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 result-date" title="${dateTitle}">
      ${dateDisplay}
    </span>
  </div>
  <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed result-excerpt">
    ${highlightedExcerpt}
  </p>
</li>
`.trim();
}

/**
 * 渲染搜索结果列表
 * 
 * @param results - 搜索结果数组
 * @param query - 搜索查询词
 * @returns HTML 字符串
 */
export function renderResultList(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return '';
  }
  
  return results.map(result => renderResultItem(result, query)).join('\n');
}
