
## SearchBox 入口统一 (2026-02-27)

**变更**：删除 `src/components/SearchBox/index.ts`，保留 `src/scripts/search-box.ts` 为唯一入口

**原因**：
- `SearchBox/index.ts` hardcode 域名 `blog.eeymoo.com`
- `search-box.ts` 从 `data-site-url` 动态获取，更灵活

**入口引用链**：
```
Header.astro -> SearchBox.astro -> scripts/search-box.ts
```
