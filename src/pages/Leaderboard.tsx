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

interface Row {
  user_id: string;
  display_name: string | null;
  total_spent: number;
  order_count: number;
}

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRows = async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    const { data: orders } = await supabase
      .from("orders")
      .select("user_id, price, status")
      .in("status", ["completed", "processing"]);

    const totals = new Map<string, { total: number; count: number }>();
    (orders || []).forEach((order: any) => {
      const current = totals.get(order.user_id) || { total: 0, count: 0 };
      current.total += Number(order.price) || 0;
      current.count += 1;
      totals.set(order.user_id, current);
    });

    const ranked = Array.from(totals.entries())
      .map(([user_id, values]) => ({
        user_id,
        total_spent: values.total,
        order_count: values.count,
      }))
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 15);

    const ids = ranked.map((row) => row.user_id);
    const nameMap: Record<string, string | null> = {};
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      (profiles || []).forEach((profile: any) => {
        nameMap[profile.id] = profile.display_name;
      });
    }

    setRows(ranked.map((row) => ({ ...row, display_name: nameMap[row.user_id] || null })));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadRows();
  }, []);

  const topThree = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  const rankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Top Buyers Leaderboard | Scaliver Official</title>
        <meta name="description" content="See the top 15 buyers on Scaliver Official and track the highest purchasers by total spend." />
        <link rel="canonical" href="https://scaliverofficial.in/leaderboard" />
        <meta property="og:title" content="Top Buyers Leaderboard | Scaliver Official" />
        <meta property="og:description" content="Top 15 buyers ranked by total purchase amount." />
        <meta property="og:url" content="https://scaliverofficial.in/leaderboard" />
      </Helmet>

      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-8 max-w-4xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadRows(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="mb-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg sm:text-xl">
              <Trophy className="w-5 h-5 text-primary" />
              Top Purchase Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Live ranking of the top 15 buyers by total completed and processing purchase amount.</p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No buyer data yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topThree.map((row, index) => (
                <Card key={row.user_id} className="border-border bg-card">
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {rankIcon(index)}
                    </div>
                    <p className="font-semibold truncate">{row.display_name || `${row.user_id.slice(0, 8)}…`}</p>
                    <div className="flex items-center justify-center gap-1 text-primary font-bold text-lg">
                      <Coins className="w-4 h-4" /> ₹{row.total_spent.toFixed(2)}
                    </div>
                    <Badge variant="outline">{row.order_count} orders</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2">
                  {rows.map((row, index) => (
                    <div key={row.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {rankIcon(index)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{row.display_name || `${row.user_id.slice(0, 8)}…`}</p>
                          <p className="text-xs text-muted-foreground">Top buyer rank #{index + 1}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-primary text-sm sm:text-base">₹{row.total_spent.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{row.order_count} purchases</p>
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