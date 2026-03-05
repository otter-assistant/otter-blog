import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import remarkCitation from '../remarkCitation';

describe('remarkCitation', () => {
  describe('场景 1: 纯文字引用', () => {
    it('应该将 {cite 百度一下} 转换为上标 [1]', async () => {
      const markdown = '这是一个引用{cite 百度一下}的示例';
      
      const processor = unified()
        .use(remarkParse)
        .use(remarkCitation);
      
      const tree = processor.parse(markdown);
      const file = { data: {} } as any;
      
      processor.runSync(tree, file);
      
      let foundCitation = false;
      visit(tree, 'citation', (node: any) => {
        foundCitation = true;
        expect(node.type).toBe('citation');
        expect(node.content).toBe('百度一下');
        expect(node.index).toBe(1);
      });
      
      expect(foundCitation).toBe(true);
      
      expect(file.data.citations).toBeDefined();
      expect(file.data.citations).toHaveLength(1);
      expect(file.data.citations[0]).toEqual({
        content: '百度一下',
        index: 1,
        type: 'text'
      });
    });
  });

  describe('场景 2: 链接引用', () => {
    it('应该将 {cite [百度](https://baidu.com)} 转换为上标 [1] 并收集链接', async () => {
      const markdown = '这是一个链接引用{cite [百度](https://baidu.com)}的示例';
      
      const processor = unified()
        .use(remarkParse)
        .use(remarkCitation);
      
      const tree = processor.parse(markdown);
      const file = { data: {} } as any;
      
      processor.runSync(tree, file);
      
      let foundCitation = false;
      visit(tree, 'citation', (node: any) => {
        foundCitation = true;
        expect(node.type).toBe('citation');
        expect(node.content).toBe('[百度](https://baidu.com)');
        expect(node.index).toBe(1);
      });
      
      expect(foundCitation).toBe(true);
      
      expect(file.data.citations).toBeDefined();
      expect(file.data.citations).toHaveLength(1);
      expect(file.data.citations[0]).toEqual({
        content: '[百度](https://baidu.com)',
        index: 1,
        type: 'link'
      });
    });
  });

  describe('场景 3: WikiLink 引用', () => {
    it('应该将 {cite [[其他文章]]} 转换为上标 [1] 并收集 WikiLink', async () => {
      const markdown = '这是一个 WikiLink 引用{cite [[其他文章]]}的示例';
      
      const processor = unified()
        .use(remarkParse)
        .use(remarkCitation);
      
      const tree = processor.parse(markdown);
      const file = { data: {} } as any;
      
      processor.runSync(tree, file);
      
      let foundCitation = false;
      visit(tree, 'citation', (node: any) => {
        foundCitation = true;
        expect(node.type).toBe('citation');
        expect(node.content).toBe('[[其他文章]]');
        expect(node.index).toBe(1);
      });
      
      expect(foundCitation).toBe(true);
      
      expect(file.data.citations).toBeDefined();
      expect(file.data.citations).toHaveLength(1);
      expect(file.data.citations[0]).toEqual({
        content: '[[其他文章]]',
        index: 1,
        type: 'wikilink'
      });
    });
  });

  describe('场景 4: 多个引用', () => {
    it('应该为多个引用顺序编号 [1], [2], [3]', async () => {
      const markdown = '第一个引用{cite 来源1}，第二个引用{cite 来源2}，第三个引用{cite 来源3}';
      
      const processor = unified()
        .use(remarkParse)
        .use(remarkCitation);
      
      const tree = processor.parse(markdown);
      const file = { data: {} } as any;
      
      processor.runSync(tree, file);
      
      const citationNodes: any[] = [];
      visit(tree, 'citation', (node: any) => {
        citationNodes.push(node);
      });
      
      expect(citationNodes).toHaveLength(3);
      expect(citationNodes[0].index).toBe(1);
      expect(citationNodes[0].content).toBe('来源1');
      expect(citationNodes[1].index).toBe(2);
      expect(citationNodes[1].content).toBe('来源2');
      expect(citationNodes[2].index).toBe(3);
      expect(citationNodes[2].content).toBe('来源3');
      
      expect(file.data.citations).toBeDefined();
      expect(file.data.citations).toHaveLength(3);
      expect(file.data.citations[0].index).toBe(1);
      expect(file.data.citations[1].index).toBe(2);
      expect(file.data.citations[2].index).toBe(3);
    });
  });

  describe('场景 5: 边界情况', () => {
    it('应该处理空引用 {cite }', async () => {
      const markdown = '这是一个空引用{cite }的示例';
      
      const processor = unified()
        .use(remarkParse)
        .use(remarkCitation);
      
      const tree = processor.parse(markdown);
      const file = { data: {} } as any;
      
      processor.runSync(tree, file);
      
      let citationCount = 0;
      visit(tree, 'citation', () => {
        citationCount++;
      });
      
      expect(citationCount).toBe(0);
      
      expect(file.data.citations).toBeUndefined();
    });

    it('应该处理特殊字符', async () => {
      const markdown = '特殊字符引用{cite 测试@#$%^&*()}的示例';
      
      const processor = unified()
        .use(remarkParse)
        .use(remarkCitation);
      
      const tree = processor.parse(markdown);
      const file = { data: {} } as any;
      
      processor.runSync(tree, file);
      
      let foundCitation = false;
      visit(tree, 'citation', (node: any) => {
        foundCitation = true;
        expect(node.content).toBe('测试@#$%^&*()');
        expect(node.index).toBe(1);
      });
      
      expect(foundCitation).toBe(true);
      expect(file.data.citations).toHaveLength(1);
      expect(file.data.citations[0].content).toBe('测试@#$%^&*()');
    });

    it('应该处理中文和空格', async () => {
      const markdown = '中文引用{cite 这 是 中 文 引 用}的示例';
      
      const processor = unified()
        .use(remarkParse)
        .use(remarkCitation);
      
      const tree = processor.parse(markdown);
      const file = { data: {} } as any;
      
      processor.runSync(tree, file);
      
      let foundCitation = false;
      visit(tree, 'citation', (node: any) => {
        foundCitation = true;
        expect(node.content).toBe('这 是 中 文 引 用');
        expect(node.index).toBe(1);
      });
      
      expect(foundCitation).toBe(true);
      expect(file.data.citations).toHaveLength(1);
    });
  });
});
