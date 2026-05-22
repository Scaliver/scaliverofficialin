import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Loader2, RefreshCw } from "lucide-react";

interface Tx {
  id: string;
  amount: number;
  status: string;
  request_type: string;
  product_name: string | null;
  utr_number: string | null;
  user_email: string | null;
  user_id: string | null;
  created_at: string;
}

const STATUSES = [
  { key: "all", label: "All" },
  { key: "completed", label: "Success" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Cancel/Failed" },
];

const PaymentTransactions = () => {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("upi_payment_requests")
      .select("id, amount, status, request_type, product_name, utr_number, user_email, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(s) ||
        (r.utr_number || "").toLowerCase().includes(s) ||
        (r.user_email || "").toLowerCase().includes(s) ||
        (r.product_name || "").toLowerCase().includes(s)
      );
    }
    return true;
  }), [rows, status, search]);

  const counts = useMemo(() => ({
    total: rows.length,
    completed: rows.filter((r) => r.status === "completed").length,
    pending: rows.filter((r) => r.status === "pending").length,
    failed: rows.filter((r) => r.status === "failed").length,
  }), [rows]);

  const statusBadge = (s: string) => {
    if (s === "completed") return <Badge className="bg-green-600/20 text-green-400 border-green-600/40">Success</Badge>;
    if (s === "pending") return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/40">Pending</Badge>;
    if (s === "failed") return <Badge className="bg-red-600/20 text-red-400 border-red-600/40">Cancel</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  const typeLabel = (t: string) => t === "coin_recharge" ? "Wallet Recharge" : t === "product_order" ? "Product Buy" : t === "auction_win" ? "Auction Pay" : t;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 font-display"><Receipt className="w-5 h-5 text-primary" /> Gateway Transactions</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
          <div className="bg-secondary/40 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">Total</p><p className="font-bold">{counts.total}</p></div>
          <div className="bg-green-600/10 rounded-lg p-2 text-center"><p className="text-[10px] text-green-400">Success</p><p className="font-bold text-green-400">{counts.completed}</p></div>
          <div className="bg-yellow-600/10 rounded-lg p-2 text-center"><p className="text-[10px] text-yellow-400">Pending</p><p className="font-bold text-yellow-400">{counts.pending}</p></div>
          <div className="bg-red-600/10 rounded-lg p-2 text-center"><p className="text-[10px] text-red-400">Cancel</p><p className="font-bold text-red-400">{counts.failed}</p></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3 flex-wrap">
          {STATUSES.map((s) => (
            <Button key={s.key} size="sm" variant={status === s.key ? "default" : "outline"} onClick={() => setStatus(s.key)}>
              {s.label}
            </Button>
          ))}
          <Input className="max-w-xs" placeholder="Search ID / UTR / email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No transactions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2">When</th><th>Type</th><th>Amount</th><th>Product/UTR</th><th>User</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-secondary/20">
                    <td className="py-2 text-xs">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                    <td className="text-xs">{typeLabel(r.request_type)}</td>
                    <td className="font-bold text-primary">₹{Number(r.amount).toFixed(0)}</td>
                    <td className="text-xs truncate max-w-[180px]">{r.product_name || r.utr_number || "—"}</td>
                    <td className="text-xs truncate max-w-[160px]">{r.user_email || r.user_id?.slice(0, 8) || "—"}</td>
                    <td>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentTransactions;
