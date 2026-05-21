import { Zap, Shield, CreditCard, Headphones } from "lucide-react";

const features = [
  { icon: Zap, title: "Instant Delivery", description: "Get your items instantly, 24/7." },
  { icon: Shield, title: "Secure & Legit", description: "Reliable and trusted services." },
  { icon: CreditCard, title: "Easy Payments", description: "Flexible and secure options." },
  { icon: Headphones, title: "24/7 Support", description: "Always here to help you." },
];

const FeaturesSection = () => {
  return (
    <section className="py-8 sm:py-12 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent_70%)]" />

      <div className="container relative">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="font-display text-xl sm:text-3xl lg:text-5xl font-bold text-foreground">
            Why Choose <span className="text-gradient">Us</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 card-hover animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300 glow-blue">
                <feature.icon className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-1">
                {feature.title}
              </h3>
              <p className="font-body text-xs sm:text-sm text-muted-foreground leading-snug">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
