import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Plus, Minus, History, ShieldCheck, Loader2, Wallet, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  inr_balance: number;
  usdt_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  registered_at: string;
}

interface HistoryRow {
  id: string;
  user_id: string;
  display_name: string | null;
  order_reference: string;
  request_type: string; // admin_credit | admin_debit
  amount: number;
  notes: string | null;
  balance_before: number | null;
  balance_after: number | null;
  admin_id: string | null;
  created_at: string;
}

const UsdtWalletManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<UserRow | null>(null);
  const [mode, setMode] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // crypto wallets
      const { data: wallets, error: wErr } = await supabase
        .from("crypto_wallets")
        .select("user_id, balance, created_at");
      if (wErr) throw wErr;
      const userIds = (wallets || []).map(w => w.user_id);

      const [profilesRes, fiatRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, created_at").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("wallets").select("user_id, balance").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("crypto_orders").select("user_id, amount, request_type, status, credited, amount_paid").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (fiatRes.error) throw fiatRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const fiatMap = new Map((fiatRes.data || []).map(w => [w.user_id, Number(w.balance)]));
      const profMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const depMap = new Map<string, number>();
      const wdMap = new Map<string, number>();
      for (const o of ordersRes.data || []) {
        const isCredit = o.request_type === "admin_credit" || (o.credited === true);
        const isDebit = o.request_type === "admin_debit";
        const amt = Number(o.amount_paid ?? o.amount ?? 0);
        if (isCredit && o.status === "success") depMap.set(o.user_id, (depMap.get(o.user_id) || 0) + amt);
        if (isDebit) wdMap.set(o.user_id, (wdMap.get(o.user_id) || 0) + amt);
      }

      const rows: UserRow[] = (wallets || []).map(w => {
        const p = profMap.get(w.user_id);
        return {
          user_id: w.user_id,
          display_name: p?.display_name ?? null,
          email: null,
          inr_balance: fiatMap.get(w.user_id) ?? 0,
          usdt_balance: Number(w.balance) || 0,
          total_deposits: depMap.get(w.user_id) || 0,
          total_withdrawals: wdMap.get(w.user_id) || 0,
          registered_at: p?.created_at ?? w.created_at,
        };
      });
      rows.sort((a, b) => b.usdt_balance - a.usdt_balance);
      setUsers(rows);

      // history (admin actions only)
      const { data: hist, error: hErr } = await supabase
        .from("crypto_orders")
        .select("id, user_id, order_reference, request_type, amount, amount_paid, notes, metadata, created_at")
        .in("request_type", ["admin_credit", "admin_debit"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (hErr) throw hErr;
      const histRows: HistoryRow[] = (hist || []).map(h => {
        const meta = (h.metadata || {}) as Record<string, unknown>;
        return {
          id: h.id,
          user_id: h.user_id,
          display_name: profMap.get(h.user_id)?.display_name ?? null,
          order_reference: h.order_reference,
          request_type: h.request_type,
          amount: Number(h.amount_paid ?? h.amount ?? 0),
          notes: h.notes,
          balance_before: meta.balance_before != null ? Number(meta.balance_before) : null,
          balance_after: meta.balance_after != null ? Number(meta.balance_after) : null,
          admin_id: (meta.admin_id as string) ?? null,
          created_at: h.created_at,
        };
      });
      setHistory(histRows);
    } catch (e) {
      toast({ title: "Failed to load USDT data", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.user_id.toLowerCase().includes(q) ||
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.reduce((s, u) => s + u.usdt_balance, 0);
    const credited = history.filter(h => h.request_type === "admin_credit").reduce((s, h) => s + h.amount, 0);
    const debited = history.filter(h => h.request_type === "admin_debit").reduce((s, h) => s + h.amount, 0);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = history.filter(h => new Date(h.created_at) >= today).length;
    return { total, credited, debited, active: users.filter(u => u.usdt_balance > 0).length, todayCount };
  }, [users, history]);

  const openAction = (u: UserRow, m: "credit" | "debit") => {
    setTarget(u); setMode(m); setAmount(""); setReason(""); setConfirmOpen(true);
  };

  const submit = async () => {
    if (!target) return;
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" }); return;
    }
    if (!reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const fn = mode === "credit" ? "admin_credit_crypto_wallet" : "admin_debit_crypto_wallet";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(fn, {
        p_user_id: target.user_id, p_amount: amt, p_note: reason.trim(),
      });
      if (error) throw error;
      const ok = (data as { success?: boolean } | null)?.success !== false;
      if (!ok) throw new Error("Operation failed");
      toast({ title: mode === "credit" ? "USDT credited" : "USDT deducted",
              description: `${mode === "credit" ? "+" : "-"}${amt} USDT for ${target.display_name || target.user_id}` });
      setConfirmOpen(false);
      await loadData();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" /> USDT Wallet Management
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Total USDT" value={`${stats.total.toFixed(2)} USDT`} />
          <Stat label="Total Credited" value={`${stats.credited.toFixed(2)} USDT`} />
          <Stat label="Total Debited" value={`${stats.debited.toFixed(2)} USDT`} />
          <Stat label="Active Users" value={String(stats.active)} />
          <Stat label="Today's Actions" value={String(stats.todayCount)} />
        </CardContent>
      </Card>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><ShieldCheck className="w-4 h-4 mr-1" /> Users</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by User ID or Username" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>INR</TableHead>
                      <TableHead>USDT</TableHead>
                      <TableHead>Deposits</TableHead>
                      <TableHead>Withdrawals</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(u => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="font-medium">{u.display_name || "—"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}…</div>
                        </TableCell>
                        <TableCell>₹{u.inr_balance.toFixed(2)}</TableCell>
                        <TableCell><Badge variant="secondary">{u.usdt_balance.toFixed(2)} USDT</Badge></TableCell>
                        <TableCell className="text-green-600">+{u.total_deposits.toFixed(2)}</TableCell>
                        <TableCell className="text-destructive">-{u.total_withdrawals.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{new Date(u.registered_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="default" onClick={() => openAction(u, "credit")}>
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openAction(u, "debit")}>
                            <Minus className="w-3 h-3 mr-1" /> Deduct
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No users found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="text-sm">{h.display_name || "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{h.user_id.slice(0,8)}…</div>
                      </TableCell>
                      <TableCell>
                        {h.request_type === "admin_credit"
                          ? <Badge className="bg-green-600">Credit</Badge>
                          : <Badge variant="destructive">Debit</Badge>}
                      </TableCell>
                      <TableCell className={h.request_type === "admin_credit" ? "text-green-600" : "text-destructive"}>
                        {h.request_type === "admin_credit" ? "+" : "-"}{h.amount.toFixed(2)} USDT
                      </TableCell>
                      <TableCell>{h.balance_before != null ? h.balance_before.toFixed(2) : "—"}</TableCell>
                      <TableCell>{h.balance_after != null ? h.balance_after.toFixed(2) : "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={h.notes ?? ""}>{h.notes || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{h.order_reference}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No history yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "credit" ? "Add USDT" : "Deduct USDT"}</DialogTitle>
            <DialogDescription>
              {target ? <>User: <b>{target.display_name || target.user_id}</b><br/>Current: <b>{target.usdt_balance.toFixed(2)} USDT</b></> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (USDT)</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Manual Deposit / Bonus / Refund / Adjustment" />
            </div>
            {amount && target && (
              <div className="text-sm rounded-md bg-muted p-3">
                New Balance:{" "}
                <b>
                  {(mode === "credit"
                    ? target.usdt_balance + Number(amount || 0)
                    : target.usdt_balance - Number(amount || 0)
                  ).toFixed(2)} USDT
                </b>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting} variant={mode === "credit" ? "default" : "destructive"}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Confirm {mode === "credit" ? "Credit" : "Debit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-muted/50 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-bold">{value}</div>
  </div>
);

export default UsdtWalletManagement;
