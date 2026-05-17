import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

interface Order {
  id: string;
  product_name: string;
  product_id: string;
  amount: string;
  price: number;
  status: string;
  user_game_id: string;
  zone_id: string | null;
  smm_order_id: string | null;
  contact_number: string;
  created_at: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchOrders();

      // Real-time subscription
      const channel = supabase
        .channel("user-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, authLoading, navigate]);

  // After Pay UPI redirect, verify the payment with the gateway and refresh orders.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentOrder = params.get("payment_order");
    if (!paymentOrder) return;
    params.delete("payment_order");
    params.delete("status");
    const newSearch = params.toString();
    window.history.replaceState({}, "", `/orders${newSearch ? `?${newSearch}` : ""}`);

    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke("chuimei-payment", {
          body: { action: "verify_payment", order_id: paymentOrder },
        });
        if (data?.status === "completed") {
          toast({
            title: "Payment Successful ✅",
            description: "Your order has been placed and is being processed.",
          });
          fetchOrders();
          return;
        }
        if (data?.status === "failed") {
          toast({ title: "Payment Failed", description: "Payment was not completed.", variant: "destructive" });
          return;
        }
      } catch {}
      if (attempts < 24) setTimeout(tick, 5000);
    };
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { toast } = useToast();

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  };

  // Sync order statuses with SMM API
  const syncOrderStatuses = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-order-status', {
        body: {}
      });

      if (error) throw error;

      if (data.updatedCount > 0) {
        toast({
          title: "Orders Updated",
          description: `${data.updatedCount} order(s) status updated.`,
        });
      } else {
        toast({
          title: "Orders Synced",
          description: "All orders are up to date.",
        });
      }
      
      // Refresh orders after sync
      await fetchOrders();
    } catch (error) {
      console.error("Error syncing orders:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync order statuses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "cancelled":
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            {status === "failed" ? "Failed" : "Cancelled"}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case "completed": return 100;
      case "processing": return 66;
      case "pending": return 33;
      default: return 0;
    }
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My Orders | Scaliver Official</title>
        <meta name="description" content="Track Mobile Legends, PUBG UC, and gaming top-up orders with live payment verification and delivery status." />
        <link rel="canonical" href="https://scaliverofficial.in/orders" />
        <meta name="robots" content="noindex" />
        <meta property="og:title" content="My Orders | Scaliver Official" />
        <meta property="og:description" content="Live order tracking and payment verification." />
        <meta property="og:url" content="https://scaliverofficial.in/orders" />
      </Helmet>

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-display flex items-center gap-2">
              <Package className="w-6 h-6" />
              My Orders
            </CardTitle>
            {orders.some(o => o.smm_order_id || o.zone_id?.startsWith("SMM#")) && (
              <Button
                variant="outline"
                size="sm"
                onClick={syncOrderStatuses}
                disabled={isSyncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Status'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
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
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{order.product_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.amount}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    {/* Status Progress Bar */}
                    {!["cancelled", "failed"].includes(order.status) && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Pending</span>
                          <span>Processing</span>
                          <span>Completed</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-500 via-blue-500 to-green-500 transition-all duration-500"
                            style={{ width: `${getStatusProgress(order.status)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {order.product_id === "instagram" || order.product_id === "youtube" ? "URL:" : "Game ID:"}
                        </span>
                        <span className="ml-2 break-all">{order.user_game_id}</span>
                      </div>
                      {order.zone_id && !order.zone_id.startsWith("SMM#") && (
                        <div>
                          <span className="text-muted-foreground">Zone ID:</span>
                          <span className="ml-2">{order.zone_id}</span>
                        </div>
                      )}
                      {(order.smm_order_id || order.zone_id?.startsWith("SMM#")) && (
                        <div>
                          <span className="text-muted-foreground">SMM Order:</span>
                          <span className="ml-2 text-primary">
                            #{order.smm_order_id || order.zone_id?.replace("SMM#", "")}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <span className="ml-2 text-primary font-semibold">₹{order.price}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2">{formatDate(order.created_at)}</span>
                      </div>
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

export default Orders;
