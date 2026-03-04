export function initHeader() {
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });

    const links = mobileMenu.querySelectorAll("a");
    links.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
      });
    });
  }

  // 移动端操作按钮展开/收起
  const actionsToggle = document.getElementById("mobile-actions-toggle");
  const actionsPanel = document.getElementById("mobile-actions-panel");

  if (actionsToggle && actionsPanel) {
    actionsToggle.addEventListener("click", () => {
      const isExpanded = actionsToggle.getAttribute("aria-expanded") === "true";
      actionsToggle.setAttribute("aria-expanded", (!isExpanded).toString());
      actionsPanel.classList.toggle("hidden");
      actionsPanel.classList.toggle("flex");
    });

    // 点击外部关闭
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!actionsToggle.contains(target) && !actionsPanel.contains(target)) {
        actionsToggle.setAttribute("aria-expanded", "false");
        actionsPanel.classList.add("hidden");
        actionsPanel.classList.remove("flex");
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeader);
} else {
  initHeader();
}
