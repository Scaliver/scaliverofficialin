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
import { supabase } from "@/integrations/supabase/client";
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

interface SiteAlert {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  alert_type: string;
}

const Index = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [siteAlert, setSiteAlert] = useState<SiteAlert | null>(null);

  useEffect(() => {
    const fetchActiveAlert = async () => {
      try {
        const { data, error } = await supabase
          .from('site_alerts' as any)
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const alertData = data as unknown as SiteAlert;
          setSiteAlert(alertData);
          
          // Check if user has dismissed this specific alert
          const dismissedAlertId = localStorage.getItem("dismissedAlertId");
          if (dismissedAlertId !== alertData.id) {
            setShowAlert(true);
          }
        }
      } catch (error) {
        console.error("Error fetching site alert:", error);
      }
    };

    fetchActiveAlert();
  }, []);

  const handleClose = () => {
    if (dontShowAgain && siteAlert) {
      localStorage.setItem("dismissedAlertId", siteAlert.id);
    }
    setShowAlert(false);
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case "warning":
        return { icon: "⚠️", titleClass: "text-yellow-400" };
      case "success":
        return { icon: "✅", titleClass: "text-green-400" };
      case "error":
        return { icon: "❌", titleClass: "text-red-400" };
      default:
        return { icon: "ℹ️", titleClass: "text-blue-400" };
    }
  };

  const alertStyles = siteAlert ? getAlertStyles(siteAlert.alert_type) : getAlertStyles("info");

  return (
    <div className="min-h-screen bg-background">
      {/* Alert Dialog */}
      <AlertDialog open={showAlert && !!siteAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={alertStyles.titleClass}>
              {alertStyles.icon} {siteAlert?.title || "Important Notice"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {siteAlert?.message}
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
