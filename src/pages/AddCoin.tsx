import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Coins, CreditCard, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const coinPackages = [
  { amount: 50, bonus: 0 },
  { amount: 100, bonus: 5 },
  { amount: 200, bonus: 15 },
  { amount: 500, bonus: 50 },
  { amount: 1000, bonus: 150 },
  { amount: 2000, bonus: 400 },
];

const AddCoin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { balance } = useWallet();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | null>(null);
  const [upiId, setUpiId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  const getAmount = () => {
    if (selectedPackage !== null) {
      return coinPackages[selectedPackage].amount;
    }
    return parseInt(customAmount) || 0;
  };

  const getBonus = () => {
    if (selectedPackage !== null) {
      return coinPackages[selectedPackage].bonus;
    }
    const amount = parseInt(customAmount) || 0;
    if (amount >= 2000) return Math.floor(amount * 0.2);
    if (amount >= 1000) return Math.floor(amount * 0.15);
    if (amount >= 500) return Math.floor(amount * 0.1);
    if (amount >= 200) return Math.floor(amount * 0.075);
    if (amount >= 100) return Math.floor(amount * 0.05);
    return 0;
  };

  const getTotalCoins = () => getAmount() + getBonus();

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please select a payment method to continue",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "upi" && !upiId) {
      toast({
        title: "Enter UPI ID",
        description: "Please enter your UPI ID to continue",
        variant: "destructive",
      });
      return;
    }

    const amount = getAmount();
    if (amount < 10) {
      toast({
        title: "Minimum Amount",
        description: "Minimum recharge amount is ₹10",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing - In production, integrate actual payment gateway
    toast({
      title: "Payment Initiated",
      description: `Processing payment of ₹${amount}. You will receive ${getTotalCoins()} coins after successful payment.`,
    });

    // For demo, we'll show a message that payment is pending admin approval
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Payment Pending",
        description: "Your payment request has been submitted. Coins will be credited after admin verification.",
      });
      navigate("/wallet");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Current Balance */}
        <Card className="mb-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Balance</span>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{balance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coin Packages */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-display">Select Package</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {coinPackages.map((pkg, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedPackage(index);
                    setCustomAmount("");
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedPackage === index
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="text-xl font-bold">{pkg.amount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">₹{pkg.amount}</p>
                  {pkg.bonus > 0 && (
                    <p className="text-xs text-green-500 mt-1">+{pkg.bonus} bonus</p>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Label htmlFor="customAmount">Or enter custom amount (₹)</Label>
              <Input
                id="customAmount"
                type="number"
                placeholder="Enter amount (min ₹10)"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedPackage(null);
                }}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-display">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setPaymentMethod("upi")}
                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === "upi"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span>UPI</span>
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Card</span>
              </button>
            </div>

            {paymentMethod === "upi" && (
              <div>
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="Enter your UPI ID (e.g., name@upi)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            {paymentMethod === "card" && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Card payment integration coming soon. Please use UPI for now.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {getAmount() > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span>₹{getAmount()}</span>
                </div>
                {getBonus() > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Bonus Coins</span>
                    <span>+{getBonus()}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total Coins</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span>{getTotalCoins()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pay Button */}
        <Button
          onClick={handlePayment}
          disabled={getAmount() < 10 || isProcessing}
          className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90"
          size="lg"
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              Pay ₹{getAmount()} & Get {getTotalCoins()} Coins
            </>
          )}
        </Button>
      </main>

      <Footer />
      <QuickActions />
    </div>
  );
};

export default AddCoin;
