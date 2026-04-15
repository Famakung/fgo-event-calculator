export const TIERS = ["bronze", "silver", "gold"];
export const TIER_FIELDS = ["Need", "Have", "Bonus"];
export const MAX_ITERATIONS = 10000;
export const EPSILON = 0.01;
export const DEBOUNCE_MS = 100;
export const SERVANT_MAX_SLOTS = 6;
export const STORAGE_KEY = "fgo_calculator_data";
export const BOND_STORAGE_KEY = "fgo_bond_calculator_data";
export const CEFILTER_STORAGE_KEY = "fgo_ce_filter_data";

export const BOND_CONSTANTS = {
  MAX_BOND_NEEDED: 9999999,
  MAX_CUSTOM_BOND: 99999,
  FRONTLINE_SIZE: 3,
  MAX_BOND_BONUS_PCT: 25,
  SUPPORT_BONUS_PCT: 4,
  FRONTLINE_BONUS_PCT: 20,
  FRONTLINE_BONUS_FRACTION: 0.2
};

export const ICON_URLS = {
  bronze: {
    bg: "icons/materials/bronze_bg.webp",
    fg: "icons/materials/bronze_fg.webp"
  },
  silver: {
    bg: "icons/materials/silver_bg.webp",
    fg: "icons/materials/silver_fg.webp"
  },
  gold: {
    bg: "icons/materials/gold_bg.webp",
    fg: "icons/materials/gold_fg.webp"
  }
};

export const TIER_COLORS = {
  bronze: "#cd7f32",
  silver: "#71717a",
  gold: "#eab308"
};

export const QUEST_DROPS = {
  bronze: { primary: "bronze", secondary: "silver" },
  silver: { primary: "silver", secondary: "gold" },
  gold: { primary: "gold", secondary: "bronze" }
};

export const BOND_QUESTS = [
  { key: "fq83", name: "Free Quest Lv.83", bond: 835 },
  { key: "fq84", name: "Free Quest Lv.84", bond: 855 },
  { key: "gd100", name: "Grand Duel Lv.100\u2605\u2605\u2605", bond: 4748 }
];
