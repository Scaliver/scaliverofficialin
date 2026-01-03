import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Helper functions to match old products.ts API
  const getProductBySlug = (slug: string) => {
    return productsWithTiers?.find(p => p.slug === slug);
  };

  const getProductsByCategory = (category: string) => {
    return productsWithTiers?.filter(p => p.category === category);
  };

  const getProductBySubCategory = (subCategory: string) => {
    return productsWithTiers?.find(p => p.sub_category === subCategory);
  };

  return {
    products: productsWithTiers || [],
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
    
    // Loading states
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    
    // Helpers
    getProductBySlug,
    getProductsByCategory,
    getProductBySubCategory,
  };
};
