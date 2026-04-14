import { ServantData } from "./data.js";
import { App } from "./event-shop.js";
import { BondApp } from "./bond-app.js";
import { CEFilterApp } from "./ce-filter-app.js";
import { TabNavigator } from "./tab-navigator.js";
import {
  ServantSelector, AscensionSelector, ServantDrag,
  CESelector, CESubSelector, CEFilterPicker, CEServantOverlap
} from "./selectors.js";

document.addEventListener("DOMContentLoaded", () => {
  // Load servant/CE data
  ServantData.load();

  // Initialize Event Shop tab
  App.init();

  // Wire BondApp with selector references (avoids circular imports)
  BondApp.configure({
    ServantSelector, AscensionSelector, CESelector, CESubSelector, ServantDrag
  });
  BondApp.init();

  // CEFilterApp lazy-init callback for TabNavigator
  const initCEFilter = () => {
    CEFilterApp.init({
      openFilterPicker: () => CEFilterPicker.open({
        onApply: (selectedCEs) => {
          CEFilterApp.state.selectedCEs = selectedCEs;
          CEFilterApp.saveState();
          CEFilterApp.state.currentPage = 1;
          CEFilterApp.render();
        },
        getSelectedCEs: () => CEFilterApp.state.selectedCEs,
        getCEMatches: () => CEFilterApp.computeAllCEMatches(),
        getCEMatchEntries: () => CEFilterApp._ceMatchEntriesIndex
      }),
      initFilterPicker: () => CEFilterPicker.init(),
      initOverlap: () => CEServantOverlap.init(() => CEFilterApp.computeAllCEMatches()),
      openOverlap: (entry) => CEServantOverlap.open(entry)
    });
  };

  TabNavigator.init(initCEFilter);

  // Lazy-init CEFilterApp if saved tab is cefilter
  let activeTab = "cefilter";
  try {
    activeTab = localStorage.getItem("fgo_active_tab") || "cefilter";
  } catch (e) { /* ignore */ }
  if (activeTab === "cefilter") initCEFilter();
});
