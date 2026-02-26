import { type CollectionEntry } from 'astro:content';
import { generatePostSlug } from './index.ts';

export interface LinkMatch {
  title: string;
  slug: string;
  exists: boolean;
}

export function findPostByTitle(
  title: string,
  posts: CollectionEntry<'blog'>[]
): CollectionEntry<'blog'> | undefined {
  const normalizedTitle = title.trim().toLowerCase();
  
  return posts.find(post => {
    const postTitle = post.data.title.trim().toLowerCase();
    return postTitle === normalizedTitle;
  });
}

export function extractWikiLinks(content: string): string[] {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  
  return [...new Set(links)];
}

export function resolveWikiLink(
  linkText: string,
  posts: CollectionEntry<'blog'>[]
): LinkMatch {
  const post = findPostByTitle(linkText, posts);
  
  if (post) {
    return {
      title: post.data.title,
      slug: generatePostSlug(post),
      exists: true,
    };
  }
  
  return {
    title: linkText,
    slug: '',
    exists: false,
  };
}

export function findBacklinks(
  currentPostId: string,
  posts: CollectionEntry<'blog'>[]
): CollectionEntry<'blog'>[] {
  const currentPost = posts.find(p => p.id === currentPostId);
  
  if (!currentPost) {
    return [];
  }
  
  const currentTitle = currentPost.data.title.toLowerCase();
  const backlinks: CollectionEntry<'blog'>[] = [];
  
  for (const post of posts) {
    if (post.id === currentPostId) continue;
    
    const content = post.body || '';
    const wikiLinks = extractWikiLinks(content);
    
    const linksToCurrent = wikiLinks.some(link => 
      link.toLowerCase() === currentTitle
    );
    
    if (linksToCurrent) {
      backlinks.push(post);
    }
  }
  
  return backlinks;
}
