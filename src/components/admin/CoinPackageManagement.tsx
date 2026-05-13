import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coins, Loader2, Plus, Trash2, Save } from "lucide-react";

interface CoinPackage {
  id: string;
  amount: number;
  bonus: number;
  sort_order: number;
  is_active: boolean;
}

const CoinPackageManagement = () => {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [newBonus, setNewBonus] = useState("");
  const { toast } = useToast();

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from("coin_packages").select("*").order("sort_order");
    setPackages((data as CoinPackage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPackages(); }, []);

  const updateField = (id: string, field: keyof CoinPackage, value: any) => {
    setPackages(p => p.map(pkg => pkg.id === id ? { ...pkg, [field]: value } : pkg));
  };

  const savePackage = async (pkg: CoinPackage) => {
    setSaving(pkg.id);
    const { error } = await supabase.from("coin_packages").update({
      amount: Number(pkg.amount), bonus: Number(pkg.bonus),
      sort_order: Number(pkg.sort_order), is_active: pkg.is_active,
    }).eq("id", pkg.id);
    setSaving(null);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Saved", description: "Package updated" });
  };

  const deletePackage = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("coin_packages").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchPackages(); }
  };

  const addPackage = async () => {
    const amount = Number(newAmount);
    if (!amount || amount < 1) {
      toast({ title: "Invalid", description: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const maxSort = packages.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1;
    const { error } = await supabase.from("coin_packages").insert({
      amount, bonus: Number(newBonus) || 0, sort_order: maxSort, is_active: true,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setNewAmount(""); setNewBonus(""); fetchPackages(); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5" /> Coin Packages & Bonuses</CardTitle>
        <CardDescription>Edit the coin packages and bonus amounts shown on the Add Coin page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground px-2">
          <div className="col-span-3">Amount (₹)</div>
          <div className="col-span-3">Bonus Coins</div>
          <div className="col-span-2">Sort</div>
          <div className="col-span-2">Active</div>
          <div className="col-span-2">Actions</div>
        </div>
        {packages.map(pkg => (
          <div key={pkg.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg">
            <Input className="col-span-3" type="number" value={pkg.amount} onChange={e => updateField(pkg.id, "amount", e.target.value)} />
            <Input className="col-span-3" type="number" value={pkg.bonus} onChange={e => updateField(pkg.id, "bonus", e.target.value)} />
            <Input className="col-span-2" type="number" value={pkg.sort_order} onChange={e => updateField(pkg.id, "sort_order", e.target.value)} />
            <div className="col-span-2"><Switch checked={pkg.is_active} onCheckedChange={(v) => updateField(pkg.id, "is_active", v)} /></div>
            <div className="col-span-2 flex gap-1">
              <Button size="sm" onClick={() => savePackage(pkg)} disabled={saving === pkg.id}>
                {saving === pkg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deletePackage(pkg.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}

        <div className="border-t pt-3 mt-4">
          <p className="text-sm font-medium mb-2">Add New Package</p>
          <div className="flex gap-2">
            <Input placeholder="Amount (₹)" type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
            <Input placeholder="Bonus coins" type="number" value={newBonus} onChange={e => setNewBonus(e.target.value)} />
            <Button onClick={addPackage}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CoinPackageManagement;
