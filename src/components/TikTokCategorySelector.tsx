import { Users, Heart, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export type TikTokCategory = "followers" | "likes" | "views";

interface CategoryOption {
  id: TikTokCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

const categories: CategoryOption[] = [
  {
    id: "followers",
    name: "Followers",
    icon: Users,
    gradient: "from-[#69C9D0] via-[#EE1D52] to-[#010101]",
  },
  {
    id: "likes",
    name: "Likes",
    icon: Heart,
    gradient: "from-[#EE1D52] via-[#69C9D0] to-[#EE1D52]",
  },
  {
    id: "views",
    name: "Views",
    icon: Eye,
    gradient: "from-[#010101] via-[#69C9D0] to-[#EE1D52]",
  },
];

interface TikTokCategorySelectorProps {
  selectedCategory: TikTokCategory;
  onCategoryChange: (category: TikTokCategory) => void;
}

const TikTokCategorySelector = ({
  selectedCategory,
  onCategoryChange,
}: TikTokCategorySelectorProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <h3 className="font-display text-lg font-bold text-foreground mb-4">
        Select Category
      </h3>
      <div className="grid grid-cols-3 gap-2 md:gap-4">
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
              {/* TikTok-style gradient background for icon */}
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
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-[#EE1D52] rounded-full" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TikTokCategorySelector;
