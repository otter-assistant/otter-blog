/**
 * 内容集合条目的基础接口
 */
interface ContentEntry {
  id: string;
  collection?: string;
  data: {
    title?: string;
    date?: Date | string;
    hidden?: boolean;
    draft?: boolean;
    categories?: string;
    [key: string]: any;
  };
}

/**
 * 过滤内容的工具方法
 * @param posts - 需要过滤的内容数组
 * @param filterType - 过滤类型，可选，默认为 'default'，可选 'default' | 'microblog'
 * @returns 过滤后的内容数组
 * @description 过滤规则：
 *   1. 过滤掉 hidden === true 的内容
 *   2. 过滤掉 draft === true 的内容
 *   3. 过滤掉缺少必填字段（title、date）的内容
 *   4. 根据类型过滤 categories
 */
export function filterContent(posts: ContentEntry[], filterType: 'default' | 'microblog' = 'default'): ContentEntry[] {
  if (!Array.isArray(posts)) return [];
  
  // 通用过滤规则：过滤掉不合法的内容
  let filteredPosts = posts.filter(post => {
    if (!post?.data) return false;
    
    // 过滤隐藏的内容
    if (post.data.hidden === true) return false;
    
    // 过滤草稿内容
    if (post.data.draft === true) return false;
    
    // 过滤缺少必填字段的内容
    if (!post.data.title) return false;
    if (!post.data.date) return false;
    
    return true;
  });
  
  if (filterType === 'default') {
    // 默认过滤规则：过滤掉 categories === 'microblog' 的内容
    return filteredPosts.filter(post => post?.data?.categories !== 'microblog');
  } else if (filterType === 'microblog') {
    // microblog 过滤规则：只保留 categories === 'microblog' 的内容
    return filteredPosts.filter(post => post?.data?.categories === 'microblog');
  }
  // 其他类型暂不处理，返回过滤后的数组
  return filteredPosts;
}