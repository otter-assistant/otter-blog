import type { TitleIndexItem, DetailShardItem, SearchResult } from "../search/types";

let titleIndex: TitleIndexItem[] | null = null;
let detail3mo: DetailShardItem[] | null = null;
let isInitialized = false;

export async function initSearchCore() {
  if (isInitialized) return;
  isInitialized = true;

  const modal = document.getElementById("search-modal");
  const input = document.getElementById("modal-search-input") as HTMLInputElement;
  const closeBtn = document.getElementById("close-modal");
  const resultsContainer = document.getElementById("search-results");
  const emptyState = document.getElementById("search-empty-state");
  const loadingState = document.getElementById("search-loading-state");

  if (!modal || !input || !closeBtn || !resultsContainer || !emptyState || !loadingState) {
    return;
  }

  // Close modal logic
  const closeModal = () => {
    modal.classList.add("hidden");
    input.value = "";
    renderResults([]);
    emptyState.classList.remove("hidden");
  };

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal || (e.target as HTMLElement).classList.contains("backdrop-blur-sm")) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // Load data
  const loadData = async () => {
    try {
      if (!titleIndex) {
        const res = await fetch("/search/title-index.json");
        if (res.ok) titleIndex = await res.json();
      }
      if (!detail3mo) {
        const res = await fetch("/search/detail-3mo.json");
        if (res.ok) detail3mo = await res.json();
      }
    } catch (error) {
      console.error("Failed to load search index:", error);
    }
  };

  // Highlight function
  const highlight = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="text-primary bg-transparent font-medium">$1</mark>');
  };

  // Excerpt function
  const getExcerpt = (content: string, query: string, maxLength = 100) => {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) return content.slice(0, maxLength) + "...";
    
    const start = Math.max(0, index - 40);
    const end = Math.min(content.length, index + query.length + 40);
    
    let excerpt = content.slice(start, end);
    if (start > 0) excerpt = "..." + excerpt;
    if (end < content.length) excerpt = excerpt + "...";
    
    return highlight(excerpt, query);
  };

  // Search logic
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      renderResults([]);
      emptyState.classList.remove("hidden");
      loadingState.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    loadingState.classList.remove("hidden");
    resultsContainer.querySelectorAll('.search-result-item').forEach(el => el.remove());

    await loadData();

    if (!titleIndex) {
      loadingState.classList.add("hidden");
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    const seenIds = new Set<string>();

    // 1. Search titles
    for (const item of titleIndex) {
      if (item.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: item.id,
          type: item.type,
          title: item.title,
          uri: item.uri,
          hitType: 'title',
          excerpt: item.description ? highlight(item.description, query) : '',
          date: item.date,
          score: 100
        });
        seenIds.add(item.id);
      }
    }

    // 2. Search details
    if (detail3mo) {
      for (const item of detail3mo) {
        if (seenIds.has(item.id)) continue;
        
        if (item.content.toLowerCase().includes(lowerQuery)) {
          const titleItem = titleIndex.find(t => t.id === item.id);
          if (titleItem) {
            results.push({
              id: item.id,
              type: item.type,
              title: titleItem.title,
              uri: titleItem.uri,
              hitType: 'detail',
              excerpt: getExcerpt(item.content, query),
              date: item.date,
              score: 50
            });
            seenIds.add(item.id);
          }
        }
      }
    }

    // Sort results: score desc, then date desc
    results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });

    loadingState.classList.add("hidden");
    renderResults(results, query);
  };

  // Render results
  const renderResults = (results: SearchResult[], query: string = "") => {
    resultsContainer.querySelectorAll('.search-result-item').forEach(el => el.remove());
    
    if (results.length === 0 && query.trim()) {
      const noResult = document.createElement('div');
      noResult.className = 'search-result-item py-12 text-center text-slate-500 dark:text-slate-400';
      noResult.innerHTML = '<p>未找到相关结果</p>';
      resultsContainer.appendChild(noResult);
      return;
    }

    results.forEach(result => {
      const item = document.createElement('a');
      item.href = result.uri;
      item.className = 'search-result-item group block p-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors cursor-pointer border border-transparent hover:border-primary/20 no-underline';
      
      const typeLabel = result.type === 'blog' ? '文章' : 
                        result.type === 'microblog' ? '微博客' : 
                        result.type === 'tool' ? '工具' : '友链';

      const dateStr = result.date ? new Date(result.date).toISOString().split('T')[0] : '';
      
      item.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${typeLabel}</span>
            <h3 class="text-base font-medium text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors m-0">${highlight(result.title, query)}</h3>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400">${dateStr}</span>
        </div>
        ${result.excerpt ? `<p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mt-1 m-0">${result.excerpt}</p>` : ''}
      `;
      
      resultsContainer.appendChild(item);
    });
  };

  // Debounce input
  let timeout: any;
  input.addEventListener("input", (e) => {
    clearTimeout(timeout);
    const query = (e.target as HTMLInputElement).value;
    timeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  });
}
