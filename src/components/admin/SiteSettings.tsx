import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2 } from "lucide-react";

const SiteSettings = () => {
  const [isManualRechargeEnabled, setIsManualRechargeEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'manual_recharge_enabled')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const value = data.value as { enabled: boolean };
        setIsManualRechargeEnabled(value.enabled);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleManualRecharge = async () => {
    setIsSaving(true);
    try {
      const newValue = !isManualRechargeEnabled;
      
      const { error } = await supabase
        .from('site_settings')
        .update({ value: { enabled: newValue } })
        .eq('key', 'manual_recharge_enabled');

      if (error) throw error;

      setIsManualRechargeEnabled(newValue);
      toast({
        title: "Success",
        description: `Manual recharge ${newValue ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Site Settings
        </CardTitle>
        <CardDescription>
          Manage site-wide settings and features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="manual-recharge" className="text-base font-medium">
              Manual Recharge Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow users to select manual recharge option on product pages.
              When disabled, only automatic recharge will be available.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Switch
              id="manual-recharge"
              checked={isManualRechargeEnabled}
              onCheckedChange={handleToggleManualRecharge}
              disabled={isSaving}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteSettings;
