import { ServantData, CEList } from "./data.js";
import { CLASS_FILTERS, RARITY_FILTERS } from "./constants.js";
import { DOMFactory, CollapsibleFactory } from "./presentation.js";

/* ============================================
   SERVANT SELECTOR MODAL
   ============================================ */
export const ServantSelector = {
  activeSlotIndex: null,
  pendingSlot: false,
  classFilters: [],
  rarityFilters: [],
  _searchQuery: "",
  _callbacks: null,

  init() {
    const modal = document.getElementById("servantModal");
    const closeBtn = document.getElementById("servantModalClose");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.close();
      });
    }
  },

  open(slotIndex, pending = false, callbacks = null) {
    this.activeSlotIndex = slotIndex;
    this.pendingSlot = pending;
    this._callbacks = callbacks;
    this.classFilters = [];
    this.rarityFilters = [];
    this._searchQuery = "";

    this.buildFilterArea();
    this.renderGrid(ServantData.servants);

    const modal = document.getElementById("servantModal");
    if (modal) modal.classList.add("open");
  },

  close() {
    // If this was a pending add and no servant was picked, remove the slot
    if (this.pendingSlot && this.activeSlotIndex !== null) {
      this._callbacks?.onPendingRemove?.(this.activeSlotIndex);
    }
    const modal = document.getElementById("servantModal");
    if (modal) modal.classList.remove("open");
    this.activeSlotIndex = null;
    this.pendingSlot = false;
  },

  renderGrid(servants) {
    const grid = document.getElementById("servantPickerGrid");
    if (!grid) return;

    const frag = document.createDocumentFragment();

    servants.forEach((servant) => {
      const item = DOMFactory.el("div", "servant-picker-item");

      const img = DOMFactory.createLazyImg(servant.image, null, {
        alt: servant.name,
      });
      DOMFactory.addAscensionFallback(img, servant.id);

      const name = DOMFactory.el("div", "servant-picker-name");
      name.textContent = servant.name;

      item.appendChild(img);
      item.appendChild(name);

      item.addEventListener("click", () => {
        this.pendingSlot = false; // servant selected, don't remove on close
        if (servant.hasAscensions) {
          const idx = this.activeSlotIndex;
          this.close();
          AscensionSelector.open(servant, idx, this._callbacks);
        } else {
          this._callbacks?.onSelect?.(this.activeSlotIndex, servant.id, null);
          this.close();
        }
      });

      frag.appendChild(item);
    });

    grid.replaceChildren(frag);
  },

  filter() {
    this.renderGrid(this.getFilteredServants());
  },

  getFilteredServants() {
    let result = ServantData.servants;
    const query = this._searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(query) ||
          ServantData.getAllNames(s.id).some((n) => n.toLowerCase().includes(query)),
      );
    }
    if (this.classFilters.length > 0) {
      const classSet = new Set(this.classFilters);
      result = result.filter((s) => s.traits.some((t) => classSet.has(t)));
    }
    if (this.rarityFilters.length > 0) {
      const raritySet = new Set(this.rarityFilters);
      result = result.filter((s) => s.traits.some((t) => raritySet.has(t)));
    }
    return result;
  },

  buildFilterArea() {
    const container = document.getElementById("servantFilterArea");
    if (!container) return;
    CollapsibleFactory.populateFilterArea(
      container,
      this._searchQuery,
      (query) => {
        this._searchQuery = query;
        this.filter();
      },
      (content) => {
        this._buildClassFilter(content);
        this._buildRarityFilter(content);
      },
    );
  },

  _buildClassFilter(container) {
    const { standard, extra } = CLASS_FILTERS;

    const filterDiv = DOMFactory.el("div", "class-filter");
    const selected = new Set(this.classFilters);

    const buildRow = (classes) => {
      classes.forEach((cls) => {
        const btn = DOMFactory.el("div", "class-btn" + (selected.has(cls.id) ? " active" : ""));
        const img = DOMFactory.el("img", "", {
          dataset: { src: "icons/classes/" + cls.icon + ".webp" },
          alt: cls.label,
          title: cls.label,
        });
        btn.appendChild(img);
        btn.addEventListener("click", () => {
          if (selected.has(cls.id)) {
            selected.delete(cls.id);
            btn.classList.remove("active");
          } else {
            selected.add(cls.id);
            btn.classList.add("active");
          }
          this.classFilters = [...selected];
          this.filter();
        });
        filterDiv.appendChild(btn);
      });
    };

    buildRow(standard);
    buildRow(extra);
    container.appendChild(filterDiv);
  },

  _buildRarityFilter(container) {
    const rarities = RARITY_FILTERS;

    const filterDiv = DOMFactory.el("div", "rarity-filter");
    const selected = new Set(this.rarityFilters);

    rarities.forEach((rarity) => {
      const btn = DOMFactory.el("div", "rarity-btn" + (selected.has(rarity.id) ? " active" : ""));
      btn.textContent = rarity.label;
      btn.addEventListener("click", () => {
        if (selected.has(rarity.id)) {
          selected.delete(rarity.id);
          btn.classList.remove("active");
        } else {
          selected.add(rarity.id);
          btn.classList.add("active");
        }
        this.rarityFilters = [...selected];
        this.filter();
      });
      filterDiv.appendChild(btn);
    });

    container.appendChild(filterDiv);
  },
};

/* ============================================
   ASCENSION SELECTOR MODAL
   ============================================ */
export const AscensionSelector = {
  servant: null,
  slotIndex: null,
  _callbacks: null,

  init() {
    const modal = document.getElementById("ascensionModal");
    const closeBtn = document.getElementById("ascensionModalClose");
    const backBtn = document.getElementById("ascensionModalBack");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }
    if (backBtn) {
      backBtn.addEventListener("click", () => this.back());
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.close();
      });
    }
  },

  open(servant, slotIndex, callbacks = null) {
    this.servant = servant;
    this.slotIndex = slotIndex;
    this._callbacks = callbacks;
    const modal = document.getElementById("ascensionModal");
    const title = document.getElementById("ascensionModalTitle");

    if (title) title.textContent = servant.name;
    this.renderGrid();
    if (modal) modal.classList.add("open");
  },

  close() {
    const modal = document.getElementById("ascensionModal");
    if (modal) modal.classList.remove("open");
    this.servant = null;
    this.slotIndex = null;
  },

  back() {
    const idx = this.slotIndex;
    const cb = this._callbacks;
    this.close();
    if (idx !== null) {
      ServantSelector.open(idx, false, cb);
    }
  },

  renderGrid() {
    const grid = document.getElementById("ascensionPickerGrid");
    if (!grid || !this.servant) return;
    grid.replaceChildren();

    const options = ServantData.getAscensionOptions(this.servant.id);
    options.forEach((asc) => {
      const item = DOMFactory.el("div", "servant-picker-item");

      const imgSrc = ServantData.getImageForAscension(this.servant.id, asc);
      const img = DOMFactory.createLazyImg(imgSrc, null, {
        alt: ServantData.getAscensionLabel(this.servant.id, asc),
      });
      DOMFactory.addSimpleFallback(img, "servant-slot-portrait-fallback", this.servant.id);

      const label = DOMFactory.el("div", "servant-picker-name");
      label.textContent = ServantData.getAscensionLabel(this.servant.id, asc);

      item.appendChild(img);
      item.appendChild(label);

      item.addEventListener("click", () => {
        this._callbacks?.onSelect?.(this.slotIndex, this.servant.id, asc);
        this.close();
        ServantSelector.close();
      });

      grid.appendChild(item);
    });
  },
};

/* ============================================
   SERVANT DRAG REORDER
   ============================================ */
export const ServantDrag = {
  dragIndex: null,
  holdTimer: null,
  isDragging: false,
  _callbacks: null,

  init(callbacks = null) {
    this._callbacks = callbacks;
    const grid = document.getElementById("servantGrid");
    grid.addEventListener("mousedown", (e) => this.onHoldStart(e));
    grid.addEventListener("touchstart", (e) => this.onHoldStart(e), { passive: false });
    document.addEventListener("mousemove", (e) => this.onHoldMove(e));
    document.addEventListener("touchmove", (e) => this.onHoldMove(e), { passive: false });
    document.addEventListener("mouseup", () => this.onHoldEnd());
    document.addEventListener("touchend", () => this.onHoldEnd());
  },

  onHoldStart(e) {
    // Don't interfere with inputs/selects
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "OPTION") return;

    const slot = e.target.closest(".servant-slot:not(.servant-add-slot)");
    if (!slot || slot.dataset.slotIndex === undefined) return;
    const index = parseInt(slot.dataset.slotIndex);
    if (isNaN(index)) return;

    // Prevent native image drag on desktop
    if (e.type === "mousedown") e.preventDefault();

    this.dragIndex = index;
    this.isDragging = false;
    this.holdTimer = setTimeout(() => {
      this.isDragging = true;
      slot.classList.add("dragging");
    }, 300);
  },

  onHoldMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const grid = document.getElementById("servantGrid");
    const touch = e.touches ? e.touches[0] : e;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = target ? target.closest(".servant-slot") : null;

    grid.querySelectorAll(".servant-slot.drag-over").forEach((s) => s.classList.remove("drag-over"));
    if (slot && slot.dataset.slotIndex !== undefined) {
      const targetIndex = parseInt(slot.dataset.slotIndex);
      if (targetIndex !== this.dragIndex) {
        slot.classList.add("drag-over");
      }
    }
  },

  onHoldEnd() {
    clearTimeout(this.holdTimer);
    if (!this.isDragging) {
      this.dragIndex = null;
      return;
    }

    const grid = document.getElementById("servantGrid");
    const dragOver = grid.querySelector(".servant-slot.drag-over");
    if (dragOver && this.dragIndex !== null) {
      const targetIndex = parseInt(dragOver.dataset.slotIndex);
      if (!isNaN(targetIndex) && targetIndex !== this.dragIndex) {
        this._callbacks?.onSwap?.(this.dragIndex, targetIndex);
      }
    }

    grid.querySelectorAll(".servant-slot").forEach((s) => {
      s.classList.remove("dragging", "drag-over");
    });
    this.dragIndex = null;
    this.isDragging = false;
  },
};

/* ============================================
   CE SELECTOR MODAL
   ============================================ */
export const CESelector = {
  activeSlotIndex: null,
  pendingSlot: false,
  _searchQuery: "",
  _callbacks: null,

  init() {
    const modal = document.getElementById("ceModal");
    const closeBtn = document.getElementById("ceModalClose");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.close();
      });
    }
  },

  open(slotIndex, pending = false, callbacks = null) {
    this.activeSlotIndex = slotIndex;
    this.pendingSlot = pending;
    this._callbacks = callbacks;
    this._searchQuery = "";

    this.buildFilterArea();
    this.renderGrid(CEList);

    const modal = document.getElementById("ceModal");
    if (modal) modal.classList.add("open");
  },

  close() {
    if (this.pendingSlot && this.activeSlotIndex !== null) {
      this._callbacks?.onPendingRemove?.(this.activeSlotIndex);
    }
    const modal = document.getElementById("ceModal");
    if (modal) modal.classList.remove("open");
    this.activeSlotIndex = null;
    this.pendingSlot = false;
  },

  renderGrid(ces) {
    const grid = document.getElementById("cePickerGrid");
    if (!grid) return;

    const frag = document.createDocumentFragment();

    ces.forEach((ce) => {
      const item = DOMFactory.el("div", "servant-picker-item");

      const img = DOMFactory.createLazyImg(ce.image, null, { alt: ce.name });
      DOMFactory.addSimpleFallback(img, "servant-slot-portrait-fallback", ce.id);

      const name = DOMFactory.el("div", "servant-picker-name");
      name.textContent = ce.name;
      item.appendChild(img);
      item.appendChild(name);

      item.addEventListener("click", () => {
        if (ce.isGroup) {
          const idx = this.activeSlotIndex;
          this.pendingSlot = false;
          this.close();
          CESubSelector.open(ce, idx, this._callbacks);
          return;
        }
        this.pendingSlot = false;
        this._callbacks?.onSelect?.(this.activeSlotIndex, ce.id, null);
        this.close();
      });

      frag.appendChild(item);
    });

    grid.replaceChildren(frag);
  },

  filter() {
    const q = this._searchQuery.toLowerCase().trim();
    if (!q) {
      this.renderGrid(CEList);
      return;
    }
    const filtered = CEList.filter((c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    this.renderGrid(filtered);
  },

  buildFilterArea() {
    const container = document.getElementById("ceFilterArea");
    if (!container) return;
    CollapsibleFactory.populateFilterArea(container, this._searchQuery, (query) => {
      this._searchQuery = query;
      this.filter();
    });
  },
};

/* ============================================
   CE SUB-SELECTOR (GROUP OPTIONS)
   ============================================ */
export const CESubSelector = {
  groupCE: null,
  activeSlotIndex: null,
  _callbacks: null,
  _selected: false,

  init() {
    const modal = document.getElementById("ceSubModal");
    const closeBtn = document.getElementById("ceSubModalClose");
    const backBtn = document.getElementById("ceSubModalBack");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }
    if (backBtn) {
      backBtn.addEventListener("click", () => this.back());
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.close();
      });
    }
  },

  open(groupCE, slotIndex, callbacks = null) {
    this.groupCE = groupCE;
    this.activeSlotIndex = slotIndex;
    this._callbacks = callbacks;
    this._selected = false;
    const modal = document.getElementById("ceSubModal");
    const title = document.getElementById("ceSubModalTitle");

    if (title) title.textContent = groupCE.name;
    this.renderGrid();
    if (modal) modal.classList.add("open");
  },

  close() {
    const idx = this.activeSlotIndex;
    const modal = document.getElementById("ceSubModal");
    if (modal) modal.classList.remove("open");
    this.groupCE = null;
    this.activeSlotIndex = null;
    // Remove pending null slot if no option was selected
    if (!this._selected && idx !== null) {
      this._callbacks?.onPendingRemove?.(idx);
    }
    this._selected = false;
  },

  back() {
    const idx = this.activeSlotIndex;
    const cb = this._callbacks;
    this._selected = true; // prevent close() from removing pending slot
    this.close();
    if (idx !== null) {
      CESelector.open(idx, false, cb);
    }
  },

  renderGrid() {
    const grid = document.getElementById("ceSubPickerGrid");
    if (!grid || !this.groupCE) return;
    grid.replaceChildren();

    const options = this.groupCE.options || [];
    options.forEach((opt) => {
      const item = DOMFactory.el("div", "servant-picker-item");

      const img = DOMFactory.createLazyImg(opt.image, null, { alt: opt.name });
      DOMFactory.addSimpleFallback(img, "servant-slot-portrait-fallback", opt.id);

      const label = DOMFactory.el("div", "servant-picker-name");
      const colonIdx = opt.name.indexOf(": ");
      label.textContent = colonIdx !== -1 ? opt.name.substring(colonIdx + 2) : opt.name;

      item.appendChild(img);
      item.appendChild(label);

      item.addEventListener("click", () => {
        this._selected = true;
        CESelector.pendingSlot = false;
        this._callbacks?.onSelect?.(this.activeSlotIndex, this.groupCE.id, opt.id);
        this.close();
        CESelector.close();
      });

      grid.appendChild(item);
    });
  },
};
