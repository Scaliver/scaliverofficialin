import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProductCard from "./ProductCard";

interface Product {
  id: string;
  name: string;
  image: string;
  inStock?: boolean;
}

interface ProductSectionProps {
  title: string;
  products: Product[];
  onViewMore?: () => void;
}

const ProductSection = ({ title, products, onViewMore }: ProductSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent rounded-full" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-wide">
              {title}
            </h2>
          </div>
          <button 
            onClick={onViewMore}
            className="flex items-center gap-1 text-primary hover:text-accent transition-colors font-body font-medium"
          >
            View More
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-6">
          {products.map((product, index) => (
            <div 
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ProductCard
                name={product.name}
                image={product.image}
                inStock={product.inStock}
                onClick={() => navigate(`/product/${product.id}`)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
