import { useState, useEffect } from "react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import MarqueeBanner from "@/components/MarqueeBanner";
import ProductSection from "@/components/ProductSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import QuickActions from "@/components/QuickActions";
import WhatsAppButton from "@/components/WhatsAppButton";
import { mobileLegendsProducts, mobileGamesProducts, socialMediaDisplayProducts } from "@/data/products";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const Index = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hideAlert = localStorage.getItem("hideGamesApiAlert");
    if (!hideAlert) {
      setShowAlert(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("hideGamesApiAlert", "true");
    }
    setShowAlert(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Important Notice</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Kindly please order only <strong>Social Media services</strong> as the Games API has not been integrated yet. Thank you for your understanding!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox 
              id="dontShowAgain" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label htmlFor="dontShowAgain" className="text-sm cursor-pointer">
              Don't show this again
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <Header />

      {/* Hero Banner Carousel */}
      <HeroBanner />

      {/* Scrolling Marquee */}
      <MarqueeBanner />

      {/* Product Sections */}
      <main id="games" className="pb-8">
        {/* Quick Actions - Easy access to wallet features */}
        <QuickActions />

        <ProductSection
          title="Mobile Legends"
          products={mobileLegendsProducts}
        />

        <ProductSection
          title="Mobile Games"
          products={mobileGamesProducts}
        />

        <ProductSection
          title="Social Media"
          products={socialMediaDisplayProducts}
        />

        {/* Features Section */}
        <FeaturesSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Quick Actions */}
      <QuickActions />

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </div>
  );
};

export default Index;
