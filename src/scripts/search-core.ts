import type { TitleIndexItem, DetailShardItem, SearchResult } from "../search/types";

let titleIndex: TitleIndexItem[] | null = null;
let detail3mo: DetailShardItem[] | null = null;
let detail6mo: DetailShardItem[] | null = null;
let detail1y: DetailShardItem[] | null = null;
let detail2y: DetailShardItem[] | null = null;
let detailAll: DetailShardItem[] | null = null;

const BUCKETS = ['3mo', '6mo', '1y', '2y', 'all'] as const;
type Bucket = typeof BUCKETS[number];
let currentBucketIndex = 0;

let isRegexMode = false;
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
  const regexToggle = document.getElementById("regex-toggle");
  const searchMoreBtn = document.getElementById("search-more");
  const googleFallbackBtn = document.getElementById("google-fallback") as HTMLAnchorElement;

  if (!modal || !input || !closeBtn || !resultsContainer || !emptyState || !loadingState || !regexToggle || !searchMoreBtn || !googleFallbackBtn) {
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
  // Regex toggle logic
  regexToggle.addEventListener("click", () => {
    isRegexMode = !isRegexMode;
    if (isRegexMode) {
      regexToggle.classList.add("bg-primary/10", "text-primary", "dark:bg-primary/20");
      regexToggle.classList.remove("text-slate-500", "dark:text-slate-400");
    } else {
      regexToggle.classList.remove("bg-primary/10", "text-primary", "dark:bg-primary/20");
      regexToggle.classList.add("text-slate-500", "dark:text-slate-400");
    }
    if (input.value.trim()) {
      performSearch(input.value);
    }
  });

  // Search more logic
  searchMoreBtn.addEventListener("click", () => {
    if (currentBucketIndex < BUCKETS.length - 1) {
      currentBucketIndex++;
      if (input.value.trim()) {
        performSearch(input.value);
      }
    }
  });

  // Google fallback logic
  googleFallbackBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (query) {
      const domain = window.location.hostname;
      window.open(`https://google.com/search?q=site:${domain} ${encodeURIComponent(query)}`, '_blank');
    }
  });

  // Load data
  const loadData = async (bucket: Bucket) => {
    try {
      if (!titleIndex) {
        const res = await fetch("/search/title-index.json");
        if (res.ok) titleIndex = await res.json();
      }
      
      if (bucket === '3mo' && !detail3mo) {
        const res = await fetch("/search/detail-3mo.json");
        if (res.ok) detail3mo = await res.json();
      } else if (bucket === '6mo' && !detail6mo) {
        const res = await fetch("/search/detail-6mo.json");
        if (res.ok) detail6mo = await res.json();
      } else if (bucket === '1y' && !detail1y) {
        const res = await fetch("/search/detail-1y.json");
        if (res.ok) detail1y = await res.json();
      } else if (bucket === '2y' && !detail2y) {
        const res = await fetch("/search/detail-2y.json");
        if (res.ok) detail2y = await res.json();
      } else if (bucket === 'all' && !detailAll) {
        const res = await fetch("/search/detail-all.json");
        if (res.ok) detailAll = await res.json();
      }
    } catch (error) {
      console.error("Failed to load search index:", error);
    }
  };

  // Highlight function
  const highlight = (text: string, query: string) => {
    if (!query) return text;
    let regex: RegExp;
    try {
      if (isRegexMode) {
        regex = new RegExp(`(${query})`, 'gi');
      } else {
        regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      }
    } catch (e) {
      return text;
    }
    return text.replace(regex, '<mark class="text-primary bg-transparent font-medium">$1</mark>');
  };

  // Excerpt function
  const getExcerpt = (content: string, query: string, maxLength = 100) => {
    let index = -1;
    let matchLength = query.length;

    if (isRegexMode) {
      try {
        const regex = new RegExp(query, 'gi');
        const match = regex.exec(content);
        if (match) {
          index = match.index;
          matchLength = match[0].length;
        }
      } catch (e) {
        // Invalid regex, fallback to normal search
      }
    } else {
      const lowerContent = content.toLowerCase();
      const lowerQuery = query.toLowerCase();
      index = lowerContent.indexOf(lowerQuery);
    }
    
    if (index === -1) return content.slice(0, maxLength) + "...";
    
    const start = Math.max(0, index - 40);
    const end = Math.min(content.length, index + matchLength + 40);
    
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

    if (isRegexMode) {
      try {
        new RegExp(query, 'gi');
      } catch (e) {
        renderResults([], query, true);
        loadingState.classList.add("hidden");
        return;
      }
    }

    await loadData(BUCKETS[currentBucketIndex]);

    if (!titleIndex) {
      loadingState.classList.add("hidden");
      return;
    }

    const lowerQuery = query.toLowerCase();
    let regex: RegExp | null = null;
    if (isRegexMode) {
      try {
        regex = new RegExp(query, 'gi');
      } catch (e) {
        // Already handled above
      }
    }

    const results: SearchResult[] = [];
    const seenIds = new Set<string>();

    const isMatch = (text: string) => {
      if (regex) {
        regex.lastIndex = 0;
        return regex.test(text);
      }
      return text.toLowerCase().includes(lowerQuery);
    };

    const startTime = Date.now();
    const checkTimeout = () => {
      if (Date.now() - startTime > 1000) {
        throw new Error('Search timeout');
      }
    };

    // 1. Search titles
    try {
      for (const item of titleIndex) {
        checkTimeout();
        if (isMatch(item.title)) {
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
      const currentDetails = [detail3mo, detail6mo, detail1y, detail2y, detailAll]
        .slice(0, currentBucketIndex + 1)
        .filter(Boolean) as DetailShardItem[][];

      for (const details of currentDetails) {
        for (const item of details) {
          checkTimeout();
          if (seenIds.has(item.id)) continue;
          
          if (isMatch(item.content)) {
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
    } catch (e) {
      if (e instanceof Error && e.message === 'Search timeout') {
        console.warn('Search aborted due to timeout');
        // We can still render the results found so far
      } else {
        throw e;
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
  const renderResults = (results: SearchResult[], query: string = "", isInvalidRegex = false) => {
    resultsContainer.querySelectorAll('.search-result-item').forEach(el => el.remove());
    
    if (isInvalidRegex) {
      const noResult = document.createElement('div');
      noResult.className = 'search-result-item py-12 text-center text-slate-500 dark:text-slate-400';
      noResult.innerHTML = '<p>正则表达式语法错误</p>';
      resultsContainer.appendChild(noResult);
      searchMoreBtn.classList.add("hidden");
      googleFallbackBtn.classList.add("hidden");
      return;
    }

    if (results.length === 0 && query.trim()) {
      const noResult = document.createElement('div');
      noResult.className = 'search-result-item py-12 text-center text-slate-500 dark:text-slate-400';
      noResult.innerHTML = '<p>未找到相关结果</p>';
      resultsContainer.appendChild(noResult);
      
      searchMoreBtn.classList.add("hidden");
      googleFallbackBtn.classList.remove("hidden");
      return;
    }

    googleFallbackBtn.classList.add("hidden");

    if (currentBucketIndex < BUCKETS.length - 1 && query.trim()) {
      searchMoreBtn.classList.remove("hidden");
      searchMoreBtn.textContent = `搜索更多结果 (${BUCKETS[currentBucketIndex]} -> ${BUCKETS[currentBucketIndex + 1]})`;
    } else {
      searchMoreBtn.classList.add("hidden");
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
export function initSearchPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  
  if (query) {
    const modal = document.getElementById("search-modal");
    const input = document.getElementById("modal-search-input") as HTMLInputElement;
    
    if (modal && input) {
      modal.classList.remove("hidden");
      input.value = query;
      
      // We need to wait for initSearchCore to be called, or call it here
      initSearchCore().then(() => {
        // Trigger input event to start search
        input.dispatchEvent(new Event('input'));
      });
    }
  }
}
