import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, CheckCircle, RefreshCw, Globe, Gamepad2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ApiType = 'smm' | 'gametopup' | 'payment' | 'aluu';

interface SmmApi {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  api_type: ApiType;
  email: string | null;
}

const API_TYPES = [
  { value: 'smm', label: 'SMM Panel', description: 'For social media services' },
  { value: 'aluu', label: 'Aluu.in', description: 'Game top-ups via aluu.in (uses ALUU_API_KEY secret)' },
  { value: 'gametopup', label: 'Game Top-Up API', description: 'For MLBB (x-api-key header)' },
  { value: 'payment', label: 'Payment Gateway', description: 'For payment verification (BharatPe, etc.)' },
];

export const ApiManagement = () => {
  const { toast } = useToast();
  const [apis, setApis] = useState<SmmApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApi, setSelectedApi] = useState<SmmApi | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    api_url: "",
    api_key: "",
    is_active: true,
    api_type: "smm" as ApiType,
    email: "",
  });

  useEffect(() => {
    fetchApis();
  }, []);

  const fetchApis = async () => {
    try {
      const { data, error } = await supabase
        .from("smm_apis")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApis((data as unknown as SmmApi[]) || []);
    } catch (error) {
      console.error("Error fetching APIs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch API configurations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setSelectedApi(null);
    setFormData({
      name: "",
      api_url: "",
      api_key: "",
      is_active: true,
      api_type: "smm",
      email: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (api: SmmApi) => {
    setSelectedApi(api);
    setFormData({
      name: api.name,
      api_url: api.api_url,
      api_key: api.api_key,
      is_active: api.is_active,
      api_type: api.api_type || "smm",
      email: api.email || "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (api: SmmApi) => {
    setSelectedApi(api);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.api_url || !formData.api_key) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Payment gateway requires merchant ID (stored in email field)
    if (formData.api_type === "payment" && !formData.email) {
      toast({
        title: "Validation Error",
        description: "Merchant ID is required for Payment Gateway.",
        variant: "destructive",
      });
      return;
    }

    try {
      const saveData = {
        name: formData.name,
        api_url: formData.api_url,
        api_key: formData.api_key,
        is_active: formData.is_active,
        api_type: formData.api_type,
        email: formData.api_type === "payment" ? formData.email : null,
      };

      if (selectedApi) {
        const { error } = await supabase
          .from("smm_apis")
          .update(saveData)
          .eq("id", selectedApi.id);

        if (error) throw error;

        toast({
          title: "API Updated",
          description: `${formData.name} configuration has been updated.`,
        });
      } else {
        const { error } = await supabase
          .from("smm_apis")
          .insert(saveData);

        if (error) throw error;

        toast({
          title: "API Added",
          description: `${formData.name} configuration has been added.`,
        });
      }

      setDialogOpen(false);
      fetchApis();
    } catch (error) {
      console.error("Error saving API:", error);
      toast({
        title: "Error",
        description: "Failed to save API configuration.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedApi) return;

    try {
      const { error } = await supabase
        .from("smm_apis")
        .delete()
        .eq("id", selectedApi.id);

      if (error) throw error;

      toast({
        title: "API Deleted",
        description: `${selectedApi.name} has been removed.`,
      });

      setDeleteDialogOpen(false);
      fetchApis();
    } catch (error) {
      console.error("Error deleting API:", error);
      toast({
        title: "Error",
        description: "Failed to delete API configuration.",
        variant: "destructive",
      });
    }
  };

  const toggleApiStatus = async (api: SmmApi) => {
    try {
      const { error } = await supabase
        .from("smm_apis")
        .update({ is_active: !api.is_active })
        .eq("id", api.id);

      if (error) throw error;

      toast({
        title: api.is_active ? "API Disabled" : "API Enabled",
        description: `${api.name} has been ${api.is_active ? "disabled" : "enabled"}.`,
      });

      fetchApis();
    } catch (error) {
      console.error("Error toggling API status:", error);
      toast({
        title: "Error",
        description: "Failed to update API status.",
        variant: "destructive",
      });
    }
  };

  const testApiConnection = async (api: SmmApi) => {
    setIsTesting(api.id);
    
    try {
      if (api.api_type === "aluu") {
        const { data, error } = await supabase.functions.invoke('aluu-order', {
          body: { action: 'games' }
        });
        if (error) throw error;
        if (data?.success) {
          toast({ title: "Connection Successful", description: `${api.name} reachable. ${data.data?.length || 0} games.` });
        } else {
          toast({ title: "Connection Failed", description: data?.error || "Unknown", variant: "destructive" });
        }
      } else if (api.api_type === "payment") {
        // Test Payment Gateway via edge function
        const { data, error } = await supabase.functions.invoke('bharatpe-payment', {
          body: {
            action: 'test',
          }
        });

        if (error) throw error;

        if (data.error) {
          toast({
            title: "Connection Failed",
            description: data.error,
            variant: "destructive",
          });
        } else if (data.success) {
          toast({
            title: "Connection Successful",
            description: `${api.name} is configured. Gateway: ${data.gateway_type}`,
          });
        } else {
          toast({
            title: "Connection Test",
            description: `Response: ${JSON.stringify(data).substring(0, 100)}`,
          });
        }
      } else if (api.api_type === "gametopup") {
        // Test Game Top-Up API via edge function
        const { data, error } = await supabase.functions.invoke('gametopup-order', {
          body: {
            action: 'test',
            apiId: api.id,
          }
        });

        if (error) throw error;

        if (data.error) {
          toast({
            title: "Connection Failed",
            description: data.error,
            variant: "destructive",
          });
        } else if (data.success) {
          toast({
            title: "Connection Successful",
            description: `${api.name} is configured. URL: ${data.api_url}`,
          });
        } else {
          toast({
            title: "Connection Test",
            description: `Response: ${JSON.stringify(data).substring(0, 100)}`,
          });
        }
      } else {
        // Test SMM Panel API
        const formDataBody = new URLSearchParams();
        formDataBody.append('key', api.api_key);
        formDataBody.append('action', 'balance');

        const response = await fetch(api.api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formDataBody.toString(),
        });

        const result = await response.json();

        if (result.error) {
          toast({
            title: "Connection Failed",
            description: result.error,
            variant: "destructive",
          });
        } else if (result.balance !== undefined) {
          toast({
            title: "Connection Successful",
            description: `${api.name} is working. Balance: $${result.balance}`,
          });
        } else {
          toast({
            title: "Connection Test",
            description: "API responded but balance not available.",
          });
        }
      }
    } catch (error) {
      console.error("Error testing API:", error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to the API. Check configuration and try again.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(null);
    }
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  const getApiTypeLabel = (type: ApiType) => {
    const found = API_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getApiTypeIcon = (type: ApiType) => {
    if (type === 'aluu') return <Gamepad2 className="w-4 h-4" />;
    if (type === 'gametopup') return <Gamepad2 className="w-4 h-4" />;
    if (type === 'payment') return <CreditCard className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse font-display text-lg text-primary">Loading APIs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">API Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage SMM panels and game top-up providers.</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Add API
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total APIs</p>
              <p className="text-xl font-bold text-foreground">{apis.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-foreground">{apis.filter(a => a.is_active).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aluu</p>
              <p className="text-xl font-bold text-foreground">{apis.filter(a => a.api_type === 'aluu').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment</p>
              <p className="text-xl font-bold text-foreground">{apis.filter(a => a.api_type === 'payment').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* API List */}
      {apis.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold text-foreground mb-2">No APIs Configured</h3>
          <p className="text-muted-foreground mb-4">Add your first API to get started.</p>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Add API
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {apis.map((api) => (
            <div
              key={api.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* API Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg font-bold text-foreground">{api.name}</h3>
                    <Badge variant={api.is_active ? "default" : "secondary"}>
                      {api.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {getApiTypeIcon(api.api_type)}
                      {getApiTypeLabel(api.api_type)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">URL:</span>
                      <code className="bg-secondary px-2 py-0.5 rounded text-xs text-foreground break-all">
                        {api.api_url}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">API Key:</span>
                      <code className="bg-secondary px-2 py-0.5 rounded text-xs text-foreground">
                        {showApiKeys[api.id] ? api.api_key : maskApiKey(api.api_key)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowApiKey(api.id)}
                        className="h-6 w-6 p-0"
                      >
                        {showApiKeys[api.id] ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testApiConnection(api)}
                    disabled={isTesting === api.id}
                    className="gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting === api.id ? "animate-spin" : ""}`} />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(api)}
                    className="gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(api)}
                    className="gap-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                  <Switch
                    checked={api.is_active}
                    onCheckedChange={() => toggleApiStatus(api)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedApi ? "Edit API Configuration" : "Add New API"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api_type">API Type *</Label>
              <Select 
                value={formData.api_type} 
                onValueChange={(value: ApiType) => setFormData({ ...formData, api_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select API type" />
                </SelectTrigger>
                <SelectContent>
                  {API_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">API Name *</Label>
              <Input
                id="name"
                placeholder={formData.api_type === 'aluu' ? "Aluu.in" : "My SMM Panel"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api_url">
                {formData.api_type === 'payment' ? 'Gateway Type *' : formData.api_type === 'gametopup' ? 'API Base URL *' : 'API URL *'}
              </Label>
              <Input
                id="api_url"
                placeholder={formData.api_type === 'payment' ? "bharatpe" : formData.api_type === 'gametopup' ? "https://api.example.com/api-service" : "https://example.com/api/v2"}
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {formData.api_type === 'payment'
                  ? "Gateway type identifier (e.g., bharatpe, razorpay, phonepe)"
                  : formData.api_type === 'gametopup'
                  ? "Base URL for Game Top-Up API (e.g., https://api.example.com/api-service)"
                  : formData.api_type === 'aluu'
                  ? "Aluu API (uses system credentials)"
                  : "The full API endpoint URL"}
              </p>
            </div>

            {formData.api_type === 'payment' && (
              <div className="space-y-2">
                <Label htmlFor="email">Merchant ID *</Label>
                <Input
                  id="email"
                  placeholder="Your BharatPe Merchant ID"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Your payment gateway merchant ID for verification
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="api_key">
                {formData.api_type === 'payment' ? 'API Token *' : formData.api_type === 'gametopup' ? 'x-api-key *' : 'API Key *'}
              </Label>
              <Input
                id="api_key"
                type="password"
                placeholder={formData.api_type === 'payment' ? "Your payment gateway API token" : formData.api_type === 'gametopup' ? "Your x-api-key value" : "Enter your API key"}
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
              {formData.api_type === 'payment' && (
                <p className="text-xs text-muted-foreground">
                  Your BharatPe API token for payment verification
                </p>
              )}
              {formData.api_type === 'gametopup' && (
                <p className="text-xs text-muted-foreground">
                  The x-api-key header value for authenticating with the Game Top-Up API
                </p>
              )}
              {formData.api_type === 'aluu' && (
                <p className="text-xs text-muted-foreground">
                  Aluu uses system credentials (no API key needed here)
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {selectedApi ? "Update" : "Add"} API
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedApi?.name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
