/**
 * 友链数据源
 * 重新导出 config 中的 friendlyLink，便于索引生成脚本使用
 */

import config from '../config/index.ts';

/** 友链类型（从 config types 导入） */
export type { FriendlyLink } from '../config/types.ts';

/** 友链列表 */
export const friendlyLink = config.friendlyLink;
