// ALUU Name Checker game codes & required fields
export interface GameCheckerOption {
  code: string;          // ALUU API code, used in /api/check/{code}-check
  label: string;
  requiresServer: boolean;
  serverLabel?: string;
  userLabel?: string;
}

export const ALUU_GAMES: GameCheckerOption[] = [
  { code: "mlbb", label: "Mobile Legends India", requiresServer: true, userLabel: "Player ID", serverLabel: "Server ID" },
  { code: "mlbb_global", label: "Mobile Legends Global", requiresServer: true, userLabel: "Player ID", serverLabel: "Server ID" },
  { code: "mlbb_br", label: "Mobile Legends Brazil", requiresServer: true },
  { code: "mlbb_ru", label: "Mobile Legends Russia", requiresServer: true },
  { code: "mlbb_tr", label: "Mobile Legends Turkey", requiresServer: true },
  { code: "magic_chest_gogo", label: "Magic Chess Go Go", requiresServer: true, userLabel: "Character ID", serverLabel: "Server Code" },
  { code: "pubgm", label: "PUBG Mobile", requiresServer: false, userLabel: "Character ID" },
  { code: "bgmi", label: "BGMI", requiresServer: false, userLabel: "Character ID" },
  { code: "ff", label: "Free Fire", requiresServer: false, userLabel: "Character ID" },
  { code: "ff_max", label: "Free Fire MAX", requiresServer: false, userLabel: "Character ID" },
  { code: "hok", label: "Honor Of Kings", requiresServer: false, userLabel: "Player ID" },
  { code: "genshin", label: "Genshin Impact", requiresServer: true, userLabel: "Character ID", serverLabel: "Server Code" },
  { code: "wuwa", label: "Wuthering Waves", requiresServer: true, userLabel: "Character ID", serverLabel: "Server Code" },
  { code: "blood_strike", label: "Blood Strike", requiresServer: false },
  { code: "delta_force", label: "Delta Force", requiresServer: false },
  { code: "stumble_guys", label: "Stumble Guys", requiresServer: false },
  { code: "arena_breakout", label: "Arena Breakout", requiresServer: false },
  { code: "ragnarok_x", label: "Ragnarok X", requiresServer: true },
  { code: "identity_v", label: "Identity V", requiresServer: false },
  { code: "honkai_star_rail", label: "Honkai Star Rail", requiresServer: true, serverLabel: "Server Code" },
  { code: "zenless_zone_zero", label: "Zenless Zone Zero", requiresServer: true, serverLabel: "Server Code" },
];

// Map product slug → ALUU name checker game code
const SLUG_MAP: Record<string, string> = {
  mlbb: "mlbb",
  "mlbb-large": "mlbb",
  "mlbb-mid": "mlbb",
  "mlbb-diamond-recharge": "mlbb",
  mlbb_global: "mlbb_global",
  "mlbb-global": "mlbb_global",
  "mlbb-brazil": "mlbb_br",
  "magic-chess-gogo": "magic_chest_gogo",
  "magic-chess": "magic_chest_gogo",
  pubgm: "pubgm",
  pubg: "pubgm",
  bgmi: "bgmi",
  freefire: "ff",
  "free-fire": "ff",
  "freefire-max": "ff_max",
  hok: "hok",
  "honor-of-kings": "hok",
  genshin: "genshin",
  "genshin-impact": "genshin",
  wuwa: "wuwa",
  "wuthering-waves": "wuwa",
};

export function getGameCodeForSlug(slug?: string | null): string | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (SLUG_MAP[s]) return SLUG_MAP[s];
  // fuzzy: any slug starting with "mlbb" defaults to mlbb
  if (s.startsWith("mlbb")) return "mlbb";
  if (s.includes("magic-chess") || s.includes("magic_chess")) return "magic_chest_gogo";
  if (s.includes("pubg")) return "pubgm";
  if (s.includes("free-fire") || s.includes("freefire")) return s.includes("max") ? "ff_max" : "ff";
  if (s.includes("genshin")) return "genshin";
  if (s.includes("honor") && s.includes("king")) return "hok";
  return null;
}
