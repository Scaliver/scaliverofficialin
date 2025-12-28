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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-2 px-4 md:hidden">
      <div className="grid grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="group flex flex-col items-center"
          >
            <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-red-700 border-2 border-primary-foreground/20 shadow-lg shadow-primary/30 flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95">
              <action.icon className="w-7 h-7 text-primary-foreground" />
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
