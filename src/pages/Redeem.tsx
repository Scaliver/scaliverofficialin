import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Gift, Loader2, Coins } from "lucide-react";

interface Redemption {
  id: string;
  coins_credited: number;
  redeemed_at: string;
  code_id: string;
}

const Redeem = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Redemption[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("redeem_code_redemptions")
      .select("id, coins_credited, redeemed_at, code_id")
      .eq("user_id", user.id)
      .order("redeemed_at", { ascending: false });
    setHistory((data as Redemption[]) || []);
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("redeem_code", { _code: code.trim() });
      if (error) throw error;
      const result = data as { success: boolean; coins?: number; message: string };
      if (result.success) {
        toast({ title: "Redeemed! 🎉", description: `${result.coins} coins added to your wallet.` });
        setCode("");
        fetchHistory();
      } else {
        toast({ title: "Cannot redeem", description: result.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to redeem", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (authLoading) return <LoadingSpinner fullScreen size="lg" />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="mb-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display"><Gift className="w-5 h-5 text-primary" /> Redeem Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Enter your redeem code</Label>
              <Input
                id="code"
                placeholder="e.g. WELCOME50"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono tracking-wider text-center text-lg"
                maxLength={32}
              />
            </div>
            <Button
              onClick={handleRedeem}
              disabled={submitting || !code.trim()}
              className="w-full bg-gradient-to-r from-primary to-red-600 hover:opacity-90"
              size="lg"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
              Redeem Code
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-display">Your Redemption History</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No codes redeemed yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">Code redeemed</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.redeemed_at).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-500 font-bold">
                      <Coins className="w-4 h-4" /> +{h.coins_credited}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
      <QuickActions />
    </div>
  );
};

export default Redeem;
