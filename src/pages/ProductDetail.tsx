import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Check, AlertCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getProductById, PricingTier } from "@/data/products";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const product = getProductById(productId || "");
  
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [contactNumber, setContactNumber] = useState("");

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

  const handleOrder = () => {
    if (!selectedTier) {
      toast({
        title: "Select a pack",
        description: "Please select a pricing option to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!userId.trim()) {
      toast({
        title: "User ID required",
        description: "Please enter your User ID / Player ID.",
        variant: "destructive",
      });
      return;
    }

    if (!contactNumber.trim()) {
      toast({
        title: "Contact number required",
        description: "Please enter your WhatsApp number for order updates.",
        variant: "destructive",
      });
      return;
    }

    // Create WhatsApp message
    const message = encodeURIComponent(
      `🎮 *New Order - Scaliver Official*\n\n` +
      `📦 Product: ${product.name}\n` +
      `💎 Pack: ${selectedTier.amount}\n` +
      `💰 Price: ₹${selectedTier.price}\n` +
      `🆔 User ID: ${userId}\n` +
      `${zoneId ? `🌐 Zone ID: ${zoneId}\n` : ""}` +
      `📱 Contact: ${contactNumber}`
    );

    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/911234567890?text=${message}`, "_blank");

    toast({
      title: "Order Initiated!",
      description: "You'll be redirected to WhatsApp to complete your order.",
    });
  };

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
                  {product.name}
                </h1>
                <p className="font-body text-muted-foreground">
                  {product.description}
                </p>
              </div>

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

              {/* User Details Form */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Enter Your Details
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId" className="font-body text-foreground">
                      User ID / Player ID *
                    </Label>
                    <Input
                      id="userId"
                      placeholder="Enter your ID"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zoneId" className="font-body text-foreground">
                      Zone ID (if applicable)
                    </Label>
                    <Input
                      id="zoneId"
                      placeholder="Enter zone ID"
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact" className="font-body text-foreground">
                    WhatsApp Number *
                  </Label>
                  <Input
                    id="contact"
                    placeholder="Enter your WhatsApp number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="bg-secondary border-border"
                  />
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

              {/* Order Button */}
              <Button 
                variant="gaming" 
                size="lg" 
                className="w-full text-lg py-6"
                onClick={handleOrder}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Order via WhatsApp
              </Button>

              <p className="text-center font-body text-sm text-muted-foreground">
                You'll be redirected to WhatsApp to complete your order
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
