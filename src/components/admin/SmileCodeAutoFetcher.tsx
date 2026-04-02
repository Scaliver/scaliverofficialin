import { useState, useEffect } from "react";
import { Download, Loader2, CheckCircle2, XCircle, Link2, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SmileOneGame {
  apiGame: string;
  name: string;
  region?: string;
}

interface SmileOneSku {
  sku: string;
  name: string;
  price: number;
  currency: string;
  diamonds?: number;
}

interface PricingTier {
  id: string;
  amount: string;
  price: number;
  provider_id: string | null;
  provider_product_id: string | null;
  product_id: string;
  product_name?: string;
  diamonds?: number;
}

interface MatchResult {
  tier: PricingTier;
  matchedSku: SmileOneSku | null;
  status: 'matched' | 'no_match' | 'already_linked';
}

export const SmileCodeAutoFetcher = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [smileCodeApiId, setSmileCodeApiId] = useState<string>("");
  const [isFetchingGames, setIsFetchingGames] = useState(false);
  const [isFetchingSkus, setIsFetchingSkus] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [games, setGames] = useState<SmileOneGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [skus, setSkus] = useState<SmileOneSku[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [linkProgress, setLinkProgress] = useState(0);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Fetch SmileCode API ID on mount
  useEffect(() => {
    const fetchApi = async () => {
      const { data } = await supabase
        .from("smm_apis")
        .select("id, name")
        .eq("api_type", "smilecode")
        .eq("is_active", true)
        .limit(1);
      
      if (data && data.length > 0) {
        setSmileCodeApiId(data[0].id);
      }
    };
    fetchApi();
  }, []);

  // Parse diamond amount from string
  const parseDiamonds = (str: string): number | null => {
    const cleaned = str.replace(/diamonds?/gi, '').replace(/💎/g, '').trim();
    if (cleaned.includes('+')) {
      const base = parseInt(cleaned.split('+')[0].trim());
      return isNaN(base) ? null : base;
    }
    // Try to find a number
    const match = cleaned.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  // Fetch available games from SmileOne
  const handleFetchGames = async () => {
    setIsFetchingGames(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('smilecode-order', {
        body: { action: 'products' }
      });

      if (error) throw error;

      if (data.error) {
        setTestResult(`❌ API Error: ${data.error}`);
        toast({ title: "API Error", description: data.error, variant: "destructive" });
        return;
      }

      const productList = data.products || [];
      setGames(productList.map((p: any) => ({
        apiGame: p.apiGame || p.code || p.id,
        name: p.name || p.title || p.apiGame,
        region: p.region || '',
      })));

      setTestResult(`✅ Found ${productList.length} games`);
      toast({ title: "Games Fetched", description: `Found ${productList.length} games from SmileOne` });
    } catch (err: any) {
      setTestResult(`❌ Error: ${err.message}`);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingGames(false);
    }
  };

  // Fetch SKUs for selected game
  const handleFetchSkus = async () => {
    if (!selectedGame) {
      toast({ title: "Select a game", description: "Please select a game first", variant: "destructive" });
      return;
    }

    setIsFetchingSkus(true);
    setSkus([]);
    setMatchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('smilecode-order', {
        body: { action: 'sku_list', apiGame: selectedGame }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "SKU Error", description: data.error, variant: "destructive" });
        return;
      }

      const skuList = (data.skuList || []).map((s: any) => ({
        sku: String(s.sku || s.id),
        name: s.name || s.title || `SKU ${s.sku}`,
        price: parseFloat(s.price || s.cost || 0),
        currency: s.currency || 'USD',
        diamonds: parseDiamonds(s.name || s.title || ''),
      }));

      setSkus(skuList);
      toast({ title: "SKUs Fetched", description: `Found ${skuList.length} SKUs for ${selectedGame}` });

      // Auto-match with existing tiers
      await autoMatchTiers(skuList);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingSkus(false);
    }
  };

  // Auto-match SKUs with existing pricing tiers
  const autoMatchTiers = async (skuList: SmileOneSku[]) => {
    // Fetch all MLBB pricing tiers
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .eq("category", "Mobile Legends");

    if (!products || products.length === 0) {
      toast({ title: "No Products", description: "No Mobile Legends products found to match", variant: "destructive" });
      return;
    }

    const productIds = products.map(p => p.id);
    const productMap = new Map(products.map(p => [p.id, p.name]));

    const { data: tiers } = await supabase
      .from("pricing_tiers")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    if (!tiers || tiers.length === 0) return;

    const results: MatchResult[] = tiers.map(tier => {
      const tierDiamonds = parseDiamonds(tier.amount);

      // Already linked to SmileCode
      if (tier.provider_id === smileCodeApiId && tier.provider_product_id) {
        return { tier: { ...tier, diamonds: tierDiamonds, product_name: productMap.get(tier.product_id) || '' }, matchedSku: null, status: 'already_linked' as const };
      }

      // Try to match by diamond count
      if (tierDiamonds) {
        const match = skuList.find(s => s.diamonds === tierDiamonds);
        if (match) {
          return { tier: { ...tier, diamonds: tierDiamonds, product_name: productMap.get(tier.product_id) || '' }, matchedSku: match, status: 'matched' as const };
        }
      }

      return { tier: { ...tier, diamonds: tierDiamonds, product_name: productMap.get(tier.product_id) || '' }, matchedSku: null, status: 'no_match' as const };
    });

    setMatchResults(results);
  };

  // Apply all matched links
  const handleApplyLinks = async () => {
    const toLink = matchResults.filter(r => r.status === 'matched' && r.matchedSku);
    if (toLink.length === 0) {
      toast({ title: "Nothing to Link", description: "No matches found" });
      return;
    }

    setIsLinking(true);
    setLinkProgress(0);
    let success = 0, errors = 0;

    for (let i = 0; i < toLink.length; i++) {
      const { tier, matchedSku } = toLink[i];
      try {
        const { error } = await supabase
          .from("pricing_tiers")
          .update({
            provider_id: smileCodeApiId,
            provider_product_id: matchedSku!.sku,
          })
          .eq("id", tier.id);

        if (error) { errors++; } else {
          success++;
          setMatchResults(prev => prev.map(r =>
            r.tier.id === tier.id ? { ...r, status: 'already_linked' as const } : r
          ));
        }
      } catch { errors++; }
      setLinkProgress(((i + 1) / toLink.length) * 100);
    }

    setIsLinking(false);
    toast({
      title: "Linking Complete",
      description: `Linked ${success} tiers${errors > 0 ? `, ${errors} failed` : ''}`,
      variant: errors > 0 ? "destructive" : "default",
    });
  };

  const matchedCount = matchResults.filter(r => r.status === 'matched').length;
  const alreadyLinkedCount = matchResults.filter(r => r.status === 'already_linked').length;
  const noMatchCount = matchResults.filter(r => r.status === 'no_match').length;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
        disabled={!smileCodeApiId}
      >
        <Download className="w-4 h-4" />
        SmileOne Auto-Fetch
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Zap className="w-5 h-5" />
              SmileOne Product & SKU Auto-Fetcher
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Step 1: Fetch Games */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Step 1: Fetch Available Games</h3>
              <div className="flex gap-3">
                <Button onClick={handleFetchGames} disabled={isFetchingGames} className="gap-2">
                  {isFetchingGames ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Fetch Games
                </Button>
                {testResult && (
                  <span className="text-sm self-center text-muted-foreground">{testResult}</span>
                )}
              </div>
            </div>

            {/* Step 2: Select Game & Fetch SKUs */}
            {games.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Step 2: Select Game & Fetch SKUs</h3>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Select value={selectedGame} onValueChange={setSelectedGame}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                      <SelectContent>
                        {games.map(g => (
                          <SelectItem key={g.apiGame} value={g.apiGame}>
                            {g.name} {g.region ? `(${g.region})` : ''} — {g.apiGame}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleFetchSkus} disabled={isFetchingSkus || !selectedGame} className="gap-2">
                    {isFetchingSkus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Fetch SKUs
                  </Button>
                </div>
              </div>
            )}

            {/* SKU List Preview */}
            {skus.length > 0 && matchResults.length === 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Available SKUs ({skus.length})</h3>
                <ScrollArea className="h-48 border border-border rounded-lg">
                  <div className="p-3 space-y-1">
                    {skus.map(s => (
                      <div key={s.sku} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                        <span>{s.name}</span>
                        <span className="text-muted-foreground">SKU: {s.sku} • {s.currency} {s.price}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Match Results */}
            {matchResults.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{matchedCount}</p>
                    <p className="text-xs text-muted-foreground">Matched</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-500">{alreadyLinkedCount}</p>
                    <p className="text-xs text-muted-foreground">Already Linked</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">{noMatchCount}</p>
                    <p className="text-xs text-muted-foreground">No Match</p>
                  </div>
                </div>

                {isLinking && (
                  <div className="space-y-2">
                    <Progress value={linkProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">Linking... {Math.round(linkProgress)}%</p>
                  </div>
                )}

                <ScrollArea className="flex-1 border border-border rounded-lg">
                  <div className="p-3 space-y-2">
                    {matchResults.map((result) => (
                      <div
                        key={result.tier.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          result.status === 'matched'
                            ? 'bg-green-500/5 border-green-500/30'
                            : result.status === 'already_linked'
                              ? 'bg-blue-500/5 border-blue-500/30'
                              : 'bg-orange-500/5 border-orange-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {result.status === 'matched' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {result.status === 'already_linked' && <Link2 className="w-4 h-4 text-blue-500" />}
                          {result.status === 'no_match' && <XCircle className="w-4 h-4 text-orange-500" />}
                          <div>
                            <p className="font-medium text-foreground text-sm">{result.tier.amount}</p>
                            <p className="text-xs text-muted-foreground">
                              ₹{result.tier.price} • {result.tier.product_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {result.status === 'matched' && result.matchedSku && (
                            <div>
                              <Badge variant="outline" className="text-green-600 border-green-500/50">
                                SKU: {result.matchedSku.sku}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">{result.matchedSku.name}</p>
                            </div>
                          )}
                          {result.status === 'already_linked' && (
                            <Badge variant="outline" className="text-blue-600 border-blue-500/50">Linked</Badge>
                          )}
                          {result.status === 'no_match' && (
                            <Badge variant="outline" className="text-orange-600 border-orange-500/50">No Match</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Empty state */}
            {!isFetchingGames && !isFetchingSkus && games.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click "Fetch Games" to load available games from SmileOne.</p>
                <p className="text-xs mt-2">Note: SmileOne IP whitelist must include our server.</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            {matchedCount > 0 && (
              <Button onClick={handleApplyLinks} disabled={isLinking} className="gap-2">
                {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Link {matchedCount} Matches
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
