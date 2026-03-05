import type { CitationNode } from './remarkCitation';
import type { Element, Nodes as HastNodes } from 'hast';
import type { Nodes as MdastNodes } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { loadAllPosts } from './remarkWikiLinks';

export function citationToHast(state: State, node: MdastNodes): HastNodes | Array<HastNodes> | null | undefined {
  if (node.type !== 'citation') {
    return null;
  }

  const citationNode = node as unknown as CitationNode;

  let dataUrl: string | undefined;
  let dataContent = citationNode.content;

  if (citationNode.contentType === 'link') {
    const linkMatch = citationNode.content.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
    if (linkMatch) {
      dataContent = linkMatch[1];
      dataUrl = linkMatch[2];
    }
  } else if (citationNode.contentType === 'wikilink') {
    const wikiMatch = citationNode.content.match(/^\[\[([^\]]+)\]\]$/);
    if (wikiMatch) {
      const title = wikiMatch[1].trim();
      dataContent = title;
      const posts = loadAllPosts();
      const post = posts.find(p => p.title.toLowerCase() === title.toLowerCase());
      if (post) {
        const slug = post.uri || post.slug;
        dataUrl = `/post/${slug}.html`;
      }
    }
  }

  const element: Element = {
    type: 'element',
    tagName: 'citation',
    properties: {
      dataId: citationNode.index,
      dataContent: dataContent,
      dataType: citationNode.contentType,
      ...(dataUrl && { dataUrl }),
    },
    children: [],
  };

  return element;
}
