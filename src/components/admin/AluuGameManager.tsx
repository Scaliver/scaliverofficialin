import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Link as LinkIcon, Server, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AluuGame {
  Name: string;
  gamecode: string;
  image?: string;
  totalProducts?: number;
}

interface AluuProduct {
  _id: string;
  name: string;
  gamecode: string;
  Pack: string;
  price: number;
  requiresUserId?: boolean;
  requiresServerId?: boolean;
  requiresCharName?: boolean;
  stockStatus?: string;
}

interface PricingTier {
  id: string;
  amount: string;
  price: number;
  product_id: string;
  provider_id: string | null;
  provider_product_id: string | null;
  products?: { name: string; category: string };
}

export const AluuGameManager = () => {
  const { toast } = useToast();
  const [games, setGames] = useState<AluuGame[]>([]);
  const [products, setProducts] = useState<AluuProduct[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [aluuProviderId, setAluuProviderId] = useState<string>("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingProduct, setLinkingProduct] = useState<AluuProduct | null>(null);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [serverOptions, setServerOptions] = useState<{ value: string; label: string }[]>([]);
  const [serverDialogOpen, setServerDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("smm_apis").select("id").eq("api_type", "aluu").eq("is_active", true).maybeSingle();
      if (data) setAluuProviderId(data.id);
    })();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("aluu-order", { body: { action: "games" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      setGames(data.data || []);
      toast({ title: "Games loaded", description: `Found ${data.data?.length || 0} games` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const fetchProducts = async (gameCode: string) => {
    setLoading(true);
    setSelectedGame(gameCode);
    try {
      const { data, error } = await supabase.functions.invoke("aluu-order", {
        body: { action: "products", gameCode }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      setProducts(data.data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const fetchServerOptions = async (gameCode: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("aluu-order", {
        body: { action: "server_options", gameCode }
      });
      if (error) throw error;
      setServerOptions(data?.servers || []);
      setServerDialogOpen(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openLinkDialog = async (product: AluuProduct) => {
    setLinkingProduct(product);
    setSelectedTierId("");
    const { data } = await supabase
      .from("pricing_tiers")
      .select("id, amount, price, product_id, provider_id, provider_product_id, products(name, category)")
      .order("sort_order");
    setTiers((data || []) as any);
    setLinkDialogOpen(true);
  };

  const linkTier = async () => {
    if (!linkingProduct || !selectedTierId || !aluuProviderId) {
      toast({ title: "Missing data", description: "Select a tier first", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("pricing_tiers")
      .update({
        provider_id: aluuProviderId,
        provider_product_id: `${linkingProduct.gamecode}:${linkingProduct.Pack}`,
      })
      .eq("id", selectedTierId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Linked!", description: `${linkingProduct.name} → tier mapped` });
    setLinkDialogOpen(false);
  };

  const autoLink = async () => {
    if (!aluuProviderId || products.length === 0) {
      toast({ title: "Load products first", variant: "destructive" });
      return;
    }
    setLoading(true);
    let matched = 0;
    try {
      const { data: allTiers } = await supabase
        .from("pricing_tiers")
        .select("id, amount, products(name, category)");

      for (const ap of products) {
        // match by Pack contained in tier amount or numeric equality
        const candidates = (allTiers || []).filter((t: any) => {
          const a = String(t.amount).toLowerCase();
          const p = String(ap.Pack).toLowerCase();
          return a === p || a.includes(p) || p.includes(a);
        });
        if (candidates.length === 1) {
          await supabase.from("pricing_tiers").update({
            provider_id: aluuProviderId,
            provider_product_id: `${ap.gamecode}:${ap.Pack}`,
          }).eq("id", candidates[0].id);
          matched++;
        }
      }
      toast({ title: "Auto-link complete", description: `${matched} tiers linked` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.Pack.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Aluu.in Game Codes & Products</span>
          <Button onClick={fetchGames} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Fetch Games</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {games.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {games.map(g => (
              <Button
                key={g.gamecode}
                variant={selectedGame === g.gamecode ? "default" : "outline"}
                size="sm"
                onClick={() => fetchProducts(g.gamecode)}
              >
                {g.Name} <Badge variant="secondary" className="ml-2">{g.gamecode}</Badge>
                {g.totalProducts ? <span className="ml-1 text-xs opacity-70">({g.totalProducts})</span> : null}
              </Button>
            ))}
          </div>
        )}

        {selectedGame && (
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchServerOptions(selectedGame)}>
              <Server className="w-4 h-4 mr-2" /> Server Options
            </Button>
            <Button size="sm" onClick={autoLink} disabled={loading}>
              <LinkIcon className="w-4 h-4 mr-2" /> Auto-Link Tiers
            </Button>
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Requires</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(p => (
                  <TableRow key={p._id}>
                    <TableCell className="font-mono text-xs">{p.Pack}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>₹{p.price}</TableCell>
                    <TableCell className="text-xs space-x-1">
                      {p.requiresUserId && <Badge variant="outline">UserID</Badge>}
                      {p.requiresServerId && <Badge variant="outline">Server</Badge>}
                      {p.requiresCharName && <Badge variant="outline">CharName</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.stockStatus === "in_stock" ? "default" : "destructive"}>
                        {p.stockStatus || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openLinkDialog(p)}>
                        <LinkIcon className="w-3 h-3 mr-1" /> Link
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link {linkingProduct?.name} to pricing tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Will store <code className="bg-muted px-1">{linkingProduct?.gamecode}:{linkingProduct?.Pack}</code>
              </p>
              <Select value={selectedTierId} onValueChange={setSelectedTierId}>
                <SelectTrigger><SelectValue placeholder="Pick a pricing tier" /></SelectTrigger>
                <SelectContent>
                  {tiers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {(t as any).products?.name || "?"} – {t.amount} (₹{t.price})
                      {t.provider_id && " ✓"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={linkTier} className="w-full">Link</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={serverDialogOpen} onOpenChange={setServerDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Server Options ({selectedGame})</DialogTitle></DialogHeader>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {serverOptions.length === 0 && <p className="text-sm text-muted-foreground">No server selection required.</p>}
              {serverOptions.map(s => (
                <div key={s.value} className="flex justify-between p-2 border rounded">
                  <span>{s.label}</span>
                  <code className="text-xs bg-muted px-2 rounded">{s.value}</code>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AluuGameManager;
