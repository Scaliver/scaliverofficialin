import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Trophy, Crown, Medal, Loader2, RefreshCw, Coins, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Row { user_id: string; display_name: string | null; total_spent: number; order_count: number; }

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRows = async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);

    const { data: orders } = await supabase.from("orders").select("user_id, price, status").in("status", ["completed", "processing"]);
    const totals = new Map<string, { total: number; count: number }>();
    (orders || []).forEach((o: any) => {
      const cur = totals.get(o.user_id) || { total: 0, count: 0 };
      cur.total += Number(o.price) || 0;
      cur.count += 1;
      totals.set(o.user_id, cur);
    });

    const { data: overrides } = await supabase.from("leaderboard_overrides").select("user_id, manual_rank, hidden");
    const ovMap = new Map<string, { manual_rank: number | null; hidden: boolean }>();
    (overrides || []).forEach((o: any) => ovMap.set(o.user_id, { manual_rank: o.manual_rank, hidden: o.hidden }));

    const base = Array.from(totals.entries())
      .map(([user_id, v]) => ({ user_id, total_spent: v.total, order_count: v.count }))
      .filter(r => !ovMap.get(r.user_id)?.hidden)
      .sort((a, b) => b.total_spent - a.total_spent);

    const pinned = base.filter(r => ovMap.get(r.user_id)?.manual_rank != null)
      .sort((a, b) => (ovMap.get(a.user_id)!.manual_rank! - ovMap.get(b.user_id)!.manual_rank!));
    const rest = base.filter(r => ovMap.get(r.user_id)?.manual_rank == null);
    const ranked = [...pinned, ...rest].slice(0, 15);

    const ids = ranked.map((r) => r.user_id);
    const nameMap: Record<string, string | null> = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      (profiles || []).forEach((p: any) => { nameMap[p.id] = p.display_name; });
    }

    setRows(ranked.map((r) => ({ ...r, display_name: nameMap[r.user_id] || null })));
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { loadRows(); }, []);

  const topThree = useMemo(() => rows.slice(0, 3), [rows]);

  const rankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (index === 1) return <Medal className="w-4 h-4 text-slate-400" />;
    if (index === 2) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Top Buyers Leaderboard | Scaliver Official</title>
        <meta name="description" content="See the top 15 buyers on Scaliver Official ranked by total spend." />
        <link rel="canonical" href="https://scaliverofficial.in/leaderboard" />
      </Helmet>

      <Header />
      <main className="container mx-auto px-3 py-3 pb-24 md:pb-8 max-w-3xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadRows(true)} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-3">Top Buyers Leaderboard</h1>


        <Card className="mb-4 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardHeader className="py-3">
            <h2 className="flex items-center gap-2 font-display text-base sm:text-lg font-semibold leading-none tracking-tight">
              <Trophy className="w-4 h-4 text-primary" /> Top Purchase Leaderboard
            </h2>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Live ranking of the top 15 buyers by total purchase amount.</p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No buyer data yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {topThree.map((r, i) => (
                <Card key={r.user_id} className="border-border bg-card">
                  <CardContent className="p-2 text-center space-y-1">
                    <div className="mx-auto w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">{rankIcon(i)}</div>
                    <p className="font-semibold truncate text-xs">{r.display_name || `${r.user_id.slice(0, 6)}…`}</p>
                    <div className="flex items-center justify-center gap-1 text-primary font-bold text-sm">
                      <Coins className="w-3 h-3" /> ₹{r.total_spent.toFixed(0)}
                    </div>
                    <Badge variant="outline" className="text-[9px]">{r.order_count} orders</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="space-y-1.5">
                  {rows.map((r, i) => (
                    <div key={r.user_id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/40 border border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">{rankIcon(i)}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate">{r.display_name || `${r.user_id.slice(0, 8)}…`}</p>
                          <p className="text-[10px] text-muted-foreground">Rank #{i + 1}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-primary text-xs sm:text-sm">₹{r.total_spent.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">{r.order_count} buys</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
      <QuickActions />
    </div>
  );
};

export default LeaderboardPage;
