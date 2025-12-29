import { Users, Heart, Eye, MessageCircle, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export type InstagramCategory = "followers" | "likes" | "views" | "comments" | "saves";

interface CategoryOption {
  id: InstagramCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

const categories: CategoryOption[] = [
  {
    id: "followers",
    name: "Followers",
    icon: Users,
    gradient: "from-pink-500 via-purple-500 to-indigo-500",
  },
  {
    id: "likes",
    name: "Likes",
    icon: Heart,
    gradient: "from-red-500 via-pink-500 to-rose-500",
  },
  {
    id: "views",
    name: "Views",
    icon: Eye,
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
  },
  {
    id: "comments",
    name: "Comments",
    icon: MessageCircle,
    gradient: "from-green-500 via-emerald-500 to-teal-500",
  },
  {
    id: "saves",
    name: "Saves",
    icon: Bookmark,
    gradient: "from-amber-500 via-orange-500 to-yellow-500",
  },
];

interface InstagramCategorySelectorProps {
  selectedCategory: InstagramCategory;
  onCategoryChange: (category: InstagramCategory) => void;
}

const InstagramCategorySelector = ({
  selectedCategory,
  onCategoryChange,
}: InstagramCategorySelectorProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <h3 className="font-display text-lg font-bold text-foreground mb-4">
        Select Category
      </h3>
      <div className="grid grid-cols-5 gap-2 md:gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl transition-all duration-300",
                "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected
                  ? "bg-gradient-to-br " + category.gradient + " shadow-lg shadow-primary/20"
                  : "bg-secondary/50 hover:bg-secondary border border-border"
              )}
            >
              {/* Instagram-style gradient background for icon */}
              <div
                className={cn(
                  "w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-all",
                  isSelected
                    ? "bg-white/20 backdrop-blur-sm"
                    : "bg-gradient-to-br " + category.gradient
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 md:w-7 md:h-7",
                    isSelected ? "text-white" : "text-white"
                  )}
                />
              </div>
              
              {/* Category name */}
              <span
                className={cn(
                  "font-body text-xs md:text-sm font-medium text-center leading-tight",
                  isSelected ? "text-white" : "text-foreground"
                )}
              >
                {category.name}
              </span>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-primary rounded-full" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InstagramCategorySelector;
