import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Part {
  id: number;
  name: string;
  description: string;
  quantity: number;
  image_url: string;
  created_at: string;
}

interface PartsManagementProps {
  categoryId: number;
  onStatsUpdate: () => void;
}

export default function PartsManagement({ categoryId, onStatsUpdate }: PartsManagementProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (categoryId) {
      loadParts();
    }
  }, [categoryId]);

  const loadParts = async () => {
    try {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setParts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading parts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddPart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const image_url = formData.get("image_url") as string;

    try {
      const { error } = await supabase
        .from("parts")
        .insert([{ 
          category_id: categoryId,
          name, 
          description, 
          quantity,
          image_url: image_url || null
        }]);

      if (error) throw error;

      toast({
        title: "Part added",
        description: `${name} has been added successfully.`,
      });

      setIsAddDialogOpen(false);
      loadParts();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error adding part",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPart) return;
    
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const image_url = formData.get("image_url") as string;

    try {
      const { error } = await supabase
        .from("parts")
        .update({ 
          name, 
          description, 
          quantity,
          image_url: image_url || null
        })
        .eq("id", selectedPart.id);

      if (error) throw error;

      toast({
        title: "Part updated",
        description: `${name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      setSelectedPart(null);
      loadParts();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error updating part",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePart = async (part: Part) => {
    if (!confirm(`Are you sure you want to delete "${part.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("parts")
        .delete()
        .eq("id", part.id);

      if (error) throw error;

      toast({
        title: "Part deleted",
        description: `${part.name} has been deleted.`,
      });

      loadParts();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error deleting part",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity <= 5) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Parts in Category</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Part</DialogTitle>
              <DialogDescription>Add a new part to this category</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPart}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Part Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Arduino Uno" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Brief description of the part" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="0" defaultValue="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL (optional)</Label>
                  <Input id="image_url" name="image_url" type="url" placeholder="https://example.com/image.jpg" />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Part"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {parts.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No parts in this category yet. Add your first part to get started.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.map((part) => {
              const stockStatus = getStockStatus(part.quantity);
              return (
                <TableRow key={part.id}>
                  <TableCell className="font-medium">{part.name}</TableCell>
                  <TableCell>{part.description || "-"}</TableCell>
                  <TableCell>{part.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPart(part);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePart(part)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Edit Part Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Part</DialogTitle>
            <DialogDescription>Update part information</DialogDescription>
          </DialogHeader>
          {selectedPart && (
            <form onSubmit={handleEditPart}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Part Name</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    defaultValue={selectedPart.name}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea 
                    id="edit-description" 
                    name="description" 
                    defaultValue={selectedPart.description || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input 
                    id="edit-quantity" 
                    name="quantity" 
                    type="number" 
                    min="0" 
                    defaultValue={selectedPart.quantity}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-image_url">Image URL (optional)</Label>
                  <Input 
                    id="edit-image_url" 
                    name="image_url" 
                    type="url" 
                    defaultValue={selectedPart.image_url || ""}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Part"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}