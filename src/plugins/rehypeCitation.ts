import { visit } from 'unist-util-visit';
import { processLink } from '../utils/goto.ts';
import type { Plugin } from 'unified';
import type { Element, Root, Text } from 'hast';

const rehypeCitation: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const citations: Array<{ id: number; content?: string; url?: string }> = [];
    
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Root | Element | undefined) => {
      if (node.tagName !== 'citation') return;
      if (index === undefined || !parent) return;
      
      const id = node.properties?.dataId;
      const content = node.properties?.dataContent;
      const url = node.properties?.dataUrl;
      
      if (id === undefined) return;
      
      const citationId = typeof id === 'number' ? id : parseInt(String(id), 10);
      
      citations.push({
        id: citationId,
        content: content ? String(content) : undefined,
        url: url ? String(url) : undefined,
      });
      
      const supNode: Element = {
        type: 'element',
        tagName: 'sup',
        properties: {
          className: ['citation-ref'],
        },
        children: [
          {
            type: 'element',
            tagName: 'a',
            properties: {
              href: `#ref-${citationId}`,
              className: ['text-primary'],
            },
            children: [
              {
                type: 'text',
                value: `[${citationId}]`,
              } as Text,
            ],
          },
        ],
      };
      
      parent.children.splice(index, 1, supNode);
    });
    
    if (citations.length === 0) return;
    
    citations.sort((a, b) => a.id - b.id);
    
    const listItems: Element[] = citations.map((citation) => {
      let itemContent: Array<Element | Text>;
      
      if (citation.url) {
        const processedUrl = processLink(citation.url);
        itemContent = [
          {
            type: 'element',
            tagName: 'a',
            properties: {
              href: processedUrl,
            },
            children: [
              {
                type: 'text',
                value: citation.content || citation.url,
              } as Text,
            ],
          },
        ];
      } else if (citation.content) {
        itemContent = [
          {
            type: 'text',
            value: citation.content,
          } as Text,
        ];
      } else {
        itemContent = [];
      }
      
      return {
        type: 'element',
        tagName: 'li',
        properties: {
          id: `ref-${citation.id}`,
        },
        children: itemContent,
      };
    });
    
    const citationsSection: Element = {
      type: 'element',
      tagName: 'section',
      properties: {
        className: ['citations', 'mt-8', 'pt-4', 'border-t', 'border-slate-200', 'dark:border-slate-700'],
      },
      children: [
        {
          type: 'element',
          tagName: 'h2',
          properties: {
            className: ['text-lg', 'font-bold', 'mb-4'],
          },
          children: [
            {
              type: 'text',
              value: '参考文献',
            } as Text,
          ],
        },
        {
          type: 'element',
          tagName: 'ol',
          properties: {
            className: ['list-decimal', 'list-inside', 'space-y-2', 'text-sm', 'text-slate-600', 'dark:text-slate-400'],
          },
          children: listItems,
        },
      ],
    };
    
    let inserted = false;
    
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'article' || inserted) return;
      
      node.children.push(citationsSection);
      inserted = true;
    });
    
    if (!inserted && citations.length > 0) {
      tree.children.push(citationsSection);
    }
  };
};

export default rehypeCitation;
