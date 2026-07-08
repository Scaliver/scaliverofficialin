import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";
import PageTransition from "@/components/PageTransition";
import LoadingSpinner from "@/components/LoadingSpinner";
import MaintenanceGate from "@/components/MaintenanceGate";
import Index from "./pages/Index";
import { LANDING_SLUGS } from "./pages/SeoLanding";

// Lazy-load secondary routes so the homepage ships less JS upfront.
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Wallet = lazy(() => import("./pages/Wallet"));
const AddCoin = lazy(() => import("./pages/AddCoin"));
const Orders = lazy(() => import("./pages/Orders"));
const History = lazy(() => import("./pages/History"));
const Redeem = lazy(() => import("./pages/Redeem"));
const LeaderboardPage = lazy(() => import("./pages/Leaderboard"));
const Auction = lazy(() => import("./pages/Auction"));
const AuctionDetail = lazy(() => import("./pages/AuctionDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentDetect = lazy(() => import("./pages/PaymentDetect"));
const SeoLanding = lazy(() => import("./pages/SeoLanding"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const NameChecker = lazy(() => import("./pages/NameChecker"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
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
          <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms-and-conditions" element={<PageTransition><TermsAndConditions /></PageTransition>} />
          <Route path="/refund-policy" element={<PageTransition><RefundPolicy /></PageTransition>} />
          <Route path="/help-support" element={<PageTransition><HelpSupport /></PageTransition>} />
          <Route path="/name-checker" element={<PageTransition><NameChecker /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          {LANDING_SLUGS.map((s) => (
            <Route key={s} path={`/${s}`} element={<PageTransition><SeoLanding /></PageTransition>} />
          ))}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
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
