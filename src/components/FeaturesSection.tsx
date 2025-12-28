import { Zap, Shield, CreditCard, Headphones } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Get your items instantly, 24/7.",
  },
  {
    icon: Shield,
    title: "Secure & Legit",
    description: "Reliable and trusted services.",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "Flexible and secure options.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Always here to help you.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent_70%)]" />

      <div className="container relative">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="font-display text-sm text-primary tracking-widest uppercase">
            # Step into the World of Esports & Gaming
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4">
            Building Heroes in the{" "}
            <span className="text-gradient">Gaming Universe</span>
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all duration-300 card-hover animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 glow-blue">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground">
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
