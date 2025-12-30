import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import whyChooseUsImage from "@/assets/why-choose-us.png";

const banners = [
  {
    id: 1,
    title: "MOBILE LEGENDS TOP UP",
    subtitle: "Get the best prices on diamonds and passes",
    gradient: "from-blue-600 via-blue-800 to-indigo-900",
    image: null,
  },
  {
    id: 2,
    title: "INSTANT DELIVERY",
    subtitle: "Experience the fastest and most reliable way to top up",
    gradient: "from-cyan-600 via-blue-700 to-blue-900",
    image: null,
  },
  {
    id: 3,
    title: "WHY CHOOSE US?",
    subtitle: "",
    gradient: "from-indigo-600 via-blue-700 to-cyan-800",
    image: whyChooseUsImage,
  },
];

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[200px] md:h-[280px] lg:h-[320px]">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-700 ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          >
            <div className={`h-full w-full ${banner.image ? '' : `bg-gradient-to-br ${banner.gradient}`} relative`}>
              {/* Background Image for specific banners */}
              {banner.image && (
                <img 
                  src={banner.image} 
                  alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              )}
              
              {/* Animated Background Pattern - only show when no image */}
              {!banner.image && (
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-primary/30 rounded-full blur-3xl animate-float" />
                  <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
                  <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-float" style={{ animationDelay: "0.5s" }} />
                </div>
              )}
              
              {/* Grid Pattern Overlay - only show when no image */}
              {!banner.image && (
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
              )}
              
              {/* Content - only show when no image */}
              {!banner.image && (
                <div className="container relative h-full flex flex-col justify-center items-center text-center">
                  <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in">
                    {banner.title}
                  </h2>
                  <p className="font-body text-lg md:text-xl text-foreground/80 max-w-2xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
                    {banner.subtitle}
                  </p>
                  <Button variant="gaming" size="lg" className="mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
                    Shop Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/30 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/50 transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/30 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/50 transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide ? "w-8 bg-primary" : "w-2 bg-foreground/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroBanner;
