import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2, Crown, Medal, RefreshCw, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Row {
  user_id: string;
  display_name: string | null;
  total_spent: number;
  order_count: number;
}

const Leaderboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const { toast } = useToast();

  const loadRows = async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);
      // Pull completed orders (admin can read all per RLS)
      const { data: orders } = await supabase
        .from("orders")
        .select("user_id, price, status")
        .in("status", ["completed", "processing"]);

      const totals = new Map<string, { total: number; count: number }>();
      (orders || []).forEach((o: any) => {
        const cur = totals.get(o.user_id) || { total: 0, count: 0 };
        cur.total += Number(o.price) || 0;
        cur.count += 1;
        totals.set(o.user_id, cur);
      });

      const ranked = Array.from(totals.entries())
        .map(([user_id, v]) => ({ user_id, total_spent: v.total, order_count: v.count }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 15);

      const ids = ranked.map((r) => r.user_id);
      let names: Record<string, string | null> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ids);
        (profiles || []).forEach((p: any) => { names[p.id] = p.display_name; });
      }

      setRows(ranked.map((r) => ({ ...r, display_name: names[r.user_id] || null })));
      setLoading(false);
      setRefreshing(false);
  };

  useEffect(() => {
    loadRows();
  }, []);

  const refreshMonthly = async () => {
    setRefreshing(true);
    try {
      const stamp = new Date().toISOString();
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "leaderboard_last_manual_refresh")
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("site_settings").update({ value: { at: stamp } }).eq("key", "leaderboard_last_manual_refresh");
      } else {
        await supabase.from("site_settings").insert({ key: "leaderboard_last_manual_refresh", value: { at: stamp } });
      }

      setLastRefreshAt(stamp);
      await loadRows(true);
      toast({ title: "Leaderboard refreshed", description: "Monthly leaderboard data has been refreshed." });
    } catch (error) {
      console.error(error);
      setRefreshing(false);
      toast({ title: "Refresh failed", description: "Could not refresh leaderboard right now.", variant: "destructive" });
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "leaderboard_last_manual_refresh")
        .maybeSingle();
      const value = data?.value as { at?: string } | null;
      if (value?.at) setLastRefreshAt(value.at);
    })();
  }, []);

  const rankBadge = (i: number) => {
    if (i === 0) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (i === 1) return <Medal className="w-4 h-4 text-gray-300" />;
    if (i === 2) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-xs text-muted-foreground font-bold">#{i + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-display">
              <Trophy className="w-5 h-5 text-primary" />
              Top Spenders (Top 15)
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <CalendarClock className="w-3.5 h-3.5" />
              {lastRefreshAt ? `Last admin refresh: ${new Date(lastRefreshAt).toLocaleString("en-IN")}` : "No manual refresh recorded yet"}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refreshMonthly} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Monthly Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">No completed orders yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div
                key={r.user_id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {rankBadge(i)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {r.display_name || `${r.user_id.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{r.user_id}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-bold text-primary text-sm sm:text-base">₹{r.total_spent.toFixed(2)}</span>
                  <Badge variant="outline" className="text-[10px] mt-0.5">{r.order_count} orders</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
