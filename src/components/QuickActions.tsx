import { useNavigate } from "react-router-dom";
import { Wallet, ShoppingCart, Clock, PlusCircle } from "lucide-react";

const actions = [
  { icon: PlusCircle, label: "Add Coin", path: "/add-coin" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: ShoppingCart, label: "Orders", path: "/orders" },
  { icon: Clock, label: "History", path: "/history" },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6">
      <div className="grid grid-cols-4 gap-3 max-w-md mx-auto md:max-w-2xl">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="group flex flex-col items-center"
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-primary to-red-700 border-2 border-primary-foreground/20 shadow-lg shadow-primary/30 flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95">
              <action.icon className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
            </div>
            <span className="font-body text-xs text-foreground mt-1.5 font-medium">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
