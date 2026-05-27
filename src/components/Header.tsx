import { Menu, Search, User, LogIn, Shield, LogOut, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logoImg from "@/assets/scaliver-logo.jpeg";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 sm:h-16 items-center justify-between">
        {/* Logo with 3D animated emblem */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate("/")}>
          <div className="relative perspective-[600px]">
            <div className="logo-3d h-9 w-9 sm:h-12 sm:w-12 rounded-full overflow-hidden ring-2 ring-primary/60 shadow-[0_0_15px_hsl(var(--primary)/0.5)] group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.8)] transition-shadow">
              <img src={logoImg} alt="Scaliver Official MLBB Recharge" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/0 via-primary/20 to-accent/30 mix-blend-overlay pointer-events-none animate-pulse" />
          </div>
          <span className="font-display font-extrabold text-sm sm:text-xl tracking-wider text-gradient logo-text-glow">
            <span className="so-letter">S</span>caliver&nbsp;<span className="so-letter">O</span>fficial
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="/" className="font-body text-lg font-medium text-foreground hover:text-primary transition-colors">Home</a>
          <a href="/#games" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">Games</a>
          <a href="/#contact" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">Contact Us</a>
          <button onClick={() => navigate("/redeem")} className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">Redeem</button>

          {isAdmin && (
            <Button variant="gaming" size="sm" onClick={() => navigate("/admin")} className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Admin
            </Button>
          )}
          {user && (
            <button onClick={() => navigate("/profile")} className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">My Account</button>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Search className="h-5 w-5" />
          </Button>
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 mr-2" /> Profile
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4 mr-2" /> Login
              </Button>
              <Button variant="gaming" onClick={() => navigate("/auth?signup=true")}>
                <UserPlus className="h-4 w-4 mr-2" /> Sign Up
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu — compact sizing */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card animate-fade-in">
          <nav className="container py-2 flex flex-col gap-1.5">
            <a href="/" className="font-body text-sm font-medium text-foreground hover:text-primary transition-colors py-1.5">Home</a>
            <a href="/#games" className="font-body text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-1.5">Games</a>
            <a href="/#contact" className="font-body text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-1.5">Contact Us</a>
            <button
              onClick={() => { navigate("/redeem"); setMobileMenuOpen(false); }}
              className="font-body text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left py-1.5"
            >
              Redeem
            </button>

            {user && (
              <button
                onClick={() => { navigate("/profile"); setMobileMenuOpen(false); }}
                className="font-body text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left py-1.5"
              >
                My Account
              </button>
            )}
            {isAdmin && (
              <Button
                variant="gaming"
                size="sm"
                onClick={() => { navigate("/admin"); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 h-8 text-xs"
              >
                <Shield className="w-3.5 h-3.5" /> Admin Dashboard
              </Button>
            )}
            {user ? (
              <Button variant="outline" size="sm" className="w-full mt-1 h-8 text-xs" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
              </Button>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                  <LogIn className="h-3.5 w-3.5 mr-1.5" /> Login
                </Button>
                <Button variant="gaming" size="sm" className="w-full h-8 text-xs" onClick={() => { navigate("/auth?signup=true"); setMobileMenuOpen(false); }}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Sign Up
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
