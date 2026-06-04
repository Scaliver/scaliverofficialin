// Generates public/sitemap.xml from real routes + active products in Supabase.
// Runs automatically via npm `predev` and `prebuild` hooks.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://scaliverofficial.in";
const SUPABASE_URL = "https://rhfpvuwefqfdqxscnquf.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnB2dXdlZnFmZHF4c2NucXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzExMzIsImV4cCI6MjA4MjUwNzEzMn0.Ogf4LMG2rbDLeSmm2AnkXpZOICeH3HomM5NceTmf4uk";

interface Entry {
  path: string;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

// Real static routes that exist in src/App.tsx
const STATIC: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.6" },
  { path: "/auction", changefreq: "daily", priority: "0.7" },
  { path: "/auth", changefreq: "monthly", priority: "0.3" },
  { path: "/redeem", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.4" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/help-support", changefreq: "monthly", priority: "0.5" },
];

// Real SEO landing routes wired in src/pages/SeoLanding.tsx
const LANDINGS: Entry[] = [
  { path: "/mlbb-topup", priority: "0.95" },
  { path: "/mlbb-recharge-india", priority: "0.9" },
  { path: "/mlbb-recharge-store", priority: "0.85" },
  { path: "/mlbb-recharge-website", priority: "0.85" },
  { path: "/cheap-mlbb-recharge", priority: "0.9" },
  { path: "/mlbb-diamond-recharge", priority: "0.9" },
  { path: "/pubg-uc-topup", priority: "0.9" },
  { path: "/freefire-topup", priority: "0.9" },
  { path: "/hok-topup", priority: "0.85" },
  { path: "/genshin-topup", priority: "0.85" },
].map((e) => ({ ...e, changefreq: "weekly" }));

async function fetchProducts(): Promise<Entry[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=slug,updated_at&in_stock=eq.true&order=sort_order.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as { slug: string; updated_at: string }[];
    return rows
      .filter((r) => r.slug && r.slug.trim().length > 0)
      .map((r) => ({
        path: `/product/${r.slug}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: r.updated_at?.slice(0, 10),
      }));
  } catch (err) {
    console.warn("[sitemap] product fetch failed:", err);
    return [];
  }
}

function render(entries: Entry[]): string {
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
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

(async () => {
  const products = await fetchProducts();
  const all = [...STATIC, ...LANDINGS, ...products];
  writeFileSync(resolve("public/sitemap.xml"), render(all));
  console.log(`sitemap.xml written (${all.length} URLs, ${products.length} products)`);
})();
