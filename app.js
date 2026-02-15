/**
 * FGO Event Calculator - Clean Architecture
 * app.js
 *
 * Architecture:
 * 1. Domain Layer - Pure business logic, no DOM
 * 2. Application Layer - State, persistence, orchestration
 * 3. Presentation Layer - DOM factory, UI builder, events
 * 4. Initialization - Bootstrap
 */
(function() {
"use strict";

/* ============================================
   CONSTANTS
   ============================================ */
const TIERS = ["bronze", "silver", "gold"];
const TIER_FIELDS = ["Need", "Have", "Bonus"];
const MAX_ITERATIONS = 10000;
const EPSILON = 0.01;
const DEBOUNCE_MS = 100;
const STORAGE_KEY = "fgo_calculator_data";

const ICON_URLS = {
  bronze: {
    bg: "https://apps.atlasacademy.io/db/assets/listframes1_bg-CB5tQlCX.png",
    fg: "https://static.atlasacademy.io/JP/Items/94153901.png"
  },
  silver: {
    bg: "https://apps.atlasacademy.io/db/assets/listframes2_bg-BcVjjli0.png",
    fg: "https://static.atlasacademy.io/JP/Items/94153902.png"
  },
  gold: {
    bg: "https://apps.atlasacademy.io/db/assets/listframes3_bg-CFbSxrKK.png",
    fg: "https://static.atlasacademy.io/JP/Items/94153903.png"
  }
};

const TIER_COLORS = {
  bronze: "#cd7f32",
  silver: "#71717a",
  gold: "#eab308"
};

const QUEST_DROPS = {
  bronze: { primary: "bronze", secondary: "silver" },
  silver: { primary: "silver", secondary: "gold" },
  gold: { primary: "gold", secondary: "bronze" }
};

/* ============================================
   DOMAIN LAYER - Schema & Validation
   ============================================ */
const Schema = {
  tier: {
    Need: { min: 0, max: 999999, default: 0 },
    Have: { min: 0, max: 999999, default: 0 },
    Bonus: { min: 0, max: 1000, default: 0 }
  },
  baseDrop: { min: 0, max: 100, default: 3 },
  primaryMultiplier: { min: 100, max: 100000, default: 1500 },
  secondaryMultiplier: { min: 100, max: 100000, default: 225 }
};

const Validator = {
  clamp(value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) return min;
    return Math.min(max, Math.max(min, num));
  },

  validate(value, schema) {
    return this.clamp(value, schema.min, schema.max);
  },

  validateTierData(data) {
    const result = {};
    TIERS.forEach(tier => {
      result[tier] = {};
      TIER_FIELDS.forEach(field => {
        const key = `${tier}${field}`;
        const val = data[key];
        result[tier][field.toLowerCase()] = this.validate(
          val,
          Schema.tier[field]
        );
      });
    });
    return result;
  },

  validateSettings(data) {
    return {
      baseDrop: this.validate(data.baseDrop, Schema.baseDrop),
      primaryMultiplier: this.validate(data.primaryMultiplier, Schema.primaryMultiplier),
      secondaryMultiplier: this.validate(data.secondaryMultiplier, Schema.secondaryMultiplier)
    };
  },

  validateStorageData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }
    const allowedKeys = [
      ...TIERS.flatMap(t => TIER_FIELDS.map(f => `${t}${f}`)),
      "baseDrop", "primaryMultiplier", "secondaryMultiplier"
    ];
    const sanitized = {};
    for (const key of allowedKeys) {
      if (key in data) {
        // Validate value is a valid number
        const num = parseFloat(data[key]);
        if (!isNaN(num)) {
          sanitized[key] = num;
        }
      }
    }
    return sanitized;
  }
};

/* ============================================
   DOMAIN LAYER - Calculator
   ============================================ */
const Calculator = {
  calcDropRate(base, bonus, multiplier) {
    return Math.round((base + bonus) * multiplier * 100) / 100;
  },

  calcDeficits(needs, haves) {
    const deficits = {};
    TIERS.forEach(tier => {
      deficits[tier] = Math.max(0, needs[tier] - haves[tier]);
    });
    return deficits;
  },

  calcOptimalRuns(deficits, dropRates) {
    const runs = { bronze: 0, silver: 0, gold: 0 };
    const remaining = { ...deficits };
    let iterations = 0;

    while (
      TIERS.some(t => remaining[t] > EPSILON) &&
      iterations < MAX_ITERATIONS
    ) {
      iterations++;

      // Find highest deficit
      const maxTier = TIERS.reduce((a, b) =>
        remaining[a] >= remaining[b] ? a : b
      );

      const quest = dropRates[maxTier];
      const totalRate = quest.primary.rate + quest.secondary.rate;

      if (totalRate <= 0) {
        return { runs, error: "Drop rates too low" };
      }

      remaining[quest.primary.tier] -= quest.primary.rate;
      remaining[quest.secondary.tier] -= quest.secondary.rate;
      runs[maxTier]++;
    }

    if (iterations >= MAX_ITERATIONS) {
      return { runs, warning: "Calculation limit reached" };
    }

    return { runs };
  }
};

/* ============================================
   APPLICATION LAYER - State Manager
   ============================================ */
const StateManager = {
  createInitial() {
    const tiers = {};
    TIERS.forEach(tier => {
      tiers[tier] = { need: 0, have: 0, bonus: 0 };
    });
    return {
      tiers,
      baseDrop: Schema.baseDrop.default,
      primaryMultiplier: Schema.primaryMultiplier.default,
      secondaryMultiplier: Schema.secondaryMultiplier.default,
      results: null
    };
  },

  updateTier(state, tier, field, value) {
    return {
      ...state,
      tiers: {
        ...state.tiers,
        [tier]: {
          ...state.tiers[tier],
          [field]: value
        }
      }
    };
  },

  updateSetting(state, key, value) {
    return { ...state, [key]: value };
  },

  setResults(state, results) {
    return { ...state, results };
  }
};

/* ============================================
   APPLICATION LAYER - Persistence
   ============================================ */
const Persistence = {
  save(state) {
    try {
      const data = {
        ...TIERS.flatMap(tier =>
          TIER_FIELDS.map(field => ({
            [`${tier}${field}`]: state.tiers[tier][field.toLowerCase()]
          }))
        ).reduce((a, b) => ({ ...a, ...b }), {}),
        baseDrop: state.baseDrop,
        primaryMultiplier: state.primaryMultiplier,
        secondaryMultiplier: state.secondaryMultiplier
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("Failed to save:", e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      const sanitized = Validator.validateStorageData(data);
      if (!sanitized) return null;

      const state = StateManager.createInitial();

      // Load tier data
      TIERS.forEach(tier => {
        TIER_FIELDS.forEach(field => {
          const key = `${tier}${field}`;
          if (key in sanitized) {
            state.tiers[tier][field.toLowerCase()] = Validator.validate(
              sanitized[key],
              Schema.tier[field]
            );
          }
        });
      });

      // Load settings
      if ("baseDrop" in sanitized) {
        state.baseDrop = Validator.validate(sanitized.baseDrop, Schema.baseDrop);
      }
      if ("primaryMultiplier" in sanitized) {
        state.primaryMultiplier = Validator.validate(sanitized.primaryMultiplier, Schema.primaryMultiplier);
      }
      if ("secondaryMultiplier" in sanitized) {
        state.secondaryMultiplier = Validator.validate(sanitized.secondaryMultiplier, Schema.secondaryMultiplier);
      }

      return state;
    } catch (e) {
      console.warn("Failed to load:", e);
      return null;
    }
  }
};

/* ============================================
   PRESENTATION LAYER - DOM Factory
   ============================================ */
const DOMFactory = {
  el(tag, className, attrs = {}) {
    const element = document.createElement(tag);
    if (className) {
      if (Array.isArray(className)) {
        className.forEach(c => element.classList.add(c));
      } else {
        element.className = className;
      }
    }
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "dataset") {
        Object.entries(value).forEach(([k, v]) => {
          element.dataset[k] = v;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    return element;
  },

  createIcon(tier, size = "normal") {
    const container = this.el(
      "div",
      size === "normal" ? "material-icon" : "mini-icon"
    );
    container.id = size === "normal" ? `${tier}Icon` : undefined;

    const bgImg = this.el("img", "bg-layer", {
      src: ICON_URLS[tier].bg,
      alt: ""
    });
    bgImg.onerror = () => { bgImg.style.display = "none"; };

    const fgImg = this.el("img", "fg-layer", {
      src: ICON_URLS[tier].fg,
      alt: `${this.capitalize(tier)} material icon`
    });

    fgImg.onerror = () => {
      const fallback = this.el("div", "icon-fallback");
      fallback.style.background = TIER_COLORS[tier];
      fallback.textContent = this.capitalize(tier).charAt(0);
      fgImg.replaceWith(fallback);
    };

    container.appendChild(bgImg);
    container.appendChild(fgImg);
    return container;
  },

  createInput(id, label, value, min, max) {
    const row = this.el("div", "input-row");

    const labelEl = this.el("label", "input-label", { for: id });
    labelEl.textContent = label;

    const input = this.el("input", "input-field", {
      type: "number",
      id,
      min: String(min),
      max: String(max),
      value: String(value)
    });

    row.appendChild(labelEl);
    row.appendChild(input);
    return { row, input };
  },

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

/* ============================================
   PRESENTATION LAYER - UI Builder
   ============================================ */
const UIBuilder = {
  // DOM cache
  elements: {},

  buildMaterialsGrid(container, state) {
    container.innerHTML = "";

    TIERS.forEach(tier => {
      const card = DOMFactory.el("div", "material-card", {
        dataset: { tier }
      });

      // Icon
      const iconWrapper = DOMFactory.el("div", "material-icon-wrapper");
      const icon = DOMFactory.createIcon(tier);
      iconWrapper.appendChild(icon);
      card.appendChild(iconWrapper);

      // Name
      const name = DOMFactory.el("div", "material-name");
      name.textContent = DOMFactory.capitalize(tier);
      card.appendChild(name);

      // Inputs
      TIER_FIELDS.forEach(field => {
        const id = `${tier}${field}`;
        const max = field === "Bonus" ? 1000 : 999999;
        const { row, input } = DOMFactory.createInput(
          id,
          field,
          state.tiers[tier][field.toLowerCase()],
          0,
          max
        );
        this.elements[id] = input;
        card.appendChild(row);
      });

      container.appendChild(card);
    });
  },

  buildQuestDropsGrid(container) {
    container.innerHTML = "";

    Object.entries(QUEST_DROPS).forEach(([questTier, drops]) => {
      const item = DOMFactory.el("div", "quest-drops-item", {
        dataset: { tier: questTier }
      });

      const title = DOMFactory.el("div", "quest-drops-title");
      title.textContent = `${DOMFactory.capitalize(questTier)} Quest`;
      item.appendChild(title);

      [drops.primary, drops.secondary].forEach(material => {
        const line = DOMFactory.el("div", "drop-line");

        const miniIcon = DOMFactory.el("span", "mini-icon");
        miniIcon.id = `${questTier}Quest_${material}_icon`;
        line.appendChild(miniIcon);

        const label = DOMFactory.el("span", "drop-material");
        label.id = `${questTier}Quest_${material}_label`;
        label.textContent = "3(+0)";
        line.appendChild(label);

        const value = DOMFactory.el("span", "drop-value");
        value.id = `${questTier}Quest_${material}`;
        value.textContent = "0";
        line.appendChild(value);

        item.appendChild(line);
      });

      container.appendChild(item);
    });
  },

  buildDeficitGrid(container) {
    container.innerHTML = "";

    TIERS.forEach(tier => {
      const item = DOMFactory.el("div", "deficit-item", {
        dataset: { tier }
      });

      const label = DOMFactory.el("div", "deficit-label");
      label.textContent = DOMFactory.capitalize(tier);

      const value = DOMFactory.el("div", "deficit-value");
      value.id = `${tier}Deficit`;
      value.textContent = "0";

      item.appendChild(label);
      item.appendChild(value);
      container.appendChild(item);
    });
  },

  buildQuestGrid(container) {
    container.innerHTML = "";

    TIERS.forEach(tier => {
      const item = DOMFactory.el("div", "quest-item", {
        dataset: { tier }
      });

      const name = DOMFactory.el("div", "quest-name");
      name.textContent = `${DOMFactory.capitalize(tier)} Quest`;

      const count = DOMFactory.el("div", "quest-count");
      count.id = `${tier}Play`;
      count.textContent = "0";

      const label = DOMFactory.el("div", "quest-label");
      label.textContent = "runs";

      item.appendChild(name);
      item.appendChild(count);
      item.appendChild(label);
      container.appendChild(item);
    });
  },

  loadQuestIcons() {
    Object.entries(QUEST_DROPS).forEach(([quest, drops]) => {
      [drops.primary, drops.secondary].forEach(material => {
        const container = document.getElementById(`${quest}Quest_${material}_icon`);
        if (container) {
          const icon = DOMFactory.createIcon(material, "mini");
          container.appendChild(icon);
        }
      });
    });
  }
};

/* ============================================
   PRESENTATION LAYER - View Manager
   ============================================ */
const ViewManager = {
  updateDropDisplay(state) {
    const base = state.baseDrop;
    const primaryMult = state.primaryMultiplier / 100;
    const secondaryMult = state.secondaryMultiplier / 100;

    TIERS.forEach(questTier => {
      const drops = QUEST_DROPS[questTier];
      const primaryBonus = state.tiers[drops.primary].bonus;
      const secondaryBonus = state.tiers[drops.secondary].bonus;

      const primaryDrop = Calculator.calcDropRate(base, primaryBonus, primaryMult);
      const secondaryDrop = Calculator.calcDropRate(base, secondaryBonus, secondaryMult);

      const primaryLabel = document.getElementById(`${questTier}Quest_${drops.primary}_label`);
      const secondaryLabel = document.getElementById(`${questTier}Quest_${drops.secondary}_label`);
      const primaryValue = document.getElementById(`${questTier}Quest_${drops.primary}`);
      const secondaryValue = document.getElementById(`${questTier}Quest_${drops.secondary}`);

      if (primaryLabel) primaryLabel.textContent = `${base}(+${primaryBonus})`;
      if (secondaryLabel) secondaryLabel.textContent = `${base}(+${secondaryBonus})`;
      if (primaryValue) primaryValue.textContent = primaryDrop;
      if (secondaryValue) secondaryValue.textContent = secondaryDrop;
    });
  },

  showResults(deficits, runs) {
    const results = document.getElementById("results");
    if (results) results.classList.add("visible");

    TIERS.forEach(tier => {
      const deficitEl = document.getElementById(`${tier}Deficit`);
      if (deficitEl) deficitEl.textContent = Math.max(0, Math.ceil(deficits[tier]));

      const runEl = document.getElementById(`${tier}Play`);
      if (runEl) runEl.textContent = runs[tier];
    });

    setTimeout(() => {
      results?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  },

  syncInputsFromState(state) {
    TIERS.forEach(tier => {
      TIER_FIELDS.forEach(field => {
        const input = UIBuilder.elements[`${tier}${field}`];
        if (input) {
          input.value = state.tiers[tier][field.toLowerCase()];
        }
      });
    });

    document.getElementById("baseDrop").value = state.baseDrop;
    document.getElementById("primaryMultiplier").value = state.primaryMultiplier;
    document.getElementById("secondaryMultiplier").value = state.secondaryMultiplier;
  }
};

/* ============================================
   PRESENTATION LAYER - Event Handler
   ============================================ */
const EventHandler = {
  debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  bind(app) {
    const debouncedUpdate = this.debounce(() => {
      ViewManager.updateDropDisplay(app.state);
    }, DEBOUNCE_MS);

    // Tier bonus inputs
    TIERS.forEach(tier => {
      const input = UIBuilder.elements[`${tier}Bonus`];
      if (input) {
        input.addEventListener("input", (e) => {
          const value = Validator.validate(e.target.value, Schema.tier.Bonus);
          app.state = StateManager.updateTier(app.state, tier, "bonus", value);
          debouncedUpdate();
        });
      }
    });

    // Base drop and multiplier inputs
    ["baseDrop", "primaryMultiplier", "secondaryMultiplier"].forEach(key => {
      const input = document.getElementById(key);
      if (input) {
        input.addEventListener("input", (e) => {
          const value = Validator.validate(e.target.value, Schema[key]);
          app.state = StateManager.updateSetting(app.state, key, value);
          debouncedUpdate();
        });
      }
    });

    // Calculate button
    const calcBtn = document.getElementById("calculateBtn");
    if (calcBtn) {
      calcBtn.addEventListener("click", () => app.calculate());
    }
  }
};

/* ============================================
   APPLICATION - App Controller
   ============================================ */
const App = {
  state: null,

  init() {
    // Initialize state
    this.state = Persistence.load() || StateManager.createInitial();

    // Build UI
    UIBuilder.buildMaterialsGrid(
      document.getElementById("materialsGrid"),
      this.state
    );
    UIBuilder.buildQuestDropsGrid(document.getElementById("questDropsGrid"));
    UIBuilder.buildDeficitGrid(document.getElementById("deficitGrid"));
    UIBuilder.buildQuestGrid(document.getElementById("questGrid"));

    // Sync inputs
    ViewManager.syncInputsFromState(this.state);

    // Load icons
    UIBuilder.loadQuestIcons();

    // Update display
    ViewManager.updateDropDisplay(this.state);

    // Bind events
    EventHandler.bind(this);
  },

  calculate() {
    // Read all inputs
    TIERS.forEach(tier => {
      TIER_FIELDS.forEach(field => {
        const input = UIBuilder.elements[`${tier}${field}`];
        if (input) {
          const value = Validator.validate(input.value, Schema.tier[field]);
          this.state = StateManager.updateTier(
            this.state,
            tier,
            field.toLowerCase(),
            value
          );
        }
      });
    });

    // Save
    Persistence.save(this.state);

    // Calculate
    const needs = {};
    const haves = {};
    TIERS.forEach(tier => {
      needs[tier] = this.state.tiers[tier].need;
      haves[tier] = this.state.tiers[tier].have;
    });

    const deficits = Calculator.calcDeficits(needs, haves);

    // Build drop rates
    const dropRates = {};
    const base = this.state.baseDrop;
    const primaryMult = this.state.primaryMultiplier / 100;
    const secondaryMult = this.state.secondaryMultiplier / 100;

    TIERS.forEach(questTier => {
      const drops = QUEST_DROPS[questTier];
      dropRates[questTier] = {
        primary: {
          tier: drops.primary,
          rate: Calculator.calcDropRate(
            base,
            this.state.tiers[drops.primary].bonus,
            primaryMult
          )
        },
        secondary: {
          tier: drops.secondary,
          rate: Calculator.calcDropRate(
            base,
            this.state.tiers[drops.secondary].bonus,
            secondaryMult
          )
        }
      };
    });

    // Calculate runs
    const result = Calculator.calcOptimalRuns(deficits, dropRates);

    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.warning) {
      console.warn(result.warning);
    }

    // Show results
    ViewManager.showResults(deficits, result.runs);
  }
};

/* ============================================
   INITIALIZATION
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

})();
