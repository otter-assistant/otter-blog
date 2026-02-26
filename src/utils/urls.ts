import type { CollectionEntry } from 'astro:content';
import { generatePostSlug } from './index.ts';

type BlogEntry = CollectionEntry<'blog'>;

/**
 * 获取博客文章的相对 URL 路径
 * @param entry - 博客文章条目
 * @returns 相对 URL 路径，如 /post/slug.html
 */
export function getPostUrl(entry: BlogEntry): string {
  const slug = generatePostSlug(entry);
  return `/post/${slug}.html`;
}

/**
 * 获取博客文章的绝对 URL
 * @param entry - 博客文章条目
 * @param siteUrl - 站点 URL
 * @returns 绝对 URL
 */
export function getPostAbsUrl(entry: BlogEntry, siteUrl: string): string {
  return `${siteUrl}${getPostUrl(entry)}`;
}

/**
 * 获取微博客文章的相对 URL 路径
 * @param entry - 博客文章条目
 * @returns 相对 URL 路径，如 /microblog/slug
 */
export function getMicroblogUrl(entry: BlogEntry): string {
  const slug = generatePostSlug(entry);
  return `/microblog/${slug}`;
}

/**
 * 获取微博客文章的绝对 URL
 * @param entry - 博客文章条目
 * @param siteUrl - 站点 URL
 * @returns 绝对 URL
 */
export function getMicroblogAbsUrl(entry: BlogEntry, siteUrl: string): string {
  return `${siteUrl}${getMicroblogUrl(entry)}`;
}
