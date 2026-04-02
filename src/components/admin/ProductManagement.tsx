import { useState, useRef, useEffect } from "react";
import { Plus, Edit2, Trash2, Package, ChevronDown, ChevronUp, Search, ToggleLeft, ToggleRight, Upload, Image, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MLBBAutoLinker } from "./MLBBAutoLinker";
import { SmileCodeAutoFetcher } from "./SmileCodeAutoFetcher";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProducts, Product, ProductFormData, PricingTierFormData } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GameProviderApi {
  id: string;
  name: string;
  api_type: string;
  is_active: boolean;
}

const CATEGORIES = [
  "Mobile Legends",
  "Mobile Games",
  "Social Media",
];

const SUB_CATEGORIES = [
  "followers",
  "likes",
  "views",
  "comments",
  "saves",
  "profile-followers",
  "page-followers",
  "watch-time",
  "reactions",
];

export const ProductManagement = () => {
  const { toast } = useToast();
  const {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    createPricingTier,
    updatePricingTier,
    deletePricingTier,
    uploadImage,
    isCreating,
    isUpdating,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  
  // Product dialog state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    slug: "",
    image_url: "",
    in_stock: true,
    category: "Mobile Legends",
    description: "",
    instructions: [],
    is_social_media: false,
    sub_category: null,
    sort_order: 0,
  });
  const [instructionsText, setInstructionsText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tier dialog state
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [tierProductId, setTierProductId] = useState<string>("");
  const [tierForm, setTierForm] = useState<PricingTierFormData>({
    amount: "",
    price: 0,
    bonus: null,
    smm_service_id: null,
    quantity: null,
    sort_order: 0,
    provider_id: null,
    provider_product_id: null,
  });

  // Game provider APIs for provider selection
  const [gameProviderApis, setGameProviderApis] = useState<GameProviderApi[]>([]);

  // Fetch game provider APIs
  useEffect(() => {
    const fetchGameProviderApis = async () => {
      const { data } = await supabase
        .from("smm_apis")
        .select("id, name, api_type, is_active")
        .in("api_type", ["smilecode", "gametopup"])
        .eq("is_active", true);
      
      if (data) {
        setGameProviderApis(data as unknown as GameProviderApi[]);
      }
    };
    fetchGameProviderApis();
  }, []);
  
  // Get label for provider based on API type
  const getProviderLabel = (apiId: string) => {
    const api = gameProviderApis.find(a => a.id === apiId);
    if (!api) return '';
    return api.api_type === 'gametopup' ? `${api.name} (Game Top-Up)` : `${api.name} (Digital Top-Up)`;
  };

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "product" | "tier"; id: string; name: string } | null>(null);

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        slug: product.slug,
        image_url: product.image_url,
        in_stock: product.in_stock,
        category: product.category,
        description: product.description,
        instructions: product.instructions || [],
        is_social_media: product.is_social_media,
        sub_category: product.sub_category,
        sort_order: product.sort_order,
      });
      setInstructionsText((product.instructions || []).join("\n"));
    } else {
      setEditingProduct(null);
      setProductForm({
        name: "",
        slug: "",
        image_url: "",
        in_stock: true,
        category: "Mobile Legends",
        description: "",
        instructions: [],
        is_social_media: false,
        sub_category: null,
        sort_order: products.length,
      });
      setInstructionsText("");
    }
    setProductDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await uploadImage(file);
      setProductForm({ ...productForm, image_url: publicUrl });
      toast({
        title: "Image Uploaded",
        description: "Product image has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProduct = async () => {
    const instructions = instructionsText.split("\n").filter(line => line.trim() !== "");
    const formData = { ...productForm, instructions };
    
    if (editingProduct) {
      await updateProduct({ id: editingProduct.id, product: formData });
    } else {
      await createProduct(formData);
    }
    setProductDialogOpen(false);
  };

  const openTierDialog = (productId: string, tier?: any) => {
    setTierProductId(productId);
    if (tier) {
      setEditingTier(tier);
      setTierForm({
        amount: tier.amount,
        price: tier.price,
        bonus: tier.bonus,
        smm_service_id: tier.smm_service_id,
        quantity: tier.quantity,
        sort_order: tier.sort_order,
        provider_id: tier.provider_id || null,
        provider_product_id: tier.provider_product_id || null,
      });
    } else {
      setEditingTier(null);
      const product = products.find(p => p.id === productId);
      setTierForm({
        amount: "",
        price: 0,
        bonus: null,
        smm_service_id: null,
        quantity: null,
        sort_order: product?.pricing_tiers?.length || 0,
        provider_id: null,
        provider_product_id: null,
      });
    }
    setTierDialogOpen(true);
  };

  const handleSaveTier = async () => {
    if (editingTier) {
      await updatePricingTier({ id: editingTier.id, tier: tierForm });
    } else {
      await createPricingTier({ productId: tierProductId, tier: tierForm });
    }
    setTierDialogOpen(false);
  };

  const confirmDelete = (type: "product" | "tier", id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "product") {
      await deleteProduct(deleteTarget.id);
    } else {
      await deletePricingTier(deleteTarget.id);
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const toggleStock = async (product: Product) => {
    await updateProduct({ id: product.id, product: { in_stock: !product.in_stock } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-secondary border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <MLBBAutoLinker />
          <Button onClick={() => openProductDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Products</p>
          <p className="text-xl font-bold text-foreground">{products.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">In Stock</p>
          <p className="text-xl font-bold text-green-500">{products.filter(p => p.in_stock).length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Out of Stock</p>
          <p className="text-xl font-bold text-red-500">{products.filter(p => !p.in_stock).length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Tiers</p>
          <p className="text-xl font-bold text-foreground">{products.reduce((sum, p) => sum + (p.pricing_tiers?.length || 0), 0)}</p>
        </div>
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {products.length === 0 ? "No products yet. Add your first product!" : "No products match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Product Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
              >
                <div className="flex items-center gap-4">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-foreground">{product.name}</p>
                      <Badge variant={product.in_stock ? "default" : "destructive"} className="text-xs">
                        {product.in_stock ? "In Stock" : "Out of Stock"}
                      </Badge>
                      {product.is_social_media && (
                        <Badge variant="outline" className="text-xs">SMM</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {product.category} • {product.pricing_tiers?.length || 0} pricing tiers • Slug: {product.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); toggleStock(product); }}
                    className={product.in_stock ? "text-green-500" : "text-red-500"}
                  >
                    {product.in_stock ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openProductDialog(product); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); confirmDelete("product", product.id, product.name); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {expandedProduct === product.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Pricing Tiers */}
              {expandedProduct === product.id && (
                <div className="border-t border-border p-4 bg-secondary/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display font-semibold text-foreground">Pricing Tiers</p>
                    <Button size="sm" variant="outline" onClick={() => openTierDialog(product.id)} className="gap-1">
                      <Plus className="w-3 h-3" />
                      Add Tier
                    </Button>
                  </div>
                  
                  {product.pricing_tiers && product.pricing_tiers.length > 0 ? (
                    <div className="grid gap-2">
                      {product.pricing_tiers.map((tier) => (
                        <div key={tier.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-display font-bold text-foreground">{tier.amount}</p>
                              <p className="text-sm text-muted-foreground">
                                ₹{tier.price}
                                {tier.bonus && <span className="text-primary ml-2">({tier.bonus})</span>}
                              </p>
                            </div>
                            {tier.smm_service_id && (
                              <Badge variant="outline" className="text-xs">
                                SMM ID: {tier.smm_service_id} • Qty: {tier.quantity}
                              </Badge>
                            )}
                            {tier.provider_id && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Gamepad2 className="w-3 h-3" />
                                Provider: {tier.provider_product_id || 'N/A'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openTierDialog(product.id, tier)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-400"
                              onClick={() => confirmDelete("tier", tier.id, tier.amount)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No pricing tiers. Add one to start selling this product.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input
                  placeholder="MLBB SMALL PACK"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL ID)</Label>
                <Input
                  placeholder="mlbb-small"
                  value={productForm.slug}
                  onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                />
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="flex gap-4 items-start">
                {productForm.image_url ? (
                  <img 
                    src={productForm.image_url} 
                    alt="Product preview" 
                    className="w-24 h-24 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-secondary border border-border flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <Input
                    placeholder="Or enter image URL"
                    value={productForm.image_url || ""}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={productForm.category} 
                  onValueChange={(value) => setProductForm({ ...productForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={productForm.sort_order}
                  onChange={(e) => setProductForm({ ...productForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Product description..."
                value={productForm.description || ""}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Instructions (one per line)</Label>
              <Textarea
                placeholder="Enter your User ID&#10;Select the diamond pack&#10;Complete payment"
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={productForm.in_stock}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, in_stock: checked })}
                />
                <Label>In Stock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={productForm.is_social_media}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, is_social_media: checked })}
                />
                <Label>Social Media (SMM)</Label>
              </div>
            </div>

            {productForm.is_social_media && (
              <div className="space-y-2">
                <Label>Sub Category</Label>
                <Select 
                  value={productForm.sub_category || "none"} 
                  onValueChange={(value) => setProductForm({ ...productForm, sub_category: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Main product)</SelectItem>
                    {SUB_CATEGORIES.map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingTier ? "Edit Pricing Tier" : "Add Pricing Tier"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount Label</Label>
              <Input
                placeholder="100 Diamonds"
                value={tierForm.amount}
                onChange={(e) => setTierForm({ ...tierForm, amount: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="99"
                  value={tierForm.price}
                  onChange={(e) => setTierForm({ ...tierForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={tierForm.sort_order}
                  onChange={(e) => setTierForm({ ...tierForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bonus Label (optional)</Label>
              <Input
                placeholder="Bonus"
                value={tierForm.bonus || ""}
                onChange={(e) => setTierForm({ ...tierForm, bonus: e.target.value || null })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMM Service ID</Label>
                <Input
                  placeholder="1766"
                  value={tierForm.smm_service_id || ""}
                  onChange={(e) => setTierForm({ ...tierForm, smm_service_id: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>SMM Quantity</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={tierForm.quantity || ""}
                  onChange={(e) => setTierForm({ ...tierForm, quantity: parseInt(e.target.value) || null })}
                />
              </div>
            </div>

            {/* Game Provider Section (SmileOne + Game Top-Up) */}
            {gameProviderApis.length > 0 && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                  <Label className="font-semibold">Game Provider Integration</Label>
                </div>
                
                {/* Provider Selection */}
                <div className="space-y-2 mb-4">
                  <Label>Provider</Label>
                  <Select 
                    value={tierForm.provider_id || "none"} 
                    onValueChange={(value) => {
                      setTierForm({ 
                        ...tierForm, 
                        provider_id: value === "none" ? null : value,
                        provider_product_id: null
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {gameProviderApis.map((api) => (
                        <SelectItem key={api.id} value={api.id}>
                          {api.name} ({api.api_type === 'gametopup' ? 'Game Top-Up' : 'Digital Top-Up'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product ID Input */}
                {tierForm.provider_id && (
                  <div className="space-y-2">
                    <Label>Product ID</Label>
                    <Input
                      placeholder="e.g., mlbb_diamonds_100"
                      value={tierForm.provider_product_id || ""}
                      onChange={(e) => setTierForm({ ...tierForm, provider_product_id: e.target.value || null })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the product ID from your provider
                    </p>
                    {tierForm.provider_product_id && (
                      <p className="text-xs text-green-500">
                        ✓ Product ID: {tierForm.provider_product_id}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  Link this tier to a game provider for automatic delivery.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier}>
              Save Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-red-500">
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          
          <p className="text-muted-foreground py-4">
            Are you sure you want to delete <span className="text-foreground font-semibold">"{deleteTarget?.name}"</span>?
            {deleteTarget?.type === "product" && (
              <span className="block mt-2 text-yellow-500">
                ⚠️ This will also delete all associated pricing tiers.
              </span>
            )}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
