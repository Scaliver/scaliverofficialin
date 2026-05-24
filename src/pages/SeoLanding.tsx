import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ProductSection from "@/components/ProductSection";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck, Clock, IndianRupee } from "lucide-react";

interface LandingConfig {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
  category: "Mobile Legends" | "Mobile Games" | "Social Media";
  filter?: (name: string) => boolean;
  faqs: { q: string; a: string }[];
}

const SITE = "https://scaliverofficial.in";

const COMMON_FAQS = [
  { q: "How fast is delivery?", a: "Most orders complete within 1-5 minutes through our automated Aluu.in & SmileOne API integration. Manual orders may take up to 10 minutes." },
  { q: "Is payment safe?", a: "Yes. All UPI payments are processed through verified gateways with automatic verification. We never store your bank details." },
  { q: "Do you offer refunds?", a: "Failed orders are automatically refunded to your wallet. For other issues, contact support via WhatsApp." },
];

const LANDINGS: LandingConfig[] = [
  {
    slug: "mlbb-topup",
    title: "Buy MLBB Diamonds Cheap in India | Instant Mobile Legends Recharge",
    description: "Buy Mobile Legends diamonds instantly at cheap prices. Fast delivery, secure UPI payment, trusted MLBB recharge website in India.",
    h1: "MLBB Diamond Recharge - Cheapest in India",
    intro: "Get the cheapest Mobile Legends Bang Bang diamonds, Weekly Diamond Pass, Twilight Pass and Starlight Member with instant delivery to any MLBB account.",
    keywords: ["mlbb recharge", "mobile legends recharge", "buy mlbb diamonds", "cheap mlbb diamonds", "weekly pass mlbb", "mobile legends topup india"],
    category: "Mobile Legends",
    faqs: [
      { q: "How do I find my MLBB User ID?", a: "Open Mobile Legends, tap your avatar, your User ID and Zone ID will appear under your name." },
      ...COMMON_FAQS,
    ],
  },
  {
    slug: "mlbb-recharge-india",
    title: "MLBB Recharge India | Cheap Mobile Legends Diamond Top Up",
    description: "MLBB recharge in India with instant diamond delivery. Pay via UPI, get Mobile Legends diamonds & weekly pass at lowest prices.",
    h1: "Mobile Legends Recharge India",
    intro: "India's trusted MLBB diamond recharge store. Instant top up with UPI, no login required for delivery.",
    keywords: ["mlbb recharge india", "mobile legends india topup", "ml diamond india"],
    category: "Mobile Legends",
    faqs: COMMON_FAQS,
  },
  {
    slug: "mlbb-recharge-store",
    title: "MLBB Recharge Store | Best Mobile Legends Top Up Store Online",
    description: "Official MLBB recharge store with instant diamond delivery. Compare packs, weekly pass, twilight pass and starlight.",
    h1: "MLBB Recharge Store",
    intro: "One-stop store for all Mobile Legends recharge needs - diamonds, weekly pass, starlight member.",
    keywords: ["mlbb recharge store", "mobile legends store"],
    category: "Mobile Legends",
    faqs: COMMON_FAQS,
  },
  {
    slug: "mlbb-recharge-website",
    title: "Best MLBB Recharge Website | Mobile Legends Diamond Top Up Site",
    description: "Best MLBB recharge website in India. Fast, secure & cheap Mobile Legends diamond top up with auto delivery.",
    h1: "Best MLBB Recharge Website",
    intro: "Scaliver Official is the most trusted Mobile Legends recharge website with thousands of orders delivered.",
    keywords: ["mlbb recharge website", "best mlbb topup site"],
    category: "Mobile Legends",
    faqs: COMMON_FAQS,
  },
  {
    slug: "cheap-mlbb-recharge",
    title: "Cheap MLBB Recharge | Lowest Price Mobile Legends Top Up",
    description: "Cheap MLBB recharge with lowest price diamonds, weekly pass and twilight pass. Compare and save up to 20%.",
    h1: "Cheap MLBB Recharge - Save Big",
    intro: "Save big on every Mobile Legends top up. Wallet bonuses and seasonal offers stack on top of our base discount.",
    keywords: ["cheap mlbb recharge", "discount mlbb diamonds"],
    category: "Mobile Legends",
    faqs: COMMON_FAQS,
  },
  {
    slug: "mlbb-diamond-recharge",
    title: "MLBB Diamond Recharge | Buy ML Diamonds Online India",
    description: "Recharge MLBB diamonds online with instant delivery. All diamond packs available - 11, 22, 56, 86, 172, 257, 344 diamonds.",
    h1: "MLBB Diamond Recharge",
    intro: "All Mobile Legends diamond packs in one place - from 11 diamonds to 5000+ diamonds.",
    keywords: ["mlbb diamond recharge", "buy ml diamonds", "ml diamond topup"],
    category: "Mobile Legends",
    faqs: COMMON_FAQS,
  },
  {
    slug: "pubg-uc-topup",
    title: "PUBG UC Topup | Cheap PUBG Mobile UC Recharge India",
    description: "Buy PUBG Mobile UC at cheapest prices in India. Instant UC delivery with secure UPI payments.",
    h1: "PUBG UC Topup - Cheapest in India",
    intro: "Recharge PUBG Mobile UC instantly. All UC packs available with auto delivery.",
    keywords: ["pubg uc topup", "buy uc pubg", "cheap pubg uc", "pubgm recharge india"],
    category: "Mobile Games",
    filter: (n) => /pubg|uc/i.test(n),
    faqs: COMMON_FAQS,
  },
  {
    slug: "freefire-topup",
    title: "Free Fire Diamonds Topup | Cheap FF Diamond Recharge India",
    description: "Buy Free Fire diamonds at cheap prices. Instant FF diamond top up & weekly membership with UPI payment.",
    h1: "Free Fire Diamond Topup",
    intro: "Cheapest Free Fire diamonds and Weekly/Monthly membership with instant delivery.",
    keywords: ["free fire top up", "buy free fire diamonds", "cheap free fire recharge", "free fire weekly membership"],
    category: "Mobile Games",
    filter: (n) => /free\s*fire|ff /i.test(n),
    faqs: COMMON_FAQS,
  },
  {
    slug: "hok-topup",
    title: "Honor of Kings Topup | HOK Tokens Recharge India",
    description: "Honor of Kings recharge with instant token delivery. Cheap HOK top up website in India.",
    h1: "Honor of Kings Recharge",
    intro: "Recharge Honor of Kings tokens instantly via UPI.",
    keywords: ["hok topup", "honor of kings recharge"],
    category: "Mobile Games",
    filter: (n) => /honor|hok/i.test(n),
    faqs: COMMON_FAQS,
  },
  {
    slug: "genshin-topup",
    title: "Genshin Impact Topup | Genesis Crystals Recharge India",
    description: "Buy Genshin Impact Genesis Crystals & Blessing of Welkin at cheap prices with instant delivery.",
    h1: "Genshin Impact Topup",
    intro: "Genesis Crystals, Welkin and Battle Pass with instant top up.",
    keywords: ["genshin topup", "genesis crystals", "genshin impact recharge"],
    category: "Mobile Games",
    filter: (n) => /genshin/i.test(n),
    faqs: COMMON_FAQS,
  },
];

export const LANDING_SLUGS = LANDINGS.map((l) => l.slug);

const SeoLanding = () => {
  const { slug } = useParams();
  const cfg = LANDINGS.find((l) => l.slug === slug);
  const { getDisplayProducts } = useProducts();

  if (!cfg) return <Navigate to="/" replace />;

  let products = getDisplayProducts(cfg.category);
  if (cfg.filter) products = products.filter((p) => cfg.filter!(p.name || ""));

  const url = `${SITE}/${cfg.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{cfg.title}</title>
        <meta name="description" content={cfg.description} />
        <meta name="keywords" content={cfg.keywords.join(", ")} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={cfg.title} />
        <meta property="og:description" content={cfg.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: cfg.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE },
              { "@type": "ListItem", position: 2, name: cfg.h1, item: url },
            ],
          })}
        </script>
        {products.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: cfg.h1,
              itemListElement: products.slice(0, 20).map((p: any, idx: number) => {
                const prices = (p.pricingTiers || []).map((t: any) => Number(t.price)).filter((n: number) => n > 0);
                const low = prices.length ? Math.min(...prices) : undefined;
                const high = prices.length ? Math.max(...prices) : undefined;
                const img = typeof p.image === "string" && p.image.startsWith("http") ? p.image : `${SITE}${p.image || ""}`;
                return {
                  "@type": "ListItem",
                  position: idx + 1,
                  item: {
                    "@type": "Product",
                    name: p.name,
                    image: img,
                    description: p.description || `${p.name} instant top up in India`,
                    brand: { "@type": "Brand", name: "Scaliver Official" },
                    url: `${SITE}/product/${p.slug || p.id}`,
                    offers: low !== undefined ? {
                      "@type": "AggregateOffer",
                      priceCurrency: "INR",
                      lowPrice: low,
                      highPrice: high,
                      offerCount: prices.length,
                      availability: p.inStock === false
                        ? "https://schema.org/OutOfStock"
                        : "https://schema.org/InStock",
                      url: `${SITE}/product/${p.slug || p.id}`,
                    } : undefined,
                  },
                };
              }),
            })}
          </script>
        )}
      </Helmet>

      <Header />

      <main className="container py-6 md:py-10">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link to="/" className="hover:text-primary">Home</Link> / <span>{cfg.h1}</span>
        </nav>

        <section className="bg-gradient-to-br from-primary/10 to-accent/5 border border-border rounded-2xl p-5 md:p-8 mb-6">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-gradient mb-3">{cfg.h1}</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-4 max-w-3xl">{cfg.intro}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {cfg.keywords.slice(0, 6).map((k) => (
              <span key={k} className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground">#{k}</span>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Zap, t: "Instant Delivery", d: "1-5 min auto" },
            { icon: IndianRupee, t: "Cheapest Price", d: "India lowest" },
            { icon: ShieldCheck, t: "Secure UPI", d: "Auto verified" },
            { icon: Clock, t: "24/7 Support", d: "WhatsApp help" },
          ].map((f) => (
            <div key={f.t} className="bg-card border border-border rounded-xl p-3 text-center">
              <f.icon className="w-5 h-5 md:w-6 md:h-6 text-primary mx-auto mb-1" />
              <p className="font-display text-xs md:text-sm font-bold">{f.t}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        {products.length > 0 ? (
          <ProductSection title={cfg.h1} products={products} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Loading products... <Link to="/" className="text-primary underline ml-1">Browse all</Link>
          </div>
        )}

        <section className="mt-8 bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="font-display text-lg md:text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {cfg.faqs.map((f) => (
              <details key={f.q} className="bg-secondary/30 rounded-lg p-3">
                <summary className="font-semibold text-sm md:text-base cursor-pointer">{f.q}</summary>
                <p className="mt-2 text-xs md:text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-6 bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="font-display text-lg md:text-xl font-bold mb-3">Explore More Game Recharge</h2>
          <div className="flex flex-wrap gap-2">
            {LANDINGS.filter((l) => l.slug !== cfg.slug).map((l) => (
              <Button key={l.slug} variant="outline" size="sm" asChild>
                <Link to={`/${l.slug}`}>{l.h1}</Link>
              </Button>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default SeoLanding;
