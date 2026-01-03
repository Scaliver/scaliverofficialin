import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getProductImage } from '@/lib/productImages';

export interface PricingTier {
  id: string;
  product_id: string;
  amount: string;
  price: number;
  bonus: string | null;
  smm_service_id: string | null;
  quantity: number | null;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  in_stock: boolean;
  category: string;
  description: string | null;
  instructions: string[];
  is_social_media: boolean;
  sub_category: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  pricing_tiers?: PricingTier[];
}

export interface ProductFormData {
  name: string;
  slug: string;
  image_url: string | null;
  in_stock: boolean;
  category: string;
  description: string | null;
  instructions: string[];
  is_social_media: boolean;
  sub_category: string | null;
  sort_order: number;
}

export interface PricingTierFormData {
  amount: string;
  price: number;
  bonus: string | null;
  smm_service_id: string | null;
  quantity: number | null;
  sort_order: number;
}

// Legacy interface for compatibility with existing components
export interface LegacyProduct {
  id: string;
  name: string;
  image: string;
  inStock: boolean;
  category: string;
  description: string;
  instructions?: string[];
  isSocialMedia?: boolean;
  instagramSubCategory?: string;
  facebookSubCategory?: string;
  tiktokSubCategory?: string;
  pricingTiers: {
    id: string;
    amount: string;
    price: number;
    bonus?: string;
    smmServiceId?: string;
    quantity?: number;
  }[];
}

// Convert database product to legacy format for frontend components
const toLegacyProduct = (product: Product): LegacyProduct => ({
  id: product.slug, // Use slug as ID for URL compatibility
  name: product.name,
  image: getProductImage(product.image_url),
  inStock: product.in_stock,
  category: product.category,
  description: product.description || '',
  instructions: product.instructions,
  isSocialMedia: product.is_social_media,
  instagramSubCategory: product.sub_category && product.category === 'Social Media' && product.name.toLowerCase().includes('instagram') ? product.sub_category : undefined,
  facebookSubCategory: product.sub_category && product.category === 'Social Media' && product.name.toLowerCase().includes('facebook') ? product.sub_category : undefined,
  tiktokSubCategory: product.sub_category && product.category === 'Social Media' && product.name.toLowerCase().includes('tiktok') ? product.sub_category : undefined,
  pricingTiers: (product.pricing_tiers || []).map(tier => ({
    id: tier.id,
    amount: tier.amount,
    price: tier.price,
    bonus: tier.bonus || undefined,
    smmServiceId: tier.smm_service_id || undefined,
    quantity: tier.quantity || undefined,
  })),
});

export const useProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products' as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const pricingTiersQuery = useQuery({
    queryKey: ['pricing_tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_tiers' as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as PricingTier[];
    },
  });

  // Combined products with their pricing tiers
  const productsWithTiers = productsQuery.data?.map(product => ({
    ...product,
    pricing_tiers: pricingTiersQuery.data?.filter(tier => tier.product_id === product.id) || [],
  }));

  // Legacy format products for frontend compatibility
  const legacyProducts = productsWithTiers?.map(toLegacyProduct) || [];

  const createProductMutation = useMutation({
    mutationFn: async (product: ProductFormData) => {
      const { data, error } = await supabase
        .from('products' as any)
        .insert(product as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product Created', description: 'Product has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, product }: { id: string; product: Partial<ProductFormData> }) => {
      const { data, error } = await supabase
        .from('products' as any)
        .update(product as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product Updated', description: 'Product has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pricing_tiers'] });
      toast({ title: 'Product Deleted', description: 'Product has been deleted successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createPricingTierMutation = useMutation({
    mutationFn: async ({ productId, tier }: { productId: string; tier: PricingTierFormData }) => {
      const { data, error } = await supabase
        .from('pricing_tiers' as any)
        .insert({ ...tier, product_id: productId } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PricingTier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing_tiers'] });
      toast({ title: 'Tier Added', description: 'Pricing tier has been added.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePricingTierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: Partial<PricingTierFormData> }) => {
      const { data, error } = await supabase
        .from('pricing_tiers' as any)
        .update(tier as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PricingTier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing_tiers'] });
      toast({ title: 'Tier Updated', description: 'Pricing tier has been updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deletePricingTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pricing_tiers' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing_tiers'] });
      toast({ title: 'Tier Deleted', description: 'Pricing tier has been deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Upload product image
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Helper functions for frontend compatibility
  const getProductBySlug = (slug: string): LegacyProduct | undefined => {
    return legacyProducts.find(p => p.id === slug);
  };

  const getProductsByCategory = (category: string): LegacyProduct[] => {
    return legacyProducts.filter(p => p.category === category);
  };

  const getProductBySubCategory = (subCategory: string): LegacyProduct | undefined => {
    return legacyProducts.find(p => 
      p.instagramSubCategory === subCategory || 
      p.facebookSubCategory === subCategory || 
      p.tiktokSubCategory === subCategory
    );
  };

  // Get main products for display (exclude sub-products)
  const getDisplayProducts = (category: string): LegacyProduct[] => {
    return legacyProducts.filter(p => 
      p.category === category && 
      !p.instagramSubCategory && 
      !p.facebookSubCategory && 
      !p.tiktokSubCategory
    );
  };

  return {
    products: productsWithTiers || [],
    legacyProducts,
    isLoading: productsQuery.isLoading || pricingTiersQuery.isLoading,
    error: productsQuery.error || pricingTiersQuery.error,
    refetch: () => {
      productsQuery.refetch();
      pricingTiersQuery.refetch();
    },
    
    // Mutations
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    createPricingTier: createPricingTierMutation.mutateAsync,
    updatePricingTier: updatePricingTierMutation.mutateAsync,
    deletePricingTier: deletePricingTierMutation.mutateAsync,
    uploadImage,
    
    // Loading states
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    
    // Helpers for frontend
    getProductBySlug,
    getProductsByCategory,
    getProductBySubCategory,
    getDisplayProducts,
  };
};
