/**
 * 数据源模块
 * 为搜索索引提供稳定的数据导出
 */

import config from '../config/index.ts';

/**
 * 工具数据类型定义
 */
export interface ToolItem {
  /** 工具名称 */
  name: string;
  /** 工具页面链接 */
  href: string;
  /** 工具描述 */
  description: string;
}

/**
 * 友链数据类型定义
 */
export interface FriendItem {
  /** 站点名称 */
  name: string;
  /** 站点链接 */
  link: string;
  /** 站点描述 */
  desc: string;
  /** 头像/图标链接 */
  img: string;
}

/**
 * 在线工具列表
 * 注意：此处数据应与 src/pages/tool/index.astro 中的 tools 保持同步
 */
const tools: ToolItem[] = [
  {
    name: 'URL 重定向',
    href: '/tool/goto',
    description: '安全的外链跳转工具，支持所有 URI 协议',
  },
  {
    name: 'Gzip 压缩率对比',
    href: '/tool/gzip-compare',
    description: '输入两段文本，实时对比它们的 Gzip 压缩率和大小',
  },
];

/**
 * 获取工具数据列表
 * @returns 工具数据数组
 */
export function getToolsData(): ToolItem[] {
  return tools;
}

/**
 * 获取友链数据列表
 * @returns 友链数据数组
 */
export function getFriendsData(): FriendItem[] {
  return config.friendlyLink;
}
