import { ServantData } from "./data.js";
import { TabNavigator } from "./tab-navigator.js";

/* ============================================
   CSS LAZY LOADER
   ============================================ */
const loadedCSS = new Set();

function loadCSS(href) {
  if (loadedCSS.has(href)) return Promise.resolve();
  const existing = document.querySelector('link[href="' + href + '"]');
  if (existing) {
    if (existing.rel === "preload") {
      existing.rel = "stylesheet";
      existing.removeAttribute("as");
    }
    loadedCSS.add(href);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => {
      loadedCSS.add(href);
      resolve();
    };
    document.head.appendChild(link);
  });
}

/* ============================================
   TAB LOADERS (lazy CSS + dynamic JS)
   ============================================ */

async function loadEventShop() {
  await loadCSS("styles-event-shop.min.css");
  const { App } = await import("./event-shop.js");
  App.init();
}

async function loadBond() {
  await loadCSS("styles-bond.min.css");
  const [{ BondApp }, { ServantSelector, AscensionSelector, CESelector, CESubSelector, ServantDrag }] =
    await Promise.all([import("./bond-app.js"), import("./selectors-bond.js")]);
  BondApp.configure({ ServantSelector, AscensionSelector, CESelector, CESubSelector, ServantDrag });
  BondApp.init();
}

async function loadCEFilter() {
  await loadCSS("styles-ce-filter.min.css");
  const [{ CEFilterApp }, { CEFilterPicker, CEServantOverlap }] = await Promise.all([
    import("./ce-filter-app.js"),
    import("./selectors-cefilter.js"),
  ]);
  CEFilterApp.init({
    openFilterPicker: () =>
      CEFilterPicker.open({
        onApply: (selectedCEs) => {
          CEFilterApp.state.selectedCEs = selectedCEs;
          CEFilterApp.state.currentPage = 1;
          CEFilterApp.render();
        },
        getSelectedCEs: () => CEFilterApp.state.selectedCEs,
        getCEMatches: () => CEFilterApp.computeAllCEMatches(),
        getCEMatchEntries: () => CEFilterApp._ceMatchEntriesIndex,
      }),
    initFilterPicker: () => CEFilterPicker.init(),
    initOverlap: () => CEServantOverlap.init(() => CEFilterApp.computeAllCEMatches()),
    openOverlap: (entry) => CEServantOverlap.open(entry),
  });
}

/* ============================================
   INIT
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  ServantData.load();

  let activeTab = "cefilter";
  try {
    activeTab = localStorage.getItem("fgo_active_tab") || "cefilter";
  } catch (_e) {
    /* ignore */
  }

  const loaders = { event: loadEventShop, bond: loadBond, cefilter: loadCEFilter };

  // Mark default tab CSS as already loaded (injected by inline <script> in <head>)
  const cssMap = {
    event: "styles-event-shop.min.css",
    bond: "styles-bond.min.css",
    cefilter: "styles-ce-filter.min.css",
  };
  loadedCSS.add(cssMap[activeTab]);

  TabNavigator.init(activeTab === "cefilter" ? null : loaders.cefilter, activeTab === "bond" ? null : loaders.bond);

  // Eagerly init active tab
  loaders[activeTab]();

  // Defer Event Shop to idle (hydrates static HTML only)
  const rIC = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  rIC(() => {
    if (activeTab !== "event") loaders.event();
  });
});
