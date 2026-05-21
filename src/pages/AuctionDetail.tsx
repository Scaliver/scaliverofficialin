import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Gavel, Clock, Loader2, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Auction {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starting_price: number;
  current_bid: number;
  current_bidder_id: string | null;
  bid_increment: number;
  ends_at: string;
  status: string;
}
interface Bid { id: string; user_id: string; amount: number; created_at: string; display_name?: string | null; }

const AuctionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  const load = async () => {
    if (!id) return;
    const { data: a } = await supabase.from("auctions").select("*").eq("id", id).maybeSingle();
    setAuction(a as any);
    const { data: b } = await supabase
      .from("auction_bids")
      .select("id, user_id, amount, created_at")
      .eq("auction_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    const ids = Array.from(new Set((b || []).map((r: any) => r.user_id)));
    const nameMap: Record<string, string | null> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      (profs || []).forEach((p: any) => { nameMap[p.id] = p.display_name; });
    }
    setBids(((b as any[]) || []).map((r) => ({ ...r, display_name: nameMap[r.user_id] || null })));
  };

  useEffect(() => {
    load();
    if (!id) return;
    const ch = supabase
      .channel(`auction-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main>
      </div>
    );
  }

  const ended = new Date(auction.ends_at).getTime() <= now || auction.status !== "active";
  const minBid = Math.max(auction.starting_price, (auction.current_bid || 0) + (auction.bid_increment || 1));
  const diff = Math.max(0, new Date(auction.ends_at).getTime() - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const remaining = ended ? "Ended" : `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const handleBid = async () => {
    if (!user) { navigate("/auth"); return; }
    const amt = Number(amount);
    if (!amt || amt < minBid) { toast({ title: "Bid too low", description: `Minimum bid is ₹${minBid}`, variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("auction_bids").insert({ auction_id: auction.id, user_id: user.id, amount: amt });
    setSubmitting(false);
    if (error) { toast({ title: "Bid failed", description: error.message, variant: "destructive" }); return; }
    setAmount("");
    toast({ title: "Bid placed!", description: `You bid ₹${amt}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>{auction.title} | Auction</title></Helmet>
      <Header />
      <main className="container mx-auto px-3 py-4 pb-24 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/auction")} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>

        <Card className="overflow-hidden">
          {auction.image_url ? (
            <img src={auction.image_url} alt={auction.title} className="w-full aspect-video object-cover" />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"><Gavel className="w-12 h-12 text-primary" /></div>
          )}
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-display font-bold text-lg sm:text-2xl">{auction.title}</h1>
              <Badge variant={ended ? "secondary" : "default"}>{ended ? "ENDED" : "LIVE"}</Badge>
            </div>
            {auction.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{auction.description}</p>}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-[10px] text-muted-foreground uppercase">Current Bid</p>
                <p className="font-bold text-primary text-xl">₹{(auction.current_bid || auction.starting_price).toFixed(0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Time Left</p>
                <p className="font-bold font-mono text-xl">{remaining}</p>
              </div>
            </div>

            {!ended && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-muted-foreground">Minimum next bid: <span className="font-bold text-foreground">₹{minBid}</span></p>
                <div className="flex gap-2">
                  <Input type="number" inputMode="numeric" min={minBid} placeholder={`₹${minBid}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <Button onClick={handleBid} disabled={submitting} variant="gaming">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><TrendingUp className="w-4 h-4 mr-1" /> Bid</>)}
                  </Button>
                </div>
                {!user && <p className="text-xs text-muted-foreground">Sign in to place a bid.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="py-3"><CardTitle className="text-sm font-display">Recent Bids</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {bids.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No bids yet — be the first!</p>
            ) : (
              <div className="space-y-1.5">
                {bids.map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/40 text-sm">
                    <span className="truncate">{i === 0 && "🏆 "}{b.display_name || `${b.user_id.slice(0, 6)}…`}</span>
                    <span className="font-bold text-primary">₹{Number(b.amount).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AuctionDetail;
