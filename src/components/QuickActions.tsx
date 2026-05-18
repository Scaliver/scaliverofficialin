import { useNavigate } from "react-router-dom";
import { Wallet, ShoppingCart, Gift, PlusCircle, Trophy } from "lucide-react";

const actions = [
  { icon: PlusCircle, label: "Add Coin", path: "/add-coin" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: Gift, label: "Redeem", path: "/redeem" },
  { icon: Trophy, label: "Top Buyers", path: "/leaderboard" },
  { icon: ShoppingCart, label: "Orders", path: "/orders" },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6">
      <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-md mx-auto md:max-w-3xl">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="group flex flex-col items-center"
          >
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-primary to-red-700 border-2 border-primary-foreground/20 shadow-lg shadow-primary/30 flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95">
              <action.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary-foreground" />
            </div>
            <span className="font-body text-[11px] sm:text-xs text-foreground mt-1.5 font-medium text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
