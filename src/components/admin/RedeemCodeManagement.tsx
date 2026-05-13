import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Gift, Loader2, Plus, Trash2, Copy, Eye } from "lucide-react";

interface RedeemCode {
  id: string;
  code: string;
  coins: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Redemption {
  id: string;
  code_id: string;
  user_id: string;
  coins_credited: number;
  redeemed_at: string;
}

const generateRandomCode = (len = 10) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

const RedeemCodeManagement = () => {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [customCode, setCustomCode] = useState("");
  const [coins, setCoins] = useState("100");
  const [maxUses, setMaxUses] = useState("1");
  const [bulkCount, setBulkCount] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");

  // View redemptions
  const [viewingCodeId, setViewingCodeId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: codesData }, { data: redData }] = await Promise.all([
      supabase.from("redeem_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("redeem_code_redemptions").select("*").order("redeemed_at", { ascending: false }),
    ]);
    setCodes((codesData as RedeemCode[]) || []);
    setRedemptions((redData as Redemption[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const createCodes = async () => {
    const c = Number(coins);
    const mu = Number(maxUses) || 1;
    const count = Number(bulkCount) || 1;
    if (!c || c < 1) {
      toast({ title: "Invalid", description: "Coin amount required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        code: count === 1 && customCode.trim() ? customCode.trim().toUpperCase() : generateRandomCode(),
        coins: c,
        max_uses: mu,
        expires_at: expiresAt || null,
        is_active: true,
      });
    }
    const { error } = await supabase.from("redeem_codes").insert(rows);
    setCreating(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Created", description: `${count} code(s) generated` });
      setCustomCode("");
      fetchAll();
    }
  };

  const toggleActive = async (id: string, val: boolean) => {
    await supabase.from("redeem_codes").update({ is_active: val }).eq("id", id);
    fetchAll();
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Delete this code?")) return;
    await supabase.from("redeem_codes").delete().eq("id", id);
    fetchAll();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: code });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const codeRedemptions = viewingCodeId ? redemptions.filter(r => r.code_id === viewingCodeId) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5" /> Generate Redeem Codes</CardTitle>
          <CardDescription>Create single or bulk redeem codes that users can use for free coins.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Coins per code</Label>
              <Input type="number" value={coins} onChange={e => setCoins(e.target.value)} />
            </div>
            <div>
              <Label>Max uses</Label>
              <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} />
            </div>
            <div>
              <Label>Bulk count</Label>
              <Input type="number" value={bulkCount} onChange={e => setBulkCount(e.target.value)} />
            </div>
            <div>
              <Label>Expires at (optional)</Label>
              <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Custom code (only for single code)</Label>
            <Input placeholder="Leave blank to auto-generate" value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase())} />
          </div>
          <Button onClick={createCodes} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Generate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Codes ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {codes.length === 0 && <p className="text-center text-muted-foreground py-4">No codes yet</p>}
          {codes.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-3 border rounded-lg flex-wrap">
              <code className="font-mono font-bold text-primary flex-1 min-w-[120px]">{c.code}</code>
              <span className="text-sm">🪙 {c.coins}</span>
              <span className="text-sm text-muted-foreground">{c.used_count}/{c.max_uses} used</span>
              {c.expires_at && <span className="text-xs text-muted-foreground">exp: {new Date(c.expires_at).toLocaleDateString()}</span>}
              <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
              <Button size="sm" variant="ghost" onClick={() => copyCode(c.code)}><Copy className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setViewingCodeId(viewingCodeId === c.id ? null : c.id)}><Eye className="w-3 h-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => deleteCode(c.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {viewingCodeId && (
        <Card>
          <CardHeader>
            <CardTitle>Redemptions for selected code ({codeRedemptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {codeRedemptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Not yet redeemed</p>
            ) : (
              <div className="space-y-2">
                {codeRedemptions.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-2 bg-secondary/50 rounded">
                    <span className="font-mono text-xs">{r.user_id.slice(0, 8)}...</span>
                    <span>+{r.coins_credited} coins</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.redeemed_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Redemptions ({redemptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No redemptions yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {redemptions.map(r => {
                const code = codes.find(c => c.id === r.code_id);
                return (
                  <div key={r.id} className="flex justify-between items-center p-2 bg-secondary/50 rounded text-sm">
                    <code className="font-mono">{code?.code || "—"}</code>
                    <span className="font-mono text-xs">{r.user_id.slice(0, 8)}...</span>
                    <span>+{r.coins_credited}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.redeemed_at).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedeemCodeManagement;
