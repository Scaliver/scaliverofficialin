import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

type State = "checking" | "success" | "failed";

const PaymentDetect = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const paymentId = params.get("id") || params.get("payment_order");

  const [state, setState] = useState<State>("checking");
  const [attempts, setAttempts] = useState(0);
  const [requestType, setRequestType] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    let tries = 0;

    const finish = (target: string, ms = 1200) => {
      setTimeout(() => {
        if (!cancelled) navigate(target, { replace: true });
      }, ms);
    };

    const tick = async () => {
      tries++;
      setAttempts(tries);
      try {
        const { data } = await supabase.functions.invoke("chuimei-payment", {
          body: { action: "verify_payment", order_id: paymentId },
        });
        if (cancelled) return;
        const rt = data?.request_type as string | undefined;
        if (rt) setRequestType(rt);

        if (data?.status === "completed" || data?.status === "processing" || data?.has_order) {
          setState("success");
          toast({
            title: "Payment Successful ✅",
            description: rt === "coin_recharge"
              ? `${data?.total_coins ?? ""} coins added to your wallet.`.trim()
              : "Your order has been placed and is being processed.",
          });
          finish(rt === "coin_recharge" ? "/wallet" : "/orders");
          return;
        }
        if (data?.status === "failed") {
          setState("failed");
          toast({ title: "Payment Failed", description: "Please try again.", variant: "destructive" });
          finish(rt === "coin_recharge" ? "/add-coin" : "/orders", 2000);
          return;
        }
      } catch (e) {
        console.error("verify_payment error", e);
      }
      if (tries < 36 && !cancelled) setTimeout(tick, 3000);
      else if (!cancelled) {
        setState("failed");
        toast({ title: "Verification Timed Out", description: "Check your orders shortly.", variant: "destructive" });
        finish(requestType === "coin_recharge" ? "/wallet" : "/orders", 2000);
      }
    };

    tick();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Verifying Payment | Scaliver Official</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-md border border-border bg-card rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-lg">
          {state === "checking" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Detecting your UPI payment
              </h1>
              <p className="text-sm text-muted-foreground">
                Verifying with the payment gateway and preparing your order. This usually takes 5–15 seconds.
              </p>
              <p className="text-xs text-muted-foreground">Check #{attempts}</p>
            </>
          )}
          {state === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Payment Confirmed</h1>
              <p className="text-sm text-muted-foreground">Redirecting you now…</p>
            </>
          )}
          {state === "failed" && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-destructive" />
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Payment Not Confirmed</h1>
              <p className="text-sm text-muted-foreground">If you were charged, it will reflect within a few minutes.</p>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => navigate("/orders")}>View Orders</Button>
                <Button variant="outline" onClick={() => navigate("/wallet")}>View Wallet</Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentDetect;
