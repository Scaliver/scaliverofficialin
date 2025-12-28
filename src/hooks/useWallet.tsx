import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  reference_id: string | null;
  created_at: string;
}

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const fetchWallet = async () => {
      setIsLoading(true);
      
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) {
        console.error("Error fetching wallet:", walletError);
      } else {
        setWallet(walletData);
      }

      const { data: txData, error: txError } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (txError) {
        console.error("Error fetching transactions:", txError);
      } else {
        setTransactions((txData || []) as CoinTransaction[]);
      }

      setIsLoading(false);
    };

    fetchWallet();

    // Subscribe to real-time updates
    const walletChannel = supabase
      .channel("wallet-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setWallet(payload.new as Wallet);
          }
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel("transaction-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coin_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setTransactions((prev) => [payload.new as CoinTransaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user]);

  return {
    wallet,
    transactions,
    isLoading,
    balance: wallet?.balance || 0,
  };
};
