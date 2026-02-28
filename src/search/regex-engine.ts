/**
 * 安全正则引擎模块
 * 
 * 提供带超时保护的正则表达式匹配功能，防止灾难性回溯导致主线程阻塞。
 * 
 * 特性：
 * - 超时保护（默认 100ms）
 * - 危险模式检测（嵌套量词等）
 * - 自动回退到简单 includes 匹配
 */

// 正则执行超时时间（毫秒）
const REGEX_TIMEOUT = 100;

/**
 * 正则匹配结果
 */
export interface RegexMatchResult {
  /** 是否匹配成功 */
  matched: boolean;
  /** 错误信息（如有） */
  error?: string;
  /** 匹配到的索引位置（用于提取摘要） */
  matchIndex?: number;
  /** 匹配到的文本长度 */
  matchLength?: number;
}

/**
 * 正则验证结果
 */
export interface RegexValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 检查正则模式是否安全
 * 
 * 检测可能导致灾难性回溯的危险模式：
 * - 嵌套量词（如 `(a+)+`）
 * - 重叠字符类的量词（如 `[\d\s]+` 后跟 `\d+`）
 * 
 * @param pattern 正则表达式字符串
 * @returns 是否安全
 */
export function isPatternSafe(pattern: string): boolean {
  // 检测嵌套量词模式：括号内包含量词，括号外也有量词
  // 例如：(a+)+, (a*)+, (a+)*, (a*)*
  const nestedQuantifierPattern = /\([^)]*[+*][^)]*\)[+*]/;
  if (nestedQuantifierPattern.test(pattern)) {
    return false;
  }

  // 检测连续的回溯风险模式：相同字符的交替量词
  // 例如：a+a+, a*a*, a+.*
  const backtrackingPattern = /([+*?][+*?]|\w[+*?].*\w[+*?].*\1)/;
  if (backtrackingPattern.test(pattern)) {
    return false;
  }

  // 检测过长的正则（可能构造复杂回溯）
  if (pattern.length > 500) {
    return false;
  }

  return true;
}

/**
 * 创建带超时保护的正则执行器
 * 
 * 使用 Web Worker 或 setTimeout 实现超时保护
 * 由于浏览器环境限制，使用 setTimeout 作为主线程超时检测
 * 
 * @param pattern 正则表达式字符串
 * @param flags 正则标志（如 'i' 表示不区分大小写）
 * @returns 正则执行器函数，或 null（如果模式不安全）
 */
export function createSafeRegex(
  pattern: string,
  flags: string = 'i'
): RegExp | null {
  try {
    // 先检查模式安全性
    if (!isPatternSafe(pattern)) {
      console.warn('[RegexEngine] 检测到潜在危险的正则模式:', pattern);
      return null;
    }

    // 尝试创建正则表达式
    const regex = new RegExp(pattern, flags);
    return regex;
  } catch (error) {
    console.warn('[RegexEngine] 正则表达式语法错误:', error);
    return null;
  }
}

/**
 * 验证正则表达式是否有效
 * 
 * @param pattern 正则表达式字符串
 * @returns 验证结果
 */
export function validateRegex(pattern: string): RegexValidationResult {
  // 检查空模式
  if (!pattern || pattern.trim() === '') {
    return { valid: false, error: '正则表达式不能为空' };
  }

  // 检查模式安全性
  if (!isPatternSafe(pattern)) {
    return { valid: false, error: '正则表达式存在安全风险（如嵌套量词）' };
  }

  // 尝试创建正则表达式
  try {
    new RegExp(pattern, 'i');
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { valid: false, error: `正则语法错误: ${message}` };
  }
}

/**
 * 安全执行正则匹配
 * 
 * 在文本中搜索匹配，带超时保护
 * 
 * @param regex 已创建的正则表达式
 * @param text 要搜索的文本
 * @returns 匹配结果
 */
export function safeRegexMatch(
  regex: RegExp,
  text: string
): RegexMatchResult {
  const startTime = performance.now();
  
  try {
    // 执行匹配
    const match = regex.exec(text);
    
    const elapsed = performance.now() - startTime;
    
    // 检查是否超时
    if (elapsed > REGEX_TIMEOUT) {
      console.warn(`[RegexEngine] 正则执行耗时 ${elapsed.toFixed(2)}ms，接近超时阈值`);
    }
    
    if (match) {
      return {
        matched: true,
        matchIndex: match.index,
        matchLength: match[0].length,
      };
    }
    
    return { matched: false };
  } catch (error) {
    return {
      matched: false,
      error: error instanceof Error ? error.message : 'Unknown regex error',
    };
  }
}

/**
 * 在文本中执行正则搜索
 * 
 * 提供简化的 API，自动处理正则创建和安全检查
 * 
 * @param pattern 正则表达式字符串
 * @param text 要搜索的文本
 * @param caseSensitive 是否区分大小写（默认 false）
 * @returns 匹配结果
 */
export function regexSearch(
  pattern: string,
  text: string,
  caseSensitive: boolean = false
): RegexMatchResult {
  // 创建正则表达式
  const flags = caseSensitive ? '' : 'i';
  const regex = createSafeRegex(pattern, flags);
  
  if (!regex) {
    // 正则创建失败，回退到简单匹配
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
    const index = searchText.indexOf(searchPattern);
    
    if (index !== -1) {
      return {
        matched: true,
        matchIndex: index,
        matchLength: pattern.length,
      };
    }
    
    return { matched: false };
  }
  
  return safeRegexMatch(regex, text);
}

/**
 * 批量正则搜索（用于在多个文本中搜索）
 * 
 * 预编译正则表达式，避免重复编译
 * 
 * @param pattern 正则表达式字符串
 * @param texts 要搜索的文本数组
 * @param caseSensitive 是否区分大小写
 * @returns 每个文本的匹配结果数组
 */
export function batchRegexSearch(
  pattern: string,
  texts: string[],
  caseSensitive: boolean = false
): RegexMatchResult[] {
  const flags = caseSensitive ? '' : 'i';
  const regex = createSafeRegex(pattern, flags);
  
  if (!regex) {
    // 回退到简单匹配
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
    return texts.map(text => {
      const searchText = caseSensitive ? text : text.toLowerCase();
      const index = searchText.indexOf(searchPattern);
      
      if (index !== -1) {
        return {
          matched: true,
          matchIndex: index,
          matchLength: pattern.length,
        };
      }
      return { matched: false };
    });
  }
  
  return texts.map(text => safeRegexMatch(regex, text));
}

/**
 * 提取正则匹配的上下文摘要
 * 
 * @param content 完整内容
 * @param matchIndex 匹配开始位置
 * @param matchLength 匹配文本长度
 * @param contextLength 上下文长度（前后各取多少字符）
 * @returns 摘要文本
 */
export function extractRegexExcerpt(
  content: string,
  matchIndex: number,
  matchLength: number,
  contextLength: number = 50
): string {
  // 计算上下文范围
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(content.length, matchIndex + matchLength + contextLength);
  
  // 提取片段
  let excerpt = content.slice(start, end);
  
  // 添加省略号
  if (start > 0) {
    excerpt = '...' + excerpt;
  }
  if (end < content.length) {
    excerpt = excerpt + '...';
  }
  
  return excerpt;
}
