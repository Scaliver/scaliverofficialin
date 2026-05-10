import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TierLike {
  id: string;
  price: number;
}

export const useReseller = () => {
  const { user } = useAuth();
  const [isReseller, setIsReseller] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: setting } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "reseller_discount_percent")
          .maybeSingle();
        if (mounted && setting?.value) {
          const v = setting.value as { percent?: number };
          setDiscountPercent(Number(v.percent) || 0);
        }

        let resellerNow = false;
        if (user) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          resellerNow = (roles || []).some((r: any) => r.role === "reseller");
          if (mounted) setIsReseller(resellerNow);
        } else if (mounted) {
          setIsReseller(false);
        }

        // Load per-tier overrides only when needed (resellers see them)
        if (resellerNow) {
          const { data: rp } = await supabase
            .from("reseller_prices" as any)
            .select("tier_id, price");
          if (mounted && rp) {
            const map: Record<string, number> = {};
            (rp as any[]).forEach((r) => { map[r.tier_id] = Number(r.price); });
            setOverrides(map);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const applyDiscount = (price: number) => {
    if (!isReseller || !discountPercent) return price;
    return Math.max(0, Math.round(price * (1 - discountPercent / 100)));
  };

  const getTierPrice = useCallback((tier: TierLike) => {
    if (!isReseller) return tier.price;
    if (overrides[tier.id] != null) return overrides[tier.id];
    return applyDiscount(tier.price);
  }, [isReseller, overrides, discountPercent]);

  return { isReseller, discountPercent, applyDiscount, getTierPrice, loading };
};
