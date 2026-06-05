import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check, AlertCircle, Wallet, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProducts, LegacyProduct } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useCryptoWallet, useUsdtRate } from "@/hooks/useCryptoWallet";
import { useReseller } from "@/hooks/useReseller";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TransactionReceipt from "@/components/TransactionReceipt";
import InstagramCategorySelector, { InstagramCategory } from "@/components/InstagramCategorySelector";
import FacebookCategorySelector, { FacebookCategory } from "@/components/FacebookCategorySelector";
import TikTokCategorySelector, { TikTokCategory } from "@/components/TikTokCategorySelector";
import { Helmet } from "react-helmet-async";

// WhatsApp auto-notifications removed per user request — now a no-op.
const sendWhatsAppNotification = (_orderDetails: {
  orderId: string;
  productName: string;
  amount: string;
  price: number;
  playerId: string;
  zoneId?: string;
  playerName?: string;
  paymentMethod: string;
  status: string;
  isManual?: boolean;
}) => {
  /* intentionally empty */
};

interface ReceiptData {
  orderId: string;
  productName: string;
  amount: string;
  price: number;
  userId: string;
  zoneId?: string;
  contactNumber: string;
  transactionDate: string;
  paymentMethod: string;
}

interface PricingTier {
  id: string;
  amount: string;
  price: number;
  bonus?: string;
  smmServiceId?: string;
  quantity?: number;
  providerId?: string;
  providerProductId?: string;
}

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, wallet } = useWallet();
  const { balance: usdtBalance, refresh: refreshUsdt } = useCryptoWallet();
  const usdtRate = useUsdtRate();
  const { isReseller, discountPercent, getTierPrice } = useReseller();
  const { getProductBySlug, getProductBySubCategory, isLoading } = useProducts();
  
  const baseProduct = getProductBySlug(productId || "");
  const isInstagramMainProduct = productId === "instagram";
  const isFacebookMainProduct = productId === "facebook";
  const isTikTokMainProduct = productId === "tiktok";
  
  const [selectedCategory, setSelectedCategory] = useState<InstagramCategory>("followers");
  const [selectedFbCategory, setSelectedFbCategory] = useState<FacebookCategory>("profile-followers");
  const [selectedTikTokCategory, setSelectedTikTokCategory] = useState<TikTokCategory>("followers");
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [charName, setCharName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpiProcessing, setIsUpiProcessing] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData2, setReceiptData2] = useState<null>(null); // placeholder removed
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<
    | { success: true; username: string; region?: string }
    | { success: false; error: string }
    | null
  >(null);

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Manual recharge removed; always automatic.
  const rechargeMode: 'automatic' | 'manual' = 'automatic';
  const isManualRechargeEnabled = false;

  // Track which API type to use for this product
  const [productApiType, setProductApiType] = useState<'aluu' | 'gametopup' | null>(null);
  const [productApiId, setProductApiId] = useState<string | null>(null);
  const [isUpiPaymentEnabled, setIsUpiPaymentEnabled] = useState(true);

  // Get the active product based on category selection for Instagram, Facebook, or TikTok
  const product = useMemo((): LegacyProduct | undefined => {
    let p: LegacyProduct | undefined;
    if (isInstagramMainProduct) p = getProductBySubCategory(selectedCategory) || baseProduct;
    else if (isFacebookMainProduct) p = getProductBySubCategory(selectedFbCategory) || baseProduct;
    else if (isTikTokMainProduct) p = getProductBySubCategory(selectedTikTokCategory) || baseProduct;
    else p = baseProduct;
    if (!p) return p;
    // Apply effective price (per-tier reseller override, then percent fallback)
    if (isReseller) {
      return {
        ...p,
        pricingTiers: p.pricingTiers.map(t => ({ ...t, price: getTierPrice(t) })),
      };
    }
    return p;
  }, [isInstagramMainProduct, isFacebookMainProduct, isTikTokMainProduct, selectedCategory, selectedFbCategory, selectedTikTokCategory, baseProduct, getProductBySubCategory, isReseller, getTierPrice]);

  // Reset selected tier & quantity when category changes
  useEffect(() => {
    setSelectedTier(null);
    setQuantity(1);
  }, [selectedCategory, selectedFbCategory, selectedTikTokCategory]);

  // Reset quantity when tier changes
  useEffect(() => { setQuantity(1); }, [selectedTier?.id]);

  // Clear validation when Player ID / Zone changes
  useEffect(() => { setValidationResult(null); }, [userId, zoneId]);

  // Clamp quantity to product max
  const maxQty = product?.isStackable ? Math.max(1, product?.maxQuantity ?? 5) : 1;
  useEffect(() => {
    if (quantity > maxQty) setQuantity(maxQty);
  }, [maxQty, quantity]);

  // Fetch API type for this product's first pricing tier provider
  useEffect(() => {
    const fetchApiType = async () => {
      if (!product?.pricingTiers || product.pricingTiers.length === 0) return;
      
      // Check if any tier has a provider
      const tierWithProvider = product.pricingTiers.find(t => t.providerId);
      if (!tierWithProvider?.providerId) {
        setProductApiType(null);
        setProductApiId(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('smm_apis')
          .select('id, api_type')
          .eq('id', tierWithProvider.providerId)
          .single();
        
        if (!error && data) {
          setProductApiType(data.api_type as 'aluu' | 'gametopup');
          setProductApiId(data.id);
        }
      } catch (err) {
        console.error('Failed to fetch API type:', err);
      }
    };
    
    fetchApiType();
  }, [product?.pricingTiers]);

  useEffect(() => {
    const fetchUpiSetting = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "upi_product_enabled")
        .maybeSingle();

      const value = data?.value as { enabled?: boolean } | null;
      setIsUpiPaymentEnabled(value?.enabled !== false);
    };

    fetchUpiSetting();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (location.pathname === "/product-detect") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10 flex items-center justify-center">
          <div className="w-full max-w-md border border-border bg-card rounded-lg p-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Detecting your UPI payment</h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we verify payment, create your Aluu order, and show it in your website order history.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
            <p className="font-body text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Button variant="gaming" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const validateForm = () => {
    if (!selectedTier) {
      toast({
        title: "Select a pack",
        description: "Please select a pricing option to continue.",
        variant: "destructive",
      });
      return false;
    }

    const needsPlayerId = product?.isSocialMedia ? true : (product?.requiresPlayerId !== false);
    if (needsPlayerId && !userId.trim()) {
      toast({
        title: product?.isSocialMedia ? "URL required" : "Player ID required",
        description: product?.isSocialMedia ? "Please enter the profile or post URL." : "Please enter your Player ID.",
        variant: "destructive",
      });
      return false;
    }

    // Server requirement (when product needs server selection/entry)
    const serverRequired = !product?.isSocialMedia && (product?.serverMode === 'select' || product?.serverMode === 'manual' || product?.requiresServerId);
    if (serverRequired && !zoneId.trim()) {
      toast({ title: "Server required", description: "Please select / enter your Server (Zone) ID.", variant: "destructive" });
      return false;
    }

    // Character name requirement
    if (product?.requiresCharName && !charName.trim()) {
      toast({ title: "Username required", description: "Please enter your in-game username.", variant: "destructive" });
      return false;
    }

    return true;
  };

  // Places a single API order (one row in `orders`). Returns true on success.
  const placeSingleOrder = async (
    tier: PricingTier,
    label: string,
  ): Promise<{ ok: boolean; orderId: string | null; error?: string }> => {
    if (!user) return { ok: false, orderId: null, error: "Not signed in" };

    // 1. Create order row
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product!.id,
        product_name: label,
        amount: tier.amount,
        price: tier.price,
        user_game_id: userId,
        zone_id: zoneId || null,
        contact_number: user.email || "",
        status: "pending",
      })
      .select()
      .single();
    if (orderError || !orderData) {
      return { ok: false, orderId: null, error: orderError?.message || "Order create failed" };
    }

    // 2. Atomic wallet debit
    const { error: rpcError } = await supabase.rpc("process_order_payment", {
      p_user_id: user.id,
      p_amount: tier.price,
      p_order_id: orderData.id,
      p_description: `Purchase: ${label} - ${tier.amount}`,
    });
    if (rpcError) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", orderData.id);
      return { ok: false, orderId: orderData.id, error: rpcError.message || "Payment failed" };
    }

    // 3. Provider fulfilment
    try {
      if (tier.providerId && tier.providerProductId) {
        let apiType = 'aluu';
        const { data: apiData } = await supabase
          .from('smm_apis').select('api_type').eq('id', tier.providerId).single();
        if (apiData?.api_type) apiType = apiData.api_type;

        if (apiType === 'gametopup') {
          const { data: g, error: gErr } = await supabase.functions.invoke('gametopup-order', {
            body: {
              action: 'order', apiId: tier.providerId,
              playerId: userId, zoneId: zoneId,
              productId: tier.providerProductId, currency: 'INR',
            }
          });
          if (gErr) throw gErr;
          if (g.error || !g.success) throw new Error(g.message || g.error || 'Game Top-Up order failed');
          await supabase.from("orders").update({
            status: "processing",
            smm_order_id: g.order_id ? String(g.order_id) : null,
          }).eq("id", orderData.id);
        } else if (apiType === 'aluu') {
          const [game, denom] = String(tier.providerProductId).split(":");
          if (!game || !denom) throw new Error("Invalid Aluu product mapping");
          const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aluu-webhook`;
          const { data: a, error: aErr } = await supabase.functions.invoke('aluu-order', {
            body: {
              action: 'create_order', game, denom, userid: userId,
              serverid: zoneId || undefined,
              charname: charName || undefined,
              partner_orderid: orderData.id,
              partner_webhook_url: webhookUrl,
            }
          });
          if (aErr) throw aErr;
          if (!a?.success) throw new Error(a?.error || a?.message || 'Aluu order failed');
          await supabase.from("orders").update({
            status: "processing",
            smm_order_id: a?.data?.reference || null,
          }).eq("id", orderData.id);
        }
      } else if (product!.isSocialMedia && tier.smmServiceId && tier.quantity) {
        const { data: s, error: sErr } = await supabase.functions.invoke('smm-order', {
          body: { action: 'order', service: tier.smmServiceId, link: userId, quantity: tier.quantity },
        });
        if (sErr) throw sErr;
        if (s.error) throw new Error(s.error);
        await supabase.from("orders").update({
          status: "processing",
          smm_order_id: s.order ? String(s.order) : null,
        }).eq("id", orderData.id);
      }
    } catch (provErr) {
      console.error("Provider error:", provErr);
      await supabase.from("orders").update({ status: "failed" }).eq("id", orderData.id);
      return {
        ok: false,
        orderId: orderData.id,
        error: provErr instanceof Error ? provErr.message : "Auto-delivery failed",
      };
    }

    return { ok: true, orderId: orderData.id };
  };

  const handleWalletPayment = async () => {
    if (!validateForm() || !selectedTier || !user) return;

    const qty = Math.max(1, Math.min(maxQty, quantity));
    const total = selectedTier.price * qty;

    if (balance < total) {
      toast({
        title: "Insufficient Balance",
        description: `You need ₹${total - balance} more. Please add coins to your wallet.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;
      let lastOrderId: string | null = null;
      let lastError: string | null = null;

      for (let i = 0; i < qty; i++) {
        const label = qty > 1 ? `${product!.name} (${i + 1}/${qty})` : product!.name;
        const res = await placeSingleOrder(selectedTier, label);
        if (res.ok) {
          successCount++;
          lastOrderId = res.orderId;
        } else {
          lastError = res.error || lastError;
          // Stop the loop on first failure to avoid charging more than delivered
          break;
        }
      }

      if (successCount === 0) {
        toast({
          title: "Order Failed",
          description: lastError || "Failed to place order. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setReceiptData({
        orderId: lastOrderId || "",
        productName: qty > 1 ? `${product!.name} x${successCount}` : product!.name,
        amount: selectedTier.amount,
        price: selectedTier.price * successCount,
        userId: userId,
        zoneId: zoneId || undefined,
        contactNumber: user.email || "",
        transactionDate: new Date().toISOString(),
        paymentMethod: "Wallet Balance",
      });
      setReceiptOpen(true);

      toast({
        title: "Order Placed Successfully!",
        description:
          successCount === qty
            ? `${successCount} order${successCount > 1 ? "s" : ""} placed. Check your Orders page.`
            : `${successCount} of ${qty} orders placed. Last error: ${lastError}`,
      });
    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  // UPI QR manual flow removed.

  const validationMode: 'mandatory' | 'non_mandatory' | 'disabled' =
    product?.validationMode || 'non_mandatory';

  const handleValidatePlayer = async () => {
    if (!userId.trim()) {
      toast({ title: "Player ID required", description: "Enter your Player ID first.", variant: "destructive" });
      return;
    }
    const serverNeeded = product?.serverMode === 'select' || product?.serverMode === 'manual' || product?.requiresServerId;
    if (serverNeeded && !zoneId.trim()) {
      toast({ title: "Server required", description: "Enter / select your Server (Zone) ID first.", variant: "destructive" });
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('gametopup-order', {
        body: {
          action: 'validate',
          apiId: productApiId || undefined,
          playerId: userId.trim(),
          zoneId: zoneId.trim() || '0',
        },
      });
      if (error) throw error;
      if (data?.success) {
        setValidationResult({
          success: true,
          username: data.username || data.data?.username || data.data?.nickname || 'Unknown',
          region: data.region || data.zone_name || data.data?.region,
        });
      } else {
        setValidationResult({ success: false, error: data?.message || data?.error || 'Player not found' });
      }
    } catch (e) {
      setValidationResult({
        success: false,
        error: e instanceof Error ? e.message : 'Validation request failed',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const isValidationBlocking = validationMode === 'mandatory' && !validationResult?.success;

  const totalPrice = selectedTier ? selectedTier.price * Math.max(1, Math.min(maxQty, quantity)) : 0;
  const canPayWithWallet = !!(user && wallet && selectedTier && balance >= totalPrice);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`${product.name} Top Up | Scaliver Official`}</title>
        <meta
          name="description"
          content={`${product.name} top up with secure UPI payment, automatic payment detection, and instant order processing on Scaliver Official.`}
        />
        <link rel="canonical" href={`https://scaliverofficial.in/product/${product.slug}`} />
        <meta property="og:title" content={`${product.name} | Scaliver Official`} />
        <meta
          property="og:description"
          content={`Buy ${product.name} with fast UPI payment verification and automatic order delivery.`}
        />
        <meta property="og:url" content={`https://scaliverofficial.in/product/${product.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description || `${product.name} instant gaming top up`,
            category: product.category,
            brand: { "@type": "Brand", name: "Scaliver Official" },
            offers: selectedTier
              ? {
                  "@type": "Offer",
                  priceCurrency: "INR",
                  price: selectedTier.price,
                  availability: "https://schema.org/InStock",
                  url: `https://scaliverofficial.in/product/${product.slug}`,
                }
              : undefined,
          })}
        </script>
      </Helmet>

      <Header />
      
      <main className="flex-1 py-8">
        <div className="container">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>

          <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
            {/* Product Image & Info */}
            <div className="space-y-3 md:space-y-6">
              <div className="relative overflow-hidden rounded-lg md:rounded-2xl border border-border bg-card mx-auto max-w-[180px] sm:max-w-[260px] md:max-w-none">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>

              {/* Instructions */}
              {product.instructions && product.instructions.length > 0 && (
                <div className="bg-card border border-border rounded-md md:rounded-xl p-2.5 md:p-6">
                  <h2 className="font-display text-xs md:text-lg font-bold text-foreground mb-1.5 md:mb-4">
                    How to Order
                  </h2>
                  <ol className="space-y-1 md:space-y-3">
                    {product.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start gap-1.5 md:gap-3">
                        <span className="flex-shrink-0 w-4 h-4 md:w-6 md:h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-[9px] md:text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-body text-[11px] md:text-base text-muted-foreground leading-snug">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Order Form */}
            <div className="space-y-3 md:space-y-6">
              {/* Product Title */}
              <div>
                <Badge variant="gaming" className="mb-1.5 md:mb-3 text-[10px] md:text-xs">
                  {product.category}
                </Badge>
                <h1 className="font-display text-lg md:text-4xl font-bold text-foreground mb-1 md:mb-2 leading-tight">
                  {isInstagramMainProduct ? "INSTAGRAM SERVICE" : isFacebookMainProduct ? "FACEBOOK SERVICE" : isTikTokMainProduct ? "TIKTOK SERVICE" : product.name}
                </h1>
                <p className="font-body text-xs md:text-base text-muted-foreground leading-snug">
                  {isInstagramMainProduct
                    ? "Boost your Instagram presence with followers, likes, views, comments, and saves."
                    : isFacebookMainProduct
                    ? "Boost your Facebook presence with followers, likes, views, watch time, and reactions."
                    : isTikTokMainProduct
                    ? "Boost your TikTok presence with followers, likes, and views."
                    : product.description}
                </p>
              </div>


              {/* Instagram Category Selector */}
              {isInstagramMainProduct && (
                <InstagramCategorySelector
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
              )}

              {/* Facebook Category Selector */}
              {isFacebookMainProduct && (
                <FacebookCategorySelector
                  selectedCategory={selectedFbCategory}
                  onCategoryChange={setSelectedFbCategory}
                />
              )}

              {/* TikTok Category Selector */}
              {isTikTokMainProduct && (
                <TikTokCategorySelector
                  selectedCategory={selectedTikTokCategory}
                  onCategoryChange={setSelectedTikTokCategory}
                />
              )}


              {/* User Details Form */}
              <div className="bg-card border border-border rounded-lg p-3 md:p-6 space-y-3 md:space-y-4">
                <h2 className="font-display text-sm md:text-lg font-bold text-foreground">
                  {product.isSocialMedia ? "Enter Your Details" : "Enter Your Game Details"}
                </h2>

                
                {product.isSocialMedia ? (
                  <div className="space-y-2">
                    <Label htmlFor="userId" className="font-body text-foreground">
                      Profile URL / Post URL *
                    </Label>
                    <Input
                      id="userId"
                      placeholder="Enter your profile or post URL"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                ) : (
                  <>
                    {(product.requiresPlayerId !== false || product.requiresServerId || product.serverMode === 'select' || product.serverMode === 'manual') && (
                      <div className={`grid gap-4 ${(product.requiresServerId || product.serverMode === 'select' || product.serverMode === 'manual') && product.requiresPlayerId !== false ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {product.requiresPlayerId !== false && (
                          <div className="space-y-2">
                            <Label htmlFor="userId" className="font-body text-foreground">
                              Player ID *
                            </Label>
                            <Input
                              id="userId"
                              placeholder="Enter your Player ID"
                              value={userId}
                              onChange={(e) => setUserId(e.target.value)}
                              className="bg-secondary border-border"
                            />
                          </div>
                        )}
                        {(product.serverMode === 'select' && product.serverOptions && product.serverOptions.length > 0) ? (
                          <div className="space-y-2">
                            <Label htmlFor="zoneId" className="font-body text-foreground">
                              Server *
                            </Label>
                            <select
                              id="zoneId"
                              value={zoneId}
                              onChange={(e) => setZoneId(e.target.value)}
                              className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground"
                            >
                              <option value="">Select server…</option>
                              {product.serverOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        ) : (product.requiresServerId || product.serverMode === 'manual') ? (
                          <div className="space-y-2">
                            <Label htmlFor="zoneId" className="font-body text-foreground">
                              Server / Zone ID *
                            </Label>
                            <Input
                              id="zoneId"
                              placeholder="Enter Zone ID"
                              value={zoneId}
                              onChange={(e) => setZoneId(e.target.value)}
                              className="bg-secondary border-border"
                            />
                          </div>
                        ) : null}
                      </div>
                    )}

                    {product.requiresCharName && (
                      <div className="space-y-2">
                        <Label htmlFor="charName" className="font-body text-foreground">
                          In-game Username *
                        </Label>
                        <Input
                          id="charName"
                          placeholder="Enter your in-game username"
                          value={charName}
                          onChange={(e) => setCharName(e.target.value)}
                          className="bg-secondary border-border"
                        />
                      </div>
                    )}
                    
                  </>
                )}
              </div>

              {/* Wallet Balance */}
              {user && wallet && (
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <span className="font-body text-foreground">Your Balance</span>
                  </div>
                  <span className="font-display font-bold text-primary text-lg">
                    ₹{balance.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Pricing Tiers */}
              <div className="bg-card border border-border rounded-lg p-3 md:p-6">
                <h2 className="font-display text-sm md:text-lg font-bold text-foreground mb-2 md:mb-4">
                  Select Package
                </h2>

                {isReseller && discountPercent > 0 && (
                  <Badge className="mb-3 bg-accent/20 text-accent border-accent/30">
                    Reseller pricing • {discountPercent}% OFF applied
                  </Badge>
                )}
                {product.pricingTiers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No pricing options available for this product.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {product.pricingTiers.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => setSelectedTier(tier)}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                          selectedTier?.id === tier.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/50 hover:border-primary/50"
                        }`}
                      >
                        {tier.bonus && (
                          <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs">
                            {tier.bonus}
                          </Badge>
                        )}
                        <p className="font-display font-bold text-foreground text-sm mb-1">
                          {tier.amount}
                        </p>
                        <p className="font-display font-bold text-primary text-lg">
                          ₹{tier.price}
                        </p>
                        {selectedTier?.id === tier.id && (
                          <Check className="absolute top-2 right-2 w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              {selectedTier && (
                <div className="bg-card border border-border rounded-lg p-3 md:p-6 space-y-2.5 md:space-y-4">
                  <h2 className="font-display text-sm md:text-lg font-bold text-foreground">
                    Order Summary
                  </h2>


                  {/* Quantity Selector — only when product is stackable */}
                  {product.isStackable && maxQty > 1 && (
                    <div className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg p-3 transition-all">
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">Quantity</p>
                        <p className="text-xs text-muted-foreground">Buy up to {maxQty} in one go</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button" size="icon" variant="outline"
                          className="h-9 w-9 rounded-full"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        >−</Button>
                        <div className="relative">
                          <span className="font-display font-bold text-primary text-lg w-10 text-center inline-block transition-transform duration-200 hover:scale-110">
                            {quantity}
                          </span>
                          <Badge className="absolute -top-2 -right-3 bg-accent text-accent-foreground text-[10px] px-1.5 py-0">x{quantity}</Badge>
                        </div>
                        <Button
                          type="button" size="icon" variant="outline"
                          className="h-9 w-9 rounded-full"
                          disabled={quantity >= maxQty}
                          onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                        >+</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Package</span>
                      <span className="text-foreground font-medium">
                        {selectedTier.amount}{quantity > 1 ? ` × ${quantity}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unit price</span>
                      <span className="text-foreground">₹{selectedTier.price}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-primary font-display font-bold text-xl transition-all">
                        ₹{totalPrice}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* UPI QR manual flow removed — only gateway payments */}

              {/* Player Validation */}
              {validationMode !== 'disabled' && !product.isSocialMedia && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-primary/40"
                    onClick={handleValidatePlayer}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validating…</>
                    ) : (
                      <><Check className="w-4 h-4 mr-2" /> Validate Player</>
                    )}
                  </Button>
                  {validationResult?.success && (
                    <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm">
                      <p className="text-foreground"><span className="text-muted-foreground">Player:</span> <b>{validationResult.username}</b></p>
                      {validationResult.region && (
                        <p className="text-foreground"><span className="text-muted-foreground">Region:</span> <b>{validationResult.region}</b></p>
                      )}
                      <p className="text-green-500 mt-1 flex items-center gap-1"><Check className="w-4 h-4" /> Validated Successfully</p>
                    </div>
                  )}
                  {validationResult && validationResult.success === false && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                      <p className="text-destructive font-medium">❌ Player not found</p>
                      <p className="text-muted-foreground text-xs mt-1">Please check Player ID and Server ID. ({validationResult.error})</p>
                    </div>
                  )}
                  {validationMode === 'mandatory' && !validationResult?.success && (
                    <p className="text-xs text-muted-foreground">Validation is required before placing an order.</p>
                  )}
                </div>
              )}

              {/* Payment Buttons */}
              {(
                <div className="space-y-3">
                  {user ? (
                    <>
                      <Button
                        variant="gaming"
                        className="w-full"
                        onClick={handleWalletPayment}
                        disabled={!selectedTier || isProcessing || !canPayWithWallet}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Wallet className="w-4 h-4 mr-2" />
                        )}
                        {canPayWithWallet ? `Pay ₹${totalPrice} with Coins` : "Insufficient Balance"}
                      </Button>
                      
                      {/* Online Payment via Chuimei-pe */}
                      {isUpiPaymentEnabled && (
                        <Button
                          variant="outline"
                          className="w-full border-primary/50 hover:bg-primary/10"
                          onClick={async () => {
                            if (!validateForm() || !selectedTier) return;
                            setIsUpiProcessing(true);
                            try {
                              const { data: paymentRecord, error: insertError } = await supabase
                                .from("upi_payment_requests")
                                .insert({
                                  user_id: user.id,
                                  user_email: user.email,
                                  request_type: "product_order",
                                  amount: selectedTier.price,
                                  product_id: product.id,
                                  product_name: product.name,
                                  product_pack: selectedTier.amount,
                                  tier_id: selectedTier.id,
                                  provider_id: selectedTier.providerId || null,
                                  provider_product_id: selectedTier.providerProductId || null,
                                  smm_service_id: selectedTier.smmServiceId || null,
                                  smm_quantity: selectedTier.quantity || null,
                                  is_social_media: !!product.isSocialMedia,
                                  player_id: userId,
                                  zone_id: zoneId || null,
                                  redirect_path: `${window.location.origin}/payment-detect?id=__ID__`,
                                  utr_number: `CHUIMEI-${Date.now()}`,
                                  status: "pending",
                                })
                                .select()
                                .single();
                              if (insertError) throw insertError;

                              // Patch redirect_path with the real id so gateway returns
                              // user to /payment-detect?id=<paymentId>
                              const detectUrl = `${window.location.origin}/payment-detect?id=${paymentRecord.id}`;
                              await supabase
                                .from("upi_payment_requests")
                                .update({ redirect_path: detectUrl })
                                .eq("id", paymentRecord.id);

                              const { data, error } = await supabase.functions.invoke('chuimei-payment', {
                                body: {
                                  action: 'create_order',
                                  amount: selectedTier.price,
                                  order_id: paymentRecord.id,
                                  customer_mobile: '0000000000',
                                  redirect_url: detectUrl,
                                  remark1: `${product.name} - ${selectedTier.amount}`,
                                  remark2: `Player: ${userId}${zoneId ? ` Zone: ${zoneId}` : ''}`,
                                }
                              });
                              if (error) throw error;
                              if (data?.success && data?.payment_url) {
                                // Send the user straight to the gateway in the
                                // same tab, then to /payment-detect on return.
                                window.location.href = data.payment_url;
                              } else {
                                throw new Error(data?.error || 'Payment failed');
                              }
                            } catch (err) {
                              console.error("Online payment error:", err);
                              toast({
                                title: "Payment Error",
                                description: err instanceof Error ? err.message : "Failed to initiate payment.",
                                variant: "destructive",
                              });
                              setIsUpiProcessing(false);
                            }
                          }}
                          disabled={!selectedTier || isUpiProcessing}
                        >
                          {isUpiProcessing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-2" />
                          )}
                          {isUpiProcessing ? "Opening UPI…" : "Pay UPI"}
                        </Button>
                      )}

                      {/* USDT Wallet Payment */}
                      {selectedTier && usdtRate > 0 && (() => {
                        const usdtNeeded = +(totalPrice / usdtRate).toFixed(4);
                        const canPayUsdt = usdtBalance >= usdtNeeded;
                        return (
                          <Button
                            variant="outline"
                            className="w-full border-green-500/40 hover:bg-green-500/10 text-green-500"
                            disabled={!canPayUsdt || isProcessing}
                            onClick={async () => {
                              if (!validateForm() || !user) return;
                              setIsProcessing(true);
                              try {
                                const ref = `prod-${product!.id}-${Date.now()}`;
                                const { data, error } = await supabase.functions.invoke("crypto-gateway", {
                                  body: { action: "purchase", amount_usdt: usdtNeeded, reference: ref },
                                });
                                if (error) throw error;
                                if (!data?.success) throw new Error(data?.error || "USDT debit failed");

                                const qty = Math.max(1, Math.min(maxQty, quantity));
                                let successCount = 0;
                                let lastOrderId: string | null = null;
                                for (let i = 0; i < qty; i++) {
                                  // Use the existing wallet-payment helper but skip the INR debit
                                  // by creating an order row + provider call directly is complex;
                                  // instead temporarily credit INR wallet then call placeSingleOrder.
                                  // Simpler: insert order row paid via USDT and provider-call manually.
                                  const { data: o } = await supabase.from("orders").insert({
                                    user_id: user.id,
                                    product_id: product!.id,
                                    product_name: qty > 1 ? `${product!.name} (${i + 1}/${qty})` : product!.name,
                                    amount: selectedTier.amount,
                                    price: selectedTier.price,
                                    user_game_id: userId,
                                    zone_id: zoneId || null,
                                    contact_number: user.email || "",
                                    status: "pending_manual",
                                  }).select().single();
                                  if (o) { successCount++; lastOrderId = o.id; }
                                }

                                refreshUsdt();
                                setReceiptData({
                                  orderId: lastOrderId || "",
                                  productName: qty > 1 ? `${product!.name} x${successCount}` : product!.name,
                                  amount: selectedTier.amount,
                                  price: selectedTier.price * successCount,
                                  userId,
                                  zoneId: zoneId || undefined,
                                  contactNumber: user.email || "",
                                  transactionDate: new Date().toISOString(),
                                  paymentMethod: `USDT (${usdtNeeded} USDT)`,
                                });
                                setReceiptOpen(true);
                                toast({ title: "Paid with USDT", description: `Debited ${usdtNeeded} USDT` });
                              } catch (e) {
                                toast({
                                  title: "USDT payment failed",
                                  description: e instanceof Error ? e.message : "Try again",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsProcessing(false);
                              }
                            }}
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            {canPayUsdt
                              ? `Pay ${usdtNeeded} USDT (Bal: ${usdtBalance.toFixed(4)})`
                              : `Need ${usdtNeeded} USDT — Top up`}
                          </Button>
                        );
                      })()}
                      
                    </>
                  ) : (
                    <Button
                      variant="gaming"
                      className="w-full"
                      onClick={() => navigate("/auth")}
                    >
                      Login to Purchase
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Transaction Receipt */}
      <TransactionReceipt
        open={receiptOpen}
        onOpenChange={(open) => {
          setReceiptOpen(open);
          if (!open) navigate("/orders");
        }}
        receipt={receiptData}
      />

      <Footer />
    </div>
  );
};

export default ProductDetail;
