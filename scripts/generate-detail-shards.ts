/**
 * 构建时生成详情分片 JSON 文件
 * 
 * 按 3mo/6mo/1y/2y/all 分桶，仅处理 blog 内容
 * 每个分片包含文章的纯文本内容，用于详细搜索
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const CONTENT_DIR = join(ROOT_DIR, 'src/content/blog');
const OUTPUT_DIR = join(ROOT_DIR, 'public/search');

// 时间桶类型定义
type TimeBucket = '3mo' | '6mo' | '1y' | '2y' | 'all';

// 详情分片项
interface DetailShardItem {
  id: string;
  content: string;
  date: string;
}

// 详情分片
interface DetailShard {
  bucket: TimeBucket;
  items: DetailShardItem[];
}

// 文章 frontmatter
interface Frontmatter {
  title?: string;
  date?: string;
  hidden?: boolean;
  draft?: boolean;
}

// 时间桶天数阈值（从当前日期计算）
const BUCKET_DAYS: { bucket: TimeBucket; maxDays: number }[] = [
  { bucket: '3mo', maxDays: 90 },
  { bucket: '6mo', maxDays: 180 },
  { bucket: '1y', maxDays: 365 },
  { bucket: '2y', maxDays: 730 },
  { bucket: 'all', maxDays: Infinity },
];

/**
 * 递归获取目录下所有 markdown 文件
 */
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files;
}

/**
 * 解析 frontmatter
 */
function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter: Frontmatter = {};
  
  // 简单解析 YAML frontmatter
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    let value: string | boolean = line.slice(colonIndex + 1).trim();
    
    // 处理布尔值
    if (value === 'true') value = true as boolean;
    else if (value === 'false') value = false as boolean;
    // 移除引号
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    (frontmatter as Record<string, unknown>)[key] = value;
  }
  
  return { frontmatter, body };
}

/**
 * 生成文章 slug（基于文件路径）
 */
function generateSlug(filePath: string): string {
  const relativePath = relative(CONTENT_DIR, filePath);
  // 移除扩展名，将路径分隔符转换为 -
  const slug = relativePath
    .replace(/\.(md|mdx)$/i, '')
    .replace(/[\/\\]/g, '-')
    .toLowerCase();
  return slug;
}

/**
 * 将 Markdown 内容转换为纯文本
 * 移除所有 Markdown 语法标签
 */
function markdownToPlainText(markdown: string): string {
  let text = markdown;
  
  // 移除代码块
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]+`/g, ' ');
  
  // 移除图片
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, ' ');
  
  // 移除链接，保留文本
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // 移除标题标记
  text = text.replace(/^#{1,6}\s+/gm, ' ');
  
  // 移除粗体和斜体
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // 移除引用标记
  text = text.replace(/^>\s+/gm, ' ');
  
  // 移除列表标记
  text = text.replace(/^[\s]*[-*+]\s+/gm, ' ');
  text = text.replace(/^[\s]*\d+\.\s+/gm, ' ');
  
  // 移除水平线
  text = text.replace(/^[-*_]{3,}$/gm, ' ');
  
  // 移除 HTML 标签
  text = text.replace(/<[^>]+>/g, ' ');
  
  // 合并多个空白字符为单个空格
  text = text.replace(/\s+/g, ' ');
  
  // 移除首尾空白
  text = text.trim();
  
  return text;
}

/**
 * 根据日期确定文章所属的时间桶
 * 每个文章只属于一个桶（非重叠）
 */
function determineBucket(dateStr: string, now: Date): TimeBucket {
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    // 无效日期，放入 all 桶
    return 'all';
  }
  
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 从最近的桶开始检查
  for (const { bucket, maxDays } of BUCKET_DAYS) {
    if (diffDays <= maxDays) {
      return bucket;
    }
  }
  
  return 'all';
}

/**
 * 解析日期字符串为 ISO 8601 格式
 */
function parseDateToISO(dateStr: string | undefined): string {
  if (!dateStr) {
    return new Date().toISOString();
  }
  
  // 尝试解析各种日期格式
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  
  return date.toISOString();
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('开始生成详情分片...');
  
  // 确保输出目录存在
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // 获取所有 markdown 文件
  const files = await getMarkdownFiles(CONTENT_DIR);
  console.log(`找到 ${files.length} 个 markdown 文件`);
  
  const now = new Date();
  const buckets: Record<TimeBucket, DetailShardItem[]> = {
    '3mo': [],
    '6mo': [],
    '1y': [],
    '2y': [],
    'all': [],
  };
  
  // 处理每个文件
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      
      // 跳过隐藏和草稿文章
      if (frontmatter.hidden || frontmatter.draft) {
        continue;
      }
      
      // 生成 slug
      const slug = generateSlug(filePath);
      
      // 提取纯文本内容
      const plainText = markdownToPlainText(body);
      
      // 解析日期
      const isoDate = parseDateToISO(frontmatter.date);
      
      // 确定时间桶
      const bucket = determineBucket(isoDate, now);
      
      // 添加到对应桶
      buckets[bucket].push({
        id: slug,
        content: plainText,
        date: isoDate,
      });
    } catch (error) {
      console.error(`处理文件失败: ${filePath}`, error);
    }
  }
  
  // 生成每个桶的 JSON 文件
  for (const bucket of Object.keys(buckets) as TimeBucket[]) {
    const shard: DetailShard = {
      bucket,
      items: buckets[bucket],
    };
    
    const outputPath = join(OUTPUT_DIR, `detail-${bucket}.json`);
    await writeFile(outputPath, JSON.stringify(shard, null, 2), 'utf-8');
    
    console.log(`生成 ${bucket} 分片: ${buckets[bucket].length} 条记录 -> ${outputPath}`);
  }
  
  console.log('详情分片生成完成！');
}

// 执行脚本
main().catch((error) => {
  console.error('生成详情分片失败:', error);
  process.exit(1);
});
