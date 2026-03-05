import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Link, Parent } from 'mdast';

export interface CitationNode {
  type: 'citation';
  content: string;
  index: number;
  contentType: 'text' | 'link' | 'wikilink';
}

export interface CitationData {
  content: string;
  index: number;
  type: 'text' | 'link' | 'wikilink';
}

declare module 'mdast' {
  interface RootContentMap {
    citation: CitationNode;
  }
}

interface CitationOptions {}

function detectContentType(content: string): 'text' | 'link' | 'wikilink' {
  if (/^\[[^\]]+\]\([^)]+\)$/.test(content)) {
    return 'link';
  }
  
  if (/^\[\[[^\]]+\]\]$/.test(content)) {
    return 'wikilink';
  }
  
  return 'text';
}

function reconstructLinkContent(link: Link): string {
  const text = link.children
    .filter((child): child is Text => child.type === 'text')
    .map(child => child.value)
    .join('');
  return `[${text}](${link.url})`;
}

function expandTextCitations(
  text: string,
  citations: CitationData[],
  getNextIndex: () => number,
): Array<Text | CitationNode> {
  const citationRegex = /\{cite\s+([^}]+)\}/g;
  const nodes: Array<Text | CitationNode> = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (!content) continue;

    const before = text.slice(lastIndex, match.index);
    if (before) {
      nodes.push({ type: 'text', value: before });
    }

    const currentIndex = getNextIndex();
    const contentType = detectContentType(content);

    nodes.push({
      type: 'citation',
      content,
      index: currentIndex,
      contentType,
    } as CitationNode);

    citations.push({ content, index: currentIndex, type: contentType });
    lastIndex = match.index + match[0].length;
  }

  const after = text.slice(lastIndex);
  if (after) {
    nodes.push({ type: 'text', value: after });
  }

  return nodes;
}

const remarkCitation: Plugin<[CitationOptions?], Root> = () => {
  return (tree: Root, file: any) => {
    if (!file.data) {
      file.data = {};
    }
    
    let citationIndex = 0;
    const citations: CitationData[] = [];
    const transformations: Array<() => void> = [];
    
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;
      
      const citationStartRegex = /\{cite\s+$/;
      const value = node.value;
      
      if (!citationStartRegex.test(value)) return;
      
      if (index + 1 >= parent.children.length) return;
      
      const nextNode = parent.children[index + 1];
      
      if (nextNode.type === 'link') {
        const linkNode = nextNode as Link;
        const linkContent = reconstructLinkContent(linkNode);
        
        if (index + 2 >= parent.children.length) return;
        
        const afterLinkNode = parent.children[index + 2];
        if (afterLinkNode.type !== 'text') return;
        
        const afterLinkText = (afterLinkNode as Text).value;
        const closeBraceMatch = afterLinkText.match(/^([^}]*)\}/);
        
        if (!closeBraceMatch) return;
        
        const content = linkContent;
        const contentType: 'link' = 'link';
        
        transformations.push(() => {
          const newNodes: Array<Text | CitationNode> = [];
          
          const beforeText = value.slice(0, value.lastIndexOf('{cite '));
          if (beforeText) {
            const expanded = expandTextCitations(
              beforeText, citations, () => ++citationIndex,
            );
            newNodes.push(...expanded);
          }
          
          citationIndex++;
          const currentIndex = citationIndex;
          
          const citationNode: CitationNode = {
            type: 'citation',
            content,
            index: currentIndex,
            contentType,
          };
          
          citations.push({
            content,
            index: currentIndex,
            type: contentType,
          });
          
          newNodes.push(citationNode);
          
          const afterCite = afterLinkText.slice(closeBraceMatch[0].length);
          if (afterCite) {
            newNodes.push({ type: 'text', value: afterCite });
          }
          
          parent.children.splice(index, 3, ...newNodes);
        });
      }
    });
    
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;
      
      const citationRegex = /\{cite\s+([^}]+)\}/g;
      const value = node.value;
      
      if (!citationRegex.test(value)) return;
      
      if (/\{cite\s+$/.test(value)) return;
      
      transformations.push(() => {
        const newNodes = expandTextCitations(value, citations, () => ++citationIndex);
        if (newNodes.length > 0) {
          parent.children.splice(index, 1, ...newNodes);
        }
      });
    });
    
    transformations.forEach(fn => fn());
    
    if (citations.length > 0) {
      file.data.citations = citations;
    }
  };
};

export default remarkCitation;
