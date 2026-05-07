import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useReseller = () => {
  const { user } = useAuth();
  const [isReseller, setIsReseller] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
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
        if (user) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          if (mounted) setIsReseller((roles || []).some((r: any) => r.role === "reseller"));
        } else if (mounted) {
          setIsReseller(false);
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

  return { isReseller, discountPercent, applyDiscount, loading };
};
