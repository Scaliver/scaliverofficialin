import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, History as HistoryIcon, TrendingUp, TrendingDown, Package } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface Order {
  id: string;
  product_name: string;
  amount: string;
  price: number;
  status: string;
  created_at: string;
}

const History = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { transactions, isLoading: walletLoading } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, navigate]);

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("orders")
      .select("id, product_name, amount, price, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || isLoading || walletLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

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

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-display flex items-center gap-2">
              <HistoryIcon className="w-6 h-6" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="coins" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="coins">Coin Transactions</TabsTrigger>
                <TabsTrigger value="orders">Order History</TabsTrigger>
              </TabsList>

              <TabsContent value="coins" className="mt-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No coin transactions yet</p>
                    <Button
                      onClick={() => navigate("/add-coin")}
                      className="mt-4"
                      variant="outline"
                    >
                      Add Coins
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          {tx.type === "credit" ? (
                            <div className="p-2 rounded-full bg-green-500/20">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-full bg-red-500/20">
                              <TrendingDown className="w-5 h-5 text-red-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-lg font-bold ${
                            tx.type === "credit" ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}{tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="orders" className="mt-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No orders yet</p>
                    <Button
                      onClick={() => navigate("/")}
                      className="mt-4"
                      variant="outline"
                    >
                      Browse Products
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/20">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{order.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.amount} • {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">₹{order.price}</p>
                          <p className={`text-xs ${
                            order.status === "completed" ? "text-green-500" :
                            order.status === "cancelled" ? "text-red-500" :
                            "text-yellow-500"
                          }`}>
                            {order.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />
      <QuickActions />
    </div>
  );
};

export default History;
