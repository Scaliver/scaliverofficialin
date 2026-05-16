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
import { ArrowLeft, Coins, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CoinPackage { id: string; amount: number; bonus: number; sort_order: number; }

const AddCoin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { balance } = useWallet();
  const { toast } = useToast();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpiPaymentEnabled, setIsUpiPaymentEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("coin_packages")
        .select("id, amount, bonus, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      setPackages((data as CoinPackage[]) || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "upi_wallet_enabled")
        .maybeSingle();

      const value = data?.value as { enabled?: boolean } | null;
      setIsUpiPaymentEnabled(value?.enabled !== false);
    })();
  }, []);

  // Payment-callback redirect → verify with gateway, then redirect to wallet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentOrder = params.get("payment_order");
    if (!paymentOrder) return;
    window.history.replaceState({}, "", "/add-coin");
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("chuimei-payment", {
          body: { action: "verify_payment", order_id: paymentOrder },
        });
        if (data?.status === "completed") {
          toast({ title: "Payment Successful! ✅", description: `${data.total_coins ?? ""} coins added.`.trim() });
          setTimeout(() => navigate("/wallet"), 1200);
          return;
        }
      } catch {}
      pollPaymentStatus(paymentOrder);
    })();
  }, []);

  const pollPaymentStatus = async (orderId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke("chuimei-payment", {
          body: { action: "verify_payment", order_id: orderId },
        });
        if (data?.status === "completed") {
          clearInterval(interval);
          toast({ title: "Payment Successful! ✅", description: `${data.total_coins} coins added.` });
          setTimeout(() => navigate("/wallet"), 1500);
        } else if (data?.status === "failed") {
          clearInterval(interval);
          toast({ title: "Payment Failed", variant: "destructive", description: "Please try again." });
        }
      } catch {}
      if (attempts >= 60) clearInterval(interval);
    }, 5000);
  };

  if (authLoading) return <LoadingSpinner fullScreen size="lg" />;

  const getAmount = () => {
    if (selectedPackage !== null) return packages[selectedPackage]?.amount || 0;
    return parseInt(customAmount) || 0;
  };
  const getBonus = () => (selectedPackage !== null ? packages[selectedPackage]?.bonus || 0 : 0);
  const getTotalCoins = () => getAmount() + getBonus();

  const handlePay = async () => {
    const amount = getAmount();
    if (amount < 1) {
      toast({ title: "Minimum Amount", description: "Minimum recharge is ₹1", variant: "destructive" });
      return;
    }
    if (!user?.email) {
      toast({ title: "Login Required", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const { data: paymentRecord, error: insertError } = await supabase
        .from("upi_payment_requests").insert({
          user_id: user.id, user_email: user.email,
          request_type: "coin_recharge",
          amount, total_coins: getTotalCoins(), bonus_coins: getBonus(),
          utr_number: `CHUIMEI-${Date.now()}`, status: "pending",
        }).select().single();
      if (insertError) throw insertError;

      const { data, error } = await supabase.functions.invoke("chuimei-payment", {
        body: {
          action: "create_order", amount, order_id: paymentRecord.id,
          customer_mobile: "0000000000",
          redirect_url: window.location.origin,
          remark1: `Coin recharge - ${getTotalCoins()} coins`,
          remark2: user.email,
        },
      });
      if (error) throw error;

      if (data?.success && data?.payment_url) {
        window.open(data.payment_url, "_blank");
        toast({ title: "Payment Initiated", description: "Coins credit automatically after payment." });
        pollPaymentStatus(paymentRecord.id);
      } else {
        throw new Error(data?.error || "Failed to create payment order");
      }
    } catch (e) {
      toast({ title: "Payment Error", variant: "destructive", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

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

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg font-display">Select Package</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {packages.map((pkg, index) => (
                <button
                  key={pkg.id}
                  onClick={() => { setSelectedPackage(index); setCustomAmount(""); }}
                  className={`p-4 rounded-xl border-2 transition-all ${selectedPackage === index ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="text-xl font-bold">{pkg.amount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">₹{pkg.amount}</p>
                  {pkg.bonus > 0 && <p className="text-xs text-green-500 mt-1">+{pkg.bonus} bonus</p>}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Label htmlFor="customAmount">Or enter custom amount (₹)</Label>
              <Input
                id="customAmount" type="number" placeholder="Enter amount (min ₹1)"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedPackage(null); }}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {getAmount() > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>₹{getAmount()}</span></div>
              {getBonus() > 0 && (
                <div className="flex justify-between text-green-500"><span>Bonus Coins</span><span>+{getBonus()}</span></div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total Coins</span>
                <div className="flex items-center gap-1"><Coins className="w-4 h-4 text-yellow-500" /><span>{getTotalCoins()}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {getAmount() >= 1 && isUpiPaymentEnabled && (
          <Button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-primary to-red-600 hover:opacity-90"
            size="lg"
          >
            {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><CreditCard className="w-4 h-4 mr-2" /> Pay UPI ₹{getAmount()}</>}
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground mt-3">
          {isUpiPaymentEnabled ? "Coins are credited automatically after payment confirmation." : "UPI payments are temporarily unavailable."}
        </p>
      </main>
      <Footer />
      <QuickActions />
    </div>
  );
};

export default AddCoin;
