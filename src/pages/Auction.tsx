import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Gavel, Clock, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuctionRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starting_price: number;
  current_bid: number;
  ends_at: string;
  status: string;
}

function useCountdown(endsAt: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff <= 0) return "Ended";
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const AuctionCard = ({ a }: { a: AuctionRow }) => {
  const remaining = useCountdown(a.ends_at);
  return (
    <Link to={`/auction/${a.id}`}>
      <Card className="overflow-hidden hover:border-primary/50 transition-all card-hover">
        {a.image_url ? (
          <img src={a.image_url} alt={a.title} className="w-full aspect-video object-cover" loading="lazy" />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Gavel className="w-10 h-10 text-primary" />
          </div>
        )}
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold text-sm sm:text-base truncate">{a.title}</h3>
            <Badge variant={a.status === "active" && remaining !== "Ended" ? "default" : "secondary"} className="text-[10px] shrink-0">
              {a.status === "active" && remaining !== "Ended" ? "LIVE" : "ENDED"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{a.description}</p>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] text-muted-foreground">Current Bid</p>
              <p className="font-bold text-primary text-sm">₹{(a.current_bid || a.starting_price).toFixed(0)}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{remaining}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const AuctionPage = () => {
  const [rows, setRows] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("auctions")
      .select("id, title, description, image_url, starting_price, current_bid, ends_at, status")
      .order("ends_at", { ascending: true });
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("auctions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Live Auctions | Scaliver Official</title>
        <meta name="description" content="Bid live on gaming items, accounts and diamonds at Scaliver Official auctions." />
        <link rel="canonical" href="https://scaliverofficial.in/auction" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-3 py-4 pb-24 md:pb-8 max-w-5xl">
        <div className="flex items-center gap-2 mb-4">
          <Gavel className="w-5 h-5 text-primary" />
          <h1 className="font-display text-xl sm:text-2xl font-bold">Live Auctions</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No auctions yet. Check back soon!</CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {rows.map((a) => <AuctionCard key={a.id} a={a} />)}
          </div>
        )}
      </main>
      <Footer />
      <QuickActions />
    </div>
  );
};

export default AuctionPage;
