import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Package2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PartsManagement from "./PartsManagement";

interface Category {
  id: number;
  name: string;
  description: string;
  checkout_limit: number;
  created_at: string;
}

interface CategoryManagementProps {
  onStatsUpdate: () => void;
}

export default function CategoryManagement({ onStatsUpdate }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPartsDialogOpen, setIsPartsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const checkoutLimit = parseInt(formData.get("checkout_limit") as string) || 10;

    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name, description, checkout_limit: checkoutLimit }]);

      if (error) throw error;

      toast({
        title: "Category added",
        description: `${name} has been added successfully.`,
      });

      setIsAddDialogOpen(false);
      loadCategories();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error adding category",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCategory) return;
    
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const checkoutLimit = parseInt(formData.get("checkout_limit") as string) || 10;

    try {
      const { error } = await supabase
        .from("categories")
        .update({ name, description, checkout_limit: checkoutLimit })
        .eq("id", selectedCategory.id);

      if (error) throw error;

      toast({
        title: "Category updated",
        description: `${name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      loadCategories();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error updating category",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all parts in this category.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast({
        title: "Category deleted",
        description: `${category.name} has been deleted.`,
      });

      loadCategories();
      onStatsUpdate();
    } catch (error: any) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManageParts = (category: Category) => {
    setSelectedCategory(category);
    setIsPartsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category Management</CardTitle>
              <CardDescription>Add, edit, and organize inventory categories</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>Create a new inventory category</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddCategory}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name</Label>
                      <Input id="name" name="name" placeholder="e.g., Electronics" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Brief description of this category" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout_limit">Checkout Limit</Label>
                      <Input 
                        id="checkout_limit" 
                        name="checkout_limit" 
                        type="number" 
                        min="1"
                        defaultValue="10"
                        placeholder="Max items per checkout" 
                        required 
                      />
                      <p className="text-xs text-muted-foreground">Maximum number of items a user can checkout from this category at once</p>
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Adding..." : "Add Category"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <Package2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No categories yet. Add your first category to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description || "-"}</TableCell>
                    <TableCell>{new Date(category.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManageParts(category)}
                        >
                          <Package2 className="h-4 w-4 mr-1" />
                          Parts
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCategory(category);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <form onSubmit={handleEditCategory}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Category Name</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    defaultValue={selectedCategory.name}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea 
                    id="edit-description" 
                    name="description" 
                    defaultValue={selectedCategory.description || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-checkout_limit">Checkout Limit</Label>
                  <Input 
                    id="edit-checkout_limit" 
                    name="checkout_limit" 
                    type="number"
                    min="1"
                    defaultValue={selectedCategory.checkout_limit || 10}
                    required 
                  />
                  <p className="text-xs text-muted-foreground">Maximum number of items a user can checkout from this category at once</p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Category"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Parts Management Dialog */}
      <Dialog open={isPartsDialogOpen} onOpenChange={setIsPartsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Parts - {selectedCategory?.name}</DialogTitle>
            <DialogDescription>Add, edit, and manage parts in this category</DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <PartsManagement 
              categoryId={selectedCategory.id} 
              onStatsUpdate={onStatsUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}