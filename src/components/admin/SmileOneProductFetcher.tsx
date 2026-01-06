import { useState } from "react";
import { Package, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface SmileOneProduct {
  id: string;
  name: string;
  price: string | number;
  salePrice?: string | number;
  spay_id?: string;
}

interface SmileOneProductFetcherProps {
  apiId: string;
  apiName: string;
  isOpen: boolean;
  onClose: () => void;
}

const PRODUCT_TYPES = [
  { value: "mobilelegends", label: "MLBB Global Diamonds" },
  { value: "mobilelegendsbrazil", label: "MLBB Brazil Diamonds" },
  { value: "weeklypass", label: "Weekly Diamond Pass" },
  { value: "starlightmember", label: "Starlight Member" },
];

export const SmileOneProductFetcher = ({ 
  apiId, 
  apiName, 
  isOpen, 
  onClose 
}: SmileOneProductFetcherProps) => {
  const { toast } = useToast();
  const [productType, setProductType] = useState("mobilelegends");
  const [products, setProducts] = useState<SmileOneProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    setProducts([]);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('smileone-order', {
        body: {
          action: 'products',
          apiId,
          productType,
        }
      });

      if (fetchError) throw fetchError;

      if (data.error) {
        setError(data.error);
        return;
      }

      // Parse product list from SmileOne response
      // SmileOne returns products in 'data' array or directly as array
      let productList = data.data || data.product_list || data.products || [];
      
      if (Array.isArray(productList)) {
        // Map to consistent format
        const mappedProducts = productList.map((p: any) => ({
          id: p.spay_id || p.product_id || p.id || String(p.spay_id),
          name: p.product_name || p.name || 'Unknown Product',
          price: p.cost_price || p.price || p.salePrice || 0,
          salePrice: p.salePrice || p.sale_price || null,
          spay_id: p.spay_id || p.product_id || p.id,
        }));
        setProducts(mappedProducts);
        
        if (mappedProducts.length === 0) {
          setError("No products found for this type. Response: " + JSON.stringify(data).substring(0, 200));
        }
      } else {
        setError("Unexpected response format: " + JSON.stringify(data).substring(0, 200));
      }
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message || "Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      toast({
        title: "Copied!",
        description: `Product ID "${id}" copied to clipboard.`,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            SmileOne Products - {apiName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Type Selector */}
          <div className="flex gap-3">
            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select product type" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchProducts} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Fetch Products
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Products List */}
          {products.length > 0 && (
            <ScrollArea className="h-[400px] border border-border rounded-lg">
              <div className="p-2 space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          ID: {product.spay_id || product.id}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Cost: ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(product.spay_id || product.id)}
                      className="gap-1 ml-2 shrink-0"
                    >
                      {copiedId === (product.spay_id || product.id) ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy ID
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!isLoading && products.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a product type and click "Fetch Products" to view available SmileOne products.</p>
            </div>
          )}

          {/* Usage Instructions */}
          <div className="bg-secondary/50 rounded-lg p-3 text-sm">
            <p className="font-medium text-foreground mb-1">How to link products:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Copy the product ID you want to use</li>
              <li>Go to Products → Edit the pricing tier</li>
              <li>Select this SmileOne provider and paste the Product ID</li>
              <li>Save the tier - orders will now auto-fulfill!</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
