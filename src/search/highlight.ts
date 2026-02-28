/**
 * 文本高亮与上下文提取
 *
 * 用于搜索结果中的文本高亮显示和上下文摘要提取
 * 支持大小写不敏感匹配、CJK 字符处理
 */

/**
 * 检查字符是否为 CJK 字符
 * CJK 字符范围包括中文、日文、韩文等
 *
 * @param char - 要检查的字符
 * @returns 是否为 CJK 字符
 */
function isCJKChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;
  return (
    // CJK 统一汉字
    (code >= 0x4e00 && code <= 0x9fff) ||
    // CJK 扩展 A
    (code >= 0x3400 && code <= 0x4dbf) ||
    // CJK 扩展 B-F (需要代理对)
    (code >= 0x20000 && code <= 0x2ceaf) ||
    // CJK 兼容汉字
    (code >= 0xf900 && code <= 0xfaff) ||
    // CJK 兼容补充
    (code >= 0x2f800 && code <= 0x2fa1f) ||
    // CJK 符号和标点
    (code >= 0x3000 && code <= 0x303f) ||
    // 全角 ASCII、全角标点
    (code >= 0xff00 && code <= 0xffef) ||
    // 韩文字母
    (code >= 0xac00 && code <= 0xd7af) ||
    // 日文假名
    (code >= 0x3040 && code <= 0x30ff)
  );
}

/**
 * 转义 HTML 特殊字符
 * 防止 XSS 攻击，确保安全输出
 *
 * @param text - 原始文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 在文本中高亮匹配的搜索词
 *
 * 特性：
 * - 大小写不敏感匹配
 * - 保留原始文本的大小写
 * - 使用 `<mark>` 标签包裹匹配项
 * - 自动转义 HTML 特殊字符
 *
 * @param text - 原始文本
 * @param query - 搜索词
 * @returns 高亮后的 HTML 字符串
 *
 * @example
 * ```ts
 * highlightText('这是一段包含搜索关键词的文本', '搜索');
 * // 返回: '这是一段包含<mark class="text-primary bg-primary/20">搜索</mark>关键词的文本'
 * ```
 */
export function highlightText(text: string, query: string): string {
  // 参数校验
  if (!text || typeof text !== 'string') {
    return '';
  }
  if (!query || typeof query !== 'string') {
    return escapeHtml(text);
  }

  // 转义正则表达式特殊字符
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 创建大小写不敏感的正则表达式
  const regex = new RegExp(escapedQuery, 'gi');

  // 先转义 HTML，再添加高亮标记
  const escapedText = escapeHtml(text);

  // 由于已经转义，需要重新构建匹配
  // 找到所有匹配位置，然后逐个替换
  const matches: { start: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let searchPos = 0;

  while ((match = regex.exec(text)) !== null) {
    matches.push({ start: match.index, end: regex.lastIndex });
  }

  // 如果没有匹配，直接返回转义后的文本
  if (matches.length === 0) {
    return escapedText;
  }

  // 从后往前替换，避免位置偏移问题
  let result = escapedText;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end } = matches[i];
    const originalMatch = text.substring(start, end);
    const escapedMatch = escapeHtml(originalMatch);
    const replacement = `<mark class="text-primary bg-primary/20">${escapedMatch}</mark>`;

    // 计算转义后文本中的位置
    // 由于转义可能改变字符串长度，需要重新计算
    const beforeEscaped = escapeHtml(text.substring(0, start));
    const afterEscaped = escapeHtml(text.substring(end));
    result = beforeEscaped + replacement + afterEscaped;
  }

  return result;
}

/**
 * 从文本中提取包含搜索词的上下文片段
 *
 * 特性：
 * - 找到第一个匹配位置
 * - 提取匹配前后的上下文
 * - 添加省略号表示截断
 * - 正确处理 CJK 字符（避免截断半个字符）
 *
 * @param text - 原始文本
 * @param query - 搜索词
 * @param contextLength - 上下文长度（匹配前后各取的字符数），默认 100
 * @returns 提取的上下文片段，带省略号
 *
 * @example
 * ```ts
 * extractContext('这是一段很长的文本，包含搜索关键词，后面还有更多内容', '搜索', 10);
 * // 返回: '...文本，包含搜索关键词，后面...'
 * ```
 */
export function extractContext(
  text: string,
  query: string,
  contextLength: number = 100
): string {
  // 参数校验
  if (!text || typeof text !== 'string') {
    return '';
  }
  if (!query || typeof query !== 'string') {
    // 如果没有搜索词，返回文本开头的摘要
    return text.length <= contextLength * 2 ? text : text.substring(0, contextLength * 2) + '...';
  }

  // 查找匹配位置（大小写不敏感）
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  // 如果没有找到匹配，返回文本开头的摘要
  if (matchIndex === -1) {
    return text.length <= contextLength * 2 ? text : text.substring(0, contextLength * 2) + '...';
  }

  const matchEnd = matchIndex + query.length;

  // 计算上下文起始和结束位置
  let contextStart = Math.max(0, matchIndex - contextLength);
  let contextEnd = Math.min(text.length, matchEnd + contextLength);

  // 对于非 CJK 文本，尝试在单词边界截断
  // 如果起始位置不是文本开头，尝试找到合适的截断点
  if (contextStart > 0) {
    const firstChar = text[contextStart];
    // 如果第一个字符不是 CJK 字符，尝试找空格边界
    if (firstChar && !isCJKChar(firstChar)) {
      // 在前面一小段范围内找空格
      const searchStart = Math.max(0, contextStart - 20);
      const searchRange = text.substring(searchStart, contextStart + 1);
      const lastSpace = searchRange.lastIndexOf(' ');
      if (lastSpace > 0) {
        contextStart = searchStart + lastSpace + 1;
      }
    }
  }

  // 如果结束位置不是文本结尾，尝试找到合适的截断点
  if (contextEnd < text.length) {
    const lastChar = text[contextEnd - 1];
    // 如果最后一个字符不是 CJK 字符，尝试找空格边界
    if (lastChar && !isCJKChar(lastChar)) {
      // 在后面一小段范围内找空格
      const searchEnd = Math.min(text.length, contextEnd + 20);
      const searchRange = text.substring(contextEnd - 1, searchEnd);
      const firstSpace = searchRange.indexOf(' ');
      if (firstSpace > 0) {
        contextEnd = contextEnd - 1 + firstSpace;
      }
    }
  }

  // 构建结果字符串
  let result = '';

  // 添加前缀省略号
  if (contextStart > 0) {
    result += '...';
  }

  // 添加上下文内容
  result += text.substring(contextStart, contextEnd);

  // 添加后缀省略号
  if (contextEnd < text.length) {
    result += '...';
  }

  return result;
}

/**
 * 组合函数：提取上下文并高亮
 * 这是一个便捷函数，先提取上下文再进行高亮处理
 *
 * @param text - 原始文本
 * @param query - 搜索词
 * @param contextLength - 上下文长度，默认 100
 * @returns 高亮后的上下文片段
 *
 * @example
 * ```ts
 * extractAndHighlight('这是一段很长的文本，包含搜索关键词，后面还有更多内容', '搜索', 10);
 * // 返回: '...文本，包含<mark class="text-primary bg-primary/20">搜索</mark>关键词，后面...'
 * ```
 */
export function extractAndHighlight(
  text: string,
  query: string,
  contextLength: number = 100
): string {
  const context = extractContext(text, query, contextLength);
  return highlightText(context, query);
}
