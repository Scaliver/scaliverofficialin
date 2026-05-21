import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gavel, Loader2, Plus, Trash2, Upload, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

interface Auction {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starting_price: number;
  current_bid: number;
  bid_increment: number;
  ends_at: string;
  status: string;
}

const emptyForm = { title: "", description: "", starting_price: 100, bid_increment: 10, ends_at: "", status: "active", image_url: "" };

const AuctionManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("auctions").select("*").order("created_at", { ascending: false });
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("auction-images").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data } = supabase.storage.from("auction-images").getPublicUrl(path);
    setForm((f: any) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
  };

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16) }); setOpen(true); };
  const openEdit = (a: Auction) => {
    setEditingId(a.id);
    setForm({
      title: a.title, description: a.description || "", starting_price: a.starting_price,
      bid_increment: a.bid_increment, status: a.status, image_url: a.image_url || "",
      ends_at: new Date(a.ends_at).toISOString().slice(0, 16),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.ends_at) { toast({ title: "Missing fields", description: "Title and end time required", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      image_url: form.image_url || null,
      starting_price: Number(form.starting_price) || 0,
      bid_increment: Number(form.bid_increment) || 1,
      ends_at: new Date(form.ends_at).toISOString(),
      status: form.status,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("auctions").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("auctions").insert({ ...payload, created_by: user?.id, current_bid: 0 }));
    }
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingId ? "Auction updated" : "Auction created" });
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this auction and all its bids?")) return;
    const { error } = await supabase.from("auctions").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Auction deleted" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-lg"><Gavel className="w-5 h-5 text-primary" /> Auctions</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Edit Auction" : "Create Auction"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Image</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {form.image_url && <img src={form.image_url} alt="" className="mt-2 w-full max-h-40 object-cover rounded-md" />}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Starting Price (₹)</Label>
                    <Input type="number" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bid Increment (₹)</Label>
                    <Input type="number" value={form.bid_increment} onChange={(e) => setForm({ ...form, bid_increment: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Ends At</Label>
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <select className="w-full bg-background border border-input rounded-md h-10 px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="ended">Ended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "Update" : "Create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No auctions yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
                {a.image_url
                  ? <img src={a.image_url} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
                  : <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><Gavel className="w-5 h-5 text-primary" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{a.title}</p>
                    <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Current ₹{(a.current_bid || a.starting_price).toFixed(0)} · Ends {new Date(a.ends_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(a)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuctionManager;
