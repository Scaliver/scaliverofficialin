import { Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer id="contact" className="bg-card border-t border-border">
      <div className="container py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-blue">
                <span className="font-display font-bold text-xs text-primary-foreground">S</span>
              </div>
              <span className="font-display font-bold text-sm tracking-wider text-gradient">
                Scaliver Official
              </span>
            </div>
            <p className="font-body text-[11px] leading-snug text-muted-foreground max-w-md mb-3">
              Your one-stop shop for in-game currencies across Mobile Legends, BGMI, PUBG, Genshin Impact and more. Fast, reliable, 24/7 support.
            </p>

            <p className="font-display text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
              Support
            </p>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Phone className="w-3 h-3 text-primary" />
              <span className="font-body">+91 7637851804</span>
            </div>
            <div className="flex items-start gap-1.5 text-muted-foreground text-[11px] mt-0.5">
              <MessageCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <a href="https://chat.whatsapp.com/EMhSsDxfiwj2HVVvsIOt0S" target="_blank" rel="noopener noreferrer" className="font-body hover:text-primary transition-colors leading-snug">
                Join my WhatsApp channel
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2">
              Quick Links
            </h4>
            <ul className="space-y-1">
              <li><Link to="/" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/auth" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Login</Link></li>
              <li><Link to="/auth" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Register</Link></li>
              <li><Link to="/help-support" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2">
              Important
            </h4>
            <ul className="space-y-1">
              <li><Link to="/privacy-policy" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/refund-policy" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link></li>
              <li><Link to="/help-support" className="font-body text-[11px] text-muted-foreground hover:text-primary transition-colors">Help & Support</Link></li>
            </ul>

            <h4 className="font-display text-[11px] font-semibold text-foreground uppercase tracking-wider mt-3 mb-1.5">
              Payment Modes
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {["GPay", "UPI", "PhonePe"].map(p => (
                <div key={p} className="h-6 px-2 bg-secondary rounded flex items-center justify-center">
                  <span className="font-body text-[10px] text-muted-foreground">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container py-2 text-center">
          <p className="font-body text-[10px] text-muted-foreground">
            All Rights Reserved © 2024 | Scaliver Official
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
