import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, Percent, Users, Search, CreditCard, Wrench } from "lucide-react";

interface UserRow {
  id: string;
  display_name: string | null;
  is_reseller: boolean;
}

const SiteSettings = () => {
  const [isWalletUpiEnabled, setIsWalletUpiEnabled] = useState(true);
  const [isProductUpiEnabled, setIsProductUpiEnabled] = useState(true);
  const [isMaintenanceEnabled, setIsMaintenanceEnabled] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [resellerPercent, setResellerPercent] = useState<number>(0);
  const [savingPercent, setSavingPercent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingWallet, setSavingWallet] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const readBool = (row: any, fallback = true) => {
    const v = row?.value as { enabled?: boolean } | undefined;
    return v?.enabled !== false ? (v?.enabled === undefined ? fallback : !!v.enabled) : false;
  };

  const fetchSettings = async () => {
    try {
      const { data: legacy } = await supabase
        .from("site_settings").select("*").eq("key", "upi_payment_enabled").maybeSingle();
      const legacyEnabled = legacy ? readBool(legacy, true) : true;

      const { data: walletRow } = await supabase
        .from("site_settings").select("*").eq("key", "upi_wallet_enabled").maybeSingle();
      setIsWalletUpiEnabled(walletRow ? readBool(walletRow, true) : legacyEnabled);

      const { data: productRow } = await supabase
        .from("site_settings").select("*").eq("key", "upi_product_enabled").maybeSingle();
      setIsProductUpiEnabled(productRow ? readBool(productRow, true) : legacyEnabled);

      const { data: pct } = await supabase
        .from("site_settings").select("*").eq("key", "reseller_discount_percent").maybeSingle();
      if (pct) {
        const v = pct.value as { percent?: number };
        setResellerPercent(Number(v.percent) || 0);
      }

      const { data: maint } = await supabase
        .from("site_settings").select("*").eq("key", "maintenance_mode").maybeSingle();
      setIsMaintenanceEnabled(maint ? readBool(maint, false) : false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch settings", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").order("created_at", { ascending: false }).limit(200);
      const ids = (profiles || []).map(p => p.id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      const resellerSet = new Set((roles || []).filter((r: any) => r.role === "reseller").map((r: any) => r.user_id));
      setUsers((profiles || []).map(p => ({
        id: p.id,
        display_name: p.display_name,
        is_reseller: resellerSet.has(p.id),
      })));
    } finally { setUsersLoading(false); }
  };

  const toggleSetting = async (key: string, newValue: boolean) => {
    const { data: existing } = await supabase
      .from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing?.id) {
      const { error } = await supabase
        .from("site_settings").update({ value: { enabled: newValue } }).eq("key", key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("site_settings").insert({ key, value: { enabled: newValue } });
      if (error) throw error;
    }
  };

  const handleToggleWalletUpi = async () => {
    setSavingWallet(true);
    try {
      const newValue = !isWalletUpiEnabled;
      await toggleSetting("upi_wallet_enabled", newValue);
      setIsWalletUpiEnabled(newValue);
      toast({ title: "Saved", description: `Wallet UPI ${newValue ? "enabled" : "disabled"}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    } finally { setSavingWallet(false); }
  };

  const handleToggleProductUpi = async () => {
    setSavingProduct(true);
    try {
      const newValue = !isProductUpiEnabled;
      await toggleSetting("upi_product_enabled", newValue);
      setIsProductUpiEnabled(newValue);
      toast({ title: "Saved", description: `Tier/Product UPI ${newValue ? "enabled" : "disabled"}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    } finally { setSavingProduct(false); }
  };

  const saveResellerPercent = async () => {
    setSavingPercent(true);
    try {
      const pct = Math.max(0, Math.min(99, Number(resellerPercent) || 0));
      const { error } = await supabase
        .from("site_settings").update({ value: { percent: pct } }).eq("key", "reseller_discount_percent");
      if (error) throw error;
      toast({ title: "Saved", description: `Reseller discount set to ${pct}%` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSavingPercent(false); }
  };

  const toggleReseller = async (u: UserRow) => {
    if (u.is_reseller) {
      await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "reseller" as any);
    } else {
      await supabase.from("user_roles").insert({ user_id: u.id, role: "reseller" as any });
    }
    fetchUsers();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const filtered = users.filter(u => (u.display_name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Site Settings</CardTitle>
          <CardDescription>Manage site-wide settings and features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2"><CreditCard className="w-4 h-4" /> Wallet UPI Payment</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the Pay UPI button on the Add Coin / wallet recharge page.
                </p>
              </div>
              <Switch checked={isWalletUpiEnabled} onCheckedChange={handleToggleWalletUpi} disabled={savingWallet} />
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2"><CreditCard className="w-4 h-4" /> Tier / Product UPI Payment</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the Pay UPI button on product / tier purchase pages.
                </p>
              </div>
              <Switch checked={isProductUpiEnabled} onCheckedChange={handleToggleProductUpi} disabled={savingProduct} />
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <Label className="text-base font-medium flex items-center gap-2"><Percent className="w-4 h-4" /> Reseller Discount</Label>
            <p className="text-sm text-muted-foreground">
              Global discount % applied automatically to users with the <b>reseller</b> role.
            </p>
            <div className="flex gap-2 items-center max-w-xs">
              <Input
                type="number" min={0} max={99}
                value={resellerPercent}
                onChange={e => setResellerPercent(Number(e.target.value))}
              />
              <span className="text-sm">%</span>
              <Button onClick={saveResellerPercent} disabled={savingPercent}>
                {savingPercent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Resellers</CardTitle>
          <CardDescription>Toggle the reseller role per user. Resellers see discounted product prices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {usersLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{u.display_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.is_reseller && <span className="text-xs text-primary font-bold">RESELLER</span>}
                    <Switch checked={u.is_reseller} onCheckedChange={() => toggleReseller(u)} />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">No users found</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettings;
