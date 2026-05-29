// Auto-runs before `vite dev` and `vite build` via predev/prebuild hooks.
// Generates public/sitemap.xml dynamically from static routes + DB products.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://scaliverofficial.in";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://rhfpvuwefqfdqxscnquf.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";

type Entry = { path: string; changefreq?: string; priority?: string; lastmod?: string };

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/mlbb-diamond-recharge", changefreq: "weekly", priority: "0.9" },
  { path: "/pubg-uc-topup", changefreq: "weekly", priority: "0.9" },
  { path: "/freefire-topup", changefreq: "weekly", priority: "0.9" },
  { path: "/hok-topup", changefreq: "weekly", priority: "0.85" },
  { path: "/genshin-topup", changefreq: "weekly", priority: "0.85" },
  { path: "/auction", changefreq: "daily", priority: "0.7" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.6" },
  { path: "/redeem", changefreq: "monthly", priority: "0.5" },
  { path: "/add-coin", changefreq: "monthly", priority: "0.5" },
  { path: "/wallet", changefreq: "monthly", priority: "0.4" },
  { path: "/orders", changefreq: "weekly", priority: "0.4" },
  { path: "/profile", changefreq: "monthly", priority: "0.3" },
  { path: "/auth", changefreq: "monthly", priority: "0.3" },
];

async function fetchProductEntries(): Promise<Entry[]> {
  if (!SUPABASE_KEY) return [];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("in_stock", true);
    if (error || !data) return [];
    return data.map((p: { slug: string; updated_at: string }) => ({
      path: `/product/${p.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: p.updated_at?.slice(0, 10),
    }));
  } catch (e) {
    console.warn("[sitemap] product fetch failed, continuing with static entries", e);
    return [];
  }
}

function buildXml(entries: Entry[]) {
  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${BASE_URL}${e.path}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

(async () => {
  const productEntries = await fetchProductEntries();
  const entries = [...staticEntries, ...productEntries];
  writeFileSync(resolve("public/sitemap.xml"), buildXml(entries));
  console.log(`[sitemap] wrote ${entries.length} entries (${productEntries.length} products)`);
})();
