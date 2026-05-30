import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useCryptoWallet = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setBalance(0); setIsLoading(false); return; }
    const { data } = await supabase
      .from("crypto_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(Number(data?.balance ?? 0));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`crypto-wallet-${user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "crypto_wallets",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = (payload.new as { balance?: number }) ?? null;
        if (row && typeof row.balance !== "undefined") setBalance(Number(row.balance));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  return { balance, isLoading, refresh };
};

export const useUsdtRate = () => {
  const [rate, setRate] = useState<number>(100);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "usdt_to_inr_rate")
        .maybeSingle();
      const v = data?.value;
      const parsed = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(parsed) && parsed > 0) setRate(parsed);
    })();
  }, []);
  return rate;
};
