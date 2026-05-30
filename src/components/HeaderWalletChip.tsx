import { Coins, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";

const HeaderWalletChip = () => {
  const { user } = useAuth();
  const { balance } = useWallet();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/wallet")}
      className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-9 px-2 sm:px-3 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/30 hover:border-primary transition-all shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
      aria-label="Wallet balance, click to view or add coins"
    >
      <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
      <span className="font-display font-bold text-foreground text-xs sm:text-sm leading-none">
        {balance.toFixed(0)}
      </span>
      <span
        onClick={(e) => { e.stopPropagation(); navigate("/add-coin"); }}
        className="ml-1 sm:ml-1.5 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform"
        role="button"
        aria-label="Add coins"
      >
        <Plus className="w-3 h-3" strokeWidth={3} />
      </span>
    </button>
  );
};

export default HeaderWalletChip;
