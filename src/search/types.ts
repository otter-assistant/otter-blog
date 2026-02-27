/**
 * 搜索索引数据结构与类型定义
 * 用于支持 blog/microblog/tools/friends 的分词搜索功能
 */

/**
 * 搜索来源类型
 * 定义搜索索引可覆盖的内容来源
 */
type SearchSourceType = 'blog' | 'microblog' | 'tool' | 'friend';

/**
 * 搜索命中类型
 * - title: 标题命中
 * - detail: 内容详情命中
 */
type SearchHitType = 'title' | 'detail';

/**
 * 时间分桶类型
 * 用于按时间范围过滤搜索结果
 * - 3mo: 最近3个月
 * - 6mo: 最近6个月
 * - 1y: 最近1年
 * - 2y: 最近2年
 * - all: 全部时间
 */
type TimeBucket = '3mo' | '6mo' | '1y' | '2y' | 'all';

/**
 * 标题索引项
 * 用于快速标题匹配，存储元数据信息
 */
type TitleIndexItem = {
  /** 唯一标识符，格式: `${type}:${slug}` */
  id: string;
  /** 内容来源类型 */
  type: SearchSourceType;
  /** 标题文本 */
  title: string;
  /** 访问 URI 路径 */
  uri: string;
  /** 发布日期 (ISO 8601 格式) */
  date?: string;
  /** 标签列表 */
  tags?: string[];
  /** 分类列表 */
  categories?: string[];
  /** 描述/摘要文本 */
  description?: string;
};

/**
 * 详情分片项
 * 用于内容正文搜索，存储纯文本内容
 */
type DetailShardItem = {
  /** 唯一标识符，与 TitleIndexItem.id 对应 */
  id: string;
  /** 内容来源类型 */
  type: SearchSourceType;
  /** 纯文本内容（已移除 Markdown/MDX 语法） */
  content: string;
  /** 发布日期 (ISO 8601 格式) */
  date?: string;
};

/**
 * 搜索结果项
 * 展示给用户的搜索结果数据结构
 */
type SearchResult = {
  /** 唯一标识符 */
  id: string;
  /** 内容来源类型 */
  type: SearchSourceType;
  /** 标题文本 */
  title: string;
  /** 访问 URI 路径 */
  uri: string;
  /** 命中类型：标题或内容详情 */
  hitType: SearchHitType;
  /** 命中上下文摘要（高亮关键词的片段） */
  excerpt: string;
  /** 发布日期 (ISO 8601 格式) */
  date?: string;
  /** 相关性得分（用于排序） */
  score: number;
};

/**
 * 搜索状态
 * 客户端搜索组件的运行时状态
 */
type SearchState = {
  /** 当前搜索查询字符串 */
  query: string;
  /** 当前选中的时间分桶 */
  bucket: TimeBucket;
  /** 搜索结果列表 */
  results: SearchResult[];
  /** 是否正在加载 */
  loading: boolean;
  /** 是否启用正则表达式搜索 */
  regexEnabled: boolean;
};

export type {
  SearchSourceType,
  SearchHitType,
  TimeBucket,
  TitleIndexItem,
  DetailShardItem,
  SearchResult,
  SearchState,
};
