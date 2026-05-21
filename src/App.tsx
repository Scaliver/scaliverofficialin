import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Wallet from "./pages/Wallet";
import AddCoin from "./pages/AddCoin";
import Orders from "./pages/Orders";
import History from "./pages/History";
import Redeem from "./pages/Redeem";
import LeaderboardPage from "./pages/Leaderboard";
import Auction from "./pages/Auction";
import AuctionDetail from "./pages/AuctionDetail";
import NotFound from "./pages/NotFound";
import PaymentDetect from "./pages/PaymentDetect";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/product/:productId" element={<PageTransition><ProductDetail /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
        <Route path="/wallet" element={<PageTransition><Wallet /></PageTransition>} />
        <Route path="/add-coin" element={<PageTransition><AddCoin /></PageTransition>} />
        <Route path="/orders" element={<PageTransition><Orders /></PageTransition>} />
        <Route path="/history" element={<PageTransition><History /></PageTransition>} />
        <Route path="/redeem" element={<PageTransition><Redeem /></PageTransition>} />
        <Route path="/leaderboard" element={<PageTransition><LeaderboardPage /></PageTransition>} />
        <Route path="/auction" element={<PageTransition><Auction /></PageTransition>} />
        <Route path="/auction/:id" element={<PageTransition><AuctionDetail /></PageTransition>} />
        <Route path="/payment-detect" element={<PageTransition><PaymentDetect /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
