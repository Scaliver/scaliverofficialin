import { Menu, Search, User, LogIn } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-blue">
              <span className="font-display font-bold text-lg text-primary-foreground">S</span>
            </div>
          </div>
          <span className="font-display font-bold text-xl tracking-wider text-gradient">
            SCALIVER
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="font-body text-lg font-medium text-foreground hover:text-primary transition-colors">
            Home
          </a>
          <a href="#games" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
            Games
          </a>
          <a href="#contact" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
            Contact Us
          </a>
          <a href="#account" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
            My Account
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="gaming" className="hidden md:flex gap-2">
            <LogIn className="h-4 w-4" />
            Login
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card animate-fade-in">
          <nav className="container py-4 flex flex-col gap-4">
            <a href="#" className="font-body text-lg font-medium text-foreground hover:text-primary transition-colors">
              Home
            </a>
            <a href="#games" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
              Games
            </a>
            <a href="#contact" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
              Contact Us
            </a>
            <a href="#account" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
              My Account
            </a>
            <Button variant="gaming" className="w-full mt-2">
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
