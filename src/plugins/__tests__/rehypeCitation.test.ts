import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

// 注意：此插件尚未实现，测试应该失败（RED 阶段）
import rehypeCitation from '../rehypeCitation';

describe('rehypeCitation', () => {
  /**
   * 测试场景 1：上标渲染
   * citation 节点 → <sup><a href="#ref-1">[1]</a></sup>
   */
  it('应该将 citation 节点转换为上标链接', async () => {
    const html = `
      <article>
        <p>这是一段文本<citation data-id="1"></citation>。</p>
      </article>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeCitation);

    const tree = processor.parse(html);
    processor.runSync(tree);

    let foundSup = false;
    let foundLink = false;

    visit(tree, 'element', (node: Element) => {
      // 检查上标标签
      if (node.tagName === 'sup') {
        foundSup = true;
        expect(node.children).toBeDefined();
        expect(node.children!.length).toBeGreaterThan(0);
      }

      // 检查链接
      if (node.tagName === 'a' && node.properties?.href) {
        const href = node.properties.href as string;
        if (href.startsWith('#ref-')) {
          foundLink = true;
          expect(href).toBe('#ref-1');
        }
      }
    });

    expect(foundSup).toBe(true);
    expect(foundLink).toBe(true);
  });

  /**
   * 测试场景 2：参考文献区
   * 在 <article> 末尾插入 <section class="citations">
   */
  it('应该在 article 末尾插入参考文献区', async () => {
    const html = `
      <article>
        <p>第一段<citation data-id="1"></citation>。</p>
        <p>第二段<citation data-id="2"></citation>。</p>
      </article>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeCitation);

    const tree = processor.parse(html);
    processor.runSync(tree);

    let foundCitationSection = false;

    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'article') {
        const children = node.children?.filter(
          (child) => child.type === 'element'
        ) as Element[] | undefined;
        
        if (children && children.length > 0) {
          const lastElement = children[children.length - 1];
          if (lastElement.tagName === 'section') {
            const className = lastElement.properties?.className;
            if (
              className &&
              (Array.isArray(className)
                ? className.includes('citations')
                : String(className).includes('citations'))
            ) {
              foundCitationSection = true;
            }
          }
        }
      }
    });

    expect(foundCitationSection).toBe(true);
  });

  /**
   * 测试场景 3：参考文献项
   * <li id="ref-1">内容</li>
   */
  it('应该生成正确格式的参考文献列表项', async () => {
    const html = `
      <article>
        <p>这是一段文本<citation data-id="1" data-content="作者, 标题, 期刊, 2024"></citation>。</p>
      </article>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeCitation);

    const tree = processor.parse(html);
    processor.runSync(tree);

    let foundRefItem = false;

    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'li' && node.properties?.id) {
        const id = node.properties.id as string;
        if (id.startsWith('ref-')) {
          foundRefItem = true;
          expect(id).toBe('ref-1');
          // 检查列表项内容
          expect(node.children).toBeDefined();
          expect(node.children!.length).toBeGreaterThan(0);
        }
      }
    });

    expect(foundRefItem).toBe(true);
  });

  /**
   * 测试场景 4：外链处理
   * 链接经过 processLink 转换为 goto
   */
  it('应该将参考文献中的外链转换为 goto 链接', async () => {
    const html = `
      <article>
        <p>文本<citation data-id="1" data-url="https://example.com/paper"></citation>。</p>
      </article>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeCitation);

    const tree = processor.parse(html);
    processor.runSync(tree);

    let foundGotoLink = false;

    visit(tree, 'element', (node: Element) => {
      // 在参考文献区查找链接
      if (node.tagName === 'a' && node.properties?.href) {
        const href = node.properties.href as string;
        // 检查是否为 goto 链接
        if (href.startsWith('/tool/goto?url=')) {
          foundGotoLink = true;
          // 验证 URL 编码
          expect(href).toContain('https%3A%2F%2Fexample.com');
        }
      }
    });

    expect(foundGotoLink).toBe(true);
  });

  /**
   * 边界情况：多个 citation 节点
   */
  it('应该正确处理多个引用并按顺序编号', async () => {
    const html = `
      <article>
        <p>第一段<citation data-id="1"></citation>。</p>
        <p>第二段<citation data-id="2"></citation>。</p>
        <p>第三段<citation data-id="3"></citation>。</p>
      </article>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeCitation);

    const tree = processor.parse(html);
    processor.runSync(tree);

    const refIds: string[] = [];

    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'sup') {
        // 收集所有引用 ID
        const links = node.children?.filter(
          (child) =>
            child.type === 'element' &&
            (child as Element).tagName === 'a'
        ) as Element[] | undefined;
        
        if (links) {
          links.forEach((link) => {
            const href = link.properties?.href as string;
            if (href?.startsWith('#ref-')) {
              refIds.push(href);
            }
          });
        }
      }
    });

    // 验证顺序编号
    expect(refIds).toEqual(['#ref-1', '#ref-2', '#ref-3']);
  });

  /**
   * 边界情况：无 citation 节点
   */
  it('无引用时不应生成参考文献区', async () => {
    const html = `
      <article>
        <p>这是一段普通文本。</p>
      </article>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeCitation);

    const tree = processor.parse(html);
    processor.runSync(tree);

    let hasCitationSection = false;

    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'section') {
        const className = node.properties?.className;
        if (
          className &&
          (Array.isArray(className)
            ? className.includes('citations')
            : String(className).includes('citations'))
        ) {
          hasCitationSection = true;
        }
      }
    });

    expect(hasCitationSection).toBe(false);
  });

  /**
   * 边界情况：空 article
   */
  it('应该处理空 article 元素', async () => {
    const html = '<article></article>';

    const processor = unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeCitation);

    const tree = processor.parse(html);
    
    // 不应抛出错误
    expect(() => processor.runSync(tree)).not.toThrow();
  });
});
