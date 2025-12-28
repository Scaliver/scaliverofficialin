import { Phone, MessageCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contact" className="bg-card border-t border-border">
      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-blue">
                <span className="font-display font-bold text-lg text-primary-foreground">S</span>
              </div>
              <span className="font-display font-bold text-xl tracking-wider text-gradient">
                Scaliver Official
              </span>
            </div>
            <p className="font-body text-muted-foreground max-w-md mb-6">
              Welcome to Scaliver Official! Discover in-game currencies for Mobile Legends, BGMI, PUBG, Genshin Impact, and more. Enjoy fast, reliable service and exceptional customer support.
            </p>
            
            {/* Contact */}
            <div className="space-y-2">
              <p className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">
                Support
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-body">+91 1234567890</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="w-4 h-4 text-primary" />
                <a href="#" className="font-body hover:text-primary transition-colors">
                  Click here to join WhatsApp channel
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {["Home", "Login", "Register", "Contact"].map((link) => (
                <li key={link}>
                  <a href="#" className="font-body text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Important Pages */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Important Pages
            </h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms & Conditions", "Refund Policy"].map((link) => (
                <li key={link}>
                  <a href="#" className="font-body text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>

            {/* Payment */}
            <div className="mt-6">
              <h4 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                Payment Modes
              </h4>
              <div className="flex gap-3">
                <div className="h-10 w-16 bg-secondary rounded-lg flex items-center justify-center">
                  <span className="font-body text-xs text-muted-foreground">GPay</span>
                </div>
                <div className="h-10 w-16 bg-secondary rounded-lg flex items-center justify-center">
                  <span className="font-body text-xs text-muted-foreground">UPI</span>
                </div>
                <div className="h-10 w-16 bg-secondary rounded-lg flex items-center justify-center">
                  <span className="font-body text-xs text-muted-foreground">PhonePe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container py-4 text-center">
          <p className="font-body text-sm text-muted-foreground">
            All Rights Reserved © 2024 | Scaliver Official
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
