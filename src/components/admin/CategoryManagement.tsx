import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Save, Trash2, X, ArrowUp, ArrowDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export const CategoryManagement = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("categories" as any)
      .select("*")
      .order("sort_order")
      .order("name");
    setCategories((data || []) as unknown as Category[]);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("categories" as any).insert({ name: newName.trim(), sort_order: categories.length });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewName("");
    toast({ title: "Category added" });
    load();
  };

  const rename = async (cat: Category) => {
    if (!editName.trim()) return;
    const oldName = cat.name;
    const { error } = await supabase.from("categories" as any).update({ name: editName.trim() }).eq("id", cat.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    // Update existing products that referenced the old name
    await supabase.from("products").update({ category: editName.trim() }).eq("category", oldName);
    setEditId(null);
    setEditName("");
    toast({ title: "Renamed", description: `Products updated to "${editName.trim()}"` });
    load();
  };

  const remove = async (cat: Category) => {
    const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("category", cat.name);
    if ((count || 0) > 0) {
      if (!confirm(`${count} product(s) use "${cat.name}". Delete category anyway? Products will keep the name as a free-text label.`)) return;
    }
    const { error } = await supabase.from("categories" as any).delete().eq("id", cat.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const move = async (cat: Category, dir: -1 | 1) => {
    const idx = categories.findIndex(c => c.id === cat.id);
    const swap = categories[idx + dir];
    if (!swap) return;
    await supabase.from("categories" as any).update({ sort_order: swap.sort_order }).eq("id", cat.id);
    await supabase.from("categories" as any).update({ sort_order: cat.sort_order }).eq("id", swap.id);
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="New category name" value={newName} onChange={e => setNewName(e.target.value)} />
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Name</TableHead><TableHead className="w-48">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {categories.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(c, -1)}><ArrowUp className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" disabled={i === categories.length - 1} onClick={() => move(c, 1)}><ArrowDown className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editId === c.id ? (
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" />
                    ) : (
                      <span className="font-medium">{c.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {editId === c.id ? (
                        <>
                          <Button size="sm" onClick={() => rename(c)}><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setEditName(""); }}><X className="w-3 h-3" /></Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setEditId(c.id); setEditName(c.name); }}><Edit2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(c)}><Trash2 className="w-3 h-3" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No categories. Add one above.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
