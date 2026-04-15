if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(reg => {
      // Force check for SW updates on every page load
      reg.update();
    }).catch(() => {});
  });
}
