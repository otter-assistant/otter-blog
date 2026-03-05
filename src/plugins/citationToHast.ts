import type { CitationNode } from './remarkCitation';
import type { Element, Nodes as HastNodes } from 'hast';
import type { Nodes as MdastNodes } from 'mdast';
import type { State } from 'mdast-util-to-hast';

export function citationToHast(state: State, node: MdastNodes): HastNodes | Array<HastNodes> | null | undefined {
  if (node.type !== 'citation') {
    return null;
  }

  const citationNode = node as unknown as CitationNode;

  const element: Element = {
    type: 'element',
    tagName: 'citation',
    properties: {
      dataId: citationNode.index,
      dataContent: citationNode.content,
      contentType: citationNode.contentType,
    },
    children: [],
  };

  return element;
}
