import { Wallet, Receipt, Clock, PlusCircle } from "lucide-react";

const actions = [
  { icon: PlusCircle, label: "Add Coin", color: "from-blue-500 to-cyan-500" },
  { icon: Wallet, label: "Wallet", color: "from-indigo-500 to-blue-500" },
  { icon: Receipt, label: "Orders", color: "from-cyan-500 to-teal-500" },
  { icon: Clock, label: "History", color: "from-blue-600 to-indigo-600" },
];

const QuickActions = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-card/95 backdrop-blur-md border-t border-border">
      <div className="grid grid-cols-4 gap-1 p-2">
        {actions.map((action) => (
          <button
            key={action.label}
            className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color}`}>
              <action.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-body text-xs text-muted-foreground">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
