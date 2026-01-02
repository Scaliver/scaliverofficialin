import { UserPlus, Users, ThumbsUp, Eye, Clock, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export type FacebookCategory = "profile-followers" | "page-followers" | "likes" | "views" | "watch-time" | "reactions";

interface CategoryOption {
  id: FacebookCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

const categories: CategoryOption[] = [
  {
    id: "profile-followers",
    name: "Profile Followers",
    icon: UserPlus,
    gradient: "from-blue-600 via-blue-500 to-blue-400",
  },
  {
    id: "page-followers",
    name: "Page Followers",
    icon: Users,
    gradient: "from-blue-700 via-blue-600 to-blue-500",
  },
  {
    id: "likes",
    name: "Likes",
    icon: ThumbsUp,
    gradient: "from-blue-500 via-blue-400 to-sky-400",
  },
  {
    id: "views",
    name: "Views",
    icon: Eye,
    gradient: "from-cyan-500 via-teal-500 to-blue-500",
  },
  {
    id: "watch-time",
    name: "Watch Time",
    icon: Clock,
    gradient: "from-purple-500 via-blue-500 to-indigo-500",
  },
  {
    id: "reactions",
    name: "Reactions",
    icon: Heart,
    gradient: "from-red-500 via-pink-500 to-purple-500",
  },
];

interface FacebookCategorySelectorProps {
  selectedCategory: FacebookCategory;
  onCategoryChange: (category: FacebookCategory) => void;
}

const FacebookCategorySelector = ({
  selectedCategory,
  onCategoryChange,
}: FacebookCategorySelectorProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <h3 className="font-display text-lg font-bold text-foreground mb-4">
        Select Category
      </h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
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
              {/* Facebook-style gradient background for icon */}
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
                  "font-body text-[10px] md:text-sm font-medium text-center leading-tight",
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

export default FacebookCategorySelector;
