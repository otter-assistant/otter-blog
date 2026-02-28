/**
 * 搜索索引生成脚本
 * 在构建时运行，生成 title-index.json 和 detail-*.json 分片
 * 
 * 使用: npx tsx scripts/generate-search-index.ts
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 类型定义（与 src/search/types.ts 保持一致）
type SearchSourceType = 'blog' | 'microblog' | 'tool' | 'friend';
type TimeBucket = '3mo' | '6mo' | '1y' | '2y' | 'all';

type TitleIndexItem = {
  id: string;
  type: SearchSourceType;
  title: string;
  uri: string;
  date?: string;
  tags?: string[];
  categories?: string[];
  description?: string;
};

type DetailShardItem = {
  id: string;
  type: SearchSourceType;
  content: string;
  date?: string;
};

// 时间桶边界计算
function getBucketDateRange(bucket: TimeBucket): Date | null {
  const now = new Date();
  switch (bucket) {
    case '3mo':
      return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo':
      return new Date(now.setMonth(now.getMonth() - 6));
    case '1y':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    case '2y':
      return new Date(now.setFullYear(now.getFullYear() - 2));
    case 'all':
      return null;
  }
}

// 从 Markdown 提取纯文本
function extractPlainText(content: string): string {
  let text = content;
  
  // 移除 frontmatter
  text = text.replace(/^---[\s\S]*?---\n?/, '');
  
  // 移除代码块
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  
  // 移除 HTML 标签
  text = text.replace(/<[^>]+>/g, '');
  
  // 移除 Markdown 链接语法
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // 移除 Markdown 图片语法
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  
  // 移除标题标记
  text = text.replace(/^#+\s+/gm, '');
  
  // 移除粗体/斜体
  text = text.replace(/[*_]+([^*_]+)[*_]+/g, '$1');
  
  // 移除列表标记
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');
  
  // 移除引用标记
  text = text.replace(/^>\s*/gm, '');
  
  // 移除水平线
  text = text.replace(/^[-*_]{3,}$/gm, '');
  
  // 压缩空白
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
}

// 判断文章属于哪个时间桶
function getArticleBucket(dateStr: string | undefined): TimeBucket {
  if (!dateStr) return 'all';
  
  const date = new Date(dateStr);
  const now = new Date();
  
  const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
  if (date >= threeMonthsAgo) return '3mo';
  
  const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
  if (date >= sixMonthsAgo) return '6mo';
  
  const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
  if (date >= oneYearAgo) return '1y';
  
  const twoYearsAgo = new Date(now.setFullYear(now.getFullYear() - 2));
  if (date >= twoYearsAgo) return '2y';
  
  return 'all';
}

// 读取内容目录中的 Markdown 文件
function readMarkdownFiles(contentDir: string): Array<{ id: string; content: string; frontmatter: Record<string, any> }> {
  const results: Array<{ id: string; content: string; frontmatter: Record<string, any> }> = [];
  
  if (!existsSync(contentDir)) {
    return results;
  }
  
  const files = readdirSync(contentDir, { recursive: true }) as string[];
  
  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    
    const filePath = join(contentDir, file);
    const rawContent = readFileSync(filePath, 'utf-8');
    
    // 解析 frontmatter
    const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter: Record<string, any> = {};
    
    if (frontmatterMatch) {
      const fmContent = frontmatterMatch[1];
      const lines = fmContent.split('\n');
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();
          
          // 处理数组
          if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
          } else if (value.startsWith('"') || value.startsWith("'")) {
            value = value.slice(1, -1);
          }
          
          frontmatter[key] = value;
        }
      }
    }
    
    results.push({
      id: file.replace(/\.(md|mdx)$/, ''),
      content: rawContent,
      frontmatter
    });
  }
  
  return results;
}

// 生成 slug
function generateSlug(id: string, title: string): string {
  // 简单的 slug 生成：使用 id 或从标题生成
  const slug = id
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `post-${Date.now()}`;
}

// 主函数
async function main() {
  console.log('🔍 开始生成搜索索引...');
  
  const rootDir = join(__dirname, '..');
  const contentDir = join(rootDir, 'src/content/blog');
  const publicDir = join(rootDir, 'public/search');
  
  // 确保输出目录存在
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }
  
  const titleIndex: TitleIndexItem[] = [];
  const detailBuckets: Record<TimeBucket, DetailShardItem[]> = {
    '3mo': [],
    '6mo': [],
    '1y': [],
    '2y': [],
    'all': []
  };
  
  // 读取 blog 内容
  const blogFiles = readMarkdownFiles(contentDir);
  console.log(`📄 发现 ${blogFiles.length} 篇文章`);
  
  for (const file of blogFiles) {
    const { id, content, frontmatter } = file;
    
    // 跳过隐藏文章
    if (frontmatter.hidden === true) continue;
    
    const type: SearchSourceType = frontmatter.categories === 'microblog' ? 'microblog' : 'blog';
    const slug = frontmatter.uri || generateSlug(id, frontmatter.title || '');
    const uri = type === 'microblog' 
      ? `/microblog/${slug}` 
      : `/post/${slug}.html`;
    const date = frontmatter.date ? String(frontmatter.date) : undefined;
    
    // 标题索引
    titleIndex.push({
      id: `${type}:${slug}`,
      type,
      title: frontmatter.title || id,
      uri,
      date,
      tags: frontmatter.tags,
      categories: frontmatter.categories,
      description: frontmatter.description
    });
    
    // 详情分片
    const plainText = extractPlainText(content);
    const bucket = getArticleBucket(date);
    
    detailBuckets[bucket].push({
      id: `${type}:${slug}`,
      type,
      content: plainText.slice(0, 5000), // 限制内容长度
      date
    });
  }
  
  // 添加工具页面
  const tools = [
    { name: 'URL 重定向', href: '/tool/goto', description: '安全的外链跳转工具，支持所有 URI 协议' },
    { name: 'Gzip 压缩率对比', href: '/tool/gzip-compare', description: '输入两段文本，实时对比它们的 Gzip 压缩率和大小' },
  ];
  
  for (const tool of tools) {
    titleIndex.push({
      id: `tool:${tool.href}`,
      type: 'tool',
      title: tool.name,
      uri: tool.href,
      description: tool.description
    });
  }
  
  // 添加友链
  const friendlyLinks = [
    { name: 'jellyfin', link: 'https://jellyfin-cn.eeymoo.com/', desc: '为中国大陆用户提供高速稳定的 jellyfin 插件镜像服务' },
    { name: 'zeroanon', link: 'https://zeroanon.com/', desc: '不做圣经里腐朽的诗集，要做禁书里最惊世骇俗的篇章' },
    { name: 'dreamytzk', link: 'https://www.antmoe.com/', desc: '' },
    { name: "lhDream's Blog", link: 'https://blog.luhua.site/', desc: '技术、游戏、生活 | 我的个人空间' },
  ];
  
  for (const friend of friendlyLinks) {
    titleIndex.push({
      id: `friend:${friend.name}`,
      type: 'friend',
      title: friend.name,
      uri: friend.link,
      description: friend.desc
    });
  }
  
  // 写入索引文件
  const titleIndexPath = join(publicDir, 'title-index.json');
  writeFileSync(titleIndexPath, JSON.stringify(titleIndex, null, 2), 'utf-8');
  console.log(`✅ 标题索引: ${titleIndex.length} 条目 -> ${titleIndexPath}`);
  
  // 写入详情分片
  for (const bucket of ['3mo', '6mo', '1y', '2y', 'all'] as TimeBucket[]) {
    const detailPath = join(publicDir, `detail-${bucket}.json`);
    writeFileSync(detailPath, JSON.stringify(detailBuckets[bucket], null, 2), 'utf-8');
    console.log(`✅ 详情分片 ${bucket}: ${detailBuckets[bucket].length} 条目 -> ${detailPath}`);
  }
  
  console.log('🎉 搜索索引生成完成!');
}

main().catch(console.error);
