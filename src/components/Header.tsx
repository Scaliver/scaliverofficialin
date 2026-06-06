import { Menu, Search, User, LogIn, Shield, LogOut, UserPlus, Home, Bell, Globe, UserCircle, Settings, Trophy, Headphones, Gift, FileText, RefreshCw, Lock, Coins } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import HeaderWalletChip from "./HeaderWalletChip";
import ReferEarnDialog from "./ReferEarnDialog";
import logoImg from "@/assets/scaliver-logo.jpeg";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { balance } = useWallet();

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const go = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const menuItems: { icon: any; label: string; onClick: () => void; show?: boolean }[] = [
    { icon: Home, label: "Home", onClick: () => go("/") },
    { icon: Bell, label: "Announcement", onClick: () => go("/#contact") },
    { icon: Globe, label: "Game Name Checker", onClick: () => go("/name-checker") },
    { icon: UserCircle, label: "My Account", onClick: () => go("/profile"), show: !!user },
    { icon: Coins, label: "Wallet", onClick: () => go("/wallet"), show: !!user },
    { icon: Trophy, label: "Leaderboard", onClick: () => go("/leaderboard") },
    { icon: Headphones, label: "Help & Support", onClick: () => { setMobileMenuOpen(false); window.open("https://chat.whatsapp.com/EMhSsDxfiwj2HVVvsIOt0S", "_blank"); } },
    { icon: Gift, label: "Refer & Earn", onClick: () => { setMobileMenuOpen(false); setReferOpen(true); } },
    { icon: Lock, label: "Privacy & Policy", onClick: () => go("/#contact") },
    { icon: FileText, label: "Terms & Condition", onClick: () => go("/#contact") },
    { icon: RefreshCw, label: "Refund Policy", onClick: () => go("/#contact") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 sm:h-16 items-center justify-between px-3 sm:px-6">
        {/* Logo + brand — nudged slightly inward */}
        <div className="flex items-center gap-2 cursor-pointer group pl-1 sm:pl-2" onClick={() => navigate("/")}>
          <div className="relative perspective-[600px]">
            <div className="logo-3d h-9 w-9 sm:h-12 sm:w-12 rounded-full overflow-hidden ring-2 ring-primary/60 shadow-[0_0_15px_hsl(var(--primary)/0.5)] group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.8)] transition-shadow">
              <img src={logoImg} alt="Scaliver Official MLBB Recharge" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/0 via-primary/20 to-accent/30 mix-blend-overlay pointer-events-none animate-pulse" />
          </div>
          <span className="font-display font-extrabold text-sm sm:text-xl tracking-wider text-gradient logo-text-glow">
            <span className="so-letter">S</span>caliver&nbsp;<span className="so-letter">O</span>fficial
          </span>
          <div className="ml-1 sm:ml-2" onClick={(e) => e.stopPropagation()}>
            <HeaderWalletChip />
          </div>
        </div>

        {/* Desktop nav */}
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

        {/* Right-side actions — pushed a little inward */}
        <div className="flex items-center gap-3 pr-1 sm:pr-2">
          <Button variant="ghost" size="icon" className="hidden md:flex" aria-label="Search">
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
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile drawer menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[78vw] max-w-[320px] p-0 bg-background border-r border-border overflow-y-auto">
          <SheetTitle className="sr-only">Main menu</SheetTitle>
          <SheetDescription className="sr-only">Navigate the app and manage your account.</SheetDescription>

          {/* Brand */}
          <div className="flex items-center gap-2 px-4 pt-5 pb-3">
            <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-primary/60">
              <img src={logoImg} alt="Scaliver Official logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-extrabold text-base text-gradient">Scaliver Official</span>
          </div>

          {/* Coin wallet card */}
          {user ? (
            <div className="mx-4 mb-3 rounded-xl p-3 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
              <p className="text-[11px] uppercase tracking-wider opacity-90">SO Coin Wallet</p>
              <p className="font-display text-2xl font-bold">₹ {balance.toFixed(2)}</p>
              <button
                onClick={() => go("/add-coin")}
                className="mt-1 text-xs font-semibold underline underline-offset-2 opacity-95"
              >
                + Add Coins
              </button>
            </div>
          ) : (
            <div className="mx-4 mb-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-9 text-xs" onClick={() => go("/auth")}>
                <LogIn className="h-3.5 w-3.5 mr-1.5" /> Login
              </Button>
              <Button size="sm" variant="gaming" className="flex-1 h-9 text-xs" onClick={() => go("/auth?signup=true")}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Sign Up
              </Button>
            </div>
          )}

          {/* Menu items */}
          <nav className="px-2 pb-4">
            {menuItems.filter(m => m.show !== false).map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-left"
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="font-body text-sm text-foreground">{label}</span>
              </button>
            ))}

            {isAdmin && (
              <Button
                variant="gaming"
                size="sm"
                onClick={() => go("/admin")}
                className="w-full mt-2 flex items-center justify-center gap-2 h-9 text-xs"
              >
                <Shield className="w-3.5 h-3.5" /> Admin Dashboard
              </Button>
            )}
            {user && (
              <Button variant="outline" size="sm" className="w-full mt-2 h-9 text-xs" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
              </Button>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <ReferEarnDialog open={referOpen} onOpenChange={setReferOpen} />
    </header>
  );
};

export default Header;
