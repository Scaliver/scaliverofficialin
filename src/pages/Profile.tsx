import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Save, ArrowLeft, Package, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Helmet } from "react-helmet-async";

interface Profile {
  display_name: string | null;
}

interface Order {
  id: string;
  product_name: string;
  amount: string;
  price: number;
  status: string;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();
  
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrders();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile({
          display_name: data.display_name || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, product_name, amount, price, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name,
        })
        .eq("id", user!.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "cancelled":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>My Profile | Scaliver Official</title>
        <meta name="description" content="Manage your Scaliver Official profile, contact details, and account preferences." />
        <link rel="canonical" href="https://scaliverofficial.in/profile" />
        <meta name="robots" content="noindex" />
        <meta property="og:title" content="My Profile | Scaliver Official" />
        <meta property="og:description" content="Manage your Scaliver Official account." />
      </Helmet>
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

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Section */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    {profile.display_name || "User"}
                  </h2>
                  <p className="font-body text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="font-body text-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={profile.display_name || ""}
                      onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <Button
                    variant="gaming"
                    className="w-full"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Profile"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>

            {/* Orders Section */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Package className="w-6 h-6 text-primary" />
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Order History
                  </h2>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-body text-muted-foreground">No orders yet</p>
                    <Button
                      variant="gaming"
                      className="mt-4"
                      onClick={() => navigate("/")}
                    >
                      Browse Products
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-secondary/50 border border-border rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-display font-bold text-foreground">
                            {order.product_name}
                          </h3>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between font-body text-sm">
                          <span className="text-muted-foreground">{order.amount}</span>
                          <span className="text-primary font-bold">₹{order.price}</span>
                        </div>
                        <p className="font-body text-xs text-muted-foreground mt-2">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;