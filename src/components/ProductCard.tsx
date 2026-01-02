import { Badge } from "./ui/badge";

interface ProductCardProps {
  name: string;
  image: string;
  inStock?: boolean;
  onClick?: () => void;
}

const ProductCard = ({ name, image, inStock = true, onClick }: ProductCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl bg-card border border-border/50 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />
        
        {/* Glow Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative py-1.5 px-2 bg-gradient-to-r from-primary to-accent">
        <h3 className="font-display text-[10px] md:text-xs font-bold text-primary-foreground text-center uppercase tracking-wide truncate">
          {name}
        </h3>
      </div>

      {/* Stock Badge */}
      {!inStock && (
        <Badge 
          variant="destructive" 
          className="absolute top-3 right-3 font-display text-xs"
        >
          Out of Stock
        </Badge>
      )}

      {/* Border Glow on Hover */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/50 transition-colors duration-300 pointer-events-none" />
    </div>
  );
};

export default ProductCard;
