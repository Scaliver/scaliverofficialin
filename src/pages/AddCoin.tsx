import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Coins, Copy, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import upiQrImage from "@/assets/upi-qr.jpeg";

const coinPackages = [
  { amount: 1, bonus: 0 },
  { amount: 50, bonus: 0 },
  { amount: 100, bonus: 5 },
  { amount: 200, bonus: 15 },
  { amount: 500, bonus: 50 },
  { amount: 1000, bonus: 150 },
  { amount: 2000, bonus: 400 },
];

const UPI_ID = "7637851804@pthdfc";
const WHATSAPP_NUMBER = "917637851804";

const AddCoin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { balance } = useWallet();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'chuimei' | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Check URL params for payment callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentOrder = params.get('payment_order');
    const status = params.get('status');
    
    if (paymentOrder) {
      // Clean URL
      window.history.replaceState({}, '', '/add-coin');
      // Always verify with the gateway after redirect — don't trust the URL status alone.
      (async () => {
        try {
          const { data } = await supabase.functions.invoke('chuimei-payment', {
            body: { action: 'verify_payment', order_id: paymentOrder },
          });
          if (data?.status === 'completed') {
            toast({
              title: "Payment Successful! ✅",
              description: `${data.total_coins ?? ''} coins added to your wallet.`.trim(),
            });
            setTimeout(() => navigate('/wallet'), 1200);
            return;
          }
        } catch {}
        // Not yet confirmed — keep polling
        pollPaymentStatus(paymentOrder);
      })();
    }
  }, []);

  if (authLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
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

  const handleSubmitPayment = async () => {
    const amount = getAmount();
    if (amount < 1) {
      toast({
        title: "Minimum Amount",
        description: "Minimum recharge amount is ₹1",
        variant: "destructive",
      });
      return;
    }

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

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("upi_payment_requests")
        .insert({
          user_id: user?.id,
          user_email: user?.email,
          request_type: "coin_recharge",
          amount: amount,
          total_coins: getTotalCoins(),
          bonus_coins: getBonus(),
          utr_number: utrNumber.trim(),
          status: "pending",
        });

      if (error) throw error;

      const message = encodeURIComponent(
        `💰 *COIN RECHARGE REQUEST - Scaliver Official*\n\n` +
        `📧 User Email: ${user?.email || "N/A"}\n` +
        `💵 Amount Paid: ₹${amount}\n` +
        `🪙 Total Coins: ${getTotalCoins()} (including ${getBonus()} bonus)\n` +
        `🔢 UTR Number: ${utrNumber.trim()}\n\n` +
        `Please verify and credit coins.`
      );

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");

      toast({
        title: "Payment Submitted",
        description: "Your payment details have been sent. Coins will be credited after verification.",
      });

      setUtrNumber("");
      setPaymentMethod(null);
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast({
        title: "Error",
        description: "Failed to submit payment request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for 5 minutes
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke('chuimei-payment', {
          body: { action: 'verify_payment', order_id: orderId }
        });
        if (data?.status === 'completed') {
          clearInterval(interval);
          toast({
            title: "Payment Successful! ✅",
            description: `${data.total_coins} coins added. Redirecting to wallet...`,
          });
          setTimeout(() => navigate('/wallet'), 1500);
        } else if (data?.status === 'failed') {
          clearInterval(interval);
          toast({
            title: "Payment Failed",
            description: "Payment was not completed. Please try again.",
            variant: "destructive",
          });
        }
      } catch {
        // continue polling
      }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 5000);
  };

  const handleChuimeiPayment = async () => {
    const amount = getAmount();
    if (amount < 1) {
      toast({
        title: "Minimum Amount",
        description: "Minimum recharge amount is ₹1",
        variant: "destructive",
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Login Required",
        description: "Please login to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: paymentRecord, error: insertError } = await supabase
        .from("upi_payment_requests")
        .insert({
          user_id: user.id,
          user_email: user.email,
          request_type: "coin_recharge",
          amount: amount,
          total_coins: getTotalCoins(),
          bonus_coins: getBonus(),
          utr_number: `CHUIMEI-${Date.now()}`,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data, error } = await supabase.functions.invoke('chuimei-payment', {
        body: {
          action: 'create_order',
          amount: amount,
          order_id: paymentRecord.id,
          customer_mobile: '0000000000',
          redirect_url: window.location.origin + '/add-coin',
          remark1: `Coin recharge - ${getTotalCoins()} coins`,
          remark2: user.email,
        }
      });

      if (error) throw error;

      if (data?.success && data?.payment_url) {
        window.open(data.payment_url, '_blank');
        toast({
          title: "Payment Initiated",
          description: "Complete payment in the opened window. Coins will be credited automatically after confirmation.",
        });
        // Start polling for payment status
        pollPaymentStatus(paymentRecord.id);
      } else {
        throw new Error(data?.error || 'Failed to create payment order');
      }
    } catch (error) {
      console.error("Chuimei payment error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment. Please try UPI QR.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
                placeholder="Enter amount (min ₹1)"
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

        {/* Payment Method Selection */}
        {getAmount() >= 1 && !paymentMethod && (
          <div className="space-y-3 mb-6">
            <h3 className="font-display text-lg font-bold text-foreground text-center">Choose Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => setPaymentMethod('chuimei')}
              >
                <CreditCard className="w-6 h-6 text-primary" />
                <span className="font-display font-bold">Pay UPI</span>
                <span className="text-xs text-muted-foreground">Instant • Min ₹1</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => setPaymentMethod('upi')}
              >
                <Copy className="w-6 h-6 text-primary" />
                <span className="font-display font-bold">UPI QR</span>
                <span className="text-xs text-muted-foreground">Manual • Min ₹1</span>
              </Button>
            </div>
          </div>
        )}

        {/* Online Payment (Chuimei-pe) */}
        {paymentMethod === 'chuimei' && getAmount() >= 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-display text-center">Pay UPI ₹{getAmount()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                You'll be redirected to a secure payment page to complete your payment.
              </p>
              <Button
                onClick={handleChuimeiPayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ₹{getAmount()} Online
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setPaymentMethod(null)}
              >
                ← Choose different method
              </Button>
            </CardContent>
          </Card>
        )}

        {/* UPI QR Code Section */}
        {paymentMethod === 'upi' && getAmount() >= 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-display text-center">Scan & Pay ₹{getAmount()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl">
                  <img 
                    src={upiQrImage} 
                    alt="UPI QR Code" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">UPI ID:</span>
                <code className="bg-secondary px-3 py-1 rounded text-sm font-mono">{UPI_ID}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyUpiId}
                  className="p-2 h-auto"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Scan with any UPI app (GPay, PhonePe, Paytm, etc.)
              </p>

              <div className="space-y-2 pt-4 border-t border-border">
                <Label htmlFor="utrNumber" className="font-medium">
                  Enter UTR Number *
                </Label>
                <Input
                  id="utrNumber"
                  placeholder="Enter 12-digit UTR from payment confirmation"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="text-center font-mono tracking-wider"
                  maxLength={22}
                />
                <p className="text-xs text-muted-foreground text-center">
                  You'll find UTR/Reference number in your payment confirmation
                </p>
              </div>

              <Button
                onClick={handleSubmitPayment}
                disabled={isProcessing || !utrNumber.trim()}
                className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90"
                size="lg"
              >
                {isProcessing ? "Submitting..." : `Submit Payment (₹${getAmount()})`}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setPaymentMethod(null)}
              >
                ← Choose different method
              </Button>
            </CardContent>
          </Card>
        )}
        
        <p className="text-center text-xs text-muted-foreground mt-3">
          Coins will be credited within 10-30 minutes after verification
        </p>
      </main>

      <Footer />
      <QuickActions />
    </div>
  );
};

export default AddCoin;
