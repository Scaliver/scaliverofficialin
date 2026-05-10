import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Link as LinkIcon, Server, Search, Download, Plus, Eye, EyeOff, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

interface DBProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  game_code: string | null;
  in_stock: boolean;
}

interface PricingTier {
  id: string;
  amount: string;
  price: number;
  product_id: string;
  provider_id: string | null;
  provider_product_id: string | null;
  is_active?: boolean;
  products?: { name: string; category: string };
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const AluuGameManager = () => {
  const { toast } = useToast();
  const [games, setGames] = useState<AluuGame[]>([]);
  const [products, setProducts] = useState<AluuProduct[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [aluuProviderId, setAluuProviderId] = useState<string>("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingProduct, setLinkingProduct] = useState<AluuProduct | null>(null);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [tierSearch, setTierSearch] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [serverOptions, setServerOptions] = useState<{ value: string; label: string }[]>([]);
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set());
  const togglePack = (pack: string) => setSelectedPacks(prev => {
    const n = new Set(prev); n.has(pack) ? n.delete(pack) : n.add(pack); return n;
  });

  // DB products with editable game_code
  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [editingCodeValue, setEditingCodeValue] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("smm_apis").select("id").eq("api_type", "aluu").eq("is_active", true).maybeSingle();
      if (data) setAluuProviderId(data.id);
      loadDbProducts();
    })();
  }, []);

  const loadDbProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, category, game_code, in_stock")
      .order("name");
    setDbProducts((data || []) as DBProduct[]);
  };

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("aluu-order", { body: { action: "games" } });
      if (error) throw error;
      const list: AluuGame[] = data?.data || data?.games || data || [];
      setGames(Array.isArray(list) ? list : []);
      toast({ title: "Games loaded", description: `Found ${Array.isArray(list) ? list.length : 0} games` });
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
      const list: AluuProduct[] = data?.data || data?.products || data || [];
      setProducts(Array.isArray(list) ? list : []);
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
      setServerOptions(data?.servers || data?.data || []);
      setServerDialogOpen(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // Import the currently-selected game as a Product (with all denoms as tiers)
  const importGameAsProduct = async () => {
    if (!aluuProviderId || !selectedGame || products.length === 0) {
      toast({ title: "Load a game first", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const game = games.find(g => g.gamecode === selectedGame);
      const name = game?.Name || selectedGame;
      const slug = slugify(name);

      // Find or create product
      let productId: string;
      const { data: existing } = await supabase
        .from("products").select("id").eq("slug", slug).maybeSingle();
      if (existing?.id) {
        productId = existing.id;
        await supabase.from("products").update({
          game_code: selectedGame,
          category: name,
        }).eq("id", productId);
      } else {
        const { data: created, error } = await supabase.from("products").insert({
          name,
          slug,
          category: name,
          game_code: selectedGame,
          in_stock: false, // start hidden until admin reviews
          is_social_media: false,
          sort_order: dbProducts.length,
        }).select("id").single();
        if (error) throw error;
        productId = created.id;
      }

      // Insert tiers (skip duplicates by provider_product_id)
      const { data: existingTiers } = await supabase
        .from("pricing_tiers").select("provider_product_id").eq("product_id", productId);
      const haveSet = new Set((existingTiers || []).map((t: any) => t.provider_product_id));

      // Fetch USD->INR rate
      let rate = 95;
      const { data: rateRow } = await supabase
        .from("site_settings").select("value").eq("key", "usd_inr_rate").maybeSingle();
      const v = rateRow?.value as { rate?: number } | undefined;
      if (v?.rate) rate = Number(v.rate);

      const newTiers = products
        .filter(p => !haveSet.has(`${p.gamecode}:${p.Pack}`))
        .filter(p => selectedPacks.size === 0 || selectedPacks.has(p.Pack))
        .map((p, i) => ({
          product_id: productId,
          amount: p.name || p.Pack,
          // Aluu prices are USD; convert to INR using configured rate.
          price: Math.round((Number(p.price) || 0) * rate),
          provider_id: aluuProviderId,
          provider_product_id: `${p.gamecode}:${p.Pack}`,
          sort_order: (p.name || p.Pack || "").match(/\d+/)?.[0] ? parseInt((p.name || p.Pack).match(/\d+/)![0], 10) : i,
          is_active: true,
        }));

      if (newTiers.length > 0) {
        const { error } = await supabase.from("pricing_tiers").insert(newTiers);
        if (error) throw error;
      }

      toast({
        title: "Imported!",
        description: `Product "${name}" + ${newTiers.length} new tier(s). Edit prices and toggle live in Products tab.`,
      });
      loadDbProducts();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  const openLinkDialog = async (product: AluuProduct) => {
    setLinkingProduct(product);
    setSelectedTierId("");
    const { data } = await supabase
      .from("pricing_tiers")
      .select("id, amount, price, product_id, provider_id, provider_product_id, is_active, products(name, category)")
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

  const saveGameCode = async (productId: string) => {
    const { error } = await supabase
      .from("products").update({ game_code: editingCodeValue.trim() || null }).eq("id", productId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEditingCodeId(null);
    setEditingCodeValue("");
    loadDbProducts();
  };

  const toggleProductLive = async (p: DBProduct) => {
    await supabase.from("products").update({ in_stock: !p.in_stock }).eq("id", p.id);
    loadDbProducts();
  };

  const filteredProducts = products.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.Pack || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Aluu fetcher */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Aluu.in Game Codes & Products</span>
            <Button onClick={fetchGames} disabled={loading} size="sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2">Fetch Games</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {games.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2 border rounded">
              {games.map(g => (
                <Button
                  key={g.gamecode}
                  variant={selectedGame === g.gamecode ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchProducts(g.gamecode)}
                >
                  {g.Name} <Badge variant="secondary" className="ml-2">{g.gamecode}</Badge>
                </Button>
              ))}
            </div>
          )}

          {selectedGame && (
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search packs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchServerOptions(selectedGame)}>
                <Server className="w-4 h-4 mr-2" /> Server Options
              </Button>
              <Button size="sm" onClick={importGameAsProduct} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Import Game as Product
              </Button>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
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
        </CardContent>
      </Card>

      {/* Game-code editor for existing DB products */}
      <Card>
        <CardHeader>
          <CardTitle>Game Codes (existing products)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Game Code</TableHead>
                  <TableHead>Live</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dbProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.category}</div>
                    </TableCell>
                    <TableCell>
                      {editingCodeId === p.id ? (
                        <Input
                          value={editingCodeValue}
                          onChange={e => setEditingCodeValue(e.target.value)}
                          placeholder="e.g. mlbb"
                          className="h-8 w-40"
                        />
                      ) : (
                        <code className="text-xs bg-muted px-2 py-1 rounded">{p.game_code || "—"}</code>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.in_stock} onCheckedChange={() => toggleProductLive(p)} />
                        {p.in_stock ? <Eye className="w-3 h-3 text-green-500" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingCodeId === p.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => saveGameCode(p.id)}><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingCodeId(null); setEditingCodeValue(""); }}>X</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setEditingCodeId(p.id); setEditingCodeValue(p.game_code || ""); }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Link dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link {linkingProduct?.name} to pricing tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Will store <code className="bg-muted px-1">{linkingProduct?.gamecode}:{linkingProduct?.Pack}</code>
            </p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by product or amount..."
                value={tierSearch}
                onChange={e => setTierSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded max-h-72 overflow-y-auto">
              {tiers
                .filter(t => {
                  const q = tierSearch.toLowerCase();
                  if (!q) return true;
                  return ((t as any).products?.name || "").toLowerCase().includes(q) ||
                    (t.amount || "").toLowerCase().includes(q) ||
                    String(t.price).includes(q);
                })
                .map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTierId(t.id)}
                    className={`w-full text-left px-3 py-2 text-sm border-b hover:bg-muted ${selectedTierId === t.id ? "bg-primary/10" : ""}`}
                  >
                    <span className="font-medium">{(t as any).products?.name || "?"}</span>
                    {" – "}{t.amount} (₹{t.price}){t.provider_id && " ✓"}
                  </button>
                ))}
            </div>
            <Button onClick={linkTier} className="w-full" disabled={!selectedTierId}>Link</Button>
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
    </div>
  );
};

export default AluuGameManager;
