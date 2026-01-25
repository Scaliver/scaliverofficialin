import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, Image } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const BannerManagement = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newBanner, setNewBanner] = useState({ title: "", file: null as File | null });
  const { toast } = useToast();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast({
        title: "Error",
        description: "Failed to fetch banners",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewBanner({ ...newBanner, file: e.target.files[0] });
    }
  };

  const handleAddBanner = async () => {
    if (!newBanner.title || !newBanner.file) {
      toast({
        title: "Error",
        description: "Please provide a title and select an image",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload image to storage
      const fileExt = newBanner.file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, newBanner.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      // Get max sort order
      const maxOrder = banners.length > 0 
        ? Math.max(...banners.map(b => b.sort_order)) 
        : -1;

      // Insert banner record
      const { error: insertError } = await supabase
        .from('banners')
        .insert({
          title: newBanner.title,
          image_url: urlData.publicUrl,
          sort_order: maxOrder + 1,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Banner added successfully",
      });

      setNewBanner({ title: "", file: null });
      setIsDialogOpen(false);
      fetchBanners();
    } catch (error) {
      console.error("Error adding banner:", error);
      toast({
        title: "Error",
        description: "Failed to add banner",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;

      setBanners(banners.map(b => 
        b.id === banner.id ? { ...b, is_active: !b.is_active } : b
      ));

      toast({
        title: "Success",
        description: `Banner ${!banner.is_active ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error("Error toggling banner:", error);
      toast({
        title: "Error",
        description: "Failed to update banner",
        variant: "destructive",
      });
    }
  };

  const handleMoveOrder = async (banner: Banner, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(b => b.id === banner.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    const otherBanner = banners[newIndex];

    try {
      // Swap sort orders
      await supabase
        .from('banners')
        .update({ sort_order: otherBanner.sort_order })
        .eq('id', banner.id);

      await supabase
        .from('banners')
        .update({ sort_order: banner.sort_order })
        .eq('id', otherBanner.id);

      fetchBanners();
    } catch (error) {
      console.error("Error reordering banners:", error);
      toast({
        title: "Error",
        description: "Failed to reorder banners",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBanner = async (banner: Banner) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      // Extract filename from URL
      const urlParts = banner.image_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage
        .from('banners')
        .remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Banner deleted successfully",
      });

      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading banners...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Banner Management
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gaming" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Banner Title</Label>
                <Input
                  id="title"
                  placeholder="Enter banner title"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Banner Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                {newBanner.file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {newBanner.file.name}
                  </p>
                )}
              </div>
              <Button 
                onClick={handleAddBanner} 
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Banner
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {banners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No banners yet. Add your first banner!
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className="flex items-center gap-4 p-4 border rounded-lg bg-card"
              >
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-24 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{banner.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Order: {banner.sort_order + 1}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-4">
                    <Label htmlFor={`active-${banner.id}`} className="text-sm">
                      Active
                    </Label>
                    <Switch
                      id={`active-${banner.id}`}
                      checked={banner.is_active}
                      onCheckedChange={() => handleToggleActive(banner)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMoveOrder(banner, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMoveOrder(banner, 'down')}
                    disabled={index === banners.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteBanner(banner)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BannerManagement;
