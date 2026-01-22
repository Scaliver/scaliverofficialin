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
  
  // Recharge mode: 'automatic' or 'manual'
  const [rechargeMode, setRechargeMode] = useState<'automatic' | 'manual'>('automatic');
  
  // Player verification state
  const [playerInfo, setPlayerInfo] = useState<{ nickname: string; region: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isPlayerVerified, setIsPlayerVerified] = useState(false);
  const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track which API type to use for this product
  const [productApiType, setProductApiType] = useState<'smileone' | 'gametopup' | null>(null);
  const [productApiId, setProductApiId] = useState<string | null>(null);

  // Get the active product based on category selection for Instagram, Facebook, or TikTok
  const product = useMemo((): LegacyProduct | undefined => {
    if (isInstagramMainProduct) {
      return getProductBySubCategory(selectedCategory) || baseProduct;
    }
    if (isFacebookMainProduct) {
      return getProductBySubCategory(selectedFbCategory) || baseProduct;
    }
    if (isTikTokMainProduct) {
      return getProductBySubCategory(selectedTikTokCategory) || baseProduct;
    }
    return baseProduct;
  }, [isInstagramMainProduct, isFacebookMainProduct, isTikTokMainProduct, selectedCategory, selectedFbCategory, selectedTikTokCategory, baseProduct, getProductBySubCategory]);

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
          setProductApiType(data.api_type as 'smileone' | 'gametopup');
          setProductApiId(data.id);
        }
      } catch (err) {
        console.error('Failed to fetch API type:', err);
      }
    };
    
    fetchApiType();
  }, [product?.pricingTiers]);

  // Determine productType based on product slug for SmileOne API
  // Note: For validation, we always use 'mobilelegends' or 'mobilelegendsbrazil'
  // since SmileOne validates MLBB accounts the same way
  const getSmileOneProductType = useCallback((productSlug?: string): string => {
    if (!productSlug) return 'mobilelegends';
    if (productSlug.includes('brazil')) return 'mobilelegendsbrazil';
    // For weekly pass, starlight, etc. - still use mobilelegends for validation
    return 'mobilelegends';
  }, []);

  // Player verification function - supports both SmileOne and Game Top-Up APIs
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
        // Use SmileOne API for validation (default)
        const productType = getSmileOneProductType(productSlug);
        const result = await supabase.functions.invoke('smileone-order', {
          body: { action: 'validate', userId: playerId, zoneId: zone, productType }
        });
        data = result.data;
        error = result.error;
        
        if (error) throw error;
        
        if (data.code === 200 && data.username) {
          setPlayerInfo({
            nickname: data.username,
            region: data.zone_name || data.region || 'Unknown'
          });
          setIsPlayerVerified(true);
        } else {
          setVerificationError(data.message || 'Invalid Player ID or Zone ID');
        }
      }
    } catch (err) {
      console.error('Player verification error:', err);
      setVerificationError('Verification failed. Please check your details.');
    } finally {
      setIsVerifying(false);
    }
  }, [productApiType, productApiId, getSmileOneProductType]);

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

    if (!userId.trim()) {
      toast({
        title: "Player ID required",
        description: "Please enter your Player ID.",
        variant: "destructive",
      });
      return false;
    }

    // For MLBB products in automatic mode, require player verification
    const isMLBBProduct = product?.category === 'Mobile Legends' && !product?.isSocialMedia;
    if (isMLBBProduct && rechargeMode === 'automatic' && !isPlayerVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify your Player ID and Zone ID before placing an order, or switch to Manual mode.",
        variant: "destructive",
      });
      return false;
    }

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

      // For manual mode, skip API calls and mark for manual processing
      if (rechargeMode === 'manual') {
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
          paymentMethod: "Wallet Balance",
          status: "Manual Recharge",
          isManual: true,
        });
      }
      // Check if this tier has a provider linked and we're in automatic mode
      else if (selectedTier.providerId && selectedTier.providerProductId) {
        try {
          // First, determine the provider's API type
          const { data: apiData, error: apiError } = await supabase
            .from('smm_apis')
            .select('api_type')
            .eq('id', selectedTier.providerId)
            .single();

          if (apiError) {
            console.error('Failed to fetch API type:', apiError);
          }

          const apiType = apiData?.api_type || 'smileone';

          if (apiType === 'gametopup') {
            // Use Game Top-Up API (x-api-key header)
            const { data: gametopupData, error: gametopupError } = await supabase.functions.invoke('gametopup-order', {
              body: {
                action: 'order',
                apiId: selectedTier.providerId,
                playerId: userId,
                zoneId: zoneId,
                productId: selectedTier.providerProductId,
                currency: 'INR',
              }
            });

            if (gametopupError) throw gametopupError;

            if (gametopupData.error || !gametopupData.success) {
              await supabase
                .from("orders")
                .update({ status: "failed" })
                .eq("id", orderData.id);
              
              throw new Error(gametopupData.message || gametopupData.error || 'Game Top-Up order failed');
            }

            // Update order with Game Top-Up order ID
            await supabase
              .from("orders")
              .update({ 
                status: "processing",
                smm_order_id: gametopupData.order_id ? String(gametopupData.order_id) : null 
              })
              .eq("id", orderData.id);

            // Send WhatsApp notification for successful auto order
            sendWhatsAppNotification({
              orderId: orderData.id,
              productName: product.name,
              amount: selectedTier.amount,
              price: selectedTier.price,
              playerId: userId,
              zoneId: zoneId || undefined,
              playerName: playerInfo?.nickname,
              paymentMethod: "Wallet Balance",
              status: "Auto Processing",
            });

            console.log("Game Top-Up Order placed:", gametopupData);
          } else {
            // Use SmileOne API (default)
            const productType = getSmileOneProductType(product.slug);
            const { data: smileoneData, error: smileoneError } = await supabase.functions.invoke('smileone-order', {
              body: {
                action: 'order',
                apiId: selectedTier.providerId,
                userId: userId,
                zoneId: zoneId,
                productId: selectedTier.providerProductId,
                productType,
              }
            });

            if (smileoneError) throw smileoneError;

            if (smileoneData.error || smileoneData.code !== 200) {
              await supabase
                .from("orders")
                .update({ status: "failed" })
                .eq("id", orderData.id);
              
              throw new Error(smileoneData.message || smileoneData.error || 'SmileOne order failed');
            }

            // Update order with SmileOne order ID
            await supabase
              .from("orders")
              .update({ 
                status: "processing",
                smm_order_id: smileoneData.order_id ? String(smileoneData.order_id) : null 
              })
              .eq("id", orderData.id);

            // Send WhatsApp notification for successful auto order
            sendWhatsAppNotification({
              orderId: orderData.id,
              productName: product.name,
              amount: selectedTier.amount,
              price: selectedTier.price,
              playerId: userId,
              zoneId: zoneId || undefined,
              playerName: playerInfo?.nickname,
              paymentMethod: "Wallet Balance",
              status: "Auto Processing",
            });

            console.log("SmileOne Order placed:", smileoneData);
          }
        } catch (providerError) {
          console.error("Provider API Error:", providerError);
          
          // Update order status to pending_manual for manual processing
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

      // Deduct from wallet
      const newBalance = balance - selectedTier.price;
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Record transaction
      const { error: txError } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: user.id,
          amount: selectedTier.price,
          type: "debit",
          description: `Purchase: ${product.name} - ${selectedTier.amount}`,
        });

      if (txError) throw txError;

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

              {/* Recharge Mode Selector - Only for non-social media products */}
              {!product.isSocialMedia && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-display text-sm font-bold text-foreground mb-3">Recharge Mode</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRechargeMode('automatic')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        rechargeMode === 'automatic'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary/50 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className={`w-5 h-5 ${rechargeMode === 'automatic' ? 'text-primary' : ''}`} />
                        <span className="font-display text-sm font-bold">Automatic</span>
                        <span className="text-xs text-muted-foreground">Instant delivery</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setRechargeMode('manual')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        rechargeMode === 'manual'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                          : 'border-border bg-secondary/50 text-muted-foreground hover:border-orange-500/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <AlertCircle className={`w-5 h-5 ${rechargeMode === 'manual' ? 'text-orange-500' : ''}`} />
                        <span className="font-display text-sm font-bold">Manual</span>
                        <span className="text-xs text-muted-foreground">Admin will process</span>
                      </div>
                    </button>
                  </div>
                  {rechargeMode === 'manual' && (
                    <p className="text-xs text-orange-500 mt-2 text-center">
                      No username verification required. Order will be sent to admin for manual processing.
                    </p>
                  )}
                </div>
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
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    
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
                    
                    {/* Manual mode notice */}
                    {product.category === 'Mobile Legends' && rechargeMode === 'manual' && (
                      <div className="mt-3 flex items-center gap-2 text-orange-500 bg-orange-500/10 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Username verification skipped. Order will be processed manually by admin.</span>
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

              {/* UPI Payment Section */}
              {showUpiPayment && selectedTier && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    UPI Payment
                  </h3>
                  
                  <div className="flex flex-col items-center gap-4">
                    <img 
                      src={upiQrImage} 
                      alt="UPI QR Code" 
                      className="w-48 h-48 rounded-xl border border-border"
                    />
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Or pay to UPI ID:</p>
                      <div className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2">
                        <span className="font-mono text-foreground">{UPI_ID}</span>
                        <button onClick={copyUpiId} className="text-primary hover:text-accent">
                          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="w-full space-y-2">
                      <Label htmlFor="utr" className="font-body text-foreground">
                        Enter UTR Number after payment
                      </Label>
                      <Input
                        id="utr"
                        placeholder="Enter 12-digit UTR number"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>

                    <Button 
                      onClick={handleSubmitUPIPayment}
                      className="w-full"
                      disabled={!utrNumber.trim()}
                    >
                      Submit Order
                    </Button>
                  </div>
                </div>
              )}

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
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleUPIPayment}
                        disabled={!selectedTier || isProcessing}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay with UPI
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
