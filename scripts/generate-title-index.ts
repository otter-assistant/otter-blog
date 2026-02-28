#!/usr/bin/env node
/**
 * 构建时生成 title index JSON
 * 读取 blog/microblog/tools/friends 数据，生成 TitleIndex JSON 文件
 */

import { writeFile as writeFileAsync, mkdir as mkdirAsync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const writeFile = promisify(writeFileAsync);
const mkdir = promisify(mkdirAsync);

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 类型定义（与 src/search/types.ts 保持一致）
type SearchItemType = 'blog' | 'microblog' | 'tool' | 'friend';

type TitleIndexItem = {
  id: string;
  type: SearchItemType;
  title: string;
  url: string;
  date?: string;
  description?: string;
};

type TitleIndex = TitleIndexItem[];

// 博客 frontmatter 类型
type BlogFrontmatter = {
  title?: string;
  date?: string;
  description?: string;
  categories?: string | string[];
  hidden?: boolean;
  draft?: boolean;
  uri?: string;
};

/**
 * 解析 Markdown 文件的 frontmatter
 * @param content - 文件内容
 * @returns frontmatter 对象
 */
function parseFrontmatter(content: string): BlogFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatterStr = match[1];
  const result: BlogFrontmatter = {};

  // 简单的 YAML 解析（仅支持基本类型）
  const lines = frontmatterStr.split('\n');
  let currentKey = '';
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // 数组项
    if (line.match(/^\s+-\s+(.+)$/)) {
      const value = line.match(/^\s+-\s+(.+)$/)?.[1]?.trim();
      if (currentArray !== null && value) {
        currentArray.push(value);
      }
      continue;
    }

    // 键值对
    const colonMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (colonMatch) {
      // 保存之前的数组
      if (currentArray !== null && currentKey) {
        (result as Record<string, string | string[] | boolean>)[currentKey] = currentArray;
        currentArray = null;
      }

      const key = colonMatch[1].trim();
      let value = colonMatch[2].trim();

      // 处理布尔值
      if (value === 'true') {
        (result as Record<string, string | string[] | boolean>)[key] = true;
        continue;
      }
      if (value === 'false') {
        (result as Record<string, string | string[] | boolean>)[key] = false;
        continue;
      }

      // 处理空数组（后续会有数组项）
      if (value === '') {
        currentKey = key;
        currentArray = [];
        continue;
      }

      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      (result as Record<string, string | string[] | boolean>)[key] = value;
    }
  }

  // 保存最后的数组
  if (currentArray !== null && currentKey) {
    (result as Record<string, string | string[] | boolean>)[currentKey] = currentArray;
  }

  return result;
}

/**
 * 从文件路径生成 slug（简化版 generatePostSlug）
 * @param filePath - 文件相对路径
 * @returns slug
 */
function generateSlugFromPath(filePath: string): string {
  // 移除扩展名
  let slug = filePath.replace(/\.(md|mdx)$/, '');
  // 移除路径分隔符，替换为 -
  slug = slug.replace(/[/\\]/g, '-');
  return slug;
}

/**
 * 递归遍历目录获取所有匹配扩展名的文件
 * @param dir - 目录路径
 * @param extensions - 文件扩展名数组
 * @returns 文件相对路径数组
 */
function globFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];

  function traverse(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        const ext = entry.name.split('.').pop()?.toLowerCase();
        if (ext && extensions.includes(ext)) {
          results.push(relative(dir, fullPath));
        }
      }
    }
  }

  traverse(dir);
  return results;
}

/**
 * 读取所有博客内容
 * @returns 博客条目数组
 */
function readBlogContent(): Array<{
  id: string;
  frontmatter: BlogFrontmatter;
  content: string;
}> {
  const blogDir = join(projectRoot, 'src/content/blog');
  const entries: Array<{ id: string; frontmatter: BlogFrontmatter; content: string }> = [];

  try {
    // 使用自定义 glob 获取所有 .md 和 .mdx 文件
    const files = globFiles(blogDir, ['md', 'mdx']);

    for (const file of files) {
      const filePath = join(blogDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      // 生成 ID（使用 uri 或文件路径）
      const id = frontmatter.uri || generateSlugFromPath(file);

      entries.push({
        id,
        frontmatter,
        content,
      });
    }
  } catch (error) {
    console.warn('读取博客内容时出错:', error);
  }

  return entries;
}

/**
 * 生成标题索引
 */
async function generateTitleIndex(): Promise<void> {
  const titleIndex: TitleIndex = [];

  // 1. 读取博客内容
  const blogEntries = await readBlogContent();

  // 2. 处理博客和微博客
  for (const entry of blogEntries) {
    const { id, frontmatter } = entry;

    // 跳过隐藏和草稿
    if (frontmatter.hidden === true || frontmatter.draft === true) {
      continue;
    }

    // 判断是否为微博客
    const isMicroblog = frontmatter.categories === 'microblog' ||
      (Array.isArray(frontmatter.categories) && frontmatter.categories.includes('microblog'));

    const type: SearchItemType = isMicroblog ? 'microblog' : 'blog';
    const url = isMicroblog ? `/microblog/${id}` : `/post/${id}.html`;

    // 获取标题
    const title = frontmatter.title || '无标题';

    // 格式化日期（ISO 8601）
    let date: string | undefined;
    if (frontmatter.date) {
      try {
        date = new Date(frontmatter.date).toISOString();
      } catch {
        date = undefined;
      }
    }

    titleIndex.push({
      id,
      type,
      title,
      url,
      date,
      description: frontmatter.description,
    });
  }

  // 3. 获取工具和友链数据（直接从源文件导入）
  try {
    const { getToolsData, getFriendsData } = await import('../src/search/data-sources.ts');

    // 添加工具
    const tools = getToolsData();
    for (const tool of tools) {
      titleIndex.push({
        id: tool.href,
        type: 'tool',
        title: tool.name,
        url: tool.href,
        description: tool.description,
      });
    }

    // 添加友链
    const friends = getFriendsData();
    for (const friend of friends) {
      titleIndex.push({
        id: friend.link,
        type: 'friend',
        title: friend.name,
        url: friend.link,
        description: friend.desc,
      });
    }
  } catch (error) {
    console.warn('导入 data-sources 失败，跳过工具和友链:', error);
  }

  // 4. 按日期排序（最新的在前）
  titleIndex.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // 5. 写入 JSON 文件
  const outputDir = join(projectRoot, 'public/search');
  const outputPath = join(outputDir, 'title-index.json');

  // 确保目录存在
  await mkdir(outputDir, { recursive: true });

  // 写入文件
  await writeFile(outputPath, JSON.stringify(titleIndex, null, 2), 'utf-8');

  console.log(`✅ 生成 title-index.json 成功`);
  console.log(`   路径: ${outputPath}`);
  console.log(`   条目数: ${titleIndex.length}`);
  console.log(`   - blog: ${titleIndex.filter(i => i.type === 'blog').length}`);
  console.log(`   - microblog: ${titleIndex.filter(i => i.type === 'microblog').length}`);
  console.log(`   - tool: ${titleIndex.filter(i => i.type === 'tool').length}`);
  console.log(`   - friend: ${titleIndex.filter(i => i.type === 'friend').length}`);
}

// 执行
generateTitleIndex().catch((error) => {
  console.error('生成 title-index.json 失败:', error);
  process.exit(1);
});
