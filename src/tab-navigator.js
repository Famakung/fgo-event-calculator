/* ============================================
   TAB NAVIGATION
   ============================================ */
export const TabNavigator = {
  init(ceFilterInit) {
    const tabBar = document.querySelector(".tab-bar");
    if (!tabBar) return;

    // Restore active tab
    try {
      const savedTab = localStorage.getItem("fgo_active_tab");
      if (savedTab) {
        document.querySelectorAll(".tab-btn").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.tab === savedTab);
        });
        document.querySelectorAll(".tab-panel").forEach(panel => {
          panel.classList.toggle("active", panel.id === "panel-" + savedTab);
        });
      }
    } catch (e) { /* ignore */ }

    // Remove CSS-only tab override — JS now controls tab state
    document.documentElement.removeAttribute("data-tab");

    tabBar.addEventListener("click", (e) => {
      if (!e.target.classList.contains("tab-btn")) return;
      const tab = e.target.dataset.tab;

      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

      e.target.classList.add("active");
      document.getElementById("panel-" + tab).classList.add("active");

      if (tab === "cefilter") ceFilterInit();

      try {
        localStorage.setItem("fgo_active_tab", tab);
      } catch (e) { /* ignore */ }
    });
  }
};
