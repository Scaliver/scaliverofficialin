import { useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Maintenance from "@/pages/Maintenance";
import LoadingSpinner from "@/components/LoadingSpinner";

const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      if (!mounted) return;
      const v = data?.value as { enabled?: boolean } | undefined;
      setEnabled(!!v?.enabled);
    };
    load();

    const channel = supabase
      .channel("maintenance-mode-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.maintenance_mode" },
        (payload) => {
          const v = (payload.new as any)?.value as { enabled?: boolean } | undefined;
          setEnabled(!!v?.enabled);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (enabled === null || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Admins always bypass. Allow /auth so admin can log in during maintenance.
  if (enabled && !isAdmin && location.pathname !== "/auth") {
    return <Maintenance />;
  }

  return <>{children}</>;
};

export default MaintenanceGate;
