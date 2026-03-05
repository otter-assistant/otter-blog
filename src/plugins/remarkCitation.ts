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
        
        citationIndex++;
        const currentIndex = citationIndex;
        const content = linkContent;
        const contentType: 'link' = 'link';
        
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
        
        transformations.push(() => {
          const newNodes: Array<Text | CitationNode> = [];
          
          const beforeText = value.slice(0, value.lastIndexOf('{cite '));
          if (beforeText) {
            newNodes.push({ type: 'text', value: beforeText });
          }
          
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
      
      citationRegex.lastIndex = 0;
      
      const newNodes: Array<Text | CitationNode> = [];
      let lastIndex = 0;
      let match;
      
      while ((match = citationRegex.exec(value)) !== null) {
        const content = match[1].trim();
        
        if (!content) continue;
        
        const beforeText = value.slice(lastIndex, match.index);
        
        if (beforeText) {
          newNodes.push({
            type: 'text',
            value: beforeText,
          });
        }
        
        citationIndex++;
        const currentIndex = citationIndex;
        
        const contentType = detectContentType(content);
        
        const citationNode: CitationNode = {
          type: 'citation',
          content,
          index: currentIndex,
          contentType,
        };
        
        newNodes.push(citationNode);
        
        citations.push({
          content,
          index: currentIndex,
          type: contentType,
        });
        
        lastIndex = match.index + match[0].length;
      }
      
      const afterText = value.slice(lastIndex);
      if (afterText) {
        newNodes.push({
          type: 'text',
          value: afterText,
        });
      }
      
      if (newNodes.length > 0) {
        transformations.push(() => {
          parent.children.splice(index, 1, ...newNodes);
        });
      }
    });
    
    transformations.forEach(fn => fn());
    
    if (citations.length > 0) {
      file.data.citations = citations;
    }
  };
};

export default remarkCitation;
