#!/usr/bin/env node
/**
 * 从 otter-content 仓库同步博客内容到本地
 * 用途：在构建前从外部内容仓库拉取最新的博客文章
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONTENT_REPO = process.env.CONTENT_REPO || 'https://github.com/otter-assistant/otter-content.git';
const CONTENT_BRANCH = process.env.CONTENT_BRANCH || 'main';
const LOCAL_CONTENT_DIR = join(process.cwd(), 'src', 'content', 'blog');
const TEMP_CLONE_DIR = join(process.cwd(), '.temp-content');

console.log('🔄 开始同步博客内容...');
console.log(`📦 内容仓库: ${CONTENT_REPO}`);
console.log(`🌿 分支: ${CONTENT_BRANCH}`);
console.log(`📁 本地目录: ${LOCAL_CONTENT_DIR}`);

try {
  if (existsSync(TEMP_CLONE_DIR)) {
    console.log('🧹 清理临时目录...');
    rmSync(TEMP_CLONE_DIR, { recursive: true, force: true });
  }

  if (existsSync(LOCAL_CONTENT_DIR)) {
    console.log('🧹 清理本地内容目录...');
    rmSync(LOCAL_CONTENT_DIR, { recursive: true, force: true });
  }
  mkdirSync(LOCAL_CONTENT_DIR, { recursive: true });

  console.log('⬇️  克隆内容仓库...');
  execSync(
    `git clone --depth 1 --branch ${CONTENT_BRANCH} ${CONTENT_REPO} ${TEMP_CLONE_DIR}`,
    { stdio: 'inherit' }
  );

  console.log('📋 复制内容文件...');
  const contentSource = join(TEMP_CLONE_DIR, 'blog');
  
  if (!existsSync(contentSource)) {
    throw new Error(`❌ 内容目录不存在: ${contentSource}`);
  }

  if (process.platform === 'linux' || process.platform === 'darwin') {
    execSync(
      `rsync -av --exclude='.git' ${contentSource}/ ${LOCAL_CONTENT_DIR}/`,
      { stdio: 'inherit' }
    );
  } else {
    // Windows 兼容性处理
    execSync(
      `xcopy "${contentSource}" "${LOCAL_CONTENT_DIR}" /E /I /Y`,
      { stdio: 'inherit' }
    );
  }

  console.log('🧹 清理临时目录...');
  rmSync(TEMP_CLONE_DIR, { recursive: true, force: true });

  console.log('✅ 内容同步完成！');
  
  const count = execSync(
    `find ${LOCAL_CONTENT_DIR} -type f \\( -name "*.md" -o -name "*.mdx" \\) | wc -l`,
    { encoding: 'utf-8' }
  ).trim();
  console.log(`📊 同步了 ${count} 个文件`);

} catch (error) {
  console.error('❌ 同步失败:', error);
  
  if (existsSync(TEMP_CLONE_DIR)) {
    rmSync(TEMP_CLONE_DIR, { recursive: true, force: true });
  }
  
  process.exit(1);
}
