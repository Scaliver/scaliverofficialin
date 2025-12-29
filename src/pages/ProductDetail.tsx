import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check, AlertCircle, Wallet, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getProductById, getInstagramProductsByCategory, PricingTier, InstagramSubCategory } from "@/data/products";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TransactionReceipt from "@/components/TransactionReceipt";
import InstagramCategorySelector, { InstagramCategory } from "@/components/InstagramCategorySelector";

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

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, wallet } = useWallet();
  
  const baseProduct = getProductById(productId || "");
  const isInstagramMainProduct = productId === "instagram";
  
  const [selectedCategory, setSelectedCategory] = useState<InstagramCategory>("followers");
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Get the active product based on category selection for Instagram
  const product = useMemo(() => {
    if (isInstagramMainProduct) {
      return getInstagramProductsByCategory(selectedCategory as InstagramSubCategory) || baseProduct;
    }
    return baseProduct;
  }, [isInstagramMainProduct, selectedCategory, baseProduct]);

  // Reset selected tier when category changes
  useEffect(() => {
    setSelectedTier(null);
  }, [selectedCategory]);

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

    return true;
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

      // If this is a social media product with SMM service ID, place order via SMM API
      if (product.isSocialMedia && selectedTier.smmServiceId && selectedTier.quantity) {
        try {
          const { data: smmData, error: smmError } = await supabase.functions.invoke('smm-order', {
            body: {
              action: 'order',
              service: selectedTier.smmServiceId,
              link: userId, // For social media, userId field contains the profile/post URL
              quantity: selectedTier.quantity,
            }
          });

          if (smmError) throw smmError;

          if (smmData.error) {
            // Update order status to failed
            await supabase
              .from("orders")
              .update({ status: "failed" })
              .eq("id", orderData.id);
            
            throw new Error(smmData.error);
          }

          // Update order with SMM order ID
          await supabase
            .from("orders")
            .update({ 
              status: "processing",
              zone_id: smmData.order ? `SMM#${smmData.order}` : zoneId 
            })
            .eq("id", orderData.id);

          console.log("SMM Order placed:", smmData);
        } catch (smmApiError) {
          console.error("SMM API Error:", smmApiError);
          toast({
            title: "Warning",
            description: "Order created but SMM processing failed. Our team will process manually.",
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

  const handleUPIPayment = () => {
    if (!validateForm() || !selectedTier) return;

    toast({
      title: "UPI Payment",
      description: "Please contact us to complete your UPI payment.",
    });
    
    const message = encodeURIComponent(
      `🎮 *UPI Payment Request - Scaliver Official*\n\n` +
      `📦 Product: ${product.name}\n` +
      `💎 Pack: ${selectedTier.amount}\n` +
      `💰 Price: ₹${selectedTier.price}\n` +
      `🆔 Player ID: ${userId}\n` +
      `${zoneId ? `🌐 Zone/Server: ${zoneId}\n` : ""}\n` +
      `I want to pay via UPI.`
    );

    window.open(`https://wa.me/911234567890?text=${message}`, "_blank");
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
              {product.instructions && (
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
                  {isInstagramMainProduct ? "INSTAGRAM SERVICE" : product.name}
                </h1>
                <p className="font-body text-muted-foreground">
                  {isInstagramMainProduct 
                    ? "Boost your Instagram presence with followers, likes, views, comments, and saves."
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

              {/* User Details Form - MOVED TO TOP */}
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
                        placeholder="Enter server/zone ID"
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Balance Card (if logged in) */}
              {user && (
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-primary" />
                      <span className="font-body text-foreground">Wallet Balance</span>
                    </div>
                    <span className="font-display text-xl font-bold text-primary">₹{balance.toFixed(2)}</span>
                  </div>
                  {selectedTier && balance < selectedTier.price && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Need ₹{(selectedTier.price - balance).toFixed(2)} more for this pack.{" "}
                      <button 
                        onClick={() => navigate("/add-coin")}
                        className="text-primary hover:underline"
                      >
                        Add coins
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* Pricing Tiers */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Select Pack
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.pricingTiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedTier?.id === tier.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 bg-secondary/50"
                      }`}
                    >
                      {selectedTier?.id === tier.id && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      {tier.bonus && (
                        <Badge variant="secondary" className="mb-2 text-xs bg-accent/20 text-accent">
                          {tier.bonus}
                        </Badge>
                      )}
                      <p className="font-display font-bold text-foreground text-sm">
                        {tier.amount}
                      </p>
                      <p className="font-display text-xl font-bold text-primary mt-1">
                        ₹{tier.price}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              {selectedTier && (
                <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-xl p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">
                    Order Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between font-body">
                      <span className="text-muted-foreground">Product</span>
                      <span className="text-foreground">{product.name}</span>
                    </div>
                    <div className="flex justify-between font-body">
                      <span className="text-muted-foreground">Pack</span>
                      <span className="text-foreground">{selectedTier.amount}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between font-display font-bold text-lg">
                        <span className="text-foreground">Total</span>
                        <span className="text-primary">₹{selectedTier.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Buttons */}
              <div className="space-y-3">
                {user && (
                  <Button 
                    variant="gaming" 
                    size="lg" 
                    className="w-full text-lg py-6"
                    onClick={handleWalletPayment}
                    disabled={!canPayWithWallet || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5 mr-2" />
                        Pay with Coins {selectedTier ? `(₹${selectedTier.price})` : ""}
                      </>
                    )}
                  </Button>
                )}
                
                <Button 
                  variant={user ? "outline" : "gaming"} 
                  size="lg" 
                  className="w-full text-lg py-6"
                  onClick={handleUPIPayment}
                  disabled={isProcessing}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay with UPI
                </Button>
              </div>

              {!user && (
                <p className="text-center font-body text-sm text-muted-foreground">
                  <button 
                    onClick={() => navigate("/auth")}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                  {" "}to pay with wallet balance
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Transaction Receipt Dialog */}
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