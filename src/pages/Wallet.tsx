import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Wallet as WalletIcon, Coins, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect } from "react";

const Wallet = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { balance, transactions, isLoading } = useWallet();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Balance Card */}
        <Card className="mb-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Your Balance</p>
                <div className="flex items-center gap-2">
                  <Coins className="w-8 h-8 text-yellow-500" />
                  <span className="text-4xl font-display font-bold text-foreground">
                    {balance}
                  </span>
                  <span className="text-muted-foreground">coins</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  ≈ ₹{balance} (1 coin = ₹1)
                </p>
              </div>
              <WalletIcon className="w-16 h-16 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        {/* Add Coins Button */}
        <Button
          onClick={() => navigate("/add-coin")}
          className="w-full mb-6 bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90"
          size="lg"
        >
          <Coins className="w-5 h-5 mr-2" />
          Add Coins
        </Button>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      {tx.type === "credit" ? (
                        <div className="p-2 rounded-full bg-green-500/20">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-red-500/20">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold ${
                        tx.type === "credit" ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "-"}{tx.amount}
                    </span>
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

export default Wallet;
