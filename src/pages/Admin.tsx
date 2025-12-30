import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Users, Shield, Check, X, Clock, RefreshCw, Eye, BellRing, Wallet, Coins, History, ArrowUp, ArrowDown, Search, ShieldCheck, ShieldAlert, Mail, Phone, Lock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  product_name: string;
  amount: string;
  price: number;
  user_game_id: string;
  zone_id: string | null;
  smm_order_id: string | null;
  contact_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
  } | null;
  user_phone?: string | null;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
  user_roles: {
    role: string;
  }[];
  orders: Order[];
  wallet?: {
    id: string;
    balance: number;
  } | null;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_name?: string;
}

interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  user_display_name?: string;
  user_phone?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { logAction } = useAuditLog();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "users" | "wallets" | "history" | "security" | "audit">("orders");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userOrdersDialogOpen, setUserOrdersDialogOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const initialLoadRef = useRef(true);
  const hasLoggedInitialView = useRef(false);
  
  // Credit coins state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [isCreditLoading, setIsCreditLoading] = useState(false);
  
  // Debit coins state
  const [debitDialogOpen, setDebitDialogOpen] = useState(false);
  const [debitAmount, setDebitAmount] = useState("");
  const [debitDescription, setDebitDescription] = useState("");
  const [isDebitLoading, setIsDebitLoading] = useState(false);

  // Search and filter state for orders
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);

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
          description: `${data.updatedCount} order(s) status synced from SMM API.`,
        });
      } else {
        toast({
          title: "Orders Synced",
          description: "All SMM orders are up to date.",
        });
      }
    } catch (error) {
      console.error("Error syncing orders:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync order statuses from SMM API.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Memoized filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" ||
        order.product_name.toLowerCase().includes(searchLower) ||
        order.user_game_id.toLowerCase().includes(searchLower) ||
        order.profiles?.display_name?.toLowerCase().includes(searchLower) ||
        order.user_phone?.toLowerCase().includes(searchLower) ||
        order.contact_number.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      // Product filter
      const matchesProduct = productFilter === "all" || order.product_name === productFilter;

      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [orders, searchQuery, statusFilter, productFilter]);

  // Get unique product names for filter
  const uniqueProducts = useMemo(() => {
    return [...new Set(orders.map(o => o.product_name))];
  }, [orders]);

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
      fetchTransactions();
      fetchAuditLogs();
      
      // Log initial admin view (only once)
      if (!hasLoggedInitialView.current) {
        hasLoggedInitialView.current = true;
        logAction({
          action: 'view_orders',
          resourceType: 'orders',
          details: { initial_load: true }
        });
      }
      
      // Set up real-time subscriptions
      const ordersChannel = supabase
        .channel('admin-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            // Show notification for new orders (skip on initial load)
            if (!initialLoadRef.current) {
              const newOrder = payload.new as Order;
              setNewOrdersCount(prev => prev + 1);
              toast({
                title: "🔔 New Order Received!",
                description: `${newOrder.product_name} - ₹${newOrder.price}`,
                duration: 5000,
              });
              // Play notification sound (optional visual pulse)
              document.title = `(New Order) Admin Panel`;
              setTimeout(() => {
                document.title = "Admin Panel";
              }, 5000);
            }
            fetchOrders();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
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

      const transactionsChannel = supabase
        .channel('admin-transactions-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'coin_transactions'
          },
          () => {
            fetchTransactions();
          }
        )
        .subscribe();

      // Mark initial load complete after first fetch
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 2000);

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(profilesChannel);
        supabase.removeChannel(transactionsChannel);
      };
    }
  }, [isAdmin, toast]);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersWithProfiles = await Promise.all(
        (ordersData || []).map(async (order) => {
          const [profileResult, contactResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name")
              .eq("id", order.user_id)
              .maybeSingle(),
            supabase
              .from("user_contacts")
              .select("phone")
              .eq("user_id", order.user_id)
              .maybeSingle()
          ]);
          
          return {
            ...order,
            profiles: profileResult.data,
            user_phone: contactResult.data?.phone,
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
          const [rolesResult, ordersResult, walletResult, contactResult] = await Promise.all([
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id),
            supabase
              .from("orders")
              .select("*")
              .eq("user_id", profile.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("wallets")
              .select("id, balance")
              .eq("user_id", profile.id)
              .maybeSingle(),
            supabase
              .from("user_contacts")
              .select("phone, phone_verified")
              .eq("user_id", profile.id)
              .maybeSingle()
          ]);
          
          const userPhone = contactResult.data?.phone || null;
          const phoneVerified = contactResult.data?.phone_verified || false;
          
          return {
            ...profile,
            phone: userPhone,
            phone_verified: phoneVerified,
            email_verified: true, // Users who can log in have verified email
            user_roles: rolesResult.data || [],
            orders: (ordersResult.data || []).map(order => ({
              ...order,
              profiles: { display_name: profile.display_name },
              user_phone: userPhone
            })),
            wallet: walletResult.data,
          };
        })
      );

      setUsers(usersWithData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: txData, error } = await supabase
        .from("coin_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user profiles and contacts for each transaction
      const txWithProfiles = await Promise.all(
        (txData || []).map(async (tx) => {
          const [profileResult, contactResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name")
              .eq("id", tx.user_id)
              .maybeSingle(),
            supabase
              .from("user_contacts")
              .select("phone")
              .eq("user_id", tx.user_id)
              .maybeSingle()
          ]);
          
          return {
            ...tx,
            user_display_name: profileResult.data?.display_name,
            user_phone: contactResult.data?.phone,
          };
        })
      );

      setTransactions(txWithProfiles);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data: logsData, error } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get admin names for each log
      const logsWithAdminNames = await Promise.all(
        ((logsData as any[]) || []).map(async (log) => {
          const profileResult = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", log.admin_id)
            .maybeSingle();
          
          return {
            ...log,
            admin_name: profileResult.data?.display_name || 'Unknown Admin',
          };
        })
      );

      setAuditLogs(logsWithAdminNames);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      const order = orders.find(o => o.id === orderId);
      
      // Log the status update
      logAction({
        action: 'update_order_status',
        resourceType: 'orders',
        resourceId: orderId,
        details: { 
          new_status: newStatus, 
          product_name: order?.product_name,
          previous_status: order?.status 
        }
      });
      
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      // Show notification based on status
      const statusMessages: Record<string, { title: string; description: string; icon: string }> = {
        completed: { 
          title: "✅ Order Completed", 
          description: `Order for ${order?.product_name} marked as completed.`,
          icon: "✅"
        },
        pending: { 
          title: "⏳ Order Pending", 
          description: `Order for ${order?.product_name} marked as pending.`,
          icon: "⏳"
        },
        cancelled: { 
          title: "❌ Order Cancelled", 
          description: `Order for ${order?.product_name} has been cancelled.`,
          icon: "❌"
        },
        processing: { 
          title: "🔄 Order Processing", 
          description: `Order for ${order?.product_name} is now being processed.`,
          icon: "🔄"
        },
      };

      const notification = statusMessages[newStatus] || { 
        title: "Order Updated", 
        description: `Order status changed to ${newStatus}.`,
        icon: "📦"
      };

      toast({
        title: notification.title,
        description: notification.description,
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

  const openCreditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setCreditAmount("");
    setCreditDescription("");
    setCreditDialogOpen(true);
  };

  const openDebitDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setDebitAmount("");
    setDebitDescription("");
    setDebitDialogOpen(true);
  };

  const handleCreditCoins = async () => {
    if (!selectedUser || !creditAmount) return;
    
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    setIsCreditLoading(true);
    
    try {
      // First, update the wallet balance
      const newBalance = (selectedUser.wallet?.balance || 0) + amount;
      
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", selectedUser.id);

      if (walletError) throw walletError;

      // Then, create a transaction record
      const { error: txError } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: selectedUser.id,
          amount: amount,
          type: "credit",
          description: creditDescription || "Admin credit - Payment verified",
        });

      if (txError) throw txError;

      // Log the wallet credit action
      logAction({
        action: 'update_wallet',
        resourceType: 'wallets',
        resourceId: selectedUser.wallet?.id,
        details: {
          type: 'credit',
          amount,
          user_name: selectedUser.display_name,
          description: creditDescription || "Admin credit - Payment verified"
        }
      });

      toast({
        title: "Coins Credited Successfully",
        description: `₹${amount} credited to ${selectedUser.display_name || "User"}'s wallet.`,
      });

      setCreditDialogOpen(false);
      fetchUsers(); // Refresh users to show updated balance
    } catch (error) {
      console.error("Error crediting coins:", error);
      toast({
        title: "Error",
        description: "Failed to credit coins. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreditLoading(false);
    }
  };

  const handleDebitCoins = async () => {
    if (!selectedUser || !debitAmount) return;
    
    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    const currentBalance = selectedUser.wallet?.balance || 0;
    if (amount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `User only has ₹${currentBalance.toFixed(2)} in their wallet.`,
        variant: "destructive",
      });
      return;
    }

    setIsDebitLoading(true);
    
    try {
      // First, update the wallet balance
      const newBalance = currentBalance - amount;
      
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", selectedUser.id);

      if (walletError) throw walletError;

      // Then, create a transaction record
      const { error: txError } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: selectedUser.id,
          amount: amount,
          type: "debit",
          description: debitDescription || "Admin debit - Refund/Correction",
        });

      if (txError) throw txError;

      // Log the wallet debit action
      logAction({
        action: 'update_wallet',
        resourceType: 'wallets',
        resourceId: selectedUser.wallet?.id,
        details: {
          type: 'debit',
          amount,
          user_name: selectedUser.display_name,
          description: debitDescription || "Admin debit - Refund/Correction"
        }
      });

      toast({
        title: "Coins Deducted Successfully",
        description: `₹${amount} deducted from ${selectedUser.display_name || "User"}'s wallet.`,
      });

      setDebitDialogOpen(false);
      fetchUsers(); // Refresh users to show updated balance
    } catch (error) {
      console.error("Error debiting coins:", error);
      toast({
        title: "Error",
        description: "Failed to deduct coins. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDebitLoading(false);
    }
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center relative">
                <Shield className="w-6 h-6 text-primary-foreground" />
                {newOrdersCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {newOrdersCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="font-body text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live Updates Active
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {newOrdersCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setNewOrdersCount(0)}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <BellRing className="w-4 h-4" />
                  Clear ({newOrdersCount})
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => { fetchOrders(); fetchUsers(); fetchTransactions(); setNewOrdersCount(0); }}
                className="gap-2 flex-1 sm:flex-none"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => { setActiveTab("orders"); setNewOrdersCount(0); }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-bold transition-all whitespace-nowrap relative ${
                activeTab === "orders"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4" />
              Orders ({orders.length})
              {newOrdersCount > 0 && activeTab !== "orders" && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {newOrdersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("users");
                logAction({ action: 'view_users_list', resourceType: 'users' });
              }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-bold transition-all whitespace-nowrap ${
                activeTab === "users"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-bold transition-all whitespace-nowrap ${
                activeTab === "wallets"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet className="w-4 h-4" />
              Wallets
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-bold transition-all whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-4 h-4" />
              Wallet History
            </button>
            <button
              onClick={() => {
                setActiveTab("security");
                logAction({ action: 'view_user_security', resourceType: 'security' });
              }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-bold transition-all whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="w-4 h-4" />
              Security
            </button>
            <button
              onClick={() => {
                setActiveTab("audit");
                fetchAuditLogs();
              }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-bold transition-all whitespace-nowrap ${
                activeTab === "audit"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4" />
              Audit Logs
            </button>
          </div>

          {/* Dashboard Stats */}
          {activeTab === "orders" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-xl font-bold text-foreground">{orders.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-foreground">₹{orders.reduce((sum, o) => sum + o.price, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Orders</p>
                    <p className="text-xl font-bold text-foreground">{orders.filter(o => o.status === "pending").length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-xl font-bold text-foreground">{orders.filter(o => o.status === "completed").length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by product, user, game ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-secondary border-border"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px] bg-secondary border-border">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={productFilter} onValueChange={setProductFilter}>
                      <SelectTrigger className="w-[180px] bg-secondary border-border">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        {uniqueProducts.map((product) => (
                          <SelectItem key={product} value={product}>{product}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={syncOrderStatuses}
                      disabled={isSyncing}
                      className="whitespace-nowrap"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync SMM'}
                    </Button>
                    {(searchQuery || statusFilter !== "all" || productFilter !== "all") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setProductFilter("all");
                        }}
                        className="whitespace-nowrap"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredOrders.length} of {orders.length} orders
                </p>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">
                    {orders.length === 0 ? "No orders yet" : "No orders match your search"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table - Hidden on mobile */}
                  <div className="hidden lg:block bg-card border border-border rounded-2xl overflow-hidden">
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
                          {filteredOrders.map((order) => {
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
                                  <p className="font-body text-foreground">{order.profiles?.display_name || "Unknown"}</p>
                                  {order.user_phone && (
                                    <p className="font-body text-sm text-muted-foreground">{order.user_phone}</p>
                                  )}
                                </td>
                                <td className="p-4">
                                  <p className="font-body text-foreground">{order.user_game_id}</p>
                                  {order.zone_id && !order.zone_id.startsWith("SMM#") && <p className="font-body text-sm text-muted-foreground">Zone: {order.zone_id}</p>}
                                  {(order.smm_order_id || order.zone_id?.startsWith("SMM#")) && (
                                    <p className="font-body text-sm text-primary">SMM #{order.smm_order_id || order.zone_id?.replace("SMM#", "")}</p>
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
                                  <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-500/20" onClick={() => updateOrderStatus(order.id, "processing")} disabled={order.status === "processing"}>
                                      <Clock className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/20" onClick={() => updateOrderStatus(order.id, "completed")} disabled={order.status === "completed"}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20" onClick={() => updateOrderStatus(order.id, "cancelled")} disabled={order.status === "cancelled"}>
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
                  </div>

                  {/* Mobile Cards - Shown only on mobile */}
                  <div className="lg:hidden space-y-3">
                    {filteredOrders.map((order) => {
                      const { date, time } = formatDateTime(order.created_at);
                      return (
                        <div key={order.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-display font-bold text-foreground">{order.product_name}</p>
                              <p className="font-body text-sm text-muted-foreground">{order.amount}</p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Customer</p>
                              <p className="font-body text-foreground">{order.profiles?.display_name || "Unknown"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-display font-bold text-primary">₹{order.price}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Game ID</p>
                              <p className="font-body text-foreground">{order.user_game_id}</p>
                              {order.zone_id && !order.zone_id.startsWith("SMM#") && <p className="text-muted-foreground text-xs">Zone: {order.zone_id}</p>}
                              {(order.smm_order_id || order.zone_id?.startsWith("SMM#")) && (
                                <p className="text-primary text-xs">SMM #{order.smm_order_id || order.zone_id?.replace("SMM#", "")}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-muted-foreground">Contact</p>
                              <p className="font-body text-foreground">{order.contact_number}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <p className="font-body text-xs text-muted-foreground">{date} • {time}</p>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-500/20 h-8 w-8 p-0" onClick={() => updateOrderStatus(order.id, "processing")} disabled={order.status === "processing"}>
                                <Clock className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/20 h-8 w-8 p-0" onClick={() => updateOrderStatus(order.id, "completed")} disabled={order.status === "completed"}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20 h-8 w-8 p-0" onClick={() => updateOrderStatus(order.id, "cancelled")} disabled={order.status === "cancelled"}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No users yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table - Hidden on mobile */}
                  <div className="hidden lg:block bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left p-4 font-display text-sm text-foreground">Name</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Phone</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Role</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">2FA</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Total Orders</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Total Spent</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Joined</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => {
                            const totalSpent = u.orders.reduce((sum, order) => sum + Number(order.price), 0);
                            const { date, time } = formatDateTime(u.created_at);
                            return (
                              <tr key={u.id} className="border-t border-border">
                                <td className="p-4">
                                  <p className="font-display font-bold text-foreground">{u.display_name || "Unknown"}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-body text-foreground">{u.phone || "-"}</p>
                                </td>
                                <td className="p-4">
                                  <Badge variant={u.user_roles?.some(r => r.role === "admin") ? "default" : "secondary"}>
                                    {u.user_roles?.some(r => r.role === "admin") ? "Admin" : "User"}
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <Badge className={u.phone_verified 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }>
                                    <span className="flex items-center gap-1">
                                      {u.phone_verified ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                      {u.phone_verified ? "On" : "Off"}
                                    </span>
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <p className="font-display font-bold text-foreground">{u.orders.length}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-display font-bold text-primary">₹{totalSpent.toFixed(0)}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-body text-foreground">{date}</p>
                                  <p className="font-body text-sm text-muted-foreground">{time}</p>
                                </td>
                                <td className="p-4">
                                  <Button size="sm" variant="outline" onClick={() => viewUserOrders(u)} disabled={u.orders.length === 0}>
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
                  </div>

                  {/* Mobile Cards - Shown only on mobile */}
                  <div className="lg:hidden space-y-3">
                    {users.map((u) => {
                      const totalSpent = u.orders.reduce((sum, order) => sum + Number(order.price), 0);
                      const { date } = formatDateTime(u.created_at);
                      return (
                        <div key={u.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-display font-bold text-foreground">{u.display_name || "Unknown"}</p>
                              <p className="font-body text-sm text-muted-foreground">{u.phone || "No phone"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={u.phone_verified 
                                ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" 
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
                              }>
                                {u.phone_verified ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                              </Badge>
                              <Badge variant={u.user_roles?.some(r => r.role === "admin") ? "default" : "secondary"}>
                                {u.user_roles?.some(r => r.role === "admin") ? "Admin" : "User"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Orders</p>
                              <p className="font-display font-bold text-foreground">{u.orders.length}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Spent</p>
                              <p className="font-display font-bold text-primary">₹{totalSpent.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Joined</p>
                              <p className="font-body text-foreground text-xs">{date}</p>
                            </div>
                          </div>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => viewUserOrders(u)} 
                            disabled={u.orders.length === 0}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Order History
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Wallets Tab */}
          {activeTab === "wallets" && (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl text-center py-12">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No users with wallets yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left p-4 font-display text-sm text-foreground">User</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Phone</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Wallet Balance</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-t border-border">
                              <td className="p-4">
                                <p className="font-display font-bold text-foreground">{u.display_name || "Unknown"}</p>
                              </td>
                              <td className="p-4">
                                <p className="font-body text-foreground">{u.phone || "-"}</p>
                              </td>
                              <td className="p-4">
                                <p className="font-display font-bold text-primary">₹{u.wallet?.balance?.toFixed(2) || "0.00"}</p>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="default" onClick={() => openCreditDialog(u)} className="gap-1">
                                    <ArrowUp className="w-4 h-4" />
                                    Credit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openDebitDialog(u)} className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                    <ArrowDown className="w-4 h-4" />
                                    Debit
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-3">
                    {users.map((u) => (
                      <div key={u.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-display font-bold text-foreground">{u.display_name || "Unknown"}</p>
                            <p className="font-body text-sm text-muted-foreground">{u.phone || "No phone"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground text-xs">Balance</p>
                            <p className="font-display font-bold text-primary">₹{u.wallet?.balance?.toFixed(2) || "0.00"}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1 gap-1"
                            onClick={() => openCreditDialog(u)}
                          >
                            <ArrowUp className="w-4 h-4" />
                            Credit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => openDebitDialog(u)}
                          >
                            <ArrowDown className="w-4 h-4" />
                            Debit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Wallet History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No wallet transactions yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left p-4 font-display text-sm text-foreground">User</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Type</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Amount</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Description</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => {
                            const { date, time } = formatDateTime(tx.created_at);
                            return (
                              <tr key={tx.id} className="border-t border-border">
                                <td className="p-4">
                                  <p className="font-display font-bold text-foreground">{tx.user_display_name || "Unknown"}</p>
                                  <p className="font-body text-sm text-muted-foreground">{tx.user_phone || "-"}</p>
                                </td>
                                <td className="p-4">
                                  <Badge className={tx.type === "credit" 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                  }>
                                    <span className="flex items-center gap-1">
                                      {tx.type === "credit" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                      {tx.type}
                                    </span>
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <p className={`font-display font-bold ${tx.type === "credit" ? "text-green-400" : "text-red-400"}`}>
                                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="font-body text-foreground text-sm">{tx.description}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-body text-foreground">{date}</p>
                                  <p className="font-body text-sm text-muted-foreground">{time}</p>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-3">
                    {transactions.map((tx) => {
                      const { date, time } = formatDateTime(tx.created_at);
                      return (
                        <div key={tx.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-display font-bold text-foreground">{tx.user_display_name || "Unknown"}</p>
                              <p className="font-body text-sm text-muted-foreground">{tx.user_phone || "-"}</p>
                            </div>
                            <Badge className={tx.type === "credit" 
                              ? "bg-green-500/20 text-green-400 border-green-500/30" 
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                            }>
                              <span className="flex items-center gap-1">
                                {tx.type === "credit" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                {tx.type}
                              </span>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className={`font-display font-bold text-lg ${tx.type === "credit" ? "text-green-400" : "text-red-400"}`}>
                              {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                            </p>
                            <div className="text-right">
                              <p className="font-body text-sm text-foreground">{date}</p>
                              <p className="font-body text-xs text-muted-foreground">{time}</p>
                            </div>
                          </div>

                          <p className="font-body text-sm text-muted-foreground border-t border-border pt-2">
                            {tx.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-4">
              {/* Security Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                      <p className="text-xl font-bold text-foreground">{users.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">2FA Enabled</p>
                      <p className="text-xl font-bold text-foreground">{users.filter(u => u.phone_verified).length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">2FA Disabled</p>
                      <p className="text-xl font-bold text-foreground">{users.filter(u => !u.phone_verified).length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email Verified</p>
                      <p className="text-xl font-bold text-foreground">{users.filter(u => u.email_verified).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl text-center py-12">
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No users yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left p-4 font-display text-sm text-foreground">User</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Phone</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Role</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Email Verified</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">2FA Status</th>
                            <th className="text-left p-4 font-display text-sm text-foreground">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => {
                            const { date, time } = formatDateTime(u.created_at);
                            return (
                              <tr key={u.id} className="border-t border-border">
                                <td className="p-4">
                                  <p className="font-display font-bold text-foreground">{u.display_name || "Unknown"}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-body text-foreground">{u.phone || "-"}</p>
                                </td>
                                <td className="p-4">
                                  <Badge variant={u.user_roles?.some(r => r.role === "admin") ? "default" : "secondary"}>
                                    {u.user_roles?.some(r => r.role === "admin") ? "Admin" : "User"}
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <Badge className={u.email_verified 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                  }>
                                    <span className="flex items-center gap-1">
                                      {u.email_verified ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                      {u.email_verified ? "Verified" : "Pending"}
                                    </span>
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <Badge className={u.phone_verified 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }>
                                    <span className="flex items-center gap-1">
                                      {u.phone_verified ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                      {u.phone_verified ? "Enabled" : "Disabled"}
                                    </span>
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <p className="font-body text-foreground">{date}</p>
                                  <p className="font-body text-sm text-muted-foreground">{time}</p>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-3">
                    {users.map((u) => {
                      const { date } = formatDateTime(u.created_at);
                      return (
                        <div key={u.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-display font-bold text-foreground">{u.display_name || "Unknown"}</p>
                              <p className="font-body text-sm text-muted-foreground">{u.phone || "No phone"}</p>
                            </div>
                            <Badge variant={u.user_roles?.some(r => r.role === "admin") ? "default" : "secondary"}>
                              {u.user_roles?.some(r => r.role === "admin") ? "Admin" : "User"}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Email</p>
                              <Badge className={u.email_verified 
                                ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" 
                                : "bg-red-500/20 text-red-400 border-red-500/30 text-xs"
                              }>
                                {u.email_verified ? "✓" : "✗"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">2FA</p>
                              <Badge className={u.phone_verified 
                                ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" 
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
                              }>
                                {u.phone_verified ? "On" : "Off"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Joined</p>
                              <p className="font-body text-foreground text-xs">{date}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Admin Activity Audit Logs
                </h2>
                <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Track when admins view or modify sensitive user data for compliance purposes.
              </p>

              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs recorded yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-display font-bold text-foreground">Admin</th>
                          <th className="px-4 py-3 text-left font-display font-bold text-foreground">Action</th>
                          <th className="px-4 py-3 text-left font-display font-bold text-foreground">Resource</th>
                          <th className="px-4 py-3 text-left font-display font-bold text-foreground">Details</th>
                          <th className="px-4 py-3 text-left font-display font-bold text-foreground">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {auditLogs.map((log) => {
                          const { date, time } = formatDateTime(log.created_at);
                          return (
                            <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-display font-semibold text-foreground">{log.admin_name}</p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={
                                  log.action.includes('view') 
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                    : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                }>
                                  {log.action.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-body text-foreground">{log.resource_type}</p>
                                {log.resource_id && (
                                  <p className="text-xs text-muted-foreground font-mono">{log.resource_id.slice(0, 8)}...</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {log.details ? (
                                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                                    {JSON.stringify(log.details)}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-body text-foreground text-sm">{date}</p>
                                <p className="font-body text-muted-foreground text-xs">{time}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {auditLogs.map((log) => {
                      const { date, time } = formatDateTime(log.created_at);
                      return (
                        <div key={log.id} className="bg-card border border-border rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-display font-bold text-foreground">{log.admin_name}</p>
                              <Badge className={
                                log.action.includes('view') 
                                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs mt-1"
                                  : "bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs mt-1"
                              }>
                                {log.action.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-body text-foreground text-sm">{date}</p>
                              <p className="font-body text-muted-foreground text-xs">{time}</p>
                            </div>
                          </div>
                          <div className="text-sm">
                            <p className="text-muted-foreground">Resource: <span className="text-foreground">{log.resource_type}</span></p>
                            {log.details && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
                        {order.zone_id && !order.zone_id.startsWith("SMM#") && <p className="text-muted-foreground">Zone: {order.zone_id}</p>}
                        {(order.smm_order_id || order.zone_id?.startsWith("SMM#")) && (
                          <p className="text-primary text-xs">SMM #{order.smm_order_id || order.zone_id?.replace("SMM#", "")}</p>
                        )}
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

      {/* Credit Coins Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Credit Coins
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 rounded-xl p-4 border border-border">
              <p className="text-sm text-muted-foreground">Crediting to</p>
              <p className="font-display font-bold text-foreground">{selectedUser?.display_name || "Unknown User"}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.phone || "No phone"}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Current Balance: <span className="font-bold text-primary">₹{selectedUser?.wallet?.balance?.toFixed(2) || "0.00"}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Credit (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="1"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Payment verified via UPI"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreditCoins} disabled={!creditAmount || isCreditLoading}>
              {isCreditLoading ? "Processing..." : "Credit Coins"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debit Coins Dialog */}
      <Dialog open={debitDialogOpen} onOpenChange={setDebitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <ArrowDown className="w-5 h-5 text-red-400" />
              Debit Coins
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 rounded-xl p-4 border border-border">
              <p className="text-sm text-muted-foreground">Deducting from</p>
              <p className="font-display font-bold text-foreground">{selectedUser?.display_name || "Unknown User"}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.phone || "No phone"}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Current Balance: <span className="font-bold text-primary">₹{selectedUser?.wallet?.balance?.toFixed(2) || "0.00"}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="debitAmount">Amount to Deduct (₹)</Label>
              <Input
                id="debitAmount"
                type="number"
                placeholder="Enter amount"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
                min="1"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debitDescription">Reason (Optional)</Label>
              <Input
                id="debitDescription"
                placeholder="e.g., Refund for cancelled order"
                value={debitDescription}
                onChange={(e) => setDebitDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDebitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDebitCoins} 
              disabled={!debitAmount || isDebitLoading}
              variant="destructive"
            >
              {isDebitLoading ? "Processing..." : "Deduct Coins"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Admin;