import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Link } from 'mdast';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

export interface PostData {
  title: string;
  slug: string;
  uri?: string;
  id: string;
}

let postsCache: PostData[] | null = null;

function extractTitle(content: string): string | null {
  const titleMatch = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractUri(content: string): string | undefined {
  const uriMatch = content.match(/^uri:\s*['"]?(.+?)['"]?\s*$/m);
  return uriMatch ? uriMatch[1].trim() : undefined;
}

export function generateSlug(title: string, id: string, uri?: string): string {
  if (uri) return uri;
  
  const baseName = basename(id, '.md').replace(/\.mdx$/, '');
  return baseName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\u4e00-\u9fa5]/g, '');
}

export function loadAllPosts(): PostData[] {
  if (postsCache) {
    return postsCache;
  }
  
  const blogDir = join(process.cwd(), 'src/content/blog');
  const posts: PostData[] = [];
  
  function scanDirectory(dir: string, basePath: string = '') {
    if (!existsSync(dir)) return;
    
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, join(basePath, item));
      } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const title = extractTitle(content);
          const uri = extractUri(content);
          
          if (title) {
            const id = join(basePath, item);
            posts.push({
              title,
              slug: generateSlug(title, id, uri),
              uri,
              id,
            });
          }
        } catch (error) {
          console.warn(`Failed to parse frontmatter for ${fullPath}:`, error);
        }
      }
    }
  }
  
  scanDirectory(blogDir);
  postsCache = posts;
  return posts;
}

interface WikiLinkOptions {}

const remarkWikiLinks: Plugin<[WikiLinkOptions?], Root> = () => {
  return (tree: Root) => {
    const posts = loadAllPosts();
    
    const transformations: Array<() => void> = [];
    
    visit(tree, 'text', (node: Text, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;
      
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
      const value = node.value;
      
      if (!wikiLinkRegex.test(value)) return;
      
      wikiLinkRegex.lastIndex = 0;
      
      const newNodes: Array<Text | Link> = [];
      let lastIndex = 0;
      let match;
      
      while ((match = wikiLinkRegex.exec(value)) !== null) {
        const linkText = match[1].trim();
        const beforeText = value.slice(lastIndex, match.index);
        
        if (beforeText) {
          newNodes.push({
            type: 'text',
            value: beforeText,
          });
        }
        
        const post = posts.find(p => 
          p.title.toLowerCase() === linkText.toLowerCase()
        );
        
        if (post) {
          const slug = post.uri || post.slug;
          newNodes.push({
            type: 'link',
            url: `/post/${slug}.html`,
            children: [{
              type: 'text',
              value: linkText,
            }],
          });
        } else {
          newNodes.push({
            type: 'text',
            value: linkText,
          });
        }
        
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
  };
};

export default remarkWikiLinks;
