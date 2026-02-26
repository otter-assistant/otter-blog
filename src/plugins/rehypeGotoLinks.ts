import { visit } from 'unist-util-visit';
import { processLink } from '../utils/goto.ts';
import type { Plugin } from 'unified';
import type { Element, Root } from 'hast';

/**
 * Rehype 插件：将外链转换为 goto 跳转链接
 * 遵循规则：
 * 1. http:// 强制走 goto + stop=true
 * 2. 白名单不走 goto
 * 3. 友链根据配置决定
 * 4. 其他 https:// 外链都走 goto
 */
const rehypeGotoLinks: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      // 只处理 <a> 标签
      if (node.tagName !== 'a') return;
      
      // 检查是否有 href 属性
      if (!node.properties || !node.properties.href) return;
      
      const href = node.properties.href;
      
      // 只处理字符串类型的 href
      if (typeof href !== 'string') return;
      
      // 跳过空链接、锚点、相对路径等
      if (!href || href.startsWith('#') || href.startsWith('?')) return;
      
      // 使用工具函数处理链接
      const processedHref = processLink(href);
      
      // 如果链接被转换，更新 href 属性
      if (processedHref !== href) {
        node.properties.href = processedHref;
      }
    });
  };
};

export default rehypeGotoLinks;
