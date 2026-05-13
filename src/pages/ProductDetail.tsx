import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ArrowLeft, Check, AlertCircle, Wallet, Loader2, CreditCard, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProducts, LegacyProduct } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useReseller } from "@/hooks/useReseller";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TransactionReceipt from "@/components/TransactionReceipt";
import InstagramCategorySelector, { InstagramCategory } from "@/components/InstagramCategorySelector";
import FacebookCategorySelector, { FacebookCategory } from "@/components/FacebookCategorySelector";
import TikTokCategorySelector, { TikTokCategory } from "@/components/TikTokCategorySelector";
import upiQrImage from "@/assets/upi-qr.jpeg";

const UPI_ID = "7637851804@pthdfc";
const WHATSAPP_NUMBER = "917637851804";

// Send WhatsApp notification with order details
const sendWhatsAppNotification = (orderDetails: {
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
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  
  const message = encodeURIComponent(
    `${orderDetails.isManual ? '⚠️ *MANUAL ORDER REQUIRED*' : '🎮 *NEW ORDER - Scaliver Official*'}\n\n` +
    `📋 Order ID: ${orderDetails.orderId.slice(0, 8)}...\n` +
    `📦 Product: ${orderDetails.productName}\n` +
    `💎 Pack: ${orderDetails.amount}\n` +
    `💰 Price: ₹${orderDetails.price}\n` +
    `🆔 Player ID: ${orderDetails.playerId}\n` +
    `${orderDetails.zoneId ? `🌐 Server/Zone: ${orderDetails.zoneId}\n` : ''}` +
    `${orderDetails.playerName ? `👤 Username: ${orderDetails.playerName}\n` : ''}` +
    `💳 Payment: ${orderDetails.paymentMethod}\n` +
    `📊 Status: ${orderDetails.status}\n` +
    `📅 Date: ${dateStr}\n` +
    `⏰ Time: ${timeStr}\n` +
    `${orderDetails.isManual ? '\n❗ Auto-delivery failed. Please process manually.' : ''}`
  );
  
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
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
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, wallet } = useWallet();
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
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [showUpiPayment, setShowUpiPayment] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Manual recharge removed; always automatic.
  const rechargeMode: 'automatic' | 'manual' = 'automatic';
  const isManualRechargeEnabled = false;

  // Player verification state
  const [playerInfo, setPlayerInfo] = useState<{ nickname: string; region: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isPlayerVerified, setIsPlayerVerified] = useState(false);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which API type to use for this product
  const [productApiType, setProductApiType] = useState<'aluu' | 'gametopup' | null>(null);
  const [productApiId, setProductApiId] = useState<string | null>(null);

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

  // Reset selected tier when category changes
  useEffect(() => {
    setSelectedTier(null);
  }, [selectedCategory, selectedFbCategory, selectedTikTokCategory]);

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

  // Player verification function - supports Digital Top-Up and Game Top-Up APIs
  const verifyPlayer = useCallback(async (playerId: string, zone: string, productSlug?: string) => {
    if (!playerId || !zone) return;
    
    setIsVerifying(true);
    setVerificationError(null);
    setPlayerInfo(null);
    setIsPlayerVerified(false);
    
    try {
      let data, error;
      
      if (productApiType === 'gametopup' && productApiId) {
        // Use Game Top-Up API for validation
        const result = await supabase.functions.invoke('gametopup-order', {
          body: { 
            action: 'validate', 
            apiId: productApiId,
            playerId: playerId, 
            zoneId: zone 
          }
        });
        data = result.data;
        error = result.error;
        
        if (error) throw error;
        
        if (data.code === 200 && data.success && data.username) {
          setPlayerInfo({
            nickname: data.username,
            region: data.region || data.zone_name || 'Unknown'
          });
          setIsPlayerVerified(true);
        } else {
          setVerificationError(data.message || data.error || 'Invalid Player ID or Zone ID');
        }
      } else {
        // Aluu does not expose a standalone validate endpoint; skip and treat as verified.
        setPlayerInfo({ nickname: playerId, region: zone || 'Unknown' });
        setIsPlayerVerified(true);
      }
    } catch (err) {
      console.error('Player verification error:', err);
      setVerificationError('Verification failed. Please check your details.');
    } finally {
      setIsVerifying(false);
    }
  }, [productApiType, productApiId]);

  // Trigger verification when player ID and zone ID change (with debounce)
  useEffect(() => {
    if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);
    
    const isMLBBProduct = product?.category === 'Mobile Legends' && !product?.isSocialMedia;
    
    if (userId && zoneId && isMLBBProduct) {
      verifyTimeoutRef.current = setTimeout(() => {
        verifyPlayer(userId, zoneId, product?.slug);
      }, 600);
    } else {
      setPlayerInfo(null);
      setVerificationError(null);
      setIsPlayerVerified(false);
    }
    
    return () => {
      if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);
    };
  }, [userId, zoneId, product?.category, product?.isSocialMedia, product?.slug, verifyPlayer]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

    // Player verification is optional - no longer required for MLBB products

    return true;
  };

  // Manual verify button handler
  const handleManualVerify = () => {
    if (!userId || !zoneId) {
      toast({
        title: "Missing Details",
        description: "Please enter both Player ID and Zone ID to verify.",
        variant: "destructive",
      });
      return;
    }
    verifyPlayer(userId, zoneId, product?.slug);
  };

  const handleWalletPayment = async () => {
    if (!validateForm() || !selectedTier || !user) return;

    if (balance < selectedTier.price) {
      toast({
        title: "Insufficient Balance",
        description: `You need ₹${selectedTier.price - balance} more. Please add coins to your wallet.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create order first
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          amount: selectedTier.amount,
          price: selectedTier.price,
          user_game_id: userId,
          zone_id: zoneId || null,
          contact_number: user.email || "",
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // ATOMIC wallet deduction (prevents negative balance + double-spend)
      const { error: rpcError } = await supabase.rpc("process_order_payment", {
        p_user_id: user.id,
        p_amount: selectedTier.price,
        p_order_id: orderData.id,
        p_description: `Purchase: ${product.name} - ${selectedTier.amount}`,
      });
      if (rpcError) {
        // Rollback order
        await supabase.from("orders").update({ status: "failed" }).eq("id", orderData.id);
        throw new Error(rpcError.message || "Payment failed");
      }

      // Auto-fulfillment via configured provider (Aluu / GameTopUp)
      if (selectedTier.providerId && selectedTier.providerProductId) {
        try {
          let apiType = 'aluu';
          const { data: apiData } = await supabase
            .from('smm_apis').select('api_type').eq('id', selectedTier.providerId).single();
          if (apiData?.api_type) apiType = apiData.api_type;

          if (apiType === 'gametopup') {
            const { data: gametopupData, error: gametopupError } = await supabase.functions.invoke('gametopup-order', {
              body: {
                action: 'order', apiId: selectedTier.providerId,
                playerId: userId, zoneId: zoneId,
                productId: selectedTier.providerProductId, currency: 'INR',
              }
            });
            if (gametopupError) throw gametopupError;
            if (gametopupData.error || !gametopupData.success) {
              await supabase.from("orders").update({ status: "failed" }).eq("id", orderData.id);
              throw new Error(gametopupData.message || gametopupData.error || 'Game Top-Up order failed');
            }
            await supabase.from("orders").update({
              status: "processing",
              smm_order_id: gametopupData.order_id ? String(gametopupData.order_id) : null
            }).eq("id", orderData.id);
            sendWhatsAppNotification({
              orderId: orderData.id, productName: product.name, amount: selectedTier.amount,
              price: selectedTier.price, playerId: userId, zoneId: zoneId || undefined,
              playerName: playerInfo?.nickname, paymentMethod: "Wallet Balance", status: "Auto Processing",
            });
          } else if (apiType === 'aluu') {
            const [game, denom] = String(selectedTier.providerProductId).split(":");
            if (!game || !denom) throw new Error("Invalid Aluu product mapping");
            const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aluu-webhook`;
            const { data: aluuData, error: aluuError } = await supabase.functions.invoke('aluu-order', {
              body: {
                action: 'create_order', game, denom, userid: userId,
                serverid: zoneId || undefined,
                partner_orderid: orderData.id,
                partner_webhook_url: webhookUrl,
              }
            });
            if (aluuError) throw aluuError;
            if (!aluuData?.success) {
              await supabase.from("orders").update({ status: "failed" }).eq("id", orderData.id);
              throw new Error(aluuData?.error || aluuData?.message || 'Aluu order failed');
            }
            await supabase.from("orders").update({
              status: "processing",
              smm_order_id: aluuData?.data?.reference || null,
            }).eq("id", orderData.id);
            sendWhatsAppNotification({
              orderId: orderData.id, productName: product.name, amount: selectedTier.amount,
              price: selectedTier.price, playerId: userId, zoneId: zoneId || undefined,
              playerName: playerInfo?.nickname, paymentMethod: "Wallet Balance", status: "Auto Processing",
            });
          }
        } catch (providerError) {
          console.error("Provider API Error:", providerError);
          await supabase.from("orders").update({ status: "pending_manual" }).eq("id", orderData.id);
          sendWhatsAppNotification({
            orderId: orderData.id, productName: product.name, amount: selectedTier.amount,
            price: selectedTier.price, playerId: userId, zoneId: zoneId || undefined,
            playerName: playerInfo?.nickname, paymentMethod: "Wallet Balance",
            status: "Pending Manual", isManual: true,
          });
          toast({
            title: "Manual Processing Required",
            description: "Auto-delivery failed. Your order has been sent to admin via WhatsApp for manual processing.",
          });
        }
      }
      // If this is a social media product with SMM service ID, place order via SMM API
      else if (product.isSocialMedia && selectedTier.smmServiceId && selectedTier.quantity) {
        try {
          const { data: smmData, error: smmError } = await supabase.functions.invoke('smm-order', {
            body: {
              action: 'order',
              service: selectedTier.smmServiceId,
              link: userId,
              quantity: selectedTier.quantity,
            }
          });

          if (smmError) throw smmError;

          if (smmData.error) {
            await supabase
              .from("orders")
              .update({ status: "failed" })
              .eq("id", orderData.id);
            
            throw new Error(smmData.error);
          }

          await supabase
            .from("orders")
            .update({ 
              status: "processing",
              smm_order_id: smmData.order ? String(smmData.order) : null 
            })
            .eq("id", orderData.id);

          // Send WhatsApp notification for SMM order
          sendWhatsAppNotification({
            orderId: orderData.id,
            productName: product.name,
            amount: selectedTier.amount,
            price: selectedTier.price,
            playerId: userId,
            zoneId: zoneId || undefined,
            paymentMethod: "Wallet Balance",
            status: "Auto Processing",
          });

          console.log("SMM Order placed:", smmData);
        } catch (smmApiError) {
          console.error("SMM API Error:", smmApiError);
          
          // Update order status to pending_manual
          await supabase
            .from("orders")
            .update({ status: "pending_manual" })
            .eq("id", orderData.id);
          
          // Send WhatsApp notification for manual processing
          sendWhatsAppNotification({
            orderId: orderData.id,
            productName: product.name,
            amount: selectedTier.amount,
            price: selectedTier.price,
            playerId: userId,
            zoneId: zoneId || undefined,
            playerName: playerInfo?.nickname,
            paymentMethod: "Wallet Balance",
            status: "Pending Manual",
            isManual: true,
          });
          
          toast({
            title: "Manual Processing Required",
            description: "Auto-delivery failed. Your order has been sent to admin via WhatsApp for manual processing.",
            variant: "default",
          });
        }
      }

      // Wallet was already debited atomically via process_order_payment RPC.


      // Show receipt
      setReceiptData({
        orderId: orderData.id,
        productName: product.name,
        amount: selectedTier.amount,
        price: selectedTier.price,
        userId: userId,
        zoneId: zoneId || undefined,
        contactNumber: user.email || "",
        transactionDate: new Date().toISOString(),
        paymentMethod: "Wallet Balance",
      });
      setReceiptOpen(true);

      toast({
        title: "Order Placed Successfully!",
        description: product.isSocialMedia 
          ? "Your order is being processed. Delivery within 24-48 hours."
          : "Your order has been placed. Check your orders page for updates.",
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

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const validateUTR = (utr: string) => {
    const cleanUtr = utr.replace(/\s/g, "");
    return cleanUtr.length >= 12 && /^\d+$/.test(cleanUtr);
  };

  const handleUPIPayment = () => {
    if (!validateForm() || !selectedTier) return;
    setShowUpiPayment(true);
  };

  const handleSubmitUPIPayment = async () => {
    if (!selectedTier) return;

    if (!utrNumber.trim()) {
      toast({
        title: "UTR Required",
        description: "Please enter the UTR number from your payment",
        variant: "destructive",
      });
      return;
    }

    if (!validateUTR(utrNumber)) {
      toast({
        title: "Invalid UTR",
        description: "Please enter a valid UTR number (minimum 12 digits)",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save UPI order request to database
      const { error } = await supabase
        .from("upi_payment_requests")
        .insert({
          user_id: user?.id || null,
          user_email: user?.email || null,
          request_type: "product_order",
          amount: selectedTier.price,
          product_name: product.name,
          product_pack: selectedTier.amount,
          player_id: userId,
          zone_id: zoneId || null,
          utr_number: utrNumber.trim(),
          status: "pending",
        });

      if (error) throw error;

      const message = encodeURIComponent(
        `🎮 *UPI ORDER - Scaliver Official*\n\n` +
        `📦 Product: ${product.name}\n` +
        `💎 Pack: ${selectedTier.amount}\n` +
        `💰 Price: ₹${selectedTier.price}\n` +
        `🆔 ${product.isSocialMedia ? "Profile/Post URL" : "Player ID"}: ${userId}\n` +
        `${zoneId ? `🌐 Zone/Server: ${zoneId}\n` : ""}` +
        `🔢 UTR Number: ${utrNumber.trim()}\n\n` +
        `Please verify payment and process order.`
      );

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");

      toast({
        title: "Order Submitted",
        description: "Your order details have been sent. Order will be processed after payment verification.",
      });

      setShowUpiPayment(false);
      setUtrNumber("");
    } catch (error) {
      console.error("Error submitting UPI order:", error);
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canPayWithWallet = user && wallet && selectedTier && balance >= selectedTier.price;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Product Image & Info */}
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>

              {/* Instructions */}
              {product.instructions && product.instructions.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">
                    How to Order
                  </h3>
                  <ol className="space-y-3">
                    {product.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-body text-muted-foreground">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Order Form */}
            <div className="space-y-6">
              {/* Product Title */}
              <div>
                <Badge variant="gaming" className="mb-3">
                  {product.category}
                </Badge>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {isInstagramMainProduct ? "INSTAGRAM SERVICE" : isFacebookMainProduct ? "FACEBOOK SERVICE" : isTikTokMainProduct ? "TIKTOK SERVICE" : product.name}
                </h1>
                <p className="font-body text-muted-foreground">
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
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  {product.isSocialMedia ? "Enter Your Details" : "Enter Your Game Details"}
                </h3>
                
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
                    {(product.requiresPlayerId !== false || product.requiresServerId) && (
                      <div className={`grid gap-4 ${product.requiresServerId && product.requiresPlayerId !== false ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                        {product.requiresServerId && (
                          <div className="space-y-2">
                            <Label htmlFor="zoneId" className="font-body text-foreground">
                              Server / Zone ID
                            </Label>
                            <Input
                              id="zoneId"
                              placeholder="Enter Zone ID"
                              value={zoneId}
                              onChange={(e) => setZoneId(e.target.value)}
                              className="bg-secondary border-border"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Player Verification Section - Only show in automatic mode */}
                    {product.category === 'Mobile Legends' && rechargeMode === 'automatic' && (
                      <div className="mt-3 space-y-3">
                        {/* Manual Check Username Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleManualVerify}
                          disabled={isVerifying || !userId || !zoneId}
                          className="w-full"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Checking Username...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Check Username
                            </>
                          )}
                        </Button>
                        
                        {/* Verification Status */}
                        {playerInfo && (
                          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-2 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              ✓ Player: {playerInfo.nickname} | Region: {playerInfo.region}
                            </span>
                          </div>
                        )}
                        {verificationError && (
                          <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{verificationError}</span>
                          </div>
                        )}
                        {!isVerifying && !playerInfo && !verificationError && (!userId || !zoneId) && (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Enter Player ID and Zone ID, then click "Check Username" to verify</span>
                          </div>
                        )}
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
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Select Package
                </h3>
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
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">
                    Order Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package</span>
                      <span className="text-foreground font-medium">{selectedTier.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="text-primary font-bold">₹{selectedTier.price}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* UPI QR manual flow removed — only gateway payments */}

              {/* Payment Buttons */}
              {!showUpiPayment && (
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
                        {canPayWithWallet ? "Pay with Coins" : "Insufficient Balance"}
                      </Button>
                      
                      {/* Online Payment via Chuimei-pe */}
                      <Button
                        variant="outline"
                        className="w-full border-primary/50 hover:bg-primary/10"
                        onClick={async () => {
                          if (!validateForm() || !selectedTier) return;
                          setIsProcessing(true);
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
                                redirect_path: `/orders`,
                                utr_number: `CHUIMEI-${Date.now()}`,
                                status: "pending",
                              })
                              .select()
                              .single();
                            if (insertError) throw insertError;

                            const { data, error } = await supabase.functions.invoke('chuimei-payment', {
                              body: {
                                action: 'create_order',
                                amount: selectedTier.price,
                                order_id: paymentRecord.id,
                                customer_mobile: '0000000000',
                                redirect_url: window.location.origin,
                                remark1: `${product.name} - ${selectedTier.amount}`,
                                remark2: `Player: ${userId}${zoneId ? ` Zone: ${zoneId}` : ''}`,
                              }
                            });
                            if (error) throw error;
                            if (data?.success && data?.payment_url) {
                              window.open(data.payment_url, '_blank');
                              toast({
                                title: "Payment Initiated",
                                description: "Complete payment in the opened window.",
                              });
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
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={!selectedTier || isProcessing}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay UPI
                      </Button>
                      
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
        onOpenChange={setReceiptOpen}
        receipt={receiptData}
      />

      <Footer />
    </div>
  );
};

export default ProductDetail;
