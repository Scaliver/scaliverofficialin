import { useState, useEffect } from "react";
import { Link2, Loader2, CheckCircle2, XCircle, RefreshCw, Zap } from "lucide-react";
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

interface GameTopUpProduct {
  productid: string;
  title: string;
  price: number;
  diamonds?: number; // Parsed diamond amount
}

interface PricingTier {
  id: string;
  amount: string;
  price: number;
  provider_id: string | null;
  provider_product_id: string | null;
  product_id: string;
  diamonds?: number; // Parsed diamond amount
}

interface MatchResult {
  tier: PricingTier;
  matchedProduct: GameTopUpProduct | null;
  status: 'matched' | 'no_match' | 'already_linked';
}

interface GameProviderApi {
  id: string;
  name: string;
  api_type: string;
  is_active: boolean;
}

export const MLBBAutoLinker = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gameApis, setGameApis] = useState<GameProviderApi[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string>("");
  const [isFetching, setIsFetching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [apiProducts, setApiProducts] = useState<GameTopUpProduct[]>([]);
  const [mlbbTiers, setMlbbTiers] = useState<PricingTier[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [linkProgress, setLinkProgress] = useState(0);

  // Fetch Game Top-Up APIs on mount
  useEffect(() => {
    const fetchApis = async () => {
      const { data } = await supabase
        .from("smm_apis")
        .select("id, name, api_type, is_active")
        .eq("api_type", "gametopup")
        .eq("is_active", true);
      
      if (data) {
        setGameApis(data as unknown as GameProviderApi[]);
        if (data.length > 0) {
          setSelectedApiId(data[0].id);
        }
      }
    };
    fetchApis();
  }, []);

  // Parse diamond amount from string like "100 Diamonds", "5+6", "86 💎"
  const parseDiamondAmount = (amountStr: string): number | null => {
    // Remove common suffixes and clean up
    const cleaned = amountStr
      .toLowerCase()
      .replace(/diamonds?/gi, '')
      .replace(/💎/g, '')
      .replace(/\s+/g, '')
      .trim();
    
    // Handle formats like "5+6" (bonus format)
    if (cleaned.includes('+')) {
      const parts = cleaned.split('+').map(p => parseInt(p.trim()));
      if (parts.every(p => !isNaN(p))) {
        return parts[0]; // Use base amount for matching
      }
    }
    
    // Handle simple number
    const num = parseInt(cleaned);
    return isNaN(num) ? null : num;
  };

  // Parse diamond amount from API product title
  const parseApiProductDiamonds = (title: string): number | null => {
    // Match patterns like "MLBB (100)", "100 Diamonds", "86 💎", etc.
    const patterns = [
      /\((\d+)\)/,           // "(100)"
      /(\d+)\s*diamonds?/i,  // "100 Diamonds"
      /(\d+)\s*💎/,           // "100 💎"
      /^(\d+)$/,              // Just a number
      /mlbb[_\s]*(\d+)/i,     // "mlbb_100" or "MLBB 100"
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    
    // Try extracting any number from the title
    const numbers = title.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      return parseInt(numbers[0]);
    }
    
    return null;
  };

  // Fetch MLBB products and their tiers
  const fetchMLBBTiers = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug")
      .eq("category", "Mobile Legends");

    if (!products || products.length === 0) {
      toast({
        title: "No Products",
        description: "No Mobile Legends products found.",
        variant: "destructive",
      });
      return [];
    }

    const productIds = products.map(p => p.id);
    
    const { data: tiers } = await supabase
      .from("pricing_tiers")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    if (!tiers) return [];

    // Parse diamond amounts
    return tiers.map(tier => ({
      ...tier,
      diamonds: parseDiamondAmount(tier.amount),
    }));
  };

  // Fetch products from Game Top-Up API
  const fetchApiProducts = async () => {
    if (!selectedApiId) return [];

    try {
      const { data, error } = await supabase.functions.invoke('gametopup-order', {
        body: {
          action: 'products',
          apiId: selectedApiId,
        }
      });

      if (error) throw error;

      let products = data.products || data.data || [];
      
      if (!Array.isArray(products)) {
        console.log("Raw API response:", data);
        return [];
      }

      // Parse and normalize products
      return products.map((p: any) => ({
        productid: p.productid || p.product_id || p.id,
        title: p.title || p.name || p.product_name || '',
        price: parseFloat(p.price || 0),
        diamonds: parseApiProductDiamonds(p.title || p.name || ''),
      }));
    } catch (err: any) {
      console.error("Error fetching API products:", err);
      throw err;
    }
  };

  // Match tiers to API products
  const performMatching = (tiers: PricingTier[], products: GameTopUpProduct[]): MatchResult[] => {
    return tiers.map(tier => {
      // Skip if already linked
      if (tier.provider_id && tier.provider_product_id) {
        return {
          tier,
          matchedProduct: null,
          status: 'already_linked' as const,
        };
      }

      // Find matching product by diamond amount
      if (tier.diamonds) {
        const match = products.find(p => p.diamonds === tier.diamonds);
        if (match) {
          return {
            tier,
            matchedProduct: match,
            status: 'matched' as const,
          };
        }
      }

      return {
        tier,
        matchedProduct: null,
        status: 'no_match' as const,
      };
    });
  };

  // Start the auto-link process
  const handleStartAutoLink = async () => {
    if (!selectedApiId) {
      toast({
        title: "Select API",
        description: "Please select a Game Top-Up API first.",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    setMatchResults([]);
    setLinkProgress(0);

    try {
      // Fetch MLBB tiers and API products in parallel
      const [tiers, products] = await Promise.all([
        fetchMLBBTiers(),
        fetchApiProducts(),
      ]);

      setMlbbTiers(tiers);
      setApiProducts(products);

      if (products.length === 0) {
        toast({
          title: "No API Products",
          description: "Could not fetch products from the API. Check the API configuration.",
          variant: "destructive",
        });
        return;
      }

      // Perform matching
      const results = performMatching(tiers, products);
      setMatchResults(results);

      const matchedCount = results.filter(r => r.status === 'matched').length;
      const alreadyLinked = results.filter(r => r.status === 'already_linked').length;
      
      toast({
        title: "Matching Complete",
        description: `Found ${matchedCount} matches, ${alreadyLinked} already linked, ${results.length - matchedCount - alreadyLinked} unmatched.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch data for auto-linking.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Apply all matched links
  const handleApplyLinks = async () => {
    const toLink = matchResults.filter(r => r.status === 'matched' && r.matchedProduct);
    
    if (toLink.length === 0) {
      toast({
        title: "Nothing to Link",
        description: "No matching tiers found to link.",
      });
      return;
    }

    setIsLinking(true);
    setLinkProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < toLink.length; i++) {
      const { tier, matchedProduct } = toLink[i];
      
      try {
        const { error } = await supabase
          .from("pricing_tiers")
          .update({
            provider_id: selectedApiId,
            provider_product_id: matchedProduct!.productid,
          })
          .eq("id", tier.id);

        if (error) {
          console.error("Error updating tier:", error);
          errorCount++;
        } else {
          successCount++;
          // Update local state to show as linked
          setMatchResults(prev => prev.map(r => 
            r.tier.id === tier.id 
              ? { ...r, status: 'already_linked' as const }
              : r
          ));
        }
      } catch (err) {
        console.error("Error:", err);
        errorCount++;
      }

      setLinkProgress(((i + 1) / toLink.length) * 100);
    }

    setIsLinking(false);

    toast({
      title: "Auto-Link Complete",
      description: `Successfully linked ${successCount} tiers${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      variant: errorCount > 0 ? "destructive" : "default",
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
        disabled={gameApis.length === 0}
      >
        <Zap className="w-4 h-4" />
        Auto-Link MLBB
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Auto-Link MLBB Products to Game Top-Up API
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* API Selection */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-foreground">Game Top-Up API</label>
                <Select value={selectedApiId} onValueChange={setSelectedApiId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select API" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameApis.map(api => (
                      <SelectItem key={api.id} value={api.id}>
                        {api.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleStartAutoLink} 
                disabled={isFetching || !selectedApiId}
                className="gap-2"
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Analyze & Match
              </Button>
            </div>

            {/* Stats */}
            {matchResults.length > 0 && (
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
            )}

            {/* Progress bar during linking */}
            {isLinking && (
              <div className="space-y-2">
                <Progress value={linkProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Linking tiers... {Math.round(linkProgress)}%
                </p>
              </div>
            )}

            {/* Results List */}
            {matchResults.length > 0 && (
              <ScrollArea className="flex-1 border border-border rounded-lg">
                <div className="p-3 space-y-2">
                  {matchResults.map((result, idx) => (
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
                          <p className="font-medium text-foreground">{result.tier.amount}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{result.tier.price} • {result.tier.diamonds || 'N/A'} diamonds
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {result.status === 'matched' && result.matchedProduct && (
                          <div>
                            <Badge variant="outline" className="text-green-600 border-green-500/50">
                              {result.matchedProduct.productid}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {result.matchedProduct.title}
                            </p>
                          </div>
                        )}
                        {result.status === 'already_linked' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-500/50">
                            Already Linked
                          </Badge>
                        )}
                        {result.status === 'no_match' && (
                          <Badge variant="outline" className="text-orange-600 border-orange-500/50">
                            No Match Found
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Empty state */}
            {!isFetching && matchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click "Analyze & Match" to find matches between</p>
                <p>MLBB pricing tiers and Game Top-Up API products</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            {matchedCount > 0 && (
              <Button 
                onClick={handleApplyLinks} 
                disabled={isLinking}
                className="gap-2"
              >
                {isLinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                Link {matchedCount} Tiers
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
