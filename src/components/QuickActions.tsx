import { useNavigate } from "react-router-dom";
import { Wallet, ShoppingCart, Gavel, PlusCircle, Trophy } from "lucide-react";

const actions = [
  { icon: PlusCircle, label: "Add Coin", path: "/add-coin" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: Gavel, label: "Auction", path: "/auction" },
  { icon: Trophy, label: "Top Buyers", path: "/leaderboard" },
  { icon: ShoppingCart, label: "Orders", path: "/orders" },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="px-3 py-4 sm:px-4 sm:py-6">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3 max-w-md mx-auto md:max-w-3xl">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="group flex flex-col items-center"
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-red-700 border border-primary-foreground/20 shadow-md shadow-primary/30 flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95">
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <span className="font-body text-[10px] sm:text-xs text-foreground mt-1 font-medium text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
