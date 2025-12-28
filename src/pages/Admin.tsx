import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Users, Shield, Check, X, Clock, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  product_name: string;
  amount: string;
  price: number;
  user_game_id: string;
  zone_id: string | null;
  contact_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    phone: string | null;
  } | null;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  user_roles: {
    role: string;
  }[];
  orders: Order[];
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "users">("orders");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userOrdersDialogOpen, setUserOrdersDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
      }
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      fetchUsers();
      
      // Set up real-time subscriptions
      const ordersChannel = supabase
        .channel('admin-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      const profilesChannel = supabase
        .channel('admin-profiles-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          () => {
            fetchUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(profilesChannel);
      };
    }
  }, [isAdmin]);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersWithProfiles = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name, phone")
            .eq("id", order.user_id)
            .maybeSingle();
          
          return {
            ...order,
            profiles: profileData,
          };
        })
      );

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const usersWithData = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const [rolesResult, ordersResult] = await Promise.all([
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id),
            supabase
              .from("orders")
              .select("*")
              .eq("user_id", profile.id)
              .order("created_at", { ascending: false })
          ]);
          
          return {
            ...profile,
            user_roles: rolesResult.data || [],
            orders: (ordersResult.data || []).map(order => ({
              ...order,
              profiles: { display_name: profile.display_name, phone: profile.phone }
            })),
          };
        })
      );

      setUsers(usersWithData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-IN", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric" 
      }),
      time: date.toLocaleTimeString("en-IN", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true
      }),
    };
  };

  const viewUserOrders = (user: UserProfile) => {
    setSelectedUser(user);
    setUserOrdersDialogOpen(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse font-display text-xl text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Admin Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
                <p className="font-body text-sm text-muted-foreground">Manage orders and users (Real-time)</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => { fetchOrders(); fetchUsers(); }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-display font-bold transition-all ${
                activeTab === "orders"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4" />
              Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-display font-bold transition-all ${
                activeTab === "users"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Users ({users.length})
            </button>
          </div>

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left p-4 font-display text-sm text-foreground">Product</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Customer</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Game ID</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Contact</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Price</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Date & Time</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Status</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const { date, time } = formatDateTime(order.created_at);
                        return (
                          <tr key={order.id} className="border-t border-border">
                            <td className="p-4">
                              <div>
                                <p className="font-display font-bold text-foreground">{order.product_name}</p>
                                <p className="font-body text-sm text-muted-foreground">{order.amount}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-body text-foreground">
                                {order.profiles?.display_name || "Unknown"}
                              </p>
                              {order.profiles?.phone && (
                                <p className="font-body text-sm text-muted-foreground">{order.profiles.phone}</p>
                              )}
                            </td>
                            <td className="p-4">
                              <p className="font-body text-foreground">{order.user_game_id}</p>
                              {order.zone_id && (
                                <p className="font-body text-sm text-muted-foreground">Zone: {order.zone_id}</p>
                              )}
                            </td>
                            <td className="p-4">
                              <p className="font-body text-foreground">{order.contact_number}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-display font-bold text-primary">₹{order.price}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-body text-foreground">{date}</p>
                              <p className="font-body text-sm text-muted-foreground">{time}</p>
                            </td>
                            <td className="p-4">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-yellow-400 hover:bg-yellow-500/20"
                                  onClick={() => updateOrderStatus(order.id, "processing")}
                                  disabled={order.status === "processing"}
                                >
                                  <Clock className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-400 hover:bg-green-500/20"
                                  onClick={() => updateOrderStatus(order.id, "completed")}
                                  disabled={order.status === "completed"}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:bg-red-500/20"
                                  onClick={() => updateOrderStatus(order.id, "cancelled")}
                                  disabled={order.status === "cancelled"}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No users yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left p-4 font-display text-sm text-foreground">Name</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Phone</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Role</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Total Orders</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Total Spent</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Joined</th>
                        <th className="text-left p-4 font-display text-sm text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const totalSpent = user.orders.reduce((sum, order) => sum + Number(order.price), 0);
                        const { date, time } = formatDateTime(user.created_at);
                        return (
                          <tr key={user.id} className="border-t border-border">
                            <td className="p-4">
                              <p className="font-display font-bold text-foreground">
                                {user.display_name || "Unknown"}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="font-body text-foreground">
                                {user.phone || "-"}
                              </p>
                            </td>
                            <td className="p-4">
                              <Badge variant={user.user_roles?.some(r => r.role === "admin") ? "default" : "secondary"}>
                                {user.user_roles?.some(r => r.role === "admin") ? "Admin" : "User"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <p className="font-display font-bold text-foreground">
                                {user.orders.length}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="font-display font-bold text-primary">
                                ₹{totalSpent.toFixed(0)}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="font-body text-foreground">{date}</p>
                              <p className="font-body text-sm text-muted-foreground">{time}</p>
                            </td>
                            <td className="p-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewUserOrders(user)}
                                disabled={user.orders.length === 0}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Orders
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* User Orders Dialog */}
      <Dialog open={userOrdersDialogOpen} onOpenChange={setUserOrdersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Order History - {selectedUser?.display_name || "User"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && selectedUser.orders.length > 0 ? (
            <div className="space-y-4">
              {selectedUser.orders.map((order) => {
                const { date, time } = formatDateTime(order.created_at);
                return (
                  <div key={order.id} className="bg-secondary/30 rounded-xl p-4 border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-display font-bold text-foreground">{order.product_name}</p>
                        <p className="font-body text-sm text-muted-foreground">{order.amount}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Game ID</p>
                        <p className="font-body text-foreground">{order.user_game_id}</p>
                        {order.zone_id && <p className="text-muted-foreground">Zone: {order.zone_id}</p>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Contact</p>
                        <p className="font-body text-foreground">{order.contact_number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-display font-bold text-primary">₹{order.price}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ordered</p>
                        <p className="font-body text-foreground">{date}</p>
                        <p className="font-body text-muted-foreground">{time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No orders found</p>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Admin;