import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import whyChooseUsImage from "@/assets/why-choose-us.png";
import banner1Image from "@/assets/banner-1.jpeg";
import banner2Image from "@/assets/banner-2.jpeg";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const defaultBanners = [
  {
    id: "1",
    title: "SCALIVER OFFICIAL",
    subtitle: "",
    gradient: "",
    image: banner1Image,
  },
  {
    id: "2",
    title: "SCALIVER MLBB RECHARGE",
    subtitle: "",
    gradient: "",
    image: banner2Image,
  },
  {
    id: "3",
    title: "WHY CHOOSE US?",
    subtitle: "",
    gradient: "from-indigo-600 via-blue-700 to-cyan-800",
    image: whyChooseUsImage,
  },
];

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<{ id: string; title: string; subtitle?: string; gradient?: string; image: string }[]>(defaultBanners);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const dbBanners = data.map((banner: Banner) => ({
            id: banner.id,
            title: banner.title,
            subtitle: "",
            gradient: "",
            image: banner.image_url,
          }));
          setBanners(dbBanners);
        }
        // If no banners in DB, keep default banners
      } catch (error) {
        console.error("Error fetching banners:", error);
        // Keep default banners on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);

  if (isLoading) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative h-[220px] md:h-[320px] lg:h-[400px] bg-secondary animate-pulse" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[220px] md:h-[320px] lg:h-[400px]">
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
                  width={1600}
                  height={400}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-contain bg-black"
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
