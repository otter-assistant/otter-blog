// src/scripts/search-box.ts
export function initSearchBox() {
  const searchInputs = document.querySelectorAll(
    ".search-input"
  ) as NodeListOf<HTMLInputElement>;
  
  let searchCoreLoaded = false;
  let searchCorePromise: Promise<any> | null = null;

  const loadSearchCore = async () => {
    if (!searchCorePromise) {
      searchCorePromise = import("./search-core.ts");
    }
    return searchCorePromise;
  };

  const openSearchModal = async () => {
    const modal = document.getElementById("search-modal");
    if (modal) {
      modal.classList.remove("hidden");
      const modalInput = document.getElementById("modal-search-input") as HTMLInputElement;
      if (modalInput) {
        modalInput.focus();
      }
      
      // Load core if not loaded
      if (!searchCoreLoaded) {
        try {
          const { initSearchCore } = await loadSearchCore();
          initSearchCore();
          searchCoreLoaded = true;
        } catch (error) {
          console.error("Failed to load search core:", error);
        }
      }
    }
  };

  // Ctrl + K 快捷键
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      openSearchModal();
    }
  });

  // 点击搜索框打开弹窗
  searchInputs.forEach(input => {
    input.addEventListener("click", (e) => {
      e.preventDefault();
      openSearchModal();
    });
    
    // 阻止默认的焦点行为，因为我们要打开弹窗
    input.addEventListener("focus", (e) => {
      e.preventDefault();
      input.blur();
      openSearchModal();
    });
  });
}

// 自动初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearchBox);
} else {
  initSearchBox();
}