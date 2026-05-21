import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2, Crown, Medal, RefreshCw, CalendarClock, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Row {
  user_id: string;
  display_name: string | null;
  total_spent: number;
  order_count: number;
  manual_rank: number | null;
  hidden: boolean;
}

const Leaderboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const { toast } = useToast();

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

    const baseRanked = Array.from(totals.entries())
      .map(([user_id, v]) => ({ user_id, total_spent: v.total, order_count: v.count }))
      .sort((a, b) => b.total_spent - a.total_spent);

    // Apply manual ranks: those with manual_rank go first in that order, then the rest.
    const withMR = baseRanked.filter(r => ovMap.get(r.user_id)?.manual_rank != null)
      .sort((a, b) => (ovMap.get(a.user_id)!.manual_rank! - ovMap.get(b.user_id)!.manual_rank!));
    const withoutMR = baseRanked.filter(r => ovMap.get(r.user_id)?.manual_rank == null);
    const finalList = [...withMR, ...withoutMR].slice(0, 20);

    const ids = finalList.map((r) => r.user_id);
    const names: Record<string, string | null> = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      (profiles || []).forEach((p: any) => { names[p.id] = p.display_name; });
    }

    setRows(finalList.map((r) => ({
      ...r,
      display_name: names[r.user_id] || null,
      manual_rank: ovMap.get(r.user_id)?.manual_rank ?? null,
      hidden: ovMap.get(r.user_id)?.hidden ?? false,
    })));
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { loadRows(); }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "leaderboard_last_manual_refresh").maybeSingle();
      const v = data?.value as { at?: string } | null;
      if (v?.at) setLastRefreshAt(v.at);
    })();
  }, []);

  const refreshMonthly = async () => {
    setRefreshing(true);
    try {
      const stamp = new Date().toISOString();
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "leaderboard_last_manual_refresh").maybeSingle();
      if (existing?.id) await supabase.from("site_settings").update({ value: { at: stamp } }).eq("key", "leaderboard_last_manual_refresh");
      else await supabase.from("site_settings").insert({ key: "leaderboard_last_manual_refresh", value: { at: stamp } });
      setLastRefreshAt(stamp);
      await loadRows(true);
      toast({ title: "Leaderboard refreshed" });
    } catch { setRefreshing(false); toast({ title: "Refresh failed", variant: "destructive" }); }
  };

  const saveOverride = async (user_id: string, patch: { manual_rank?: number | null; hidden?: boolean }) => {
    const current = rows.find(r => r.user_id === user_id);
    const next = {
      user_id,
      manual_rank: patch.manual_rank !== undefined ? patch.manual_rank : current?.manual_rank ?? null,
      hidden: patch.hidden !== undefined ? patch.hidden : current?.hidden ?? false,
    };
    const { error } = await supabase.from("leaderboard_overrides").upsert(next, { onConflict: "user_id" });
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    loadRows();
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    const me = rows[i];
    const above = rows[i - 1];
    const targetRank = above.manual_rank ?? i; // shift into above's slot
    saveOverride(me.user_id, { manual_rank: targetRank });
    if (above.manual_rank == null) saveOverride(above.user_id, { manual_rank: i + 1 });
  };
  const moveDown = (i: number) => {
    if (i >= rows.length - 1) return;
    const me = rows[i];
    const below = rows[i + 1];
    const targetRank = below.manual_rank ?? i + 2;
    saveOverride(me.user_id, { manual_rank: targetRank });
    if (below.manual_rank == null) saveOverride(below.user_id, { manual_rank: i + 1 });
  };

  const rankBadge = (i: number) => {
    if (i === 0) return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
    if (i === 1) return <Medal className="w-3.5 h-3.5 text-gray-300" />;
    if (i === 2) return <Medal className="w-3.5 h-3.5 text-amber-700" />;
    return <span className="text-[10px] text-muted-foreground font-bold">#{i + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-display">
              <Trophy className="w-4 h-4 text-primary" /> Top Spenders (Editable)
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1.5">
              <CalendarClock className="w-3 h-3" />
              {lastRefreshAt ? `Last refresh: ${new Date(lastRefreshAt).toLocaleString("en-IN")}` : "No manual refresh yet"}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refreshMonthly} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Monthly Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">No completed orders yet.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={r.user_id} className={`flex items-center gap-2 p-2 rounded-lg bg-secondary/40 border border-border ${r.hidden ? "opacity-50" : ""}`}>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">{rankBadge(i)}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs truncate">{r.display_name || `${r.user_id.slice(0, 8)}…`}</p>
                  <p className="text-[10px] text-muted-foreground">₹{r.total_spent.toFixed(0)} · {r.order_count}o {r.manual_rank != null && <Badge variant="outline" className="ml-1 text-[9px] py-0">pinned</Badge>}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveUp(i)} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDown(i)} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveOverride(r.user_id, { hidden: !r.hidden })} title="Hide/show">
                    {r.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  {r.manual_rank != null && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveOverride(r.user_id, { manual_rank: null })} title="Clear pin">
                      <span className="text-[10px]">✕</span>
                    </Button>
                  )}
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
