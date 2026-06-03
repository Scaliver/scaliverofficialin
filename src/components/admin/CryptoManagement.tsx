import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CryptoOrderRow {
  id: string;
  user_id: string;
  order_reference: string;
  amount: number;
  amount_paid?: number | null;
  status: string;
  credited: boolean;
  transaction_hash: string | null;
  wallet_address: string | null;
  request_type: string;
  error_message?: string | null;
  created_at: string;
  user_email?: string | null;
}

interface DepositLogRow {
  id: string;
  user_id: string;
  order_reference: string | null;
  transaction_hash: string | null;
  amount: number | null;
  status: string;
  step: string;
  error_message: string | null;
  created_at: string;
  user_email?: string | null;
}

interface WalletRow {
  user_id: string;
  balance: number;
  email?: string | null;
}

const CryptoManagement = () => {
  const { toast } = useToast();
  const [rate, setRate] = useState<number>(100);
  const [enabled, setEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [orders, setOrders] = useState<CryptoOrderRow[]>([]);
  const [depositLogs, setDepositLogs] = useState<DepositLogRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: settings }, { data: walletsData }, { data: ordersData }, { data: logsData }] = await Promise.all([
      supabase.from("site_settings").select("key, value").in("key", ["usdt_to_inr_rate", "crypto_enabled"]),
      supabase.from("crypto_wallets").select("user_id, balance").order("balance", { ascending: false }).limit(200),
      supabase.from("crypto_orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("crypto_deposit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const rateRow = settings?.find((s) => s.key === "usdt_to_inr_rate");
    const enabledRow = settings?.find((s) => s.key === "crypto_enabled");
    if (rateRow) setRate(Number(rateRow.value) || 100);
    if (enabledRow) setEnabled(Boolean(enabledRow.value));

    // batch profiles for emails / names
    const userIds = Array.from(new Set([
      ...((walletsData ?? []).map((w) => w.user_id)),
      ...((ordersData ?? []).map((o) => o.user_id)),
      ...((logsData ?? []).map((l) => l.user_id)),
    ]));
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] as { id: string; display_name: string | null }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p.display_name]));

    setWallets((walletsData ?? []).map((w) => ({ ...w, email: profMap.get(w.user_id) ?? null })));
    setOrders((ordersData ?? []).map((o) => ({ ...o, user_email: profMap.get(o.user_id) ?? null })));
    setDepositLogs((logsData ?? []).map((log) => ({ ...log, user_email: profMap.get(log.user_id) ?? null })));
  };

  useEffect(() => {
    load();

    const walletChannel = supabase
      .channel("admin-crypto-wallets")
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_wallets" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_deposit_logs" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await supabase.from("site_settings").upsert(
        [
          { key: "usdt_to_inr_rate", value: rate as any },
          { key: "crypto_enabled", value: enabled as any },
        ],
        { onConflict: "key" },
      );
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const setStatus = async (id: string, status: "success" | "failed" | "pending") => {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke("crypto-gateway", {
        body: { action: "admin_set_status", order_id: id, new_status: status },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || "Failed");
      toast({ title: `Marked as ${status}` });
      load();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="font-display text-lg">USDT Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rate">USDT → INR rate (1 USDT = ₹X)</Label>
              <Input
                id="rate" type="number" min={1} step="0.01"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg p-3">
              <div>
                <p className="font-medium">Crypto payments enabled</p>
                <p className="text-xs text-muted-foreground">Globally toggle USDT top-up & checkout.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
          <Button onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">User Crypto Wallets</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2">User</th>
                  <th className="py-2">User ID</th>
                  <th className="py-2 text-right">USDT Balance</th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No wallets</td></tr>
                ) : wallets.map((w) => (
                  <tr key={w.user_id} className="border-b border-border/40">
                    <td className="py-2">{w.email ?? "—"}</td>
                    <td className="py-2 font-mono text-xs">{w.user_id.slice(0, 8)}</td>
                    <td className="py-2 text-right font-bold">{Number(w.balance).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Crypto Transactions</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2">When</th>
                  <th className="py-2">User</th>
                  <th className="py-2">Order Ref</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">TX</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No orders</td></tr>
                ) : orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/40">
                    <td className="py-2 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="py-2">{o.user_email ?? "—"}</td>
                    <td className="py-2 font-mono text-xs">{o.order_reference}</td>
                    <td className="py-2 text-right">{Number(o.amount_paid ?? o.amount).toFixed(4)}</td>
                    <td className="py-2">
                      <Badge variant="outline" className={
                        o.status === "success" ? "border-green-500/40 text-green-500" :
                          o.status === "failed" ? "border-red-500/40 text-red-500" :
                            o.status === "confirming" ? "border-blue-500/40 text-blue-500" :
                              "border-yellow-500/40 text-yellow-500"
                      }>{o.status}</Badge>
                    </td>
                    <td className="py-2 font-mono text-[10px] truncate max-w-[140px]" title={o.error_message ?? undefined}>{o.transaction_hash ?? "—"}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" disabled={busy === o.id}
                        className="border-green-500/40 text-green-500 hover:bg-green-500/10 mr-1"
                        onClick={() => setStatus(o.id, "success")}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === o.id}
                        className="border-red-500/40 text-red-500 hover:bg-red-500/10 mr-1"
                        onClick={() => setStatus(o.id, "failed")}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === o.id}
                        className="border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10"
                        onClick={() => setStatus(o.id, "pending")}>
                        <Clock className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Crypto Deposit Logs</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2">When</th>
                  <th className="py-2">User</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Order ID</th>
                  <th className="py-2">TX Hash</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {depositLogs.length === 0 ? (
                  <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No deposit logs</td></tr>
                ) : depositLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/40 align-top">
                    <td className="py-2 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2">{log.user_email ?? "—"}</td>
                    <td className="py-2">{Number(log.amount ?? 0).toFixed(4)}</td>
                    <td className="py-2 font-mono text-[10px] break-all">{log.order_reference ?? "—"}</td>
                    <td className="py-2 font-mono text-[10px] break-all">{log.transaction_hash ?? "—"}</td>
                    <td className="py-2">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={
                          log.status === "success" ? "border-green-500/40 text-green-500" :
                          log.status === "error" ? "border-red-500/40 text-red-500" :
                          log.status === "warning" ? "border-yellow-500/40 text-yellow-500" :
                          "border-blue-500/40 text-blue-500"
                        }>{log.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{log.step.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground max-w-[260px] break-words">{log.error_message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CryptoManagement;
