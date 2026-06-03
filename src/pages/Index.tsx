import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import MarqueeBanner from "@/components/MarqueeBanner";
import ProductSection from "@/components/ProductSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface SiteAlert {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  alert_type: string;
  image_url?: string | null;
  redirect_url?: string | null;
  cta_label?: string | null;
}

const Index = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [siteAlert, setSiteAlert] = useState<SiteAlert | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { legacyProducts, getDisplayProducts, isLoading } = useProducts();

  // Dynamic categories (live updates via realtime)
  const [categories, setCategories] = useState<{ id: string; name: string; sort_order: number }[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("categories" as any)
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setCategories(((data || []) as unknown) as { id: string; name: string; sort_order: number }[]);
    };
    load();
    const ch = supabase
      .channel("categories-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const effectiveCategories = useMemo(() => {
    if (categories.length) return categories;
    return Array.from(new Set(legacyProducts.map(p => p.category))).map((name, i) => ({ id: name, name, sort_order: i }));
  }, [categories, legacyProducts]);

  const sections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectiveCategories
      .map(cat => {
        const items = getDisplayProducts(cat.name);
        const filtered = q ? items.filter(p => p.name?.toLowerCase().includes(q)) : items;
        return { name: cat.name, items: filtered };
      })
      .filter(s => s.items.length > 0);
  }, [effectiveCategories, getDisplayProducts, searchQuery]);

  // Payment verification now happens exclusively on /payment-detect.
  // If a stale payment_order param lands on home, just clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('payment_order')) {
      const paymentId = params.get('payment_order');
      window.location.replace(`/payment-detect?id=${paymentId || ''}`);
    }
  }, []);

  useEffect(() => {
    const fetchActiveAlert = async () => {
      try {
        const { data, error } = await supabase
          .from('site_alerts' as any)
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const alertData = data as unknown as SiteAlert;
          setSiteAlert(alertData);
          
          // Check if user has dismissed this specific alert
          const dismissedAlertId = localStorage.getItem("dismissedAlertId");
          if (dismissedAlertId !== alertData.id) {
            setShowAlert(true);
          }
        }
      } catch (error) {
        console.error("Error fetching site alert:", error);
      }
    };

    fetchActiveAlert();
  }, []);

  const handleClose = () => {
    if (dontShowAgain && siteAlert) {
      localStorage.setItem("dismissedAlertId", siteAlert.id);
    }
    setShowAlert(false);
  };

  const handleJoinNow = () => {
    if (siteAlert?.redirect_url) {
      window.location.href = siteAlert.redirect_url;
      return;
    }
    handleClose();
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case "warning":
        return { icon: "⚠️", titleClass: "text-yellow-400" };
      case "success":
        return { icon: "✅", titleClass: "text-green-400" };
      case "error":
        return { icon: "❌", titleClass: "text-red-400" };
      default:
        return { icon: "ℹ️", titleClass: "text-blue-400" };
    }
  };

  const alertStyles = siteAlert ? getAlertStyles(siteAlert.alert_type) : getAlertStyles("info");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Scaliver Official | MLBB, PUBG UC & Game Top Up India</title>
        <meta
          name="description"
          content="Buy MLBB diamonds, PUBG UC, Free Fire & BGMI topups with instant UPI verification and auto delivery."
        />
        <link rel="canonical" href="https://scaliverofficial.in/" />
        <meta property="og:title" content="Scaliver Official | Instant Game Top Up India" />
        <meta
          property="og:description"
          content="Automatic UPI verification and fast Mobile Legends, PUBG UC and Free Fire topups in India."
        />
        <meta property="og:url" content="https://scaliverofficial.in/" />
      </Helmet>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert && !!siteAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={alertStyles.titleClass}>
              {alertStyles.icon} {siteAlert?.title || "Important Notice"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {siteAlert?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {siteAlert?.image_url && (
            <button
              type="button"
              onClick={handleJoinNow}
              className="block overflow-hidden rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={siteAlert.title}
            >
              <img
                src={siteAlert.image_url}
                alt={siteAlert.title}
                className="w-full max-h-[55vh] object-cover"
                loading="lazy"
              />
            </button>
          )}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox 
              id="dontShowAgain" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label htmlFor="dontShowAgain" className="text-sm cursor-pointer">
              Don't show this again
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleJoinNow}>
              {siteAlert?.cta_label?.trim() || "Join Now"}
            </AlertDialogAction>
            <AlertDialogAction onClick={handleClose}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <Header />

      {/* Hero Banner Carousel */}
      <HeroBanner />

      <h1 className="sr-only">Scaliver Official Game Top Up India</h1>

      {/* Scrolling Marquee */}
      <MarqueeBanner />

      {/* Product Sections */}
      <main id="games" className="pb-8">
        {/* Quick Actions - Easy access to wallet features */}
        <QuickActions />

        {/* Search Bar */}
        <div className="container pt-4 pb-2">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games, products..."
              className="w-full h-12 pl-12 pr-12 text-base rounded-full border-2 border-border bg-card focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {sections.map((s) => (
          <ProductSection key={s.name} title={s.name} products={s.items} />
        ))}

        {searchQuery && sections.length === 0 && (
          <div className="container py-12 text-center text-muted-foreground">
            No products match "{searchQuery}".
          </div>
        )}

        {/* Features Section */}
        <FeaturesSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </div>
  );
};

export default Index;
