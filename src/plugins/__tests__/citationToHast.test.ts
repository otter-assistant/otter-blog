import { describe, it, expect, vi } from 'vitest';
import { citationToHast } from '../citationToHast';
import type { CitationNode } from '../remarkCitation';
import type { Element } from 'hast';

vi.mock('../remarkWikiLinks', () => ({
  loadAllPosts: vi.fn(() => [
    { title: 'Existing Post', slug: 'existing-post', id: 'existing.md' },
    { title: '已存在的文章', slug: 'existing-article', id: 'existing-article.md' }
  ])
}));

describe('citationToHast', () => {
  describe('场景 1: 纯文字引用', () => {
    it('纯文字引用应该设置 dataContent，不设置 dataUrl', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '这是纯文字',
        index: 1,
        contentType: 'text'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.type).toBe('element');
      expect(result.tagName).toBe('citation');
      expect(result.properties?.dataContent).toBe('这是纯文字');
      expect(result.properties?.dataId).toBe(1);
      expect(result.properties?.dataType).toBe('text');
      expect(result.properties?.dataUrl).toBeUndefined();
    });
  });

  describe('场景 2: 链接引用', () => {
    it('链接引用应该提取 URL 和文本', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[百度](https://baidu.com)',
        index: 1,
        contentType: 'link'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.type).toBe('element');
      expect(result.tagName).toBe('citation');
      expect(result.properties?.dataContent).toBe('百度');
      expect(result.properties?.dataUrl).toBe('https://baidu.com');
      expect(result.properties?.dataId).toBe(1);
      expect(result.properties?.dataType).toBe('link');
    });
  });

  describe('场景 3: WikiLink 引用 - 匹配成功', () => {
    it('WikiLink 引用匹配到文章时应该生成内部链接 URL', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[[Existing Post]]',
        index: 1,
        contentType: 'wikilink'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.type).toBe('element');
      expect(result.tagName).toBe('citation');
      expect(result.properties?.dataContent).toBe('Existing Post');
      expect(result.properties?.dataUrl).toBe('/post/existing-post.html');
      expect(result.properties?.dataId).toBe(1);
      expect(result.properties?.dataType).toBe('wikilink');
    });

    it('WikiLink 引用应该支持中文标题匹配', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[[已存在的文章]]',
        index: 2,
        contentType: 'wikilink'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.properties?.dataContent).toBe('已存在的文章');
      expect(result.properties?.dataUrl).toBe('/post/existing-article.html');
    });
  });

  describe('场景 4: WikiLink 引用 - 未匹配', () => {
    it('WikiLink 引用未匹配到文章时不应该设置 dataUrl', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[[Non-Existent Post]]',
        index: 1,
        contentType: 'wikilink'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.type).toBe('element');
      expect(result.tagName).toBe('citation');
      expect(result.properties?.dataContent).toBe('Non-Existent Post');
      expect(result.properties?.dataUrl).toBeUndefined();
      expect(result.properties?.dataId).toBe(1);
      expect(result.properties?.dataType).toBe('wikilink');
    });
  });

  describe('场景 5: 格式错误处理', () => {
    it('格式错误的链接应该降级为纯文本（不设置 dataUrl）', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[no closing paren](',
        index: 1,
        contentType: 'link'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.properties?.dataContent).toBe('[no closing paren](');
      expect(result.properties?.dataUrl).toBeUndefined();
      expect(result.properties?.dataId).toBe(1);
    });

    it('格式错误的 WikiLink 应该降级为纯文本', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[[unclosed wikilink',
        index: 1,
        contentType: 'wikilink'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.properties?.dataContent).toBe('[[unclosed wikilink');
      expect(result.properties?.dataUrl).toBeUndefined();
    });
  });

  describe('场景 6: 边界情况', () => {
    it('空链接文本应该正常处理', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[](https://example.com)',
        index: 1,
        contentType: 'link'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.properties?.dataContent).toBe('');
      expect(result.properties?.dataUrl).toBe('https://example.com');
    });

    it('WikiLink 中带空格的标题应该正常处理', () => {
      const node: CitationNode = {
        type: 'citation',
        content: '[[  Existing Post  ]]',
        index: 1,
        contentType: 'wikilink'
      };

      const result = citationToHast({} as any, node as any) as Element;

      expect(result.properties?.dataContent).toBe('Existing Post');
      expect(result.properties?.dataUrl).toBe('/post/existing-post.html');
    });
  });
});
