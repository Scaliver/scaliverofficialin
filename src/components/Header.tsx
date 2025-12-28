import { Menu, Search, User, LogIn, Shield, LogOut, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="relative">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-blue">
              <span className="font-display font-bold text-lg text-primary-foreground">S</span>
            </div>
          </div>
          <span className="font-display font-bold text-xl tracking-wider text-gradient">
            Scaliver Official
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="/" className="font-body text-lg font-medium text-foreground hover:text-primary transition-colors">
            Home
          </a>
          <a href="/#games" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
            Games
          </a>
          <a href="/#contact" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
            Contact Us
          </a>
          {user && (
            <button 
              onClick={() => navigate("/profile")}
              className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              My Account
            </button>
          )}
          {isAdmin && (
            <Button 
              variant="gaming"
              size="sm"
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Dashboard
            </Button>
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
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
              <Button variant="gaming" onClick={() => navigate("/auth?signup=true")}>
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card animate-fade-in">
          <nav className="container py-4 flex flex-col gap-4">
            <a href="/" className="font-body text-lg font-medium text-foreground hover:text-primary transition-colors">
              Home
            </a>
            <a href="/#games" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
              Games
            </a>
            <a href="/#contact" className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors">
              Contact Us
            </a>
            {user && (
              <button 
                onClick={() => { navigate("/profile"); setMobileMenuOpen(false); }}
                className="font-body text-lg font-medium text-muted-foreground hover:text-primary transition-colors text-left"
              >
                My Account
              </button>
            )}
            {isAdmin && (
              <Button 
                variant="gaming"
                onClick={() => { navigate("/admin"); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Admin Dashboard
              </Button>
            )}
            {user ? (
              <Button variant="outline" className="w-full mt-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <Button variant="outline" className="w-full" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button variant="gaming" className="w-full" onClick={() => { navigate("/auth?signup=true"); setMobileMenuOpen(false); }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
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
