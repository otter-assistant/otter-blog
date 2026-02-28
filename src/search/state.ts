import dayjs from 'dayjs';

/**
 * 时间桶类型
 * - '3mo': 最近3个月
 * - '6mo': 最近6个月
 * - '1y': 最近1年
 * - '2y': 最近2年
 * - 'all': 不限制时间
 */
export type TimeBucket = '3mo' | '6mo' | '1y' | '2y' | 'all';

/**
 * 时间桶常量数组，按加载顺序排列
 */
export const TIME_BUCKETS: readonly TimeBucket[] = [
  '3mo',
  '6mo',
  '1y',
  '2y',
  'all',
] as const;

/**
 * 搜索结果项接口
 */
export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  date?: Date;
  snippet?: string;
  matchType: 'title' | 'content';
}

/**
 * 搜索状态接口
 */
export interface SearchState {
  /** 当前时间桶 */
  currentBucket: TimeBucket;
  /** 已加载的时间桶集合 */
  loadedBuckets: Set<TimeBucket>;
  /** 当前搜索词 */
  query: string;
  /** 搜索结果 */
  results: SearchResultItem[];
  /** 是否正在加载 */
  loading: boolean;
  /** 是否启用正则搜索 */
  regexEnabled: boolean;
}

/**
 * 获取时间桶对应的起始日期
 * @param bucket 时间桶
 * @returns 起始日期，'all' 返回 null 表示不限制
 * @example
 * getBucketDateRange('3mo') // 返回 3 个月前的日期
 * getBucketDateRange('all') // 返回 null
 */
export function getBucketDateRange(bucket: TimeBucket): Date | null {
  switch (bucket) {
    case '3mo':
      return dayjs().subtract(3, 'month').toDate();
    case '6mo':
      return dayjs().subtract(6, 'month').toDate();
    case '1y':
      return dayjs().subtract(12, 'month').toDate();
    case '2y':
      return dayjs().subtract(24, 'month').toDate();
    case 'all':
      return null;
    default:
      // 类型保护，确保处理了所有情况
      const _exhaustiveCheck: never = bucket;
      return _exhaustiveCheck;
  }
}

/**
 * 获取下一个时间桶
 * @param current 当前时间桶
 * @returns 下一个时间桶，如果已是最后一个则返回 null
 * @example
 * getNextBucket('3mo') // 返回 '6mo'
 * getNextBucket('all') // 返回 null
 */
export function getNextBucket(current: TimeBucket): TimeBucket | null {
  const currentIndex = TIME_BUCKETS.indexOf(current);
  if (currentIndex === -1 || currentIndex >= TIME_BUCKETS.length - 1) {
    return null;
  }
  return TIME_BUCKETS[currentIndex + 1] ?? null;
}

/**
 * 创建初始搜索状态
 */
export function createInitialState(): SearchState {
  return {
    currentBucket: '3mo',
    loadedBuckets: new Set<TimeBucket>(),
    query: '',
    results: [],
    loading: false,
    regexEnabled: false,
  };
}

/**
 * 搜索状态机类
 * 管理分层搜索的时间桶加载和状态
 */
export class SearchStateMachine {
  private state: SearchState;

  constructor(initialState?: Partial<SearchState>) {
    this.state = {
      ...createInitialState(),
      ...initialState,
      // 确保 loadedBuckets 是 Set 实例
      loadedBuckets: initialState?.loadedBuckets
        ? new Set(initialState.loadedBuckets)
        : new Set(),
    };
  }

  /**
   * 获取当前状态（返回副本，避免外部修改）
   */
  getState(): Readonly<SearchState> {
    return {
      ...this.state,
      loadedBuckets: new Set(this.state.loadedBuckets),
    };
  }

  /**
   * 设置搜索词
   */
  setQuery(query: string): void {
    this.state.query = query;
  }

  /**
   * 设置正则搜索开关
   */
  setRegexEnabled(enabled: boolean): void {
    this.state.regexEnabled = enabled;
  }

  /**
   * 设置加载状态
   */
  setLoading(loading: boolean): void {
    this.state.loading = loading;
  }

  /**
   * 设置搜索结果
   */
  setResults(results: SearchResultItem[]): void {
    this.state.results = results;
  }

  /**
   * 追加搜索结果（用于合并不同桶的结果）
   */
  appendResults(results: SearchResultItem[]): void {
    // 使用 Map 去重，以 id 为 key
    const resultMap = new Map<string, SearchResultItem>();
    [...this.state.results, ...results].forEach((item) => {
      resultMap.set(item.id, item);
    });
    this.state.results = Array.from(resultMap.values());
  }

  /**
   * 标记当前桶为已加载
   */
  markCurrentBucketLoaded(): void {
    this.state.loadedBuckets.add(this.state.currentBucket);
  }

  /**
   * 加载下一个时间桶
   * @returns 下一个桶的标识，如果没有更多桶则返回 null
   */
  loadNextBucket(): TimeBucket | null {
    const nextBucket = getNextBucket(this.state.currentBucket);
    if (nextBucket === null) {
      return null;
    }
    this.state.currentBucket = nextBucket;
    return nextBucket;
  }

  /**
   * 检查是否已加载全部数据
   */
  isAllLoaded(): boolean {
    return this.state.currentBucket === 'all' &&
           this.state.loadedBuckets.has('all');
  }

  /**
   * 检查是否还有更多桶可加载
   */
  hasMoreBuckets(): boolean {
    return getNextBucket(this.state.currentBucket) !== null;
  }

  /**
   * 获取当前时间桶
   */
  getCurrentBucket(): TimeBucket {
    return this.state.currentBucket;
  }

  /**
   * 获取当前桶的日期范围
   */
  getCurrentDateRange(): Date | null {
    return getBucketDateRange(this.state.currentBucket);
  }

  /**
   * 重置状态到初始值
   */
  reset(): void {
    this.state = createInitialState();
  }

  /**
   * 重置状态但保留查询词和正则设置
   */
  resetForNewSearch(): void {
    const { query, regexEnabled } = this.state;
    this.state = {
      ...createInitialState(),
      query,
      regexEnabled,
    };
  }
}

// 导出默认实例工厂函数
export default function createSearchStateMachine(
  initialState?: Partial<SearchState>
): SearchStateMachine {
  return new SearchStateMachine(initialState);
}
