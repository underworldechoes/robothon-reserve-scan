import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Part {
  id: number;
  name: string;
  description: string;
  quantity: number;
  image_url: string | null;
  category_id: number;
}

interface CategoryProductsProps {
  categoryId: number;
  onBack: () => void;
  onLogout: () => void;
}

export default function CategoryProducts({ categoryId, onBack, onLogout }: CategoryProductsProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [reservingId, setReservingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCategoryAndParts();
  }, [categoryId]);

  const loadCategoryAndParts = async () => {
    try {
      // Load category info
      const { data: category, error: catError } = await supabase
        .from("categories")
        .select("name")
        .eq("id", categoryId)
        .single();

      if (catError) throw catError;
      setCategoryName(category.name);

      // Load parts in this category
      const { data: partsData, error: partsError } = await supabase
        .from("parts")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");

      if (partsError) throw partsError;
      setParts(partsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return "out-of-stock";
    if (quantity <= 5) return "low-stock";
    return "available";
  };

  const handleReserve = async (partId: number, partName: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part || part.quantity === 0) {
      toast({
        variant: "destructive",
        title: "Item unavailable",
        description: "This item is currently out of stock.",
      });
      return;
    }

    setReservingId(partId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("checkout-item", {
        body: { part_id: partId },
      });

      if (error) throw error;

      toast({
        title: "Checkout successful!",
        description: `${partName} has been checked out. Please pick it up from the hardware station.`,
      });

      // Reload parts to update quantities
      await loadCategoryAndParts();
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to checkout item",
        variant: "destructive",
      });
    } finally {
      setReservingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole="team" 
        onLogout={onLogout} 
      />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Navigation & Category Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Categories
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{categoryName}</h1>
              <p className="text-muted-foreground">
                Select components to reserve for your project
              </p>
            </div>
          </div>
        </div>

        {/* Category Info */}
        <Card className="bg-gradient-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Available Parts</h3>
                <p className="text-sm text-muted-foreground">
                  {parts.length} parts available in this category
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parts.map((part) => {
            const stockStatus = getStockStatus(part.quantity);
            const canReserve = part.quantity > 0;
            const isReserving = reservingId === part.id;
            
            return (
              <Card key={part.id} className="overflow-hidden bg-gradient-card transition-all duration-300 hover:shadow-medium">
                {/* Product Image */}
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {part.image_url ? (
                    <img src={part.image_url} alt={part.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">{part.name}</CardTitle>
                    <StatusBadge variant={stockStatus}>
                      {stockStatus === "available" && "Available"}
                      {stockStatus === "low-stock" && "Low Stock"}
                      {stockStatus === "out-of-stock" && "Out of Stock"}
                    </StatusBadge>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">
                    {part.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stock Info */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium">{part.quantity}</span>
                  </div>

                  {/* Checkout Button */}
                  <Button 
                    className="w-full" 
                    onClick={() => handleReserve(part.id, part.name)}
                    disabled={!canReserve || isReserving}
                    variant={canReserve ? "default" : "secondary"}
                  >
                    {isReserving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Checking out...
                      </>
                    ) : !canReserve ? (
                      "Out of Stock"
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Checkout
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {parts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No components available</h3>
              <p className="text-muted-foreground">
                Components in this category are currently being restocked.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}