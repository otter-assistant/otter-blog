/**
 * 内容提取器
 *
 * 用于从 Markdown/MDX 内容中提取纯文本，专为搜索索引设计
 * 支持 MDX 组件语法、HTML 实体解码、CJK 文本处理
 */

// ==================== HTML 实体映射表 ====================

/**
 * 常见 HTML 实体映射
 * 用于将 HTML 实体转换回原始字符
 */
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&bull;': '•',
  '&middot;': '·',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&deg;': '°',
  '&plusmn;': '±',
  '&times;': '×',
  '&divide;': '÷',
  '&euro;': '€',
  '&pound;': '£',
  '&yen;': '¥',
  '&cent;': '¢',
  '&sect;': '§',
  '&para;': '¶',
  '&dagger;': '†',
  '&Dagger;': '‡',
  '&laquo;': '«',
  '&raquo;': '»',
  '&lsquo;': ''',
  '&rsquo;': ''',
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&sbquo;': '‚',
  '&bdquo;': '„',
  '&larr;': '←',
  '&rarr;': '→',
  '&uarr;': '↑',
  '&darr;': '↓',
  '&harr;': '↔',
  '&lArr;': '⇐',
  '&rArr;': '⇒',
  '&uArr;': '⇑',
  '&dArr;': '⇓',
  '&hArr;': '⇔',
  '&spades;': '♠',
  '&clubs;': '♣',
  '&hearts;': '♥',
  '&diams;': '♦',
  '&alpha;': 'α',
  '&beta;': 'β',
  '&gamma;': 'γ',
  '&delta;': 'δ',
  '&epsilon;': 'ε',
  '&zeta;': 'ζ',
  '&eta;': 'η',
  '&theta;': 'θ',
  '&iota;': 'ι',
  '&kappa;': 'κ',
  '&lambda;': 'λ',
  '&mu;': 'μ',
  '&nu;': 'ν',
  '&xi;': 'ξ',
  '&omicron;': 'ο',
  '&pi;': 'π',
  '&rho;': 'ρ',
  '&sigma;': 'σ',
  '&tau;': 'τ',
  '&upsilon;': 'υ',
  '&phi;': 'φ',
  '&chi;': 'χ',
  '&psi;': 'ψ',
  '&omega;': 'ω',
};

// ==================== 辅助函数 ====================

/**
 * 解码 HTML 实体
 * 支持命名实体（&amp;）和数字实体（&#38; / &#x26;）
 * @param text - 包含 HTML 实体的文本
 * @returns 解码后的文本
 */
function decodeHtmlEntities(text: string): string {
  let result = text;

  // 1. 解码命名的 HTML 实体
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.split(entity).join(char);
  }

  // 2. 解码十进制数字实体 &#xxx;
  result = result.replace(/&#(\d+);/g, (_, code) => {
    const charCode = parseInt(code, 10);
    // 确保是有效的 Unicode 码点
    if (charCode > 0 && charCode <= 0x10ffff) {
      return String.fromCodePoint(charCode);
    }
    return '';
  });

  // 3. 解码十六进制数字实体 &#xHH;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
    const charCode = parseInt(code, 16);
    // 确保是有效的 Unicode 码点
    if (charCode > 0 && charCode <= 0x10ffff) {
      return String.fromCodePoint(charCode);
    }
    return '';
  });

  return result;
}

/**
 * 移除 MDX 组件标签
 * 处理自闭合组件 <Component /> 和成对组件 <Component>...</Component>
 * @param text - 包含 MDX 组件的文本
 * @returns 移除组件后的文本
 */
function removeMdxComponents(text: string): string {
  let result = text;

  // 1. 移除自闭合 MDX 组件 <Component /> 或 <Component prop="value" />
  // 匹配模式: <后跟大写字母开头的标签名，直到 />
  result = result.replace(/<[A-Z][a-zA-Z0-9_]*(\s+[^>]*)?\/>/g, '');

  // 2. 移除成对 MDX 组件 <Component>...</Component>
  // 需要递归处理嵌套的组件
  // 使用循环确保所有嵌套层级都被处理
  let previousResult: string;
  do {
    previousResult = result;
    // 匹配开始标签 <Component ...> 和对应的结束标签 </Component>
    result = result.replace(
      /<([A-Z][a-zA-Z0-9_]*)(\s+[^>]*)?>([\s\S]*?)<\/\1>/g,
      (_, _tagName, _attrs, innerContent) => {
        // 保留组件内部的内容（如果有文本）
        return innerContent;
      }
    );
  } while (result !== previousResult);

  return result;
}

/**
 * 移除 HTML 标签
 * @param text - 包含 HTML 标签的文本
 * @returns 移除标签后的文本
 */
function removeHtmlTags(text: string): string {
  return text
    // 移除 HTML 注释
    .replace(/<!--[\s\S]*?-->/g, '')
    // 移除自闭合 HTML 标签
    .replace(/<(\w+)(\s+[^>]*)?\/>/g, '')
    // 移除成对 HTML 标签，保留内容
    .replace(/<(\w+)(\s+[^>]*)?>([\s\S]*?)<\/\1>/g, '$3')
    // 移除剩余的未闭合标签
    .replace(/<[^>]+>/g, '');
}

// ==================== 主函数 ====================

/**
 * 从 Markdown/MDX 内容中提取纯文本
 * 移除所有 Markdown 语法、MDX 组件、HTML 标签，返回纯净的文本内容
 * 
 * @param content - Markdown/MDX 原始内容
 * @returns 提取的纯文本
 * 
 * @example
 * ```ts
 * const text = extractPlainText(`
 * ---
 * title: Hello
 * ---
 * ## 标题
 * 这是一段**加粗**的文字。
 * <CustomComponent prop="value" />
 * `);
 * // 返回: "标题 这是一段加粗的文字。"
 * ```
 */
export function extractPlainText(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let text = content;

  // 1. 移除 YAML frontmatter
  text = text.replace(/^---\n[\s\S]*?\n---\n?/, '');

  // 2. 移除 MDX 组件（必须在其他处理之前，避免组件内的特殊字符干扰）
  text = removeMdxComponents(text);

  // 3. 移除 HTML 标签和注释
  text = removeHtmlTags(text);

  // 4. 移除代码块（围栏式和缩进式）
  text = text
    // 围栏式代码块 ```...```
    .replace(/```[\s\S]*?```/g, '')
    // 波浪线代码块 ~~~...~~~
    .replace(/~~~[\s\S]*?~~~/g, '')
    // 缩进式代码块（4个空格或1个tab开头的行）
    .replace(/^( {4}|\t).+$/gm, '');

  // 5. 移除行内代码 `code`
  text = text.replace(/`[^`]+`/g, '');

  // 6. 移除 Markdown 标题标记
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 7. 移除 Markdown 格式标记
  text = text
    // 移除加粗 **text** 或 __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // 移除斜体 *text* 或 _text_（注意避免误匹配单词中的下划线）
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '$1')
    // 移除删除线 ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // 移除高亮 ==text==
    .replace(/==([^=]+)==/g, '$1')
    // 移除上标 ^text^
    .replace(/\^([^^]+)\^/g, '$1')
    // 移除下标 ~text~
    .replace(/~([^~]+)~/g, '$1');

  // 8. 移除链接和图片
  text = text
    // 移除图片 ![alt](url) 或 ![alt](url "title")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // 移除普通链接 [text](url) 或 [text](url "title")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除引用式链接 [text][ref] 或 [text]
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/\[([^\]]+)\](?!\()/g, '$1')
    // 移除链接定义 [ref]: url "title"
    .replace(/^\[[^\]]+\]:\s*.+$/gm, '');

  // 9. 移除引用块标记
  text = text.replace(/^>\s*/gm, '');

  // 10. 移除列表标记
  text = text
    // 无序列表 - * +
    .replace(/^[-*+]\s+/gm, '')
    // 有序列表 1. 2. etc.
    .replace(/^\d+\.\s+/gm, '')
    // 任务列表 - [ ] 或 - [x]
    .replace(/^[-*+]\s+\[[x ]?\]\s*/gmi, '');

  // 11. 移除表格
  text = text
    // 移除表格分隔行 |---|---|
    .replace(/^\|[-:|\s]+\|$/gm, '')
    // 移除表格行 | cell | cell |
    .replace(/\|([^|\n]+)\|/g, '$1 ')
    // 清理表格残留
    .replace(/\|+/g, ' ');

  // 12. 移除分隔线
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // 13. 移除脚注
  text = text
    // 移除脚注引用 [^1]
    .replace(/\[\^[^\]]+\]/g, '')
    // 移除脚注定义 [^1]: text
    .replace(/^\[\^[^\]]+\]:.*$/gm, '');

  // 14. 解码 HTML 实体
  text = decodeHtmlEntities(text);

  // 15. 清理空白字符
  text = text
    // 将换行符替换为空格
    .replace(/\n+/g, ' ')
    // 将多个连续空格压缩为一个
    .replace(/[ \t]+/g, ' ')
    // 移除首尾空白
    .trim();

  return text;
}

/**
 * 从纯文本中提取摘要
 * 智能截断文本，避免截断 CJK 字符（中文、日文、韩文等）
 * 
 * @param text - 纯文本内容
 * @param maxLength - 最大长度，默认 200 字符
 * @returns 截断后的摘要，超出部分添加省略号
 * 
 * @example
 * ```ts
 * const excerpt = extractExcerpt('这是一段很长的文本...', 50);
 * // 返回最多 50 个字符的摘要
 * ```
 */
export function extractExcerpt(text: string, maxLength: number = 200): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // 如果文本已经足够短，直接返回
  if (text.length <= maxLength) {
    return text;
  }

  // 截取指定长度的文本
  let excerpt = text.substring(0, maxLength);

  // 检查是否在 CJK 字符中间截断
  // CJK 字符范围：
  // - U+4E00 ~ U+9FFF: CJK 统一汉字
  // - U+3400 ~ U+4DBF: CJK 扩展 A
  // - U+20000 ~ U+2A6DF: CJK 扩展 B (需要代理对)
  // - U+2A700 ~ U+2B73F: CJK 扩展 C
  // - U+2B740 ~ U+2B81F: CJK 扩展 D
  // - U+2B820 ~ U+2CEAF: CJK 扩展 E
  // - U+F900 ~ U+FAFF: CJK 兼容汉字
  // - U+2F800 ~ U+2FA1F: CJK 兼容补充
  // - U+3000 ~ U+303F: CJK 符号和标点
  // - U+FF00 ~ U+FFEF: 全角 ASCII、全角标点
  // - U+AC00 ~ U+D7AF: 韩文字母
  // - U+3040 ~ U+30FF: 日文假名
  const isCJKChar = (char: string): boolean => {
    const code = char.codePointAt(0);
    if (code === undefined) return false;
    return (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df) ||
      (code >= 0x2a700 && code <= 0x2b73f) ||
      (code >= 0x2b740 && code <= 0x2b81f) ||
      (code >= 0x2b820 && code <= 0x2ceaf) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x2f800 && code <= 0x2fa1f) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0x3040 && code <= 0x30ff)
    );
  };

  // 如果最后一个字符是 CJK 字符，直接截断（CJK 不需要考虑单词边界）
  const lastChar = excerpt[excerpt.length - 1];
  if (lastChar && isCJKChar(lastChar)) {
    return excerpt.trim() + '...';
  }

  // 对于非 CJK 文本，尝试在单词边界截断
  // 查找最后一个空格的位置
  const lastSpaceIndex = excerpt.lastIndexOf(' ');

  // 如果最后一个空格在合理范围内（后半段），则在该处截断
  if (lastSpaceIndex > maxLength * 0.6) {
    excerpt = excerpt.substring(0, lastSpaceIndex);
  }

  return excerpt.trim() + '...';
}
